import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);
// Изменение высоты из-за адресной строки не должно пересчитывать анимации.
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger };

export const smoothstep = (t: number) => t * t * (3 - 2 * t);

/** Lenis — только для колеса/трекпада. На тач-устройствах работает нативная прокрутка. */
let lenis: Lenis | null = null;
let tick: ((time: number) => void) | null = null;

export function startSmoothScroll() {
  if (lenis) return;
  lenis = new Lenis({ lerp: 0.11, smoothWheel: true, syncTouch: false, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  tick = (time) => lenis?.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
}

export function stopSmoothScroll() {
  if (tick) gsap.ticker.remove(tick);
  tick = null;
  lenis?.destroy();
  lenis = null;
}

export function setScrollLocked(locked: boolean) {
  document.documentElement.classList.toggle('is-locked', locked);
  if (locked) lenis?.stop();
  else lenis?.start();
}

export function scrollToY(y: number, opts: { immediate?: boolean; duration?: number } = {}) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const immediate = opts.immediate || reduced;
  if (lenis) {
    lenis.scrollTo(y, { immediate, force: true, duration: opts.duration ?? 1.8, lock: !immediate });
  } else {
    window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' });
  }
}

export function notifyLayoutChanged() {
  lenis?.resize();
  ScrollTrigger.refresh();
}
