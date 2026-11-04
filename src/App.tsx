import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { film } from './animations/film';
import { setScrollLocked, startSmoothScroll, stopSmoothScroll } from './animations/setup';
import { Preloader, deferred, loadImage } from './components/Preloader/Preloader';
import { Navigation } from './components/Navigation/Navigation';
import { Finale } from './components/Finale/Finale';
import { Invitation } from './scenes/Invitation/Invitation';
import { OurStory } from './scenes/OurStory/OurStory';
import { SaveTheDate } from './scenes/SaveTheDate/SaveTheDate';
import { Timeline } from './scenes/Timeline/Timeline';
import { Location } from './scenes/Location/Location';
import { DressCode } from './scenes/DressCode/DressCode';
import { RSVP } from './scenes/RSVP/RSVP';
import { fetchFormSession, isRsvpConfigured, type FormSession } from './utils/rsvpApi';

type Phase = 'loading' | 'invitation' | 'open';
const OPENED_KEY = 'the-day:opened';

const wasOpened = () => {
  try {
    return localStorage.getItem(OPENED_KEY) === '1' && !new URLSearchParams(location.search).has('replay');
  } catch {
    return false;
  }
};

export function App() {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [skipEnvelope] = useState(wasOpened);
  const [phase, setPhase] = useState<Phase>('loading');
  const [session, setSession] = useState<FormSession | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // Плавная прокрутка только когда анимации разрешены.
  useEffect(() => {
    if (reduced) return;
    startSmoothScroll();
    return stopSmoothScroll;
  }, [reduced]);

  // Токен формы и данные приглашения. Без сервера форма честно покажет ошибку при отправке.
  useEffect(() => {
    if (!isRsvpConfigured()) {
      console.warn('[RSVP] Не задан VITE_RSVP_ENDPOINT: ответы не будут приниматься. См. README.');
      return;
    }
    fetchFormSession().then(setSession).catch((e) => console.warn('[RSVP] Форма пока без токена', e));
  }, []);

  useEffect(() => {
    const open = phase === 'open';
    setScrollLocked(!open);
    return () => setScrollLocked(false);
  }, [phase]);

  const onLoaded = useCallback(() => {
    setPhase(skipEnvelope ? 'open' : 'invitation');
    // После первых кадров докачиваем остальные изображения.
    window.setTimeout(() => deferred().forEach((src) => void loadImage(src)), 300);
  }, [skipEnvelope]);

  // Фильм строим, когда шрифты и картинки на месте, — иначе замеры будут неверными.
  useLayoutEffect(() => {
    if (phase === 'loading' || reduced) return;
    film.mount(root.current!);
    return () => film.unmount();
  }, [phase === 'loading', reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  const onOpened = useCallback(() => {
    try { localStorage.setItem(OPENED_KEY, '1'); } catch { /* приватный режим */ }
    window.scrollTo(0, 0);
    setPhase('open');
  }, []);

  const replay = useCallback(() => {
    try { localStorage.removeItem(OPENED_KEY); } catch { /* ничего страшного */ }
    const url = new URL(location.href);
    url.searchParams.set('replay', '1');
    location.href = url.toString();
  }, []);

  const showEnvelope = !skipEnvelope && phase !== 'open';
  const closed = phase !== 'open' && !reduced;

  return (
    <div ref={root} className={reduced ? 'is-static' : ''}>
      <div className="probe probe--s" />
      <div className="probe probe--l" />
      <div className="grain" aria-hidden="true" />

      {phase === 'loading' && (
        <Preloader
          anchor={() => (skipEnvelope ? null : document.querySelector<HTMLElement>('.env'))}
          onDone={onLoaded}
        />
      )}

      {showEnvelope && (
        <Invitation
          active={phase === 'invitation'}
          greetingName={session?.guestName ?? undefined}
          reduced={reduced}
          getStage={() => stage.current}
          onOpened={onOpened}
        />
      )}

      {phase === 'open' && <Navigation onReplay={replay} reduced={reduced} />}

      <main aria-hidden={showEnvelope || undefined} inert={showEnvelope || undefined}>
        <div className="film">
          <div ref={stage} className={`film__stage ${closed ? 'film__stage--closed' : ''}`}>
            <OurStory layered={!reduced} />
            <SaveTheDate />
            <Timeline />
            <Location />
            <DressCode />
            <svg className="thread" aria-hidden="true"><polyline /></svg>
          </div>
        </div>
        <RSVP session={session} reduced={reduced} />
        <Finale onReplay={replay} />
      </main>
    </div>
  );
}
