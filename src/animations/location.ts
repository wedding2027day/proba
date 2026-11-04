import { gsap, smoothstep } from './setup';
import { arch, line, rect, type Thread } from './thread';
import type { Env } from './film';

export type CardRect = { x: number; y: number; w: number; h: number };

/** Позиция центральной карточки дресс-кода: сюда сожмётся фото площадки. */
function measureCard(root: HTMLElement): CardRect {
  const card = root.querySelector<HTMLElement>('.fan__card')!;
  const fan = root.querySelector<HTMLElement>('.fan')!;
  const stage = root.querySelector<HTMLElement>('.film__stage')!;
  const f = fan.getBoundingClientRect();
  const s = stage.getBoundingClientRect();
  const w = card.offsetWidth;
  const h = card.offsetHeight;
  return { x: f.left - s.left + (f.width - w) / 2, y: f.top - s.top + (f.height - h) / 2, w, h };
}

/** Сцена 05. Снимок поднимается в арке, арка раскрывается на весь экран, нить — её контур. */
export function buildLocation(tl: gsap.core.Timeline, at: number, env: Env, thread: Thread, root: HTMLElement) {
  const { w, h, H, mobile } = env;
  const scene = root.querySelector<HTMLElement>('.loc')!;
  const q = gsap.utils.selector(scene);
  const [media] = q('.loc__media') as HTMLElement[];

  gsap.set(scene, { autoAlpha: 0 });
  tl.set(scene, { autoAlpha: 1 }, at);

  // Стартовое окно в форме арки. Скругление уходит по мере роста: арка раскрывается в весь кадр.
  const sw = mobile ? 0.5 * w : 0.2 * w;
  const sh = mobile ? 0.36 * H : 0.46 * H;
  const sx = (w - sw) / 2;
  const sy = (H - sh) / 2;
  const R = sw / 2;
  const clip = (x: number, y: number, cw: number, ch: number, r = 0) =>
    `inset(${(y / H) * 100}% ${((w - x - cw) / w) * 100}% ${((H - y - ch) / H) * 100}% ${(x / w) * 100}% round ${r}px ${r}px 0px 0px)`;

  // Сначала нить рисует арку, затем снимок поднимается внутри неё от порога.
  const appear = 0.7;
  const grow = 1.7;
  tl.fromTo(media, { clipPath: clip(sx, sy + sh, sw, 0, 0) },
    { clipPath: clip(sx, sy, sw, sh, R), duration: appear, ease: smoothstep }, at + 0.2);
  // Обе границы заданы явно: браузер сокращает запись inset(), и из неё нельзя плавно считать четыре значения.
  tl.fromTo(media, { clipPath: clip(sx, sy, sw, sh, R) },
    { clipPath: clip(0, 0, w, H, 0), duration: grow, ease: smoothstep, immediateRender: false }, at + appear + 0.4);
  // Камера отъезжает, а зал медленно наполняется цветом.
  tl.fromTo(q('.loc__media img'), { scale: 1.35 }, { scale: 1, duration: appear + grow + 0.6, ease: 'none' }, at);
  tl.fromTo(q('.loc__media .photo__colour'), { opacity: 0 }, { opacity: 1, duration: 1, ease: 'sine.inOut' }, at + appear + grow - 0.5);

  const textAt = at + appear + grow + 0.1;
  tl.fromTo(q('.loc__shade'), { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'sine.inOut' }, textAt);
  tl.fromTo(q('.loc__name-line span'), { yPercent: 135, rotation: 4 }, { yPercent: 0, rotation: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }, textAt + 0.1);
  const infoAt = textAt + 0.7;
  tl.fromTo(q('.loc__info > *'), { y: 22, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.45, stagger: 0.09, ease: 'power2.out' }, infoAt);
  tl.fromTo(q('.loc__cross'), { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out' }, infoAt);

  // Удержание с активной кнопкой, затем фото сжимается в первую карточку палитры.
  const leave = infoAt + 1.5;
  tl.to(q('.loc__media img'), { scale: 1.06, duration: leave - (at + appear + grow + 0.6) + 1.2, ease: 'none' }, at + appear + grow + 0.6);
  tl.to(q('.loc__copy'), { opacity: 0, y: -30, duration: 0.4, ease: 'power1.in' }, leave);
  tl.to(q('.loc__shade'), { opacity: 0, duration: 0.5 }, leave);
  const card = measureCard(root);
  const shrink = 1;
  tl.fromTo(media, { clipPath: clip(0, 0, w, H, 0) },
    { clipPath: clip(card.x, card.y, card.w, card.h, 0), duration: shrink, ease: smoothstep, immediateRender: false }, leave + 0.2);
  const dressAt = leave + 0.2 + shrink;
  // Снимок переворачивается вокруг оси карточки, с обратной стороны — первый цвет палитры.
  gsap.set(media, { transformOrigin: `${card.x + card.w / 2}px ${card.y + card.h / 2}px`, transformPerspective: 1100 });
  tl.to(media, { rotationY: 90, duration: 0.32, ease: 'power1.in' }, dressAt);
  tl.set(scene, { autoAlpha: 0 }, dressAt + 0.33);

  // Нить — рамка кадра, затем короткая мерная линия у адреса, снова рамка.
  // Линия стоит точно над блоком адреса, при любой высоте экрана.
  const ruleY = (q('.loc__info')[0] as HTMLElement).offsetTop - 10;
  thread.key(at - 0.05, line(0, h * (mobile ? 0.5 : 0.62), w, h * (mobile ? 0.5 : 0.62)), mobile ? 0 : 1);
  // На телефоне нить ждёт, пока погаснут строки «Вечеринка», и проявляется уже аркой.
  if (mobile) thread.key(at + 0.25, arch(sx, sy, sw, sh, R), 0);
  // Линия расписания складывается в рамку-арку и растёт вместе с окном.
  thread.key(at + appear * 0.6, arch(sx, sy, sw, sh, R));
  thread.hold(at + appear + 0.4);
  thread.key(at + appear + 0.4 + grow, arch(0, 0, w, H, 0), 0.0);
  thread.key(infoAt - 0.1, line(w * 0.06, ruleY, w * 0.06, ruleY), 0);
  thread.key(infoAt + 0.5, line(mobile ? w * 0.06 : w * 0.06, ruleY, mobile ? w * 0.94 : w * 0.5, ruleY));
  thread.hold(leave);
  // Линия гаснет над адресом и проявляется уже рамкой карточки: через текст она не идёт.
  thread.key(leave + 0.15, line(w * 0.06, ruleY, mobile ? w * 0.94 : w * 0.5, ruleY), 0);
  thread.key(leave + 0.2 + shrink - 0.3, rect(card.x, card.y, card.w, card.h), 0);
  thread.key(leave + 0.2 + shrink, rect(card.x, card.y, card.w, card.h));

  return { dressAt, card };
}
