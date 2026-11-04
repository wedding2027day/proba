import { smoothstep } from './setup';

/**
 * ЗОЛОТАЯ НИТЬ — главный мотив сайта.
 * Одна линия на весь фильм. Её форма — чистая функция времени таймлайна:
 * между ключевыми формами точки интерполируются, поэтому при прокрутке назад
 * всё проигрывается в точности обратно, и нить никогда не «теряется».
 */
const N = 80;
export type Shape = Float32Array;

const make = (fn: (u: number) => [number, number]): Shape => {
  const s = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    const [x, y] = fn(i / (N - 1));
    s[i * 2] = x;
    s[i * 2 + 1] = y;
  }
  return s;
};

export const line = (x0: number, y0: number, x1: number, y1: number) =>
  make((u) => [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u]);

export const wave = (x0: number, x1: number, mid: number, amp: number) =>
  make((u) => [x0 + (x1 - x0) * u, mid - Math.sin(u * Math.PI * 2) * amp]);

/** Периметр прямоугольника. Начинается снизу-слева, чтобы морфинг из горизонтальной линии не перекручивался. */
export const rect = (x: number, y: number, w: number, h: number) => {
  const p = 2 * (w + h);
  return make((u) => {
    let d = u * p;
    if (d < h) return [x, y + h - d];
    d -= h;
    if (d < w) return [x + d, y];
    d -= w;
    if (d < h) return [x + w, y + d];
    d -= h;
    return [x + w - d, y + h];
  });
};

/** Контур арки: стены, скруглённый верх, порог. При r = 0 это обычный прямоугольник с тем же порядком точек. */
export const arch = (x: number, y: number, w: number, h: number, r: number) => {
  const wall = h - r;
  const corner = (Math.PI * r) / 2;
  const top = w - 2 * r;
  const p = 2 * wall + 2 * corner + top + w;
  return make((u) => {
    let d = u * p;
    if (d < wall) return [x, y + h - d];
    d -= wall;
    if (d < corner) {
      const a = Math.PI - d / r;
      return [x + r + Math.cos(a) * r, y + r - Math.sin(a) * r];
    }
    d -= corner;
    if (d < top) return [x + r + d, y];
    d -= top;
    if (d < corner) {
      const a = Math.PI / 2 - d / r;
      return [x + w - r + Math.cos(a) * r, y + r - Math.sin(a) * r];
    }
    d -= corner;
    if (d < wall) return [x + w, y + r + d];
    d -= wall;
    return [x + w - d, y + h];
  });
};

export const arc = (cx: number, cy: number, r: number, a0: number, a1: number) =>
  make((u) => {
    const a = a0 + (a1 - a0) * u;
    return [cx + Math.sin(a) * r, cy - Math.cos(a) * r];
  });

type Key = { t: number; shape: Shape; alpha: number };

export class Thread {
  private keys: Key[] = [];
  private buf = new Array<string>(N);
  private lastTime = -1;
  private el: SVGPolylineElement;

  constructor(el: SVGPolylineElement) {
    this.el = el;
  }

  key(t: number, shape: Shape, alpha = 1) {
    this.keys.push({ t, shape, alpha });
  }

  /** Удержать текущую форму до момента t. */
  hold(t: number) {
    const last = this.keys[this.keys.length - 1];
    this.key(t, last.shape, last.alpha);
  }

  render(time: number) {
    if (time === this.lastTime || !this.keys.length) return;
    this.lastTime = time;
    const k = this.keys;
    let i = 0;
    while (i < k.length - 2 && k[i + 1].t <= time) i++;
    const a = k[i];
    const b = k[Math.min(i + 1, k.length - 1)];
    const span = b.t - a.t;
    const raw = span > 0 ? Math.min(1, Math.max(0, (time - a.t) / span)) : 1;
    const s = smoothstep(raw);
    for (let j = 0; j < N; j++) {
      const x = a.shape[j * 2] + (b.shape[j * 2] - a.shape[j * 2]) * s;
      const y = a.shape[j * 2 + 1] + (b.shape[j * 2 + 1] - a.shape[j * 2 + 1]) * s;
      this.buf[j] = `${x.toFixed(1)},${y.toFixed(1)}`;
    }
    this.el.setAttribute('points', this.buf.join(' '));
    this.el.style.opacity = String(a.alpha + (b.alpha - a.alpha) * s);
  }
}
