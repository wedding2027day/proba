import { gsap } from './setup';
import { line, wave, type Thread } from './thread';
import type { Env } from './film';

/** Сцена 02, главный момент: две карточки на краях сходятся в один кадр, огромные имена уходят за людей. */
export function buildStory(tl: gsap.core.Timeline, at: number, env: Env, thread: Thread, root: HTMLElement) {
  const { w, h, H, mobile } = env;
  const scene = root.querySelector<HTMLElement>('.story')!;
  const q = gsap.utils.selector(scene);
  const [nameA] = q('.story__name--a') as HTMLElement[];
  const [nameB] = q('.story__name--b') as HTMLElement[];
  const [joiner] = q('.story__joiner') as HTMLElement[];

  // Размер имён считаем от реальной ширины — длинные имена тоже поместятся.
  gsap.set([nameA, nameB], { fontSize: 100 });
  const ratio = Math.max(nameA.offsetWidth, nameB.offsetWidth) / 100;
  const F = Math.min((0.93 * w) / ratio, 0.3 * h);
  const namesBase = Math.min((0.62 * w) / ratio, 58, 0.085 * h);
  const s0 = namesBase / F;
  gsap.set([nameA, nameB], { fontSize: F });
  gsap.set(joiner, { fontSize: namesBase * 0.72 });
  const gap = namesBase * 1.2;

  gsap.set(scene, { autoAlpha: 1 });
  // Имена отсчитываются от центра видимой области, а не от центра сцены высотой 100lvh.
  gsap.set(q('.story__names'), { y: (h - H) / 2 });

  const frames = {
    l: q('.story__frame--l'),
    r: q('.story__frame--r'),
  };
  const plateL = q('.story__frame--l.story__frame--plate img');
  const plateR = q('.story__frame--r.story__frame--plate img');
  const plates = [...plateL, ...plateR];
  const people = q('.story__frame--cut img');
  const chars = q('.story__char') as HTMLElement[];

  // Начальные окна-карточки. Компьютер: на краях экрана с лёгким наклоном.
  // Телефон: движение по вертикали, сверху невеста, снизу жених, имена между ними.
  // Окна на телефоне считаем от видимой области: сверху шапка, в центре имена, снизу панель Safari.
  const namesBand = gap + namesBase * 0.9 + 10;
  const windowAt = (top: number, bottom: number, centerPct: number, side: [number, number]) => {
    const size = Math.max(0, bottom - top);
    const inTop = (centerPct / 100) * H - size / 2;
    return {
      inset: [(inTop / H) * 100, side[0], 100 - ((inTop + size) / H) * 100, side[1]],
      x: 0,
      y: top - inTop,
    };
  };
  const start = mobile
    ? {
        l: { ...windowAt(58, h / 2 - namesBand, 28, [0, 10]), r: -1.6 },
        r: { ...windowAt(h / 2 + namesBand, h - 16, 32, [10, 0]), r: 1.6 },
      }
    : {
        l: { inset: [6, 0, 28, 46], x: -0.205 * w, y: 0, r: -2.6 },
        r: { inset: [20, 48, 14, 0], x: 0.205 * w, y: 0, r: 2.2 },
      };
  const clipOf = (i: number[]) => `inset(${i[0]}% ${i[1]}% ${i[2]}% ${i[3]}%)`;
  q('.story__shadow').forEach((el, i) => {
    const v = i === 0 ? start.l.inset : start.r.inset;
    gsap.set(el, { top: `${v[0]}%`, right: `${v[1]}%`, bottom: `${v[2]}%`, left: `${v[3]}%` });
  });

  // 1. Сближение. Рамки движутся быстрее подложки: подложка внутри рамки едет им навстречу.
  const openDur = 2.5;
  const closeIn = { x: 0, y: 0, rotation: 0, duration: openDur, ease: 'power1.inOut' };
  const isPhoto = (el: Element) => !el.classList.contains('story__frame--shadow');
  tl.fromTo(frames.l, { x: start.l.x, y: start.l.y, rotation: start.l.r }, { ...closeIn }, at + 0.05);
  tl.fromTo(frames.r, { x: start.r.x, y: start.r.y, rotation: start.r.r }, { ...closeIn, duration: openDur + 0.15 }, at);
  tl.fromTo(frames.l.filter(isPhoto), { clipPath: clipOf(start.l.inset) },
    { clipPath: 'inset(0% 0% 0% 0%)', duration: openDur, ease: 'power1.inOut' }, at + 0.05);
  tl.fromTo(frames.r.filter(isPhoto), { clipPath: clipOf(start.r.inset) },
    { clipPath: 'inset(0% 0% 0% 0%)', duration: openDur + 0.15, ease: 'power1.inOut' }, at);
  tl.to(q('.story__frame--shadow'), { opacity: 0, duration: 0.8, ease: 'sine.in' }, at + 0.3);
  tl.set(q('.story__frame--shadow'), { visibility: 'hidden' }, at + 1.1);
  // Окна открыты полностью: маски больше не нужны и только нагружают видеокарту.
  tl.set([...frames.l, ...frames.r].filter(isPhoto), { clipPath: 'none' }, at + openDur + 0.2);
  // Бумага и темнота полностью перекрыты кадром, рисовать их незачем.
  tl.set(q('.story__night'), { clipPath: 'none' }, at + 1.65);
  tl.set(q('.story__paper, .story__night'), { visibility: 'hidden' }, at + openDur + 0.2);

  // Масштаб равномерный и от точки у лиц, поэтому лица не искажаются и шов не расходится.
  const counter = mobile
    ? { l: { yPercent: 4 }, r: { yPercent: -12 } }
    : { l: { xPercent: 13 }, r: { xPercent: -13 } };
  const zero = mobile ? { yPercent: 0 } : { xPercent: 0 };
  tl.fromTo(plateL, { scale: 1.2, ...counter.l }, { scale: 1, ...zero, duration: 2.8, ease: 'none' }, at);
  tl.fromTo(plateR, { scale: 1.2, ...counter.r }, { scale: 1, ...zero, duration: 2.8, ease: 'none' }, at);
  if (people.length) tl.fromTo(people, { scale: 1.1 }, { scale: 1, duration: 2.8, ease: 'none' }, at);
  tl.fromTo(q('.story__dim'), { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'sine.inOut' }, at + 0.9);
  tl.fromTo(q('.story__floor'), { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'sine.inOut' }, at + 2.3);

  // Молочный → чёрный: темнота разливается от центра, из промежутка между карточками.
  tl.fromTo(q('.story__night'), { clipPath: mobile ? 'inset(50% 0% 50% 0%)' : 'inset(0% 50% 0% 50%)' },
    { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power2.inOut' }, at + 0.6);

  // 2. Имена растут за фигурами: пока карточки далеко, они видны целиком, затем люди их заслоняют.
  tl.set([nameA, nameB], { xPercent: -50, yPercent: -50 }, at);
  const midA = mobile ? -0.11 : -0.2;
  const midB = mobile ? 0.11 : 0.2;
  tl.fromTo(nameA, { scale: s0, x: 0, y: -gap },
    { scale: 1, y: midA * h, duration: 1.5, ease: 'power2.inOut' }, at + 0.2);
  tl.fromTo(nameA, { color: '#0B0B0B' }, { color: '#F4F0E9', duration: 0.3, ease: 'none', immediateRender: false }, at + 0.8);
  tl.fromTo(nameB, { scale: s0, x: 0, y: gap },
    { scale: 1, y: midB * h, duration: 1.6, ease: 'power2.inOut' }, at + 0.15);
  tl.fromTo(nameB, { color: '#0B0B0B' }, { color: '#F4F0E9', duration: 0.3, ease: 'none', immediateRender: false }, at + 0.8);
  tl.fromTo(joiner, { xPercent: -50, yPercent: -50, opacity: 1, scale: 1 },
    { opacity: 0, scale: 0.6, duration: 0.5, ease: 'power1.in' }, at + 0.2);
  // Волна по буквам: у каждой своя задержка, и типографика не выглядит как один растущий блок.
  chars.forEach((ch, i) => {
    const dir = i % 2 ? 1 : -1;
    tl.fromTo(ch, { yPercent: 0 }, {
      keyframes: [
        { yPercent: dir * 16, rotation: dir * 2.2, duration: 0.55, ease: 'sine.out' },
        { yPercent: 0, rotation: 0, duration: 0.65, ease: 'sine.inOut' },
      ],
    }, at + 0.35 + (i % 9) * 0.045);
  });
  // Имена расходятся: верхнее уходит над головами, нижнее остаётся за фигурами.
  // На телефоне верхнее имя не заходит под шапку, а нижнее останавливается выше подписи при любой высоте экрана.
  const signTop = (q('.story__sign')[0] as HTMLElement).offsetTop;
  const finalA = mobile ? Math.max(-0.405 * h, 60 + F * 0.45 - h / 2) : -0.355 * h;
  const finalB = mobile ? Math.min(0.235 * h, signTop - 10 - F * 0.45 - h / 2) : 0.27 * h;
  tl.to(nameA, { x: 0.035 * w, y: finalA, duration: 1.35, ease: 'power2.inOut' }, at + 1.75);
  tl.to(nameB, { x: -0.035 * w, y: finalB, duration: 1.35, ease: 'power2.inOut' }, at + 1.8);

  // 3. Единый кадр: подпись с обоими именами, потому что огромные теперь заслонены людьми.
  tl.fromTo(q('.story__sign'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, at + 2.55);
  tl.fromTo(q('.story__subtitle span'), { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: 'power3.out' }, at + 2.6);

  // 4. Виртуальная камера наезжает на поцелуй. Люди ближе к зрителю, поэтому растут быстрее фона.
  const hold = at + 2.8;
  const leave = at + 3.85;
  tl.to(plates, { scale: 1.02, duration: leave - hold + 0.3, ease: 'none' }, hold);
  if (people.length) tl.to(people, { scale: 1.055, duration: leave - hold + 0.3, ease: 'none' }, hold);
  tl.fromTo(q('.story__depth'), { scale: 1 }, { scale: mobile ? 1.05 : 1.07, duration: leave - hold + 0.3, ease: 'sine.in' }, hold);
  tl.to(q('.story__sign, .story__subtitle'), { opacity: 0, duration: 0.3, ease: 'sine.in' }, leave - 0.3);
  tl.to(q('.story__floor'), { opacity: 0.4, duration: 0.3 }, leave - 0.3);
  // Сцена остаётся под маской даты: следующий этап начинается прямо из этого кадра.
  const end = leave;

  // Нить: свисает к именам → связывает левую и правую части → останавливается над лицами → уходит вниз.
  const c = w / 2;
  const drop = line(c, 0, c, h / 2 - gap - namesBase * 0.8);
  if (mobile) {
    // На телефоне имена занимают почти всю ширину: нить гаснет, появляется между ними и не идёт через буквы.
    const between = wave(0, w, h * 0.5, Math.max(8, Math.min(h * 0.05, midB * h - F * 0.5)));
    thread.key(at, drop);
    thread.key(at + 0.2, drop, 0);
    // Появляется только после того, как «и» между именами растаяло.
    thread.key(at + 0.72, between, 0);
    thread.key(at + 1.1, between);
    thread.hold(at + 1.65);
    thread.key(at + 1.85, between, 0);
    thread.hold(leave);
  } else {
    thread.key(at, drop);
    thread.key(at + 1.2, wave(0, w, h * 0.5, h * 0.18));
    thread.key(at + 2.5, line(c, 0, c, h * 0.09));
    thread.hold(leave);
  }

  return { end, namesBase };
}
