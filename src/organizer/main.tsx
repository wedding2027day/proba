import { createRoot } from 'react-dom/client';
import { useMemo, useState, type FormEvent } from 'react';
import '@fontsource/cormorant/400.css';
import '@fontsource/jost/400.css';
import './organizer.css';

type Row = {
  id: string; guest_name: string; attendance: boolean; guest_count: number;
  drinks: string | null; dietary_restrictions: string | null; comment: string | null; created_at: string;
};

const endpoint = (import.meta.env.VITE_RSVP_ENDPOINT ?? '').replace(/\/$/, '');

// Экранирование CSV, в том числе от формул в Excel.
const cell = (v: unknown) => {
  let s = String(v ?? '');
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

function App() {
  const [token, setToken] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (e?: FormEvent) => {
    e?.preventDefault();
    setError('');
    if (!endpoint) return setError('Не задан VITE_RSVP_ENDPOINT.');
    setLoading(true);
    try {
      const res = await fetch(`${endpoint}/rsvp-admin`, { headers: { 'x-organizer-token': token } });
      const data = await res.json().catch(() => null);
      if (res.status === 401) throw new Error('Неверный пароль.');
      if (res.status === 429) throw new Error('Слишком много попыток. Подождите 15 минут.');
      if (!res.ok) throw new Error('Сервер вернул ошибку. Попробуйте позже.');
      setRows(data.responses);
    } catch (err) {
      setError(err instanceof TypeError ? 'Нет связи с сервером.' : (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const r = rows ?? [];
    return {
      total: r.length,
      yes: r.filter((x) => x.attendance).length,
      no: r.filter((x) => !x.attendance).length,
      guests: r.reduce((a, x) => a + x.guest_count, 0),
    };
  }, [rows]);

  const csv = () => {
    const head = ['Имя', 'Придёт', 'Гостей', 'Напитки', 'Ограничения', 'Комментарий', 'Дата'];
    const lines = (rows ?? []).map((r) => [
      r.guest_name, r.attendance ? 'да' : 'нет', r.guest_count, r.drinks, r.dietary_restrictions, r.comment, r.created_at,
    ].map(cell).join(';'));
    const blob = new Blob([`\uFEFF${[head.map(cell).join(';'), ...lines].join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rsvp.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!rows) {
    return (
      <form className="org org--login" onSubmit={load}>
        <h1>Ответы гостей</h1>
        <label htmlFor="token">Пароль организатора</label>
        <input id="token" type="password" autoComplete="current-password" value={token} onChange={(e) => setToken(e.target.value)} required />
        {error && <p className="org__error" role="alert">{error}</p>}
        <button type="submit" disabled={loading || !token}>{loading ? 'Загрузка…' : 'Войти'}</button>
      </form>
    );
  }

  return (
    <div className="org">
      <header>
        <h1>Ответы гостей</h1>
        <div className="org__actions">
          <button type="button" onClick={() => load()} disabled={loading}>Обновить</button>
          <button type="button" onClick={csv}>Скачать CSV</button>
        </div>
      </header>
      <p className="org__stats">Ответов: {stats.total} · Придут: {stats.yes} · Не смогут: {stats.no} · Всего гостей: {stats.guests}</p>
      {error && <p className="org__error" role="alert">{error}</p>}
      <div className="org__table">
        <table>
          <thead><tr><th>Имя</th><th>Придёт</th><th>Гостей</th><th>Напитки</th><th>Ограничения</th><th>Комментарий</th><th>Дата</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.guest_name}</td><td>{r.attendance ? 'да' : 'нет'}</td><td>{r.guest_count}</td>
                <td>{r.drinks}</td><td>{r.dietary_restrictions}</td><td>{r.comment}</td>
                <td>{new Date(r.created_at).toLocaleString('ru-RU')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
