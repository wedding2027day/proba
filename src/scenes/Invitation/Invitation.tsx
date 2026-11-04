import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from '../../animations/setup';
import { wedding } from '../../config/wedding';
import { initials } from '../../utils/couple';
import { Seal } from './Seal';
import { film } from '../../animations/film';
import './Invitation.css';

type Props = {
  /** Загрузка закончена — конверт можно показывать. */
  active: boolean;
  greetingName?: string;
  reduced: boolean;
  /** Сцена-приёмник: её видимая область расширяется от размеров карточки до всего экрана. */
  getStage: () => HTMLElement | null;
  onOpened: () => void;
};

export function Invitation({ active, greetingName, reduced, getStage, onOpened }: Props) {
  const root = useRef<HTMLElement>(null);
  const [opening, setOpening] = useState(false);
  const openingRef = useRef(false);
  const ctx = useRef<gsap.Context | null>(null);
  const [m1, m2] = initials();

  useLayoutEffect(() => {
    ctx.current = gsap.context(() => {}, root.current!);
    return () => ctx.current?.revert();
  }, []);

  // Геометрия V-линии клапана — в настоящих пикселях конверта.
  useLayoutEffect(() => {
    const el = root.current!;
    const apply = () => {
      const flap = el.querySelector<HTMLElement>('.env__flap')!;
      const w = flap.offsetWidth;
      const h = flap.offsetHeight;
      el.querySelectorAll<SVGSVGElement>('.env__v').forEach((svg) => {
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        svg.querySelector('path')!.setAttribute('d', `M0 0 L${w / 2} ${h} L${w} 0`);
      });
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  // Появление: V-линия дорисовывается от линии загрузчика, затем бумага выходит из темноты.
  useEffect(() => {
    if (!active || !ctx.current) return;
    ctx.current.add(() => {
      if (reduced) {
        gsap.set('.env-scene, .inv__copy', { opacity: 1, y: 0 });
        gsap.set('.env__v path', { strokeDashoffset: 0 });
        return;
      }
      gsap.timeline()
        .fromTo('.env__v path', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' })
        .fromTo('.env-scene', { opacity: 0 }, { opacity: 1, duration: 1.3, ease: 'sine.inOut' }, 0.05)
        .fromTo('.env__body-light', { opacity: 0.9 }, { opacity: 0, duration: 1.6, ease: 'sine.out' }, 0.3)
        .fromTo('.inv__copy > *', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.14, ease: 'power3.out' }, 0.75);
    });
  }, [active, reduced]);

  // Реакция на курсор: лёгкий наклон и смещение блика. На таче — медленное «дыхание».
  useEffect(() => {
    if (!active || reduced || !ctx.current) return;
    const el = root.current!;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let cleanup = () => {};
    ctx.current.add(() => {
      const tilt = el.querySelector<HTMLElement>('.env')!;
      // Блик на воске медленно скользит, пока гость не нажал кнопку.
      gsap.fromTo(el.querySelector('.seal__gloss'), { opacity: 0.1, x: -6, y: -3 },
        { opacity: 0.34, x: 10, y: 5, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1, id: 'gloss' });
      if (canHover) {
        const rx = gsap.quickTo(tilt, 'rotationX', { duration: 1, ease: 'power3.out' });
        const ry = gsap.quickTo(tilt, 'rotationY', { duration: 1, ease: 'power3.out' });
        const sx = gsap.quickTo(el.querySelector('.env__sheen'), 'xPercent', { duration: 1.2, ease: 'power3.out' });
        const move = (e: PointerEvent) => {
          if (openingRef.current) return;
          const nx = e.clientX / window.innerWidth - 0.5;
          const ny = e.clientY / window.innerHeight - 0.5;
          rx(-ny * 9);
          ry(nx * 11);
          sx(nx * 30);
        };
        window.addEventListener('pointermove', move, { passive: true });
        cleanup = () => window.removeEventListener('pointermove', move);
      } else {
        gsap.to(tilt, { rotationX: 3, rotationY: -3.5, y: -5, duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1, id: 'breathe' });
      }
    });
    return () => cleanup();
  }, [active, reduced]);

  const open = () => {
    if (openingRef.current) return; // защита от повторных нажатий
    openingRef.current = true;
    setOpening(true);
    root.current?.scrollTo(0, 0); // для браузеров без overflow: clip

    const stage = getStage();
    if (reduced || !stage) {
      gsap.to(root.current, { opacity: 0, duration: 0.5, onComplete: onOpened });
      return;
    }

    ctx.current!.add(() => {
      const el = root.current!;
      const q = gsap.utils.selector(el);
      const tilt = el.querySelector<HTMLElement>('.env')!;
      const card = el.querySelector<HTMLElement>('.env__card')!;
      gsap.getById('breathe')?.kill();

      const cw = card.offsetWidth;
      const ch = card.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // «Камера» подъезжает: насколько увеличить карточку, чтобы она заняла центр экрана.
      const C = Math.min((vw * 0.86) / cw, (vh * 0.8) / ch, 1.55);

      // На телефоне конверт стоит выше центра: карточка приезжает точно к именам следующей сцены, без скачка.
      const joiner = stage.querySelector('.story__joiner')?.getBoundingClientRect();
      const cardBox = card.getBoundingClientRect();
      const alignY = vw / vh < 0.8 && joiner?.height
        ? joiner.top + joiner.height / 2 - (cardBox.top + cardBox.height / 2)
        : 0;

      // Имена на карточке совпадают по размеру с именами на старте следующей сцены.
      const n0 = film.namesBase / C;
      gsap.set(card, { '--card-name': `${n0}px` });

      const tl = gsap.timeline();
      gsap.getById('gloss')?.kill();
      tl.to(tilt, { rotationX: 0, rotationY: 0, y: 0, duration: 0.5, ease: 'power2.out' }, 0);
      tl.to(q('.inv__copy > *'), { opacity: 0, y: 14, duration: 0.35, stagger: 0.05, ease: 'power2.in' }, 0);

      // 1. Монограмма подсвечивается, как фольга под лампой.
      tl.to(q('.mono__glow'), { opacity: 1, duration: 0.5, ease: 'sine.out' }, 0.05);
      tl.to(q('.mono__art'), { color: '#F0DDBC', duration: 0.5, ease: 'sine.out' }, 0.05);

      // 2. Печать: нажатие, конверт чуть проседает, трещина, щелчок. Осколки и крошки воска падают.
      const crack = 0.55;
      tl.to(q('.seal'), { scale: 0.95, duration: 0.14, ease: 'power2.in' }, crack - 0.14);
      tl.to(tilt, { scale: 0.992, duration: 0.14, ease: 'power2.in' }, crack - 0.14);
      tl.fromTo(q('.seal__crack'), { strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, duration: 0.2, ease: 'power2.in' }, crack);
      tl.to(q('.seal'), { scale: 1.05, duration: 0.09, ease: 'power3.out' }, crack + 0.18);
      tl.to(tilt, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, crack + 0.18);
      tl.set(q('.seal__crack, .seal__gloss'), { opacity: 0 }, crack + 0.27);
      const dirs = [[-6, -42, 28], [58, -18, 64], [20, 62, -40], [-52, 24, -76], [-58, -22, -38]];
      (q('.seal__shard') as Element[]).forEach((piece, i) => {
        const [dx, dy, r] = dirs[i % dirs.length];
        const fall = window.innerHeight * 1.3;
        tl.to(piece, { x: dx, y: dy, rotation: r * 0.5, svgOrigin: '60 60', duration: 0.26, ease: 'power3.out' }, crack + 0.27);
        tl.to(piece, { y: dy + fall, x: dx * 1.7, rotation: r * 2.4, duration: 0.85 + i * 0.05, ease: 'power2.in' }, crack + 0.53);
      });
      (q('.seal__crumb') as Element[]).forEach((c, i) => {
        const a = (i / 6) * Math.PI * 2 + 0.4;
        tl.fromTo(c, { opacity: 1 }, { x: Math.cos(a) * (46 + i * 6), y: Math.sin(a) * 34 - 14, duration: 0.3, ease: 'power2.out' }, crack + 0.27);
        tl.to(c, { y: window.innerHeight, opacity: 0.6, duration: 0.9, ease: 'power2.in' }, crack + 0.57);
      });

      // 3. Клапан — бумага, а не жёсткая пластина: кончик поднимается первым, по линии сгиба идёт изгиб.
      const flapAt = 1.05;
      const up = 0.6;
      gsap.set(q('.env__flap'), { transformPerspective: 1100 });
      tl.fromTo(q('.env__flap'), { rotationX: 0 }, { rotationX: 90, duration: up, ease: 'power2.in' }, flapAt);
      tl.fromTo(q('.flap--b'), { rotationX: 0 }, { rotationX: 30, duration: up, ease: 'sine.in' }, flapAt);
      tl.to(q('.flap__crease'), { opacity: 1, duration: up, ease: 'sine.in' }, flapAt);
      tl.to(q('.env__flap-shadow'), { opacity: 0, scaleY: 1.2, duration: up, ease: 'sine.in' }, flapAt);
      // На ребре клапан меняет сторону и уходит под карточку.
      tl.set(q('.env__flap'), { zIndex: 1 }, flapAt + up);
      tl.set(q('.env__flap-face--out, .env__v, .mono'), { visibility: 'hidden' }, flapAt + up);
      tl.set(q('.env__flap-face--in'), { visibility: 'visible' }, flapAt + up);
      // Вес бумаги: кончик отстаёт, клапан чуть переходит за положение покоя и возвращается.
      tl.to(q('.env__flap'), { rotationX: 172, duration: 0.8, ease: 'back.out(1.5)' }, flapAt + up);
      tl.to(q('.flap--b'), { rotationX: -16, duration: 0.45, ease: 'sine.out' }, flapAt + up);
      tl.to(q('.flap--b'), { rotationX: 0, duration: 0.5, ease: 'sine.inOut' }, flapAt + up + 0.45);
      tl.to(q('.flap__crease'), { opacity: 0.25, duration: 0.8 }, flapAt + up);

      // 4. Карточка выдвигается. Карман выгибается под ней и возвращается, камера чуть наклоняется.
      const pull = flapAt + up + 0.45;
      const shellDrop = vh * 0.6 + tilt.offsetHeight * 2.2;
      gsap.set(q('.env__pocket'), { transformOrigin: '50% 100%', transformPerspective: 900 });
      tl.to(tilt, { rotationX: 7, duration: 1.05, ease: 'sine.inOut' }, pull);
      tl.to(card, { y: -ch * 0.56, rotation: -0.8, duration: 1.05, ease: 'power2.inOut' }, pull);
      tl.to(q('.env__part'), { y: ch * 0.2, duration: 1.05, ease: 'power2.inOut' }, pull);
      tl.to(q('.env__pocket'), { rotationX: -7, duration: 0.5, ease: 'sine.out' }, pull);
      tl.to(q('.env__pocket'), { rotationX: 0, duration: 0.55, ease: 'sine.inOut' }, pull + 0.5);
      tl.to(q('.env__cast'), { opacity: 0.55, scaleY: 1.1, duration: 1.05, ease: 'sine.inOut' }, pull);

      // 5. Камера въезжает внутрь: конверт уходит вниз и в тень, карточка выравнивается и встаёт по центру.
      const away = pull + 0.95;
      tl.to(q('.env__part'), { y: shellDrop, duration: 1, ease: 'power2.in' }, away);
      tl.to(q('.env__dim'), { opacity: 0.85, duration: 0.8 }, away);
      tl.to(q('.env__cast'), { opacity: 0, y: shellDrop * 0.6, duration: 0.8, ease: 'power2.in' }, away);
      tl.to(tilt, { rotationX: 0, duration: 1.15, ease: 'power2.inOut' }, away);
      tl.to(card, { y: alignY, rotation: 0, scale: C, duration: 1.15, ease: 'power2.inOut' }, away);
      tl.to(q('.inv__light'), { opacity: 0, duration: 0.8 }, away);

      // 6. Поверхность карточки становится фоном следующей сцены.
      tl.add(() => {
        const r = card.getBoundingClientRect();
        const H = stage.offsetHeight;
        const W = stage.offsetWidth;
        const from = `inset(${r.top}px ${W - r.right}px ${H - r.bottom}px ${r.left}px)`;
        gsap.set(stage, { clipPath: from });
        gsap.set(el, { visibility: 'hidden' });
        gsap.to(stage, {
          clipPath: 'inset(0px 0px 0px 0px)',
          duration: 1.2,
          ease: 'power2.inOut',
          onComplete: () => {
            gsap.set(stage, { clearProps: 'clipPath' });
            stage.classList.remove('film__stage--closed');
            onOpened();
          },
        });
      });
    });
  };

  return (
    <section ref={root} className={`inv ${active ? 'is-active' : ''}`} id="chapter-invitation" aria-label="Приглашение">
      <div className="inv__light" />
      <div className="env-scene">
        <div className="env__cast" aria-hidden="true" />
        <div className="env">
          <div className="env__back env__part" />
          <div className="env__card" aria-hidden="true">
            <span className="card__name card__name--a">{wedding.couple.partnerOne}</span>
            <span className="card__joiner">{wedding.couple.joiner}</span>
            <span className="card__name card__name--b">{wedding.couple.partnerTwo}</span>
          </div>
          <div className="env__pocket env__part">
            <div className="env__pocket-side env__pocket-side--l" />
            <div className="env__pocket-side env__pocket-side--r" />
            <div className="env__pocket-bottom" />
          </div>
          <div className="env__flap-shadow env__part" />
          <div className="env__flap env__part">
            <div className="flap flap--a">
              <div className="env__flap-face env__flap-face--out">
                <div className="env__flap-paper" />
                <div className="env__body-light" />
              </div>
              <div className="env__flap-face env__flap-face--in" />
              <svg className="env__v" aria-hidden="true"><path pathLength={1} /></svg>
              <div className="mono" aria-hidden="true">
                <span className="mono__glow">{m1}<i>&</i>{m2}</span>
                <span className="mono__art">{m1}<i>&</i>{m2}</span>
              </div>
            </div>
            <div className="flap flap--b">
              <div className="env__flap-face env__flap-face--out">
                <div className="env__flap-paper" />
                <div className="env__body-light" />
              </div>
              <div className="env__flap-face env__flap-face--in" />
              <div className="flap__crease" />
              <svg className="env__v" aria-hidden="true"><path pathLength={1} /></svg>
            </div>
          </div>
          <div className="env__sheen-wrap env__part"><div className="env__sheen" /></div>
          <div className="env__dim env__part" />
          <div className="env__seal"><Seal letter={m1 === m2 ? m1 : `${m1}${m2}`} /></div>
        </div>
      </div>
      <div className="inv__copy">
        <p className="inv__prompt">
          {greetingName ? `${greetingName}, для вас есть приглашение` : wedding.invitation.prompt}
        </p>
        <button type="button" className="btn inv__open" onClick={open} disabled={opening || !active}>
          {wedding.invitation.openLabel}
        </button>
      </div>
    </section>
  );
}
