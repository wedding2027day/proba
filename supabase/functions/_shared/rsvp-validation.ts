/** Общие правила проверки: один и тот же код работает в браузере и на сервере. */
export type RsvpInput = {
  guest_name: string;
  attendance: boolean;
  guest_count: number;
  drinks: string | null;
  dietary_restrictions: string | null;
  comment: string | null;
};

export const LIMITS = { name: 120, drinks: 300, dietary: 500, comment: 1000 } as const;
export const HARD_MAX_GUESTS = 20;

export type FieldErrors = Partial<Record<keyof RsvpInput, string>>;

// Управляющие символы убираем: они не нужны в именах и комментариях.
// deno-lint-ignore no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const clean = (v: unknown) => (typeof v === 'string' ? v.replace(CONTROL, '').trim() : '');
const optional = (v: unknown) => clean(v) || null;

/** Возвращает очищенные данные либо ошибки по полям. */
export function validateRsvp(raw: Record<string, unknown>, maxGuests: number):
  { ok: true; data: RsvpInput } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};

  const guest_name = clean(raw.guest_name).replace(/\s+/g, ' ');
  if (guest_name.length < 2) errors.guest_name = 'Укажите имя и фамилию';
  else if (guest_name.length > LIMITS.name) errors.guest_name = 'Слишком длинное имя';
  else if (!/\p{L}/u.test(guest_name)) errors.guest_name = 'Укажите имя и фамилию';

  if (typeof raw.attendance !== 'boolean') errors.attendance = 'Выберите один из вариантов';
  const attendance = raw.attendance === true;

  let guest_count = 0;
  if (attendance) {
    const n = Number(raw.guest_count);
    if (!Number.isInteger(n) || n < 1) errors.guest_count = 'Укажите количество гостей';
    else if (n > maxGuests) errors.guest_count = `Приглашение рассчитано не более чем на ${maxGuests}`;
    else guest_count = n;
  }

  const drinks = optional(raw.drinks);
  if (drinks && drinks.length > LIMITS.drinks) errors.drinks = 'Слишком длинный текст';
  const dietary_restrictions = optional(raw.dietary_restrictions);
  if (dietary_restrictions && dietary_restrictions.length > LIMITS.dietary) errors.dietary_restrictions = 'Слишком длинный текст';
  const comment = optional(raw.comment);
  if (comment && comment.length > LIMITS.comment) errors.comment = 'Слишком длинный текст';

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { guest_name, attendance, guest_count, drinks, dietary_restrictions, comment } };
}
