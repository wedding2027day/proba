import { useCallback, useEffect, useRef, useState } from 'react';
import { wedding } from '../../config/wedding';
import './MusicControl.css';

/** Оригинальный эмбиент: медленные аккорды на синусах. Создаётся в браузере, авторских прав нет. */
class AmbientSynth {
  private ctx: AudioContext;
  private master: GainNode;
  private timer = 0;
  private voices: OscillatorNode[] = [];
  private step = 0;
  private static CHORDS = [
    [110, 164.81, 220, 277.18, 329.63],
    [92.5, 138.59, 185, 220, 277.18],
    [73.42, 146.83, 185, 220, 293.66],
    [82.41, 123.47, 207.65, 246.94, 329.63],
  ];

  constructor(volume: number) {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const delay = this.ctx.createDelay(2);
    delay.delayTime.value = 0.62;
    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.42;
    filter.connect(this.master);
    filter.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.filter = filter;
    this.target = volume * 0.5;
  }
  private filter: BiquadFilterNode;
  private target: number;

  private playChord() {
    const t = this.ctx.currentTime;
    const notes = AmbientSynth.CHORDS[this.step++ % AmbientSynth.CHORDS.length];
    notes.forEach((f, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = i < 2 ? 'sine' : 'triangle';
      o.frequency.value = f;
      o.detune.value = (i % 2 ? 1 : -1) * 4;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.11 / (i * 0.5 + 1), t + 3.5);
      g.gain.linearRampToValueAtTime(0, t + 10);
      o.connect(g);
      g.connect(this.filter);
      o.start(t);
      o.stop(t + 10.2);
      this.voices.push(o);
      o.onended = () => { this.voices = this.voices.filter((v) => v !== o); };
    });
  }

  async start() {
    await this.ctx.resume();
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(this.target, this.ctx.currentTime, 0.8);
    if (!this.timer) {
      this.playChord();
      this.timer = window.setInterval(() => this.playChord(), 7000);
    }
  }

  stop() {
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
    window.clearInterval(this.timer);
    this.timer = 0;
    window.setTimeout(() => { if (!this.timer) void this.ctx.suspend(); }, 1200);
  }

  dispose() {
    window.clearInterval(this.timer);
    this.timer = 0;
    void this.ctx.close();
  }
}

/** Музыка запускается только после нажатия. Трек из конфига важнее синтезатора. */
export function MusicControl() {
  const { music } = wedding;
  const [on, setOn] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const synth = useRef<AmbientSynth | null>(null);

  const stopAll = useCallback(() => {
    audio.current?.pause();
    synth.current?.stop();
  }, []);

  useEffect(() => () => {
    audio.current?.pause();
    audio.current = null;
    synth.current?.dispose();
    synth.current = null;
  }, []);

  // Свёрнутая вкладка не должна играть.
  const onRef = useRef(on);
  onRef.current = on;
  useEffect(() => {
    const vis = () => {
      if (document.hidden) stopAll();
      else if (onRef.current) void (audio.current ? audio.current.play() : synth.current?.start());
    };
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, [stopAll]);

  if (!music.enabled) return null;

  const toggle = async () => {
    if (on) {
      stopAll();
      setOn(false);
      return;
    }
    try {
      if (music.src) {
        if (!audio.current) {
          audio.current = new Audio(music.src);
          audio.current.loop = true;
          audio.current.volume = music.volume;
        }
        await audio.current.play();
      } else {
        synth.current ??= new AmbientSynth(music.volume);
        await synth.current.start();
      }
      setOn(true);
    } catch (e) {
      console.warn('Не удалось запустить музыку', e);
      setOn(false);
    }
  };

  return (
    <button type="button" className={`music ${on ? 'is-on' : ''}`} onClick={toggle} aria-pressed={on}
      aria-label={on ? 'Выключить музыку' : 'Включить музыку'}>
      <span className="music__bars" aria-hidden="true"><i /><i /><i /><i /></span>
    </button>
  );
}
