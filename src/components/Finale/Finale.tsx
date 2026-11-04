import { useState } from 'react';
import { wedding } from '../../config/wedding';
import { downloadIcs, googleCalendarUrl } from '../../utils/calendar';
import { scrollToY } from '../../animations/setup';
import { film } from '../../animations/film';
import { Countdown } from './Countdown';
import './Finale.css';

/** Подвал фильма: обратный отсчёт, календарь, «поделиться», возврат к началу. */
export function Finale({ onReplay }: { onReplay: () => void }) {
  const [shareNote, setShareNote] = useState('');

  const share = async () => {
    // Персональный код из адреса не передаём дальше.
    const url = import.meta.env.VITE_SITE_URL || `${location.origin}${location.pathname}`;
    const title = wedding.event.title;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareNote('Ссылка скопирована');
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') setShareNote(url);
    }
  };

  return (
    <footer className="finale">
      <Countdown />
      <div className="finale__actions">
        <button type="button" className="btn" onClick={downloadIcs}>В календарь</button>
        <a className="btn" href={googleCalendarUrl()} target="_blank" rel="noopener noreferrer">Google Календарь</a>
        <button type="button" className="btn" onClick={share}>Поделиться</button>
      </div>
      <p className="finale__note" role="status">{shareNote}</p>
      <div className="finale__links">
        <button type="button" className="finale__link" onClick={() => scrollToY(film.yOf('story'), { duration: 2.6 })}>К началу</button>
        <button type="button" className="finale__link" onClick={onReplay}>Открыть конверт ещё раз</button>
      </div>
      {wedding.isDemo && <p className="finale__demo">Демонстрационные данные и изображения</p>}
    </footer>
  );
}
