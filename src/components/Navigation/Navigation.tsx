import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap, scrollToY, setScrollLocked } from '../../animations/setup';
import { CHAPTERS, film, type ChapterId } from '../../animations/film';
import { initials } from '../../utils/couple';
import { MusicControl } from '../MusicControl/MusicControl';
import './Navigation.css';

export function Navigation({ onReplay, reduced }: { onReplay: () => void; reduced: boolean }) {
  const [open, setOpen] = useState(false);
  const [chapter, setChapter] = useState<ChapterId>('story');
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [a, b] = initials();

  useEffect(() => film.subscribe(setChapter), []);

  useLayoutEffect(() => {
    if (!open) return;
    const ctx = gsap.context(() => {
      if (reduced) return;
      gsap.fromTo(panel.current, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'power3.inOut' });
      gsap.fromTo('.menu__item span', { yPercent: 110 }, { yPercent: 0, duration: 0.7, stagger: 0.05, delay: 0.25, ease: 'power3.out' });
    }, panel);
    return () => ctx.revert();
  }, [open, reduced]);

  useEffect(() => {
    if (!open) return;
    setScrollLocked(true);
    panel.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      setScrollLocked(false);
      button.current?.focus();
    };
  }, [open]);

  const go = (id: ChapterId) => {
    setOpen(false);
    if (id === 'invitation') return onReplay();
    const target = id === 'rsvp'
      ? document.getElementById('chapter-rsvp')!.getBoundingClientRect().top + window.scrollY
      : film.yOf(id);
    // Дальний переход идёт быстрее, чтобы не утомлять.
    const dist = Math.abs(target - window.scrollY) / window.innerHeight;
    requestAnimationFrame(() => scrollToY(target, { duration: Math.min(3.2, 1 + dist * 0.14) }));
  };

  const idx = Math.max(0, CHAPTERS.findIndex((c) => c.id === chapter));
  return (
    <>
      <div className={`nav-scrim ${chapter === 'rsvp' ? 'is-on' : ''}`} aria-hidden="true" />
      <nav className="nav" aria-label="Навигация">
        <button type="button" className="nav__mono" onClick={() => go('story')} aria-label="К началу истории">
          {a}<i>&</i>{b}
        </button>
        <span className="nav__index" aria-hidden="true">{String(idx + 1).padStart(2, '0')} — {CHAPTERS[idx]?.title}</span>
        <div className="nav__right">
          <MusicControl />
          <button ref={button} type="button" className={`nav__burger ${open ? 'is-open' : ''}`} onClick={() => setOpen((v) => !v)}
            aria-expanded={open} aria-label={open ? 'Закрыть меню' : 'Открыть меню'}>
            <span /><span />
          </button>
        </div>
      </nav>
      {open && (
        <div className="menu" ref={panel} data-lenis-prevent>
          <ol className="menu__list">
            {CHAPTERS.map((c, i) => (
              <li key={c.id}>
                <button type="button" className="menu__item" onClick={() => go(c.id)} aria-current={c.id === chapter ? 'true' : undefined}>
                  <small>{String(i + 1).padStart(2, '0')}</small>
                  <span>{c.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}
