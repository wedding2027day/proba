import { gsap, ScrollTrigger } from './setup';
import { Thread } from './thread';
import { buildStory } from './story';
import { buildDate } from './date';
import { buildTimeline } from './timeline';
import { buildLocation } from './location';
import { buildDress } from './dress';

export type Env = {
  /** ширина вьюпорта */
  w: number;
  /** «малая» высота: всё содержимое укладывается в неё, даже при видимой адресной строке */
  h: number;
  /** высота сцены (100lvh) */
  H: number;
  mobile: boolean;
};

export type ChapterId = 'invitation' | 'story' | 'date' | 'timeline' | 'location' | 'dress' | 'rsvp';

export const CHAPTERS: { id: ChapterId; title: string }[] = [
  { id: 'invitation', title: 'Приглашение' },
  { id: 'story', title: 'Наша история' },
  { id: 'date', title: 'Дата' },
  { id: 'timeline', title: 'Расписание' },
  { id: 'location', title: 'Место' },
  { id: 'dress', title: 'Дресс-код' },
  { id: 'rsvp', title: 'Ваш ответ' },
];

/** Сколько высот экрана прокрутки занимает одна единица времени фильма. Меньше — быстрее. */
const PACE_DESKTOP = 0.66;
const PACE_MOBILE = 0.62;

type Listener = (chapter: ChapterId) => void;

/** Единый таймлайн: одна единица времени = прокрутка на одну высоту экрана. */
class Film {
  namesBase = 48;
  private ctx: gsap.Context | null = null;
  private st: ScrollTrigger | null = null;
  private labels: Record<string, number> = {};
  private listeners = new Set<Listener>();
  private current: ChapterId = 'story';
  private root: HTMLElement | null = null;
  private lastW = 0;
  private lastH = 0;
  private onResize = () => this.scheduleRebuild();
  private fontsPending = false;
  private rebuildTimer = 0;

  mount(root: HTMLElement) {
    this.root = root;
    this.fontsPending = document.fonts?.status !== 'loaded';
    this.build();
    // Если предзагрузка вышла по таймауту, шрифт догрузится позже: все замеры текста надо повторить.
    if (this.fontsPending) {
      void document.fonts.ready.then(() => {
        if (this.root !== root) return;
        this.fontsPending = false;
        this.scheduleRebuild(true);
      });
    }
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
  }

  unmount() {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    window.clearTimeout(this.rebuildTimer);
    this.ctx?.revert();
    this.ctx = null;
    this.st = null;
    this.root = null;
  }

  private measure(): Env {
    const probe = (cls: string) => this.root!.querySelector<HTMLElement>(cls)!.offsetHeight;
    const w = window.innerWidth;
    const h = probe('.probe--s') || window.innerHeight;
    const H = probe('.probe--l') || window.innerHeight;
    return { w, h, H, mobile: w < 820 || w / h < 0.8 };
  }

  private scheduleRebuild(force = false) {
    window.clearTimeout(this.rebuildTimer);
    this.rebuildTimer = window.setTimeout(() => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const touch = window.matchMedia('(pointer: coarse)').matches;
      // На телефоне высота меняется от адресной строки — это не повод перестраивать сцену.
      if (!force && w === this.lastW && (touch ? Math.abs(h - this.lastH) < 160 : h === this.lastH)) return;
      const progress = this.st?.progress ?? 0;
      const y = window.scrollY;
      const inFilm = this.st ? y <= this.st.end : true;
      const past = this.st ? y - this.st.end : 0;
      this.ctx?.revert();
      this.build();
      if (this.st) {
        const target = inFilm ? this.st.start + (this.st.end - this.st.start) * progress : this.st.end + past;
        window.scrollTo(0, target);
        ScrollTrigger.update();
      }
    }, 180);
  }

  private build() {
    const root = this.root!;
    const env = this.measure();
    this.lastW = window.innerWidth;
    this.lastH = window.innerHeight;
    const film = root.querySelector<HTMLElement>('.film')!;
    const svg = root.querySelector<SVGSVGElement>('.thread')!;
    const polyline = svg.querySelector('polyline')!;
    svg.setAttribute('viewBox', `0 0 ${env.w} ${env.H}`);
    const thread = new Thread(polyline);

    this.ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
      let t = 0;
      tl.addLabel('story', 0);
      const story = buildStory(tl, t, env, thread, root);
      this.namesBase = story.namesBase;
      t = story.end;

      tl.addLabel('date', t);
      const date = buildDate(tl, t, env, thread, root);
      tl.addLabel('timeline', date.timelineAt);
      t = buildTimeline(tl, date.timelineAt, env, thread, root, date.tlY);

      tl.addLabel('location', t);
      const loc = buildLocation(tl, t, env, thread, root);
      tl.addLabel('dress', loc.dressAt);
      const dress = buildDress(tl, loc.dressAt, env, thread, root, loc.card);
      tl.addLabel('rsvp', dress.end);

      const duration = tl.duration();
      const scrollLen = duration * env.h * (env.mobile ? PACE_MOBILE : PACE_DESKTOP);
      film.style.height = `${scrollLen + env.H}px`;
      this.labels = tl.labels;

      thread.render(0);

      // Камера слегка следует за курсором: люди смещаются относительно фона.
      // Включается только в собранном кадре, пока окна карточек ещё совпадают по краям.
      let applyCamera = () => {};
      const people = root.querySelector<HTMLElement>('.story__people');
      const copy = root.querySelector<HTMLElement>('.loc__name');
      let removePointer = () => {};
      if (people && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const px = gsap.quickTo(people, 'x', { duration: 0.9, ease: 'power3.out' });
        const py = gsap.quickTo(people, 'y', { duration: 0.9, ease: 'power3.out' });
        const nameX = copy ? gsap.quickTo(copy, 'x', { duration: 1.1, ease: 'power3.out' }) : null;
        let nx = 0;
        let ny = 0;
        let lastAmp = -1;
        applyCamera = () => {
          const amp = gsap.utils.clamp(0, 1, (tl.time() - 2.6) / 0.4);
          if (amp !== lastAmp) gsap.set(people, { scale: 1 + 0.018 * amp });
          lastAmp = amp;
          px(nx * 14 * amp);
          py(ny * 8 * amp);
          nameX?.(-nx * 10);
        };
        const move = (e: PointerEvent) => {
          nx = e.clientX / window.innerWidth - 0.5;
          ny = e.clientY / window.innerHeight - 0.5;
          applyCamera();
        };
        window.addEventListener('pointermove', move, { passive: true });
        removePointer = () => window.removeEventListener('pointermove', move);
      }
      tl.eventCallback('onUpdate', () => {
        thread.render(tl.time());
        if (tl.time() < story.end + 2) applyCamera();
      });

      const coarse = window.matchMedia('(pointer: coarse)').matches;
      const labelsSorted = Object.entries(tl.labels).sort((a, b) => a[1] - b[1]);
      this.st = ScrollTrigger.create({
        animation: tl,
        trigger: film,
        start: 'top top',
        end: () => `+=${scrollLen}`,
        // Lenis уже сглаживает колесо; на таче небольшая инерция прячет дрожание пальца.
        scrub: coarse ? 0.35 : true,
        onUpdate: (self) => {
          const time = self.progress * duration;
          let id: ChapterId = 'story';
          for (const [name, at] of labelsSorted) if (time >= at - 0.05) id = name as ChapterId;
          this.setChapter(id);
        },
      });
      return () => removePointer();
    }, root);
    ScrollTrigger.refresh();
  }

  private setChapter(id: ChapterId) {
    if (id === this.current) return;
    this.current = id;
    this.listeners.forEach((fn) => fn(id));
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }

  /** Возвращает позицию прокрутки главы. У каждой главы своя «опорная» точка: где её содержимое уже видно. */
  yOf(id: ChapterId): number {
    if (!this.st) {
      // Статичный режим: сцены идут обычным потоком.
      const el = document.getElementById(`chapter-${id}`);
      return el ? el.getBoundingClientRect().top + window.scrollY : 0;
    }
    const nudge: Partial<Record<ChapterId, number>> = { date: 1.3, timeline: 1.5, location: 3.2, dress: 2 };
    const at = (this.labels[id] ?? 0) + (nudge[id] ?? 0);
    const tl = this.st.animation!;
    return this.st.start + (this.st.end - this.st.start) * Math.min(1, at / tl.duration());
  }
}

export const film = new Film();
