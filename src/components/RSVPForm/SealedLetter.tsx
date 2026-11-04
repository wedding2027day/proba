import { useLayoutEffect, useRef } from 'react';
import { gsap, scrollToY } from '../../animations/setup';
import { Seal } from '../../scenes/Invitation/Seal';
import { initials } from '../../utils/couple';

export type FromRect = { left: number; top: number; width: number; height: number };

type Props = {
  guest: string;
  attending: boolean;
  message: string;
  /** Откуда начинается анимация (положение формы). Если нет — сразу показывается итог. */
  from: FromRect | null;
  onAgain: () => void;
};

/**
 * Финал: форма → письмо → два сгиба → монограмма → конверт → печать → личное сообщение.
 * Компонент появляется только после подтверждённого сервером сохранения.
 */
export function SealedLetter({ guest, attending, message, from, onAgain }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [m1, m2] = initials();

  useLayoutEffect(() => {
    if (!from) return;
    const el = root.current!;
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(el);
      const [env] = q('.tenv') as HTMLElement[];
      const [letter] = q('.tl-letter') as HTMLElement[];
      const parts = q('.tenv__back, .tenv__pocket, .tenv__flap');
      const E = env.getBoundingClientRect();
      const H = from;
      // Положение формы в координатах конверта.
      const R = el.parentElement!.getBoundingClientRect();
      const start = { left: H.left - (E.left - R.left), top: H.top - (E.top - R.top), width: H.width, height: H.height };
      // Сложенное письмо занимает почти весь конверт, развёрнутое — втрое выше.
      const fw = E.width * 0.92;
      const fh = E.height * 0.84;
      const open = { left: (E.width - fw) / 2, top: E.height / 2 - fh * 1.5, width: fw, height: fh * 3 };
      const drop = window.innerHeight * 1.3 + E.height;

      gsap.set(letter, start);
      gsap.set(parts, { y: drop });
      gsap.set(q('.tenv__flap'), { rotationX: 174, transformOrigin: '50% 0%', transformPerspective: 800, zIndex: 1 });
      gsap.set(q('.tenv__flap-out'), { visibility: 'hidden' });
      gsap.set(q('.tenv__flap-in'), { visibility: 'visible' });
      gsap.set(q('.tenv__seal'), { autoAlpha: 0, scale: 1.8 });
      gsap.set(q('.tl-panel--t'), { transformOrigin: '50% 100%', transformPerspective: 900 });
      gsap.set(q('.tl-panel--b'), { transformOrigin: '50% 0%', transformPerspective: 900 });
      gsap.set(q('.thanks__text, .thanks__rule, .thanks__more'), { autoAlpha: 0 });
      gsap.set(q('.tl-panel__line'), { opacity: 0, y: 8 });
      gsap.set(q('.tl-panel__mono'), { opacity: 0, scale: 1.25 });

      // Подводим экран к письму, чтобы гость видел всё действие.
      const box = el.getBoundingClientRect();
      requestAnimationFrame(() => scrollToY(Math.max(0, window.scrollY + box.top + box.height / 2 - window.innerHeight / 2), { duration: 1.1 }));

      const tl = gsap.timeline();
      // 1. Форма становится письмом.
      tl.to(el.parentElement, { minHeight: 0, duration: 0.9, ease: 'power3.inOut' }, 0);
      tl.to(letter, { ...open, duration: 0.9, ease: 'power3.inOut' }, 0);
      tl.to(q('.tl-panel__line'), { opacity: 1, y: 0, duration: 0.45, stagger: 0.12, ease: 'power2.out' }, 0.6);

      // 2. Два сгиба. На ребре лист показывает обратную сторону, свет скользит по бумаге.
      const fold = (panel: string, angle: number, at: number) => {
        tl.fromTo(q(`${panel} .tl-panel__shade`), { opacity: 0 }, { opacity: 0.5, duration: 0.3, ease: 'sine.in' }, at);
        tl.to(q(panel), { rotationX: angle / 2, duration: 0.3, ease: 'sine.in' }, at);
        tl.set(q(`${panel} .tl-panel__face`), { visibility: 'hidden' }, at + 0.3);
        tl.set(q(`${panel} .tl-panel__rear`), { visibility: 'visible' }, at + 0.3);
        tl.to(q(panel), { rotationX: angle, duration: 0.42, ease: 'back.out(1.3)' }, at + 0.3);
        tl.to(q(`${panel} .tl-panel__shade`), { opacity: 0, duration: 0.4, ease: 'sine.out' }, at + 0.3);
      };
      const f1 = 1.55;
      fold('.tl-panel--b', 180, f1);
      fold('.tl-panel--t', -180, f1 + 0.6);

      // 3. Монограмма проступает, как тиснение фольгой.
      const stamp = f1 + 1.35;
      tl.to(q('.tl-panel__mono'), { opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' }, stamp);
      tl.fromTo(q('.tl-panel__glow'), { opacity: 0 }, { opacity: 0.9, duration: 0.3, ease: 'sine.out' }, stamp + 0.1);
      tl.to(q('.tl-panel__glow'), { opacity: 0, duration: 0.6, ease: 'sine.in' }, stamp + 0.5);

      // 4. Конверт поднимается и принимает письмо, клапан закрывается, опускается печать.
      const rise = stamp + 0.95;
      tl.to(parts, { y: 0, duration: 0.85, ease: 'power3.out' }, rise);
      const flap = rise + 0.8;
      tl.to(q('.tenv__flap'), { rotationX: 90, duration: 0.34, ease: 'power1.in' }, flap);
      tl.set(q('.tenv__flap'), { zIndex: 5 }, flap + 0.34);
      tl.set(q('.tenv__flap-out'), { visibility: 'visible' }, flap + 0.34);
      tl.set(q('.tenv__flap-in'), { visibility: 'hidden' }, flap + 0.34);
      tl.to(q('.tenv__flap'), { rotationX: 0, duration: 0.5, ease: 'back.out(1.2)' }, flap + 0.34);
      tl.set(letter, { visibility: 'hidden' }, flap + 0.84);
      const seal = flap + 0.8;
      tl.to(q('.tenv__seal'), { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'power3.in' }, seal);
      tl.to(env, { scale: 0.985, duration: 0.08, ease: 'power2.out' }, seal + 0.28);
      tl.to(env, { scale: 1, duration: 0.45, ease: 'back.out(3)' }, seal + 0.36);

      // 5. Личное сообщение.
      const words = seal + 0.55;
      tl.set(q('.thanks__text'), { visibility: 'visible', opacity: 1 }, words);
      tl.fromTo(q('.thanks__text'), { clipPath: 'inset(0% 50% 0% 50%)' }, { clipPath: 'inset(-10% -5% -10% -5%)', duration: 0.9, ease: 'power3.inOut' }, words);
      tl.set(q('.thanks__rule'), { visibility: 'visible', opacity: 1 }, words + 0.3);
      tl.fromTo(q('.thanks__rule'), { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'power2.inOut' }, words + 0.3);
      tl.to(q('.thanks__more'), { autoAlpha: 1, duration: 0.6 }, words + 0.9);
    }, el);
    return () => ctx.revert();
    // Запускается один раз при появлении.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="thanks" ref={root} role="status">
      <div className="tenv" aria-hidden="true">
        <div className="tenv__back" />
        <div className="tenv__flap">
          <div className="tenv__flap-out" />
          <div className="tenv__flap-in" />
        </div>
        {from && (
          <div className="tl-letter">
            <div className="tl-panel tl-panel--t">
              <div className="tl-panel__face"><p className="tl-panel__line tl-panel__line--name">{guest}</p></div>
              <div className="tl-panel__rear" />
              <i className="tl-panel__shade" />
            </div>
            <div className="tl-panel tl-panel--m">
              <div className="tl-panel__face"><p className="tl-panel__line">{attending ? 'С радостью приду' : 'К сожалению, не смогу'}</p></div>
            </div>
            <div className="tl-panel tl-panel--b">
              <div className="tl-panel__face"><p className="tl-panel__line tl-panel__line--small">Ответ сохранён</p></div>
              <div className="tl-panel__rear" />
              <i className="tl-panel__shade" />
            </div>
            <div className="tl-panel__mono">
              <span className="tl-panel__glow">{m1}<i>&</i>{m2}</span>
              <span>{m1}<i>&</i>{m2}</span>
            </div>
          </div>
        )}
        <div className="tenv__pocket"><i /><i /><i /></div>
        <div className="tenv__seal"><Seal letter={m1 === m2 ? m1 : `${m1}${m2}`} /></div>
      </div>
      <p className="thanks__text">{message}</p>
      <i className="thanks__rule" aria-hidden="true" />
      <button type="button" className="thanks__more" onClick={onAgain}>Отправить ещё один ответ</button>
    </div>
  );
}
