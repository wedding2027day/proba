// Рантайм Deno: настоящее хранилище Supabase и настройки из секретов.
import { createClient } from 'npm:@supabase/supabase-js@2';
import type { Config, Store } from './handlers.ts';

declare const Deno: { env: { get(k: string): string | undefined } };

const required = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Не задан секрет ${k}`);
  return v;
};

export function loadConfig(): Config {
  return {
    tokenSecret: required('RSVP_TOKEN_SECRET'),
    ipSalt: required('RSVP_IP_SALT'),
    allowedOrigins: required('RSVP_ALLOWED_ORIGINS').split(',').map((s) => s.trim()).filter(Boolean),
    defaultMaxGuests: Number(Deno.env.get('RSVP_DEFAULT_MAX_GUESTS') ?? '2'),
    organizerToken: Deno.env.get('RSVP_ORGANIZER_TOKEN') ?? '',
    minFillMs: 3000,
  };
}

export function createStore(): Store {
  // Ключ service_role Supabase подставляет сам. В браузер он не попадает.
  const db = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
  return {
    async consume(bucket, limit, windowSeconds) {
      const { data, error } = await db.rpc('rsvp_consume_rate_limit', {
        p_bucket: bucket, p_limit: limit, p_window_seconds: windowSeconds,
      });
      if (error) throw error;
      return data === true;
    },
    async getInvite(code) {
      const { data, error } = await db.from('rsvp_invites').select('code, guest_name, max_guests').eq('code', code).maybeSingle();
      if (error) throw error;
      return data;
    },
    async insert(id, row) {
      const { error } = await db.from('rsvp_responses').insert({ id, ...row });
      if (!error) return 'inserted';
      if (error.code !== '23505') throw error;
      // Нарушена уникальность: это повтор того же запроса или другое обращение с тем же именем?
      const { data } = await db.from('rsvp_responses').select('id').eq('id', id).maybeSingle();
      return data ? 'same_id' : 'duplicate_name';
    },
    async list() {
      const { data, error } = await db.from('rsvp_responses').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  };
}
