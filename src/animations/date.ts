import { gsap } from './setup';
import { line, type Thread } from './thread';
import type { Env } from './film';

/** Находит точку внутри штриха цифры: при приближении маски экран заполняется именно ею. */
function inkPoint(el: HTMLElement, layer: HTMLElement): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  const lr = layer.getBoundingClientRect();
  const fallback = { x: r.left - lr.left + r.width * 0.2, y: r.top - lr.top + r.height * 0.5 };
  try {
    const size = 200;
    const cv = document.createElement('canvas');
    cv.width = size * 2;
    cv.height = size * 2;
    const c = cv.getContext('2d', { willReadFrequently: true })!;
    c.font = `${size}px ${getComputedStyle(el).fontFamily}`;
    c.textBaseline = 'middle';
    const text = el.textContent ?? '0';
    c.fillText(text, 0, size);
    const advance = c.measureText(text).width;
    const row = c.getImageData(0, size, size * 2, 1).data;
    let start = -1;
    for (let i = 0; i < size * 2; i++) {
      const on = row[i * 4 + 3] > 128;
      if (on && start < 0) start = i;
      if (!on && start >= 0) {
        return { x: r.left - lr.left + (((start + i) / 2) / advance) * r.width, y: r.top - lr.top + r.height / 2 };
      }
    }
  } catch { /* остаётся запасная точка */ }
  return fallback;
}

/**
 * Сцена 03. Цифры — белые на чёрном слое с mix-blend-mode: multiply.
 * Под слоем лежит фото, поэтому белое становится окном. Это дешевле SVG-маски:
 * браузер не перерисовывает фото на каждый кадр, а только композитит.
 */
export function buildDate(tl: gsap.core.Timeline, at: number, env: Env, thread: Thread, root: HTMLElement) {
  const { w, h, mobile } = env;
  const scene = root.querySelector<HTMLElement>('.date')!;
  const q = gsap.utils.selector(scene);
  const [mask] = q('.date__mask') as HTMLElement[];
  const [day, month, year] = q('.date__digit') as HTMLElement[];

  const F = mobile ? Math.min(0.62 * w, 0.27 * h) : Math.min(0.4 * w, 0.46 * h);
  gsap.set([day, month, year], { fontSize: F, xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 1 });
  gsap.set(scene, { autoAlpha: 0 });
  tl.set(scene, { autoAlpha: 1 }, at);

  const wd = day.offsetWidth;
  const wm = month.offsetWidth;
  const wy = year.offsetWidth;
  const rowH = F * 0.82;
  const cy = h * (mobile ? 0.46 : 0.46) - h / 2;

  let slots: { x: number; y: number; s: number }[];
  if (mobile) {
    const sy = Math.min((0.9 * w) / wy, 0.74);
    const rows = [rowH, rowH, rowH * sy];
    const total = rows[0] + rows[1] + rows[2];
    slots = [
      { x: -(w * 0.5 - wd / 2 - w * 0.05) * 0.5, y: cy - total / 2 + rows[0] / 2, s: 1 },
      { x: (w * 0.5 - wm / 2 - w * 0.05) * 0.5, y: cy - total / 2 + rows[0] + rows[1] / 2, s: 1 },
      { x: 0, y: cy + total / 2 - rows[2] / 2, s: sy },
    ];
  } else {
    const gap = F * 0.14;
    const sy = Math.min((wd + wm + gap) / wy, (0.92 * w) / wy);
    slots = [
      { x: -(wd + gap) / 2, y: cy - rowH * 0.5, s: 1 },
      { x: (wm + gap) / 2, y: cy - rowH * 0.5, s: 1 },
      { x: 0, y: cy + rowH * 0.5, s: sy },
    ];
  }

  const hero = (el: HTMLElement) => Math.min(((mobile ? 0.9 : 0.94) * w) / el.offsetWidth, (0.92 * h) / (F * 0.8));
  const offL = (el: HTMLElement) => -(w / 2 + (el.offsetWidth * hero(el)) / 2 + 20);
  const offR = (el: HTMLElement) => w / 2 + (el.offsetWidth * hero(el)) / 2 + 20;
  const a = at;
  const charsOf = (el: HTMLElement) => Array.from(el.children) as HTMLElement[];

  // Опорные точки масок заранее: расчёт идёт, пока цифры стоят на нужных местах.
  gsap.set(day, { x: 0, y: 0, scale: hero(day) });
  const originA = inkPoint(charsOf(day)[1] ?? day, mask);
  gsap.set(month, { x: slots[1].x, y: slots[1].y, scale: slots[1].s });
  const originB = inkPoint(charsOf(month)[0] ?? month, mask);
  gsap.set(month, { x: offR(month), y: 0, scale: hero(month) });
  gsap.set(year, { x: offR(year), y: 0, scale: hero(year) });
  gsap.set(mask, { transformOrigin: `${originA.x}px ${originA.y}px` });
  gsap.set(q('.date__white'), { opacity: 1 });

  // 1. Фотография становится маской. Камера отъезжает изнутри штриха: кадр пары остаётся внутри цифры.
  const pull = 1.25;
  tl.fromTo(mask, { scale: mobile ? 16 : 22 }, { scale: 1, duration: pull, ease: 'power3.out', immediateRender: false }, a);
  tl.fromTo(q('.date__white'), { opacity: 1 }, { opacity: 0, duration: 0.3, ease: 'sine.in', immediateRender: false }, a + 0.04);
  // Лёгкий дрейф: цифра жива и реагирует на прокрутку, пока внутри неё держится кадр.
  tl.to(day, { x: -w * 0.012, duration: 0.3, ease: 'none' }, a + pull - 0.1);

  // 2. Смена чисел — как протяжка плёнки: уходящее и входящее движутся одинаково и не наезжают друг на друга.
  // Внутри числа цифры немного расходятся: скорости разные, поэтому появляется глубина.
  const t1 = a + pull + 0.2;
  const strip = { duration: 0.85, ease: 'power2.inOut' };
  tl.to(day, { x: offL(day), ...strip }, t1);
  tl.to(q('.date__base'), { opacity: 1, duration: 0.5, ease: 'sine.inOut' }, t1 + 0.05);
  tl.set(root.querySelector('.story'), { autoAlpha: 0 }, t1 + 0.6);
  tl.to(month, { x: 0, ...strip }, t1);
  tl.fromTo(charsOf(month)[1] ?? month, { xPercent: 26 }, { xPercent: 0, ...strip }, t1);
  const t2 = t1 + 1.05;
  tl.to(month, { x: offL(month), ...strip }, t2);
  tl.to(year, { x: 0, ...strip }, t2);
  charsOf(year).forEach((ch, i) => {
    tl.fromTo(ch, { xPercent: 8 + i * 12 }, { xPercent: 0, ...strip }, t2);
  });

  // 3. Сборка: сначала 2027 отступает вглубь и освобождает место, затем день и месяц влетают с разной скоростью.
  const gather = t2 + 1.05;
  tl.to(year, { x: slots[2].x, y: slots[2].y, scale: slots[2].s, duration: 0.95, ease: 'power3.inOut' }, gather);
  tl.fromTo(day, { x: -w * 0.9, y: slots[0].y - h * 0.12, scale: slots[0].s * 1.5 },
    { x: slots[0].x, y: slots[0].y, scale: slots[0].s, duration: 0.85, ease: 'power3.out', immediateRender: false }, gather + 0.58);
  tl.fromTo(month, { x: w * 0.9, y: slots[1].y + h * 0.06, scale: slots[1].s * 1.2 },
    { x: slots[1].x, y: slots[1].y, scale: slots[1].s, duration: 0.7, ease: 'power3.out', immediateRender: false }, gather + 0.7);
  const settled = gather + 1.45;

  // Подпись и обратный отсчёт.
  tl.fromTo(q('.date__caption > *'), { y: 18, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.4, stagger: 0.1, ease: 'power2.out' }, settled - 0.25);

  // 4. Цифры снова становятся окнами: новый кадр проявляется в них вслед за нитью.
  const wipe = settled + 0.1;
  // Слой включается только сейчас: постоянный clip под режимом наложения в Chromium рисуется неверно.
  tl.set(q('.date__photo'), { visibility: 'visible' }, wipe);
  tl.fromTo(q('.date__photo'), { clipPath: 'inset(0% 100% 0% 0%)' },
    { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'sine.inOut' }, wipe);

  tl.set(q('.date__photo'), { clipPath: 'none' }, wipe + 1.02);

  // 5. Камера влетает в штрих цифры месяца, снимок заполняет экран.
  const zoomAt = wipe + 1.25;
  const zoomDur = 1.2;
  tl.to(q('.date__caption'), { opacity: 0, duration: 0.25 }, zoomAt);
  tl.set(mask, { transformOrigin: `${originB.x}px ${originB.y}px` }, zoomAt);
  tl.to(mask, { scale: 42, duration: zoomDur, ease: 'power3.in' }, zoomAt);
  tl.to(q('.date__white'), { opacity: 1, duration: 0.42, ease: 'none' }, zoomAt + zoomDur - 0.42);
  tl.fromTo(q('.date__photo img'), { scale: 1.16 }, { scale: 1, duration: zoomDur + 0.8, ease: 'none' }, wipe + 0.6);

  // Нить: под цифрами растёт вместе с датой, затем встаёт на линию будущего расписания.
  const ry = h * (mobile ? 0.84 : 0.93);
  const x0 = w * 0.06;
  const x1 = w * 0.94;
  const tlY = mobile ? h * 0.5 : h * 0.62;
  thread.key(a + 0.5, line(w / 2 - 20, ry, w / 2 + 20, ry));
  thread.key(t1 + 0.45, line(x0, ry, w * 0.36, ry));
  thread.key(t2 + 0.45, line(x0, ry, w * 0.66, ry));
  thread.key(settled, line(x0, ry, x1, ry));
  thread.hold(zoomAt);
  thread.key(zoomAt + zoomDur, line(0, tlY, w, tlY));

  const timelineAt = zoomAt + zoomDur + 0.55;
  return { timelineAt, tlY };
}
