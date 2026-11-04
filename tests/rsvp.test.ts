import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { handleAdmin, handleSubmit, type Config, type Store } from '../supabase/functions/_shared/handlers.ts';
import { createTestDb, pgStore } from './helpers.ts';

const ORIGIN = 'https://site.test';
let db: Awaited<ReturnType<typeof createTestDb>>;
let store: Store;
let clock = 1_800_000_000_000;

const cfg: Config = {
  tokenSecret: 'test-secret', ipSalt: 'salt', allowedOrigins: [ORIGIN], defaultMaxGuests: 2,
  organizerToken: 'organizer-token-123456', minFillMs: 3000, now: () => clock,
};

let ipCounter = 0;
const nextIp = () => `10.0.0.${++ipCounter}`;

async function token(ip: string, invite = '') {
  const res = await handleSubmit(new Request(`https://fn.test/submit-rsvp${invite ? `?invite=${invite}` : ''}`, {
    headers: { origin: ORIGIN, 'x-forwarded-for': ip },
  }), store, cfg);
  assert.equal(res.status, 200);
  return res.json() as Promise<{ formToken: string; maxGuests: number; guestName: string | null }>;
}

async function post(body: Record<string, unknown>, ip: string, origin = ORIGIN) {
  const res = await handleSubmit(new Request('https://fn.test/submit-rsvp', {
    method: 'POST', headers: { origin, 'x-forwarded-for': ip }, body: JSON.stringify(body),
  }), store, cfg);
  return { status: res.status, data: await res.json() as Record<string, unknown> };
}

const good = (name: string, extra: Record<string, unknown> = {}) => ({
  id: randomUUID(), guest_name: name, attendance: true, guest_count: 1, ...extra,
});

async function ready(ip: string, invite = '') {
  const t = await token(ip, invite);
  clock += 4000;
  return t;
}

before(async () => {
  db = await createTestDb();
  store = pgStore(db);
});

test('сохраняет корректный ответ в базе', async () => {
  const ip = nextIp();
  const { formToken } = await ready(ip);
  const r = await post({ ...good('Мария Иванова', { drinks: 'Вино', guest_count: 2 }), formToken }, ip);
  assert.equal(r.status, 201);
  const rows = (await db.query<{ guest_name: string; guest_count: number; drinks: string }>(
    `select guest_name, guest_count, drinks from rsvp_responses where guest_name='Мария Иванова'`)).rows;
  assert.deepEqual(rows, [{ guest_name: 'Мария Иванова', guest_count: 2, drinks: 'Вино' }]);
});

test('отказ хранится с нулевым количеством гостей, даже если клиент прислал другое', async () => {
  const ip = nextIp();
  const { formToken } = await ready(ip);
  const r = await post({ id: randomUUID(), guest_name: 'Пётр Сидоров', attendance: false, guest_count: 5, formToken }, ip);
  assert.equal(r.status, 201);
  const row = (await db.query<{ guest_count: number }>(`select guest_count from rsvp_responses where guest_name='Пётр Сидоров'`)).rows[0];
  assert.equal(row.guest_count, 0);
});

test('отклоняет больше гостей, чем разрешено', async () => {
  const ip = nextIp();
  const { formToken } = await ready(ip);
  const r = await post({ ...good('Анна Лишняя', { guest_count: 3 }), formToken }, ip);
  assert.equal(r.status, 422);
  assert.ok((r.data.fields as Record<string, string>).guest_count);
});

test('персональное приглашение задаёт лимит, и подменить его нельзя', async () => {
  await db.query(`insert into rsvp_invites(code,guest_name,max_guests) values ('family-ivanovy','Семья Ивановых',4)`);
  const ip = nextIp();
  const t = await ready(ip, 'family-ivanovy');
  assert.equal(t.maxGuests, 4);
  assert.equal(t.guestName, 'Семья Ивановых');
  assert.equal((await post({ ...good('Семья Ивановых', { guest_count: 4 }), formToken: t.formToken }, ip)).status, 201);

  // Токен с чужим кодом не проходит проверку подписи.
  const plain = await ready(ip);
  const [ts, , sig] = plain.formToken.split('.');
  const forged = `${ts}.family-ivanovy.${sig}`;
  const r = await post({ ...good('Хитрый Гость', { guest_count: 4 }), formToken: forged }, ip);
  assert.equal(r.status, 400);
  assert.equal(r.data.error, 'token_invalid');
});

test('повтор того же запроса не создаёт вторую запись, другое обращение с тем же именем отклоняется', async () => {
  const ip = nextIp();
  const { formToken } = await ready(ip);
  const body = { ...good('Олег Повторов'), formToken };
  assert.equal((await post(body, ip)).status, 201);
  assert.equal((await post(body, ip)).status, 201);
  const dup = await post({ ...good('  олег   ПОВТОРОВ '), formToken }, ip);
  assert.equal(dup.status, 409);
  const n = (await db.query<{ n: number }>(`select count(*)::int n from rsvp_responses where lower(guest_name) like 'олег%'`)).rows[0].n;
  assert.equal(n, 1);
});

test('слишком быстрая отправка, просроченный и поддельный токен отклоняются', async () => {
  const ip = nextIp();
  const { formToken } = await token(ip);
  assert.equal((await post({ ...good('Быстрый Бот'), formToken }, ip)).data.error, 'too_fast');
  clock += 25 * 3600 * 1000;
  assert.equal((await post({ ...good('Старый Токен'), formToken }, ip)).data.error, 'token_expired');
  assert.equal((await post({ ...good('Без Токена'), formToken: 'a.b.c' }, ip)).data.error, 'token_invalid');
});

test('ловушка для ботов и чужой домен отсекаются', async () => {
  const ip = nextIp();
  const { formToken } = await ready(ip);
  const trap = await post({ ...good('Бот Ловушка'), formToken, website: 'http://spam' }, ip);
  assert.equal(trap.status, 400);
  const foreign = await post({ ...good('Чужой Сайт'), formToken }, ip, 'https://evil.test');
  assert.equal(foreign.status, 403);
  const rows = await db.query(`select 1 from rsvp_responses where guest_name in ('Бот Ловушка','Чужой Сайт')`);
  assert.equal(rows.rows.length, 0);
});

test('ограничение частоты срабатывает', async () => {
  const ip = nextIp();
  const { formToken } = await ready(ip);
  let last = 0;
  for (let i = 0; i < 13; i++) last = (await post({ ...good(`Спамер Номер${'а'.repeat(i + 1)}`), formToken }, ip)).status;
  assert.equal(last, 429);
});

test('просмотр ответов только по токену организатора', async () => {
  const get = (t: string, ip: string) => handleAdmin(new Request('https://fn.test/rsvp-admin', {
    headers: { origin: ORIGIN, 'x-organizer-token': t, 'x-forwarded-for': ip },
  }), store, cfg);
  assert.equal((await get('wrong', nextIp())).status, 401);
  const ok = await get(cfg.organizerToken, nextIp());
  assert.equal(ok.status, 200);
  assert.ok(((await ok.json()) as { responses: unknown[] }).responses.length > 0);
});

for (const role of ['anon', 'authenticated']) {
  test(`роль ${role} не может читать и писать напрямую`, async () => {
    await db.exec(`set role ${role}`);
    try {
      await assert.rejects(db.query('select * from public.rsvp_responses'), /permission denied/);
      await assert.rejects(db.query(`insert into public.rsvp_responses (guest_name,attendance,guest_count) values ('Хакер Хакеров',true,1)`), /permission denied/);
      await assert.rejects(db.query('select * from public.rsvp_invites'), /permission denied/);
      await assert.rejects(db.query(`select public.rsvp_consume_rate_limit('x',1,60)`), /permission denied/);
    } finally {
      await db.exec('reset role');
    }
  });
}

test('в базе нет ни одной политики SELECT для ответов гостей', async () => {
  const r = await db.query(`select 1 from pg_policies where tablename like 'rsvp_%'`);
  assert.equal(r.rows.length, 0);
  const rls = await db.query<{ rowsecurity: boolean }>(`select rowsecurity from pg_tables where tablename='rsvp_responses'`);
  assert.equal(rls.rows[0].rowsecurity, true);
});
