import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from '../../animations/setup';
import { wedding } from '../../config/wedding';
import './Preloader.css';

const portrait = () => window.innerWidth / window.innerHeight < 0.8;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pick = (i: { src: string | null; srcPortrait?: string }) => (portrait() && i.srcPortrait) || i.src;

/** Что нужно до первого кадра. На телефон идут только вертикальные версии. */
const critical = () => {
  const layers = (s: typeof wedding.story.left) =>
    reduced() || !s.plate || !s.cutout
      ? [pick(s)]
      : [pick({ src: s.plate, srcPortrait: s.platePortrait }), pick({ src: s.cutout, srcPortrait: s.cutoutPortrait })];
  return [
    '/assets/textures/paper-graphite.webp',
    '/assets/textures/paper-ivory.webp',
    ...layers(wedding.story.left),
    ...layers(wedding.story.right),
  ].filter(Boolean) as string[];
};

/** Остальные изображения: подгружаем после старта, чтобы не было пустых кадров при прокрутке. */
export const deferred = () =>
  [
    pick(wedding.datePhoto),
    pick(wedding.location.image),
    pick(wedding.rsvp.closingImage),
    ...wedding.timeline.items.map((t) => t.image && pick(t.image)),
    wedding.location.image.monoPortrait && portrait() ? wedding.location.image.monoPortrait : wedding.location.image.mono,
    ...wedding.timeline.items.map((t) => t.image?.mono),
    // Снимки образов по бокам веера есть только на компьютере.
    ...(portrait() ? [] : wedding.dressCode.lookbook.map((l) => l.image.src)),
  ].filter(Boolean) as string[];

/** Держим ссылки, чтобы браузер не выгрузил уже декодированные снимки. */
const keep = new Set<HTMLImageElement>();

export function loadImage(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onerror = () => resolve();
    // Декодируем заранее: иначе большой снимок раскодируется на первом кадре показа и прокрутка дёрнется.
    img.onload = () => {
      const done = () => { keep.add(img); resolve(); };
      img.decode().then(done, done);
    };
    img.src = src;
  });
}

const MAX_WAIT_MS = 12000; // на медленной связи не держим гостя вечно

/** Настоящий прогресс: считаем загруженные файлы и шрифты. */
export function Preloader({ anchor, onDone }: { anchor: () => HTMLElement | null; onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [pct, setPct] = useState(0);
  const displayed = useRef({ v: 0 });
  const lineEl = useRef<HTMLDivElement>(null);

  // Линия загрузки лежит ровно на верхней кромке конверта: из неё потом вырастет клапан.
  useLayoutEffect(() => {
    const place = () => {
      const r = anchor()?.getBoundingClientRect();
      const el = lineEl.current!;
      if (!r || r.width === 0) {
        el.style.cssText = 'left:20vw;width:60vw;top:50%';
      } else {
        el.style.cssText = `left:${r.left}px;width:${r.width}px;top:${r.top}px`;
      }
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [anchor]);

  useEffect(() => {
    let cancelled = false;
    const list = critical();
    const total = list.length + 1;
    let done = 0;
    const bump = () => {
      done += 1;
      if (cancelled) return;
      gsap.to(displayed.current, {
        v: (done / total) * 100, duration: 0.5, ease: 'power2.out', overwrite: true,
        onUpdate: () => {
          setPct(Math.round(displayed.current.v));
          gsap.set(root.current!.querySelector('.pre__fill'), { scaleX: displayed.current.v / 100 });
        },
      });
    };
    const tasks = [
      ...list.map((s) => loadImage(s).then(bump)),
      Promise.all([
        document.fonts.load('400 40px Cormorant', 'АБВ'),
        document.fonts.load('italic 400 40px Cormorant', 'АБВ'),
        document.fonts.load('400 40px Oranienbaum', '0123'),
        document.fonts.load('400 14px Jost', 'АБВ'),
      ]).catch(() => undefined).then(bump),
    ];
    const timeout = new Promise<void>((r) => window.setTimeout(r, MAX_WAIT_MS));
    void Promise.race([Promise.all(tasks), timeout]).then(() => {
      if (cancelled) return;
      gsap.to(displayed.current, {
        v: 100, duration: 0.45, overwrite: true,
        onUpdate: () => {
          setPct(Math.round(displayed.current.v));
          gsap.set(root.current!.querySelector('.pre__fill'), { scaleX: displayed.current.v / 100 });
        },
        onComplete: () => {
          gsap.to(root.current!.querySelector('.pre__label'), { opacity: 0, duration: 0.35 });
          gsap.to(root.current, {
            backgroundColor: 'rgba(11,11,11,0)', duration: 0.5, delay: 0.1,
            onComplete: () => { if (!cancelled) onDone(); },
          });
        },
      });
    });
    return () => {
      cancelled = true;
      gsap.killTweensOf(displayed.current);
    };
  }, [onDone]);

  return (
    <div className="pre" ref={root} role="progressbar" aria-label="Загрузка" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="pre__line" ref={lineEl}><div className="pre__fill" /></div>
      <div className="pre__label">
        <span className="pre__title">THE DAY</span>
        <span className="pre__pct">{pct}</span>
      </div>
    </div>
  );
}
