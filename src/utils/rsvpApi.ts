import type { FieldErrors, RsvpInput } from '../../supabase/functions/_shared/rsvp-validation';

const endpoint = () => (import.meta.env.VITE_RSVP_ENDPOINT ?? '').replace(/\/$/, '');
export const isRsvpConfigured = () => Boolean(endpoint());

export type FormSession = { formToken: string; maxGuests: number; guestName: string | null };

export class RsvpError extends Error {
  code: string;
  fields?: FieldErrors;
  constructor(code: string, fields?: FieldErrors) {
    super(code);
    this.code = code;
    this.fields = fields;
  }
}

async function call(path: string, init?: RequestInit) {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 15000);
  let res: Response;
  try {
    res = await fetch(`${endpoint()}${path}`, { ...init, signal: ctrl.signal });
  } catch {
    throw new RsvpError('network');
  } finally {
    window.clearTimeout(timer);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new RsvpError(data?.error ?? 'server_error', data?.fields);
  return data;
}

export const inviteCodeFromUrl = () => new URLSearchParams(window.location.search).get('i') ?? '';

export async function fetchFormSession(): Promise<FormSession> {
  if (!isRsvpConfigured()) throw new RsvpError('not_configured');
  const code = inviteCodeFromUrl();
  return call(`/submit-rsvp${code ? `?invite=${encodeURIComponent(code)}` : ''}`);
}

export async function submitRsvp(id: string, formToken: string, input: RsvpInput, website: string) {
  if (!isRsvpConfigured()) throw new RsvpError('not_configured');
  return call('/submit-rsvp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, id, formToken, website }),
  }) as Promise<{ ok: true; attendance: boolean; guest_name: string }>;
}

export function errorMessage(code: string) {
  switch (code) {
    case 'network': return 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.';
    case 'rate_limited': return 'Слишком много попыток. Подождите немного и повторите.';
    case 'too_fast': return 'Секунду, форма ещё готовится. Нажмите ещё раз через пару секунд.';
    case 'duplicate': return 'Ответ на это имя уже получен. Если нужно его изменить, напишите, пожалуйста, организаторам.';
    case 'validation': return 'Проверьте, пожалуйста, поля формы.';
    case 'not_configured': return 'Приём ответов пока не подключён. Ваш ответ не сохранён.';
    default: return 'Не удалось сохранить ответ. Попробуйте ещё раз.';
  }
}
