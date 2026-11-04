/**
 * ЛОКАЛЬНАЯ проверка формы без аккаунта Supabase: настоящие обработчики и настоящая
 * SQL-миграция на встроенном Postgres. Данные живут в памяти и исчезают при остановке.
 * Для настоящих ответов нужен развёрнутый Supabase (см. README).
 *
 *   node scripts/local-rsvp-server.mjs
 *   VITE_RSVP_ENDPOINT=http://localhost:54399 npm run dev
 */
import { createServer } from 'node:http';
import { handleAdmin, handleSubmit } from '../supabase/functions/_shared/handlers.ts';
import { createTestDb, pgStore } from '../tests/helpers.ts';

const PORT = Number(process.env.PORT ?? 54399);
const db = await createTestDb();
const store = pgStore(db);
const cfg = {
  tokenSecret: 'local-only', ipSalt: 'local-only',
  allowedOrigins: (process.env.ORIGINS ?? 'http://localhost:5173,http://localhost:5174').split(','),
  defaultMaxGuests: 2, organizerToken: 'local-organizer-token', minFillMs: 3000,
};

createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const url = `http://localhost:${PORT}${req.url}`;
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS';
  const request = new Request(url, {
    method: req.method,
    headers: { ...req.headers, 'x-forwarded-for': '127.0.0.1' },
    body: hasBody ? Buffer.concat(chunks) : undefined,
  });
  const handler = url.includes('/rsvp-admin') ? handleAdmin : handleSubmit;
  const out = await handler(request, store, cfg);
  res.writeHead(out.status, Object.fromEntries(out.headers));
  res.end(await out.text());
}).listen(PORT, () => console.log(`Локальный RSVP (только для проверки): http://localhost:${PORT}`));
