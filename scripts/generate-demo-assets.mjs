/**
 * Генератор текстур: бумага и зерно плёнки.
 * Фотографии готовит scripts/prepare-photos.py.
 *
 *   npm run assets:textures
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets');
const ensure = (p) => mkdirSync(dirname(p), { recursive: true });

/* ---------- шум ---------- */
function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Бесшовный шум: сетка замкнута по краям, поэтому текстура не даёт стыков при повторе. */
function valueNoise(w, h, cellX, cellY, seed) {
  const rnd = mulberry(seed);
  const gw = Math.max(1, Math.round(w / cellX));
  const gh = Math.max(1, Math.round(h / cellY));
  const cx = w / gw;
  const cy = h / gh;
  const grid = new Float32Array(gw * gh).map(() => rnd());
  const out = new Float32Array(w * h);
  const s = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < h; y++) {
    const gy = y / cy, y0 = Math.floor(gy), fy = s(gy - y0);
    const y1 = (y0 + 1) % gh;
    for (let x = 0; x < w; x++) {
      const gx = x / cx, x0 = Math.floor(gx), fx = s(gx - x0);
      const x1 = (x0 + 1) % gw;
      const a = grid[(y0 % gh) * gw + (x0 % gw)], b = grid[(y0 % gh) * gw + x1];
      const c = grid[y1 * gw + (x0 % gw)], d = grid[y1 * gw + x1];
      out[y * w + x] = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    }
  }
  return out;
}

/** Бумага: крупные неровности + волокна, вытянутые по горизонтали + мелкая зернистость. */
async function paper(file, [r, g, b], amp, size = 1024) {
  const big = valueNoise(size, size, 180, 180, 11);
  const fibreA = valueNoise(size, size, 34, 3, 23);
  const fibreB = valueNoise(size, size, 3, 22, 37);
  const rnd = mulberry(5);
  const buf = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    const n = (big[i] - 0.5) * 0.7 + (fibreA[i] - 0.5) * 0.9 + (fibreB[i] - 0.5) * 0.5 + (rnd() - 0.5) * 0.55;
    const v = n * amp;
    buf[i * 3] = clamp(r + v);
    buf[i * 3 + 1] = clamp(g + v);
    buf[i * 3 + 2] = clamp(b + v * 0.95);
  }
  ensure(file);
  await sharp(buf, { raw: { width: size, height: size, channels: 3 } }).webp({ quality: 72 }).toFile(file);
}
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

/** Плёночное зерно: прозрачный тайл со светлыми и тёмными точками. */
async function grain(file, size = 256) {
  const rnd = mulberry(99);
  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const n = rnd() + rnd() - 1;
    const c = n > 0 ? 255 : 0;
    buf[i * 4] = buf[i * 4 + 1] = buf[i * 4 + 2] = c;
    buf[i * 4 + 3] = Math.min(255, Math.abs(n) * 170);
  }
  ensure(file);
  await sharp(buf, { raw: { width: size, height: size, channels: 4 } }).png({ compressionLevel: 9 }).toFile(file);
}

/* ---------- запуск ---------- */
await paper(join(ROOT, 'textures/paper-ivory.webp'), [244, 240, 233], 15);
await paper(join(ROOT, 'textures/paper-graphite.webp'), [34, 33, 31], 15);
await grain(join(ROOT, 'textures/grain.png'));
mkdirSync(join(ROOT, 'audio'), { recursive: true });
writeFileSync(join(ROOT, 'audio', 'README.txt'), 'Положите сюда лицензированный трек и укажите путь в src/config/wedding.ts (music.src).\n');
console.log('Текстуры созданы в', ROOT);
