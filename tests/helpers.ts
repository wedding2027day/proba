/**
 * ТЕСТОВОЕ хранилище: настоящая SQL-миграция на встроенном Postgres (PGlite).
 * Используется только в тестах и локальной проверке, в браузер и на сервер не попадает.
 */
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import type { Store } from '../supabase/functions/_shared/handlers.ts';

export async function createTestDb() {
  const db = new PGlite();
  // Роли, которые в Supabase уже существуют.
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
  `);
  const migration = new URL('../supabase/migrations/20270101000000_rsvp.sql', import.meta.url);
  await db.exec(readFileSync(migration, 'utf8'));
  return db;
}

export function pgStore(db: PGlite): Store {
  return {
    async consume(bucket, limit, windowSeconds) {
      const r = await db.query<{ ok: boolean }>('select public.rsvp_consume_rate_limit($1,$2,$3) as ok', [bucket, limit, windowSeconds]);
      return r.rows[0].ok;
    },
    async getInvite(code) {
      const r = await db.query<{ code: string; guest_name: string | null; max_guests: number }>(
        'select code, guest_name, max_guests from public.rsvp_invites where code=$1', [code]);
      return r.rows[0] ?? null;
    },
    async insert(id, row) {
      try {
        await db.query(
          `insert into public.rsvp_responses (id, guest_name, attendance, guest_count, drinks, dietary_restrictions, comment)
           values ($1,$2,$3,$4,$5,$6,$7)`,
          [id, row.guest_name, row.attendance, row.guest_count, row.drinks, row.dietary_restrictions, row.comment]);
        return 'inserted';
      } catch (e) {
        if ((e as { code?: string }).code !== '23505') throw e;
        const r = await db.query('select id from public.rsvp_responses where id=$1', [id]);
        return r.rows.length ? 'same_id' : 'duplicate_name';
      }
    },
    async list() {
      return (await db.query('select * from public.rsvp_responses order by created_at desc')).rows;
    },
  };
}
