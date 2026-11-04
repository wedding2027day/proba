-- THE DAY: хранение ответов гостей.
-- Публичного доступа нет вообще: RLS включён, политик нет, права у anon/authenticated отозваны.
-- Запись и чтение идут только через Edge Functions с service_role.

create table public.rsvp_responses (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null check (char_length(btrim(guest_name)) between 2 and 120),
  attendance boolean not null,
  guest_count integer not null check (guest_count between 0 and 20),
  drinks text check (drinks is null or char_length(drinks) <= 300),
  dietary_restrictions text check (dietary_restrictions is null or char_length(dietary_restrictions) <= 500),
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  -- Если гость не придёт, количество гостей равно 0.
  constraint rsvp_count_matches_attendance check (
    (attendance and guest_count >= 1) or (not attendance and guest_count = 0)
  )
);

-- Один ответ на одно имя: защита от повторных отправок.
create unique index rsvp_responses_name_unique
  on public.rsvp_responses (lower(regexp_replace(btrim(guest_name), '\s+', ' ', 'g')));
create index rsvp_responses_created_at on public.rsvp_responses (created_at desc);

-- Персональные приглашения: ссылка вида ?i=КОД. Лимит гостей проверяет сервер.
create table public.rsvp_invites (
  code text primary key check (char_length(code) between 6 and 64),
  guest_name text,
  max_guests integer not null default 1 check (max_guests between 1 and 20),
  created_at timestamptz not null default now()
);

-- Счётчики ограничения частоты. IP хранится только как хэш.
create table public.rsvp_rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);

alter table public.rsvp_responses enable row level security;
alter table public.rsvp_invites enable row level security;
alter table public.rsvp_rate_limits enable row level security;
-- Намеренно ни одной политики: для anon и authenticated таблицы закрыты полностью.

revoke all on public.rsvp_responses, public.rsvp_invites, public.rsvp_rate_limits from public, anon, authenticated;
grant all on public.rsvp_responses, public.rsvp_invites, public.rsvp_rate_limits to service_role;

-- Атомарный счётчик: true, если лимит ещё не превышен.
create function public.rsvp_consume_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rsvp_rate_limits as r (bucket, window_start, hits)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set hits = r.hits + 1
  returning hits into v_hits;

  -- Понемногу убираем старые записи.
  if random() < 0.02 then
    delete from public.rsvp_rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.rsvp_consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rsvp_consume_rate_limit(text, integer, integer) to service_role;
