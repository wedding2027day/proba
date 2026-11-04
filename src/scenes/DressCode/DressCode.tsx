import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { gsap } from '../../animations/setup';
import { wedding } from '../../config/wedding';
import { Photo } from '../../components/Photo/Photo';
import './DressCode.css';

const Lookbook = lazy(() => import('../../components/Lookbook/Lookbook'));

/** Разбивает заголовок на две строки примерно пополам — для маскированного появления. */
function splitLines(text: string) {
  const words = text.split(' ');
  const half = Math.ceil(words.length / 2);
  return [words.slice(0, half).join(' '), words.slice(half).join(' ')];
}

export function DressCode() {
  const { dressCode, rsvp } = wedding;
  const [open, setOpen] = useState(false);
  const fan = useRef<HTMLDivElement>(null);

  // Реакция на курсор только там, где он есть. На телефоне веером управляет прокрутка.
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const el = fan.current!;
    const ctx = gsap.context(() => {
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.9, ease: 'power3.out' });
      const ry = gsap.quickTo(el, 'rotationY', { duration: 0.9, ease: 'power3.out' });
      const move = (e: PointerEvent) => {
        ry((e.clientX / window.innerWidth - 0.5) * 12);
        rx(-(e.clientY / window.innerHeight - 0.5) * 8);
      };
      window.addEventListener('pointermove', move, { passive: true });
      return () => window.removeEventListener('pointermove', move);
    });
    return () => ctx.revert();
  }, []);

  return (
    <section className="scene dress" id="chapter-dress" aria-labelledby="dress-heading">
      <div className="final__photo" aria-hidden="true"><Photo image={rsvp.closingImage} /></div>
      <div className="dress__sides" aria-hidden="true">
        {dressCode.lookbook.slice(0, 2).map((l) => (
          <div className="dress__side" key={l.title}><Photo image={{ ...l.image, alt: '' }} /></div>
        ))}
      </div>
      <div className="fan-stage">
        <div className="fan-flip">
        <div className="fan" ref={fan}>
          {dressCode.palette.map((c) => (
            <div className="fan__card" key={c.name} style={{ background: c.hex, color: c.ink }}>
              <div className="fan__lift">
                <span className="fan__name">{c.name}</span>
                <span className="fan__hex">{c.hex}</span>
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>
      <div className="scene__safe dress__copy">
        <h2 className="dress__head" id="dress-heading">
          {splitLines(dressCode.heading).map((l) => <span className="dress__head-line" key={l}><span>{l}</span></span>)}
        </h2>
        <p className="dress__caption">{dressCode.caption}</p>
      </div>
      <div className="scene__safe dress__action">
        <button type="button" className="btn dress__look" onClick={() => setOpen(true)}>{dressCode.lookbookLabel}</button>
      </div>

      <div className="scene__safe final" id="chapter-rsvp-head">
        <h2 className="final__title" id="rsvp-heading">
          {splitLines(rsvp.heading).map((l) => <span className="final__line" key={l}><span>{l}</span></span>)}
        </h2>
        <p className="final__sub">{rsvp.subheading}</p>
      </div>
      <div className="dress__bridge" aria-hidden="true" />

      {open && (
        <Suspense fallback={null}>
          <Lookbook onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </section>
  );
}
