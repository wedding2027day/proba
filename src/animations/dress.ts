import { gsap } from './setup';
import { arc, line, type Thread } from './thread';
import type { Env } from './film';
import type { CardRect } from './location';

/** Сцена 06 + вход в 07: стопка → веер (нить становится дугой) → стопка → край карточки RSVP. */
export function buildDress(
  tl: gsap.core.Timeline, at: number, env: Env, thread: Thread, root: HTMLElement, card: CardRect,
) {
  const { w, H, mobile } = env;
  const scene = root.querySelector<HTMLElement>('.dress')!;
  const q = gsap.utils.selector(scene);
  const cards = q('.fan__card') as HTMLElement[];
  const [fan] = q('.fan') as HTMLElement[];
  const n = cards.length;

  gsap.set(scene, { autoAlpha: 0 });
  tl.set(scene, { autoAlpha: 1 }, at - 0.02);

  // Карточки: верхняя — первая в палитре, она «выплывает» из фото площадки.
  cards.forEach((c, i) => {
    gsap.set(c, { zIndex: n - i, transformOrigin: '50% 135%', transformPerspective: 1000, x: 0, y: i * 1.5, rotation: 0 });
  });
  // Обратная сторона перевёрнутого снимка площадки: первая карточка довершает оборот.
  tl.fromTo(cards.slice(1), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, at + 0.32);
  tl.fromTo(cards[0], { rotationY: -90, autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, at + 0.32);
  tl.to(cards[0], { rotationY: 0, duration: 0.34, ease: 'power1.out' }, at + 0.33);

  const head = at + 0.45;
  tl.fromTo(q('.dress__head-line span'), { yPercent: 130 }, { yPercent: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out' }, head);
  tl.fromTo(q('.dress__caption'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, head + 0.35);

  // Веер. У каждой карточки своя траектория: подъём по дуге, отставание и лёгкий поворот в глубине.
  const spread = (mobile ? 25 : 34) * (Math.PI / 180);
  const spreadDeg = mobile ? 25 : 34;
  const fanAt = at + 0.8;
  cards.forEach((c, i) => {
    const u = n > 1 ? i / (n - 1) : 0.5;
    const angle = -spreadDeg + 2 * spreadDeg * u;
    const lag = Math.abs(u - 0.5) * 0.28;
    tl.to(c, {
      keyframes: [
        { y: -30 - (1 - Math.abs(u - 0.5) * 2) * 26, rotationY: (u - 0.5) * 24, z: 34 - i * 8, duration: 0.45, ease: 'power1.out' },
        { y: Math.abs(u - 0.5) * 18, rotation: angle, rotationY: (u - 0.5) * 12, z: 12 - i * 3, duration: 0.85, ease: 'power2.inOut' },
      ],
    }, fanAt + lag);
  });
  // Снимки образов выезжают из-за веера и остаются по сторонам, каждый со своим поворотом и глубиной.
  const sides = q('.dress__side') as HTMLElement[];
  if (sides.length && getComputedStyle(sides[0].parentElement!).display !== 'none') {
    sides.forEach((el, i) => {
      const dir = i === 0 ? -1 : 1;
      tl.fromTo(el, { x: 0, y: 40, rotation: 0, scale: 0.72, autoAlpha: 0 },
        { x: dir * Math.min(0.36 * w, 620), y: -30 + i * 44, rotation: dir * 5.5, scale: 1, autoAlpha: 1, duration: 1.1, ease: 'power2.out' }, fanAt + 0.45 + i * 0.1);
      tl.to(el, { y: i === 0 ? -56 : -6, rotation: dir * 4, duration: 1.2, ease: 'none' }, fanAt + 1.6);
    });
  }
  tl.fromTo(q('.dress__look'), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, fanAt + 1.2);
  const fanned = fanAt + 1.55;

  // Удержание, затем веер снова собирается.
  const close = fanned + 1.35;
  tl.to(q('.dress__look'), { opacity: 0, duration: 0.2 }, close);
  tl.to(q('.dress__copy'), { opacity: 0, y: -24, duration: 0.4, ease: 'power1.in' }, close);
  tl.to(cards, { rotation: 0, rotationY: 0, z: 0, y: 0, duration: 0.7, ease: 'power2.inOut', stagger: 0.03 }, close + 0.05);
  if (sides.length) tl.to(sides, { x: 0, y: 40, rotation: 0, scale: 0.72, duration: 0.65, ease: 'power2.in' }, close);
  if (sides.length) tl.set(sides, { autoAlpha: 0 }, close + 0.65);

  // Стопка переворачивается, на обороте — слоновая кость приглашения. Затем лист разворачивается в начало формы.
  const [bridge] = q('.dress__bridge') as HTMLElement[];
  const [flip] = q('.fan-flip') as HTMLElement[];
  const bw = bridge.offsetWidth;
  const bh = bridge.offsetHeight;
  const toBridge = close + 0.85;
  const dy = card.y + card.h / 2 - (H - bh / 2);
  tl.to(flip, { rotationY: 90, duration: 0.3, ease: 'power1.in' }, toBridge);
  tl.set(fan, { autoAlpha: 0 }, toBridge + 0.3);
  tl.fromTo(bridge, { y: dy, scaleX: card.w / bw, scaleY: card.h / bh, rotationY: -90, opacity: 0, transformOrigin: '50% 50%', transformPerspective: 1000 },
    { opacity: 1, duration: 0.01 }, toBridge + 0.3);
  tl.to(bridge, { rotationY: 0, duration: 0.3, ease: 'power1.out' }, toBridge + 0.31);
  tl.to(bridge, { y: 0, scaleX: 1, scaleY: 1, duration: 1, ease: 'power2.inOut' }, toBridge + 0.55);

  // Финал. Последний кадр истории поднимается от листа, как рассвет: окно растёт снизу.
  const finalAt = toBridge + 0.85;
  tl.set(q('.final__photo'), { visibility: 'visible' }, finalAt - 0.3);
  tl.fromTo(q('.final__photo'), { clipPath: 'circle(0% at 50% 100%)' },
    { clipPath: 'circle(125% at 50% 100%)', duration: 1.2, ease: 'power2.inOut' }, finalAt - 0.3);
  tl.fromTo(q('.final__photo img'), { scale: 1.18 }, { scale: 1, duration: 1.8, ease: 'none' }, finalAt - 0.3);
  tl.fromTo(q('.final__line span'), { yPercent: 135, rotation: 3 }, { yPercent: 0, rotation: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out' }, finalAt + 0.2);
  tl.fromTo(q('.final__sub'), { clipPath: 'inset(0% 50% 0% 50%)', opacity: 1 }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'power2.inOut' }, finalAt + 0.65);
  const end = finalAt + 1.3;

  // Нить: рамка карточки → дуга над веером → кромка карточки RSVP.
  const pivotX = card.x + card.w / 2;
  const pivotY = card.y + card.h * 1.35;
  const r = card.h * 0.85 + card.h * 0.5 + 22;
  thread.key(at + 0.65, arc(pivotX, pivotY, r, -0.01, 0.01));
  thread.hold(fanAt + 0.2);
  thread.key(fanned - 0.2, arc(pivotX, pivotY, r, -spread - 0.1, spread + 0.1));
  thread.hold(close);
  thread.key(close + 0.7, arc(pivotX, pivotY, r, -0.01, 0.01));
  thread.key(toBridge + 1.55, line((w - bw) / 2, H - bh, (w + bw) / 2, H - bh));
  thread.hold(end);

  return { end };
}
