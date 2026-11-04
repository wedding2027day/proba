/**
 * Логика функций без зависимости от Deno и Supabase: хранилище передаётся снаружи.
 * Благодаря этому её можно проверить тестами (npm test), не поднимая сервер.
 */
import { HARD_MAX_GUESTS, validateRsvp, type RsvpInput } from './rsvp-validation.ts';

export type Invite = { code: string; guest_name: string | null; max_guests: number };

export type Store = {
  /** true — лимит не превышен. */
  consume(bucket: string, limit: number, windowSeconds: number): Promise<boolean>;
  getInvite(code: string): Promise<Invite | null>;
  /** 'inserted' | 'same_id' — повтор того же запроса | 'duplicate_name' — такое имя уже есть. */
  insert(id: string, data: RsvpInput): Promise<'inserted' | 'same_id' | 'duplicate_name'>;
  list(): Promise<unknown[]>;
};

export type Config = {
  tokenSecret: string;
  ipSalt: string;
  allowedOrigins: string[];
  defaultMaxGuests: number;
  organizerToken: string;
  /** Минимальное время между получением формы и отправкой. */
  minFillMs: number;
  now?: () => number;
};

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INVITE = /^[A-Za-z0-9_-]{6,64}$/;

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}
const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

/** Сравнение без утечки времени. */
export async function safeEqual(a: string, b: string) {
  const [x, y] = await Promise.all([sha256(`cmp:${a}`), sha256(`cmp:${b}`)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

function corsHeaders(req: Request, cfg: Config, methods: string): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowed = cfg.allowedOrigins.includes(origin);
  return {
    ...(allowed ? { 'Access-Control-Allow-Origin': origin } : {}),
    Vary: 'Origin',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'content-type, x-organizer-token',
    'Access-Control-Max-Age': '600',
  };
}

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors },
  });
}

async function clientKey(req: Request, cfg: Config) {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  return (await sha256(`${cfg.ipSalt}:${ip}`)).slice(0, 32);
}

/** Функция submit-rsvp. GET выдаёт токен формы, POST сохраняет ответ. */
export async function handleSubmit(req: Request, store: Store, cfg: Config): Promise<Response> {
  const cors = corsHeaders(req, cfg, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const origin = req.headers.get('origin');
  // Браузер с чужого сайта отсекаем сразу. Скрипты без Origin упрутся в токен и лимиты.
  if (origin && !cfg.allowedOrigins.includes(origin)) return json({ error: 'forbidden_origin' }, 403, cors);

  const now = (cfg.now ?? Date.now)();
  const who = await clientKey(req, cfg);

  try {
    if (req.method === 'GET') {
      if (!(await store.consume(`token:${who}`, 60, 3600))) return json({ error: 'rate_limited' }, 429, cors);
      const url = new URL(req.url);
      const code = url.searchParams.get('invite') ?? '';
      const invite = INVITE.test(code) ? await store.getInvite(code) : null;
      const inviteCode = invite?.code ?? '';
      const payload = `${now}.${inviteCode}`;
      return json({
        formToken: `${payload}.${await hmac(cfg.tokenSecret, payload)}`,
        maxGuests: invite?.max_guests ?? cfg.defaultMaxGuests,
        guestName: invite?.guest_name ?? null,
      }, 200, cors);
    }

    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors);

    const text = await req.text();
    if (text.length > 8192) return json({ error: 'too_large' }, 413, cors);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text);
      if (!body || typeof body !== 'object') throw new Error();
    } catch {
      return json({ error: 'bad_request' }, 400, cors);
    }

    // Ловушка для ботов: поле скрыто от людей. Такой запрос отклоняем и ничего не сохраняем.
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      return json({ error: 'bad_request' }, 400, cors);
    }

    if (!(await store.consume(`post:${who}`, 12, 3600))) return json({ error: 'rate_limited' }, 429, cors);
    // Общий предел защищает базу от массовой рассылки с многих адресов.
    if (!(await store.consume('post:global', 300, 3600))) return json({ error: 'rate_limited' }, 429, cors);

    // Проверка токена формы.
    const parts = String(body.formToken ?? '').split('.');
    if (parts.length !== 3) return json({ error: 'token_invalid' }, 400, cors);
    const [ts, inviteCode, sig] = parts;
    if (!(await safeEqual(sig, await hmac(cfg.tokenSecret, `${ts}.${inviteCode}`)))) {
      return json({ error: 'token_invalid' }, 400, cors);
    }
    const age = now - Number(ts);
    if (!Number.isFinite(age) || age > TOKEN_TTL_MS) return json({ error: 'token_expired' }, 400, cors);
    if (age < cfg.minFillMs) return json({ error: 'too_fast' }, 429, cors);

    const id = String(body.id ?? '');
    if (!UUID.test(id)) return json({ error: 'bad_request' }, 400, cors);

    const invite = inviteCode ? await store.getInvite(inviteCode) : null;
    const maxGuests = Math.min(invite?.max_guests ?? cfg.defaultMaxGuests, HARD_MAX_GUESTS);

    const result = validateRsvp(body, maxGuests);
    if (!result.ok) return json({ error: 'validation', fields: result.errors }, 422, cors);

    const outcome = await store.insert(id, result.data);
    if (outcome === 'duplicate_name') return json({ error: 'duplicate' }, 409, cors);
    return json({ ok: true, attendance: result.data.attendance, guest_name: result.data.guest_name }, 201, cors);
  } catch (err) {
    console.error('submit-rsvp failed', err);
    return json({ error: 'server_error' }, 500, cors);
  }
}

/** Функция rsvp-admin: чтение ответов только по токену организатора. */
export async function handleAdmin(req: Request, store: Store, cfg: Config): Promise<Response> {
  const cors = corsHeaders(req, cfg, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, cors);

  try {
    const who = await clientKey(req, cfg);
    if (!(await store.consume(`admin:${who}`, 20, 900))) return json({ error: 'rate_limited' }, 429, cors);
    const token = req.headers.get('x-organizer-token') ?? '';
    if (!cfg.organizerToken || cfg.organizerToken.length < 16 || !(await safeEqual(token, cfg.organizerToken))) {
      return json({ error: 'unauthorized' }, 401, cors);
    }
    return json({ responses: await store.list() }, 200, cors);
  } catch (err) {
    console.error('rsvp-admin failed', err);
    return json({ error: 'server_error' }, 500, cors);
  }
}
