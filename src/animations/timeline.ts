import { gsap } from './setup';
import { line, type Thread } from './thread';
import type { Env } from './film';

/** Сцена 04. На компьютере — горизонтальный проход; на телефоне — вертикальный, нить слева. */
export function buildTimeline(
  tl: gsap.core.Timeline, at: number, env: Env, thread: Thread, root: HTMLElement, tlY: number,
) {
  const { w, h, H, mobile } = env;
  const scene = root.querySelector<HTMLElement>('.tl')!;
  const q = gsap.utils.selector(scene);
  const [track] = q('.tl__track') as HTMLElement[];
  const events = q('.tl-event') as HTMLElement[];
  const date = root.querySelector<HTMLElement>('.date')!;

  gsap.set(scene, { autoAlpha: 0, '--tl-y': `${tlY}px` });
  tl.set(scene, { autoAlpha: 1 }, at);

  // Сцена раскрывается изнутри фотографии: линия даты разрезает кадр, половины расходятся как створки.
  const yPct = (tlY / H) * 100;
  const openDur = 1;
  const d = gsap.utils.selector(date);
  gsap.set(d('.date__door--t'), { clipPath: `inset(0% 0% ${100 - yPct}% 0%)` });
  gsap.set(d('.date__door--b'), { clipPath: `inset(${yPct}% 0% 0% 0%)` });
  tl.set(date, { zIndex: 5 }, at);
  tl.set(d('.date__door'), { visibility: 'visible' }, at);
  tl.set(d('.date__base, .date__photo, .date__mask, .date__safe'), { visibility: 'hidden' }, at);
  tl.to(d('.date__door--t'), { y: -tlY - 10, duration: openDur, ease: 'power2.inOut' }, at);
  tl.to(d('.date__door--b'), { y: H - tlY + 10, duration: openDur, ease: 'power2.inOut' }, at);
  tl.fromTo(d('.date__door img'), { scale: 1 }, { scale: 1.14, duration: openDur, ease: 'none' }, at);
  tl.set(date, { autoAlpha: 0 }, at + openDur);

  // Первый этап успевает раскрыться и задержаться, прежде чем полотно поедет.
  const start = at + openDur * 0.85 + 0.45;
  const perEvent = 1.25;
  const dur = perEvent * events.length + 0.5;

  const distance = mobile
    ? Math.max(0, track.scrollHeight - h * 0.72)
    : Math.max(0, track.scrollWidth - w * 0.84);
  const offset0 = mobile ? h * 0.3 : w * 0.08;
  tl.fromTo(track, mobile ? { y: offset0 } : { x: offset0 },
    mobile ? { y: -distance, duration: dur } : { x: -distance, duration: dur }, start);

  // Момент, когда этап подходит к точке рисования нити.
  const head = mobile ? h * 0.72 : w * 0.72;
  const totalMove = offset0 + distance;
  const when = (el: HTMLElement) => {
    const pos = mobile ? el.offsetTop : el.offsetLeft;
    const travel = pos + offset0 - head;
    return start + Math.max(0, travel / totalMove) * dur;
  };

  // Параллакс внутри окна: фото чуть больше окна и движется ему навстречу. Масштаб равномерный.
  const drift = (imgs: Element[], t0: number) => {
    if (!imgs.length) return;
    const from = mobile ? { scale: 1.16, yPercent: 6 } : { scale: 1.16, xPercent: 6 };
    const to = mobile ? { yPercent: -6 } : { xPercent: -6 };
    tl.fromTo(imgs, from, { ...to, duration: 2.2, ease: 'none' }, t0 - 0.2);
  };

  /**
   * Своя глубина у каждого слоя этапа: цифры времени отстают от полотна, фотокарточка обгоняет его
   * и немного поворачивается, как будто камера проезжает мимо снимка, висящего ближе к зрителю.
   */
  const passBy = (el: HTMLElement, t0: number, tilt: number) => {
    const e = gsap.utils.selector(el);
    const span = 3;
    const time = e('.tl-event__time');
    const card = e('.tl-photo');
    if (mobile) {
      if (card.length) {
        tl.fromTo(card, { y: 46, rotation: tilt * 0.45 }, { y: -34, rotation: -tilt * 0.3, duration: span, ease: 'none' }, t0 - 0.7);
      }
      return;
    }
    tl.fromTo(time, { x: 90 }, { x: -50, duration: span, ease: 'none' }, t0 - 0.8);
    if (card.length) {
      tl.fromTo(card, { x: 170, y: 18, rotation: tilt, scale: 0.94 },
        { x: -130, y: -14, rotation: -tilt * 0.6, scale: 1.04, duration: span, ease: 'none' }, t0 - 0.8);
    }
  };

  events.forEach((el) => {
    const t0 = Math.max(at + openDur * 0.6, when(el) - (el === events[0] ? 0.45 : 0));
    const e = gsap.utils.selector(el);
    const kind = el.dataset.kind;
    tl.fromTo(e('.tl-event__mark'), { scale: 0 }, { scale: 1, duration: 0.2, ease: 'back.out(3)' }, t0 + 0.15);
    tl.fromTo(e('.tl-event__time span'), { yPercent: 105 }, { yPercent: 0, duration: 0.55, ease: 'power3.out' }, t0);

    switch (kind) {
      case 'gather':
        // Раскрытие типографической композиции: слова выходят из-под масок со сдвигом.
        tl.fromTo(e('.tl-word span'), { yPercent: 110, rotate: 4 },
          { yPercent: 0, rotate: 0, duration: 0.6, stagger: 0.14, ease: 'power3.out' }, t0 + 0.12);
        tl.fromTo(e('.tl-word:nth-child(2)'), { x: 70 }, { x: 0, duration: 0.8, ease: 'power2.out' }, t0 + 0.12);
        break;
      case 'ceremony':
        // Две линии идут навстречу и встречаются на названии.
        tl.fromTo(e('.tl-meet__a'), { xPercent: -100 }, { xPercent: 0, duration: 0.8, ease: 'power2.inOut' }, t0);
        tl.fromTo(e('.tl-meet__b'), { xPercent: 100 }, { xPercent: 0, duration: 0.8, ease: 'power2.inOut' }, t0);
        tl.fromTo(e('.tl-meet__dot'), { scale: 0 }, { scale: 1, duration: 0.2, ease: 'back.out(3)' }, t0 + 0.72);
        tl.fromTo(e('.tl-event__title'), { letterSpacing: '0.3em', opacity: 0 },
          { letterSpacing: '0em', opacity: 1, duration: 0.7, ease: 'power2.out' }, t0 + 0.3);
        break;
      case 'dinner':
        // Мягкое появление: кадр раскрывается, а внутри окна фото плывёт медленнее полотна.
        tl.fromTo(e('.tl-photo'), { clipPath: 'inset(22% 14% 22% 14%)', opacity: 0 },
          { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, duration: 0.9, ease: 'sine.out' }, t0);
        drift(e('.tl-photo img'), t0);
        passBy(el, t0, 3);
        // Кадр оживает: из ч/б в тёплый свет свечей, когда подходит к центру.
        tl.fromTo(e('.photo__colour'), { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'sine.inOut' }, t0 + 0.35);
        tl.fromTo(e('.tl-event__title'), { clipPath: 'inset(0% 100% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'power2.inOut' }, t0 + 0.25);
        break;
      case 'dance':
        // Кадр раскрывается кругом от пары, контурные эллипсы кружатся вокруг неё с разной скоростью.
        tl.fromTo(e('.tl-photo'), { clipPath: 'circle(0% at 50% 62%)' },
          { clipPath: 'circle(95% at 50% 62%)', duration: 1, ease: 'sine.inOut' }, t0 - 0.1);
        drift(e('.tl-photo img'), t0);
        (e('.tl-orbit ellipse') as Element[]).forEach((o, i) => {
          tl.fromTo(o, { rotation: -60 - i * 50, svgOrigin: '100 100', opacity: 0 },
            { rotation: 90 + i * 70, opacity: 1, duration: 1.6, ease: 'sine.inOut' }, t0 - 0.1);
        });
        passBy(el, t0, -3.4);
        tl.fromTo(e('.tl-event__title'), { clipPath: 'inset(0% 50% 0% 50%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'power2.inOut' }, t0 + 0.3);
        break;
      case 'party':
      default:
        // Самая быстрая композиция: огни вспыхивают, строки летят навстречу друг другу.
        // Огни вспыхивают: окно растёт от центра, а не просто проявляется.
        tl.fromTo(e('.tl-party__photo'), { opacity: 1, clipPath: 'inset(50% 30% 50% 30%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'power3.out' }, t0 - 0.05);
        drift(e('.tl-party__photo img'), t0 - 0.2);
        (e('.tl-row') as HTMLElement[]).forEach((row, i) => {
          tl.fromTo(row, { xPercent: i % 2 ? -22 : 6 }, { xPercent: i % 2 ? 6 : -22, duration: 1.9, ease: 'none' }, t0 - 0.1);
        });
        tl.fromTo(e('.tl-rows'), { opacity: 0 }, { opacity: 1, duration: 0.3 }, t0);
        break;
    }
  });

  const end = start + dur;
  // Камера влетает в огни, экран гаснет, остаётся нить.
  tl.to(q('.tl-party__photo'), { scale: 1.35, duration: 0.5, ease: 'power2.in' }, end - 0.2);
  tl.to(q('.tl__track'), { opacity: 0, duration: 0.35, ease: 'sine.in' }, end - 0.05);
  tl.set(scene, { autoAlpha: 0 }, end + 0.35);

  // Нить: разрез через весь кадр → отступает к «голове» → дорисовывается до конца.
  if (mobile) {
    const x = 20;
    thread.key(at, line(0, tlY, w, tlY));
    thread.hold(at + openDur - 0.3);
    // Разрез гаснет на месте, вертикальная линия появляется слева: нить не проходит через время и название этапа.
    thread.key(at + openDur - 0.08, line(0, tlY, w, tlY), 0);
    thread.key(at + openDur, line(x, 0, x, head), 0);
    thread.key(start + 0.15, line(x, 0, x, head));
    // Строки «Вечеринка» идут на всю ширину экрана: к ним нить гаснет, чтобы не резать текст.
    const party = Math.max(start + 0.3, when(events[events.length - 1]) - 0.3);
    thread.hold(party - 0.2);
    thread.key(party, line(x, 0, x, head), 0);
    thread.hold(end);
  } else {
    thread.key(at, line(0, tlY, w, tlY));
    thread.key(start + 0.1, line(0, tlY, head, tlY));
    thread.hold(end - 0.3);
    thread.key(end, line(0, tlY, w, tlY));
  }

  return end + 0.1;
}
