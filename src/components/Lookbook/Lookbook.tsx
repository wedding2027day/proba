import { useEffect, useLayoutEffect, useRef } from 'react';
import { gsap, setScrollLocked } from '../../animations/setup';
import { wedding } from '../../config/wedding';
import { Photo } from '../Photo/Photo';
import { createPortal } from 'react-dom';
import './Lookbook.css';

/** Панель с рекомендациями. Загружается отдельным чанком только при открытии. */
export default function Lookbook({ onClose }: { onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    if (reduced) return onClose();
    gsap.to(root.current, { clipPath: 'inset(100% 0% 0% 0%)', duration: 0.6, ease: 'power3.inOut', onComplete: onClose });
  };

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (reduced) return;
      gsap.fromTo(root.current, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'power3.inOut' });
      gsap.fromTo('.look__item', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.12, delay: 0.3, ease: 'power3.out' });
    }, root);
    return () => ctx.revert();
  }, [reduced]);

  useEffect(() => {
    setScrollLocked(true);
    const before = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      setScrollLocked(false);
      before?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className="look" ref={root} role="dialog" aria-modal="true" aria-labelledby="look-title" data-lenis-prevent>
      <header className="look__head">
        <h2 id="look-title" className="look__title">{wedding.dressCode.lookbookLabel}</h2>
        <button ref={closeBtn} type="button" className="look__close" onClick={close} aria-label="Закрыть">
          <span /><span />
        </button>
      </header>
      <div className="look__grid">
        {wedding.dressCode.lookbook.map((item) => (
          <article className="look__item" key={item.title}>
            <Photo image={item.image} className="look__photo" />
            <h3 className="look__name">{item.title}</h3>
            <p className="look__text">{item.text}</p>
          </article>
        ))}
      </div>
    </div>,
    document.body,
  );
}
