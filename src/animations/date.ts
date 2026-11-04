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
 * Реальные очертания цифр после загрузки шрифта: блок текста выше и шире самих знаков.
 * ink — высота знаков в долях кегля, off — на сколько их центр ниже центра блока.
 */
function digitInk(el: HTMLElement) {
  const fallback = { ink: 0.74, off: 0 };
  try {
    const c = document.createElement('canvas').getContext('2d')!;
    const cs = getComputedStyle(el);
    c.font = `${cs.fontWeight} 100px ${cs.fontFamily}`;
    const m = c.measureText(el.textContent ?? '0');
    const asc = m.actualBoundingBoxAscent;
    const desc = m.actualBoundingBoxDescent;
    if (!asc) return fallback;
    return {
      ink: (asc + desc) / 100,
      off: ((m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2 - (asc - desc) / 2) / 100,
    };
  } catch {
    return fallback;
  }
}

/** Значение safe-area сверху в пикселях: env() нельзя прочитать напрямую. */
function safeTop() {
  const p = document.createElement('div');
  p.style.cssText = 'position:fixed;visibility:hidden;padding-top:var(--safe-t)';
  document.body.appendChild(p);
  const v = p.offsetHeight;
  p.remove();
  return v;
}

/**
 * Сцена 03. Цифры — белые на чёрном слое с mix-blend-mode: multiply.
 * Под слоем лежит фото, поэтому белое становится окном. Это дешевле SVG-маски:
 * браузер не перерисовывает фото на каждый кадр, а только композитит.
 */
export function buildDate(tl: gsap.core.Timeline, at: number, env: Env, thread: Thread, root: HTMLElement) {
  const { w, h, H, mobile } = env;
  const scene = root.querySelector<HTMLElement>('.date')!;
  const q = gsap.utils.selector(scene);
  const [mask] = q('.date__mask') as HTMLElement[];
  const [day, month, year] = q('.date__digit') as HTMLElement[];

  // Цифры привязаны к центру сцены высотой 100lvh, а видимая область на телефоне короче на панели Safari.
  const heroY = (h - H) / 2;
  const [caption] = q('.date__caption') as HTMLElement[];

  // Телефон: дата занимает свою зону между шапкой и линией, подпись и отсчёт живут ниже линии.
  const captionTop = caption.offsetTop;
  const ruleY = mobile ? captionTop - 18 : h * 0.93;
  const zoneTop = safeTop() + 62;
  const zoneBottom = ruleY - 16;
  const zone = zoneBottom - zoneTop;

  gsap.set([day, month, year], { fontSize: 100, xPercent: -50, yPercent: -50, x: 0, y: heroY, scale: 1 });
  const { ink, off } = digitInk(day);
  const rowGap = 0.09; // зазор между строками в долях кегля
  const yearEm = year.offsetWidth / 100;
  /** Самый крупный кегль, при котором три строки помещаются в зону. Масштаб страницы не трогаем. */
  const fitMobile = () => {
    let f = 0.62 * w;
    for (let i = 0; i < 6; i++) {
      const s = Math.min((0.9 * w) / (yearEm * f), 0.74);
      const total = f * (ink * (2 + s) + 2 * rowGap);
      if (total <= zone) break;
      f *= zone / total;
    }
    return f;
  };
  const F = mobile ? fitMobile() : Math.min(0.4 * w, 0.46 * h);
  gsap.set([day, month, year], { fontSize: F });
  gsap.set(scene, { autoAlpha: 0 });
  tl.set(scene, { autoAlpha: 1 }, at);

  const wd = day.offsetWidth;
  const wm = month.offsetWidth;
  const wy = year.offsetWidth;
  const rowH = F * 0.82;
  const cy = h * 0.46 - h / 2;

  let slots: { x: number; y: number; s: number }[];
  if (mobile) {
    const sy = Math.min((0.9 * w) / wy, 0.74);
    const inkRow = ink * F;
    const gap = rowGap * F;
    const total = inkRow * (2 + sy) + 2 * gap;
    const top = zoneTop + (zone - total) / 2;
    // y цифры — это центр её блока от центра сцены, а ставим мы по центру самих знаков.
    const place = (inkCenter: number, s: number) => inkCenter - off * F * s - H / 2;
    slots = [
      { x: -(w * 0.5 - wd / 2 - w * 0.05) * 0.5, y: place(top + inkRow / 2, 1), s: 1 },
      { x: (w * 0.5 - wm / 2 - w * 0.05) * 0.5, y: place(top + inkRow + gap + inkRow / 2, 1), s: 1 },
      { x: 0, y: place(top + 2 * (inkRow + gap) + (inkRow * sy) / 2, sy), s: sy },
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

  // На телефоне крупное число не доходит ни до шапки, ни до линии.
  const heroLimit = mobile ? Math.min(zone, 2 * (ruleY - 16 - h / 2)) / (ink * F) : (0.92 * h) / (F * 0.8);
  const hero = (el: HTMLElement) => Math.min(((mobile ? 0.9 : 0.94) * w) / el.offsetWidth, heroLimit);
  const offL = (el: HTMLElement) => -(w / 2 + (el.offsetWidth * hero(el)) / 2 + 20);
  const offR = (el: HTMLElement) => w / 2 + (el.offsetWidth * hero(el)) / 2 + 20;
  const a = at;
  const charsOf = (el: HTMLElement) => Array.from(el.children) as HTMLElement[];

  // Опорные точки масок заранее: расчёт идёт, пока цифры стоят на нужных местах.
  gsap.set(day, { x: 0, y: heroY, scale: hero(day) });
  const originA = inkPoint(charsOf(day)[1] ?? day, mask);
  gsap.set(month, { x: slots[1].x, y: slots[1].y, scale: slots[1].s });
  const originB = inkPoint(charsOf(month)[0] ?? month, mask);
  gsap.set(month, { x: offR(month), y: heroY, scale: hero(month) });
  gsap.set(year, { x: offR(year), y: heroY, scale: hero(year) });
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
  // На телефоне строки стоят плотно, поэтому числа влетают строго по своей строке и не задевают соседние.
  tl.fromTo(day, { x: -w * 0.9, y: slots[0].y - (mobile ? 0 : h * 0.12), scale: slots[0].s * (mobile ? 1 : 1.5) },
    { x: slots[0].x, y: slots[0].y, scale: slots[0].s, duration: 0.85, ease: 'power3.out', immediateRender: false }, gather + 0.58);
  tl.fromTo(month, { x: w * 0.9, y: slots[1].y + (mobile ? 0 : h * 0.06), scale: slots[1].s * (mobile ? 1 : 1.2) },
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
  // Подпись и линия уходят раньше, чем растущие цифры дойдут до них.
  tl.to(q('.date__caption'), { opacity: 0, duration: 0.22 }, zoomAt - 0.22);
  tl.set(mask, { transformOrigin: `${originB.x}px ${originB.y}px` }, zoomAt);
  tl.to(mask, { scale: 42, duration: zoomDur, ease: 'power3.in' }, zoomAt);
  tl.to(q('.date__white'), { opacity: 1, duration: 0.42, ease: 'none' }, zoomAt + zoomDur - 0.42);
  tl.fromTo(q('.date__photo img'), { scale: 1.16 }, { scale: 1, duration: zoomDur + 0.8, ease: 'none' }, wipe + 0.6);

  // Нить: под цифрами растёт вместе с датой, затем встаёт на линию будущего расписания.
  const ry = ruleY;
  const x0 = w * 0.06;
  const x1 = w * 0.94;
  const tlY = mobile ? h * 0.5 : h * 0.62;
  if (mobile) thread.key(a + 0.3, line(w / 2 - 20, ry, w / 2 + 20, ry), 0);
  thread.key(a + 0.5, line(w / 2 - 20, ry, w / 2 + 20, ry));
  thread.key(t1 + 0.45, line(x0, ry, w * 0.36, ry));
  thread.key(t2 + 0.45, line(x0, ry, w * 0.66, ry));
  thread.key(settled, line(x0, ry, x1, ry));
  thread.hold(zoomAt - 0.22);
  thread.key(zoomAt, line(x0, ry, x1, ry), 0);
  // Вверх нить идёт скрытой и проявляется, когда цифры уже стали окном во весь экран.
  thread.key(zoomAt + zoomDur * 0.72, line(0, tlY, w, tlY), 0);
  thread.key(zoomAt + zoomDur, line(0, tlY, w, tlY));

  const timelineAt = zoomAt + zoomDur + 0.55;
  return { timelineAt, tlY };
}
