/**
 * Procedural background music — a tiny WebAudio step-sequencer, zero assets
 * (same philosophy as the art: everything is synthesized). Two scenes:
 *  - village: ~92bpm A-minor folk loop — plucked melody, soft bass, arp
 *  - battle:  ~144bpm war-drums ostinato — kick/snare, driving bass, stabs
 * Shares the AudioContext with SFX; starts after the first user gesture.
 */
import { G } from './state';
import { SFX } from './sfx';

export type MusicScene = 'village' | 'battle';

const N = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
const R = 0; // rest

/* ------------------------- village theme (64 eighths) ------------------------- */
// A-minor pentatonic melody over Am F C G · Am F G Am
const V_MEL: readonly number[] = [
  76, R, 72, 74, 76, R, 69, R,   74, R, 72, 69, R, 67, R, R,
  72, 74, 76, 79, 76, 74, 72, R, 69, R, R, R, 64, R, 69, R,
  76, 79, 81, R, 79, 76, 74, R,  72, R, 74, 76, 74, 72, 69, R,
  67, 69, 72, 74, 76, R, 74, 72, 69, R, R, R, 69, R, R, R,
];
const V_ROOT: readonly number[] = [45, 41, 48, 43, 45, 41, 43, 45]; // Am F C G Am F G Am
const V_STEP = 60 / 92 / 2; // eighth note @ 92bpm

/* ------------------------- battle theme (32 eighths) ------------------------- */
const B_BASS: readonly number[] = [
  38, 38, 38, 38, 38, 38, 41, 41, 38, 38, 38, 38, 36, 36, 43, 43,
  38, 38, 38, 38, 38, 38, 41, 41, 45, 45, 43, 43, 41, 41, 36, 36,
];
const B_MEL: readonly number[] = [
  R, R, 62, R, 65, R, 62, R, R, R, 62, 65, 69, R, 65, 62,
  R, R, 62, R, 65, R, 69, R, 70, R, 69, 65, 62, R, R, R,
];
const B_STEP = 60 / 144 / 2; // eighth note @ 144bpm

export const MUSIC = {
  gain: null as GainNode | null,
  timer: null as number | null,
  scene: 'village' as MusicScene,
  step: 0,
  nextT: 0,

  /** Call once after the first user gesture (needs a resumed AudioContext). */
  start(): void {
    SFX.init();
    const ctx = SFX.ctx;
    if (!ctx || this.timer !== null) return;
    if (!this.gain) {
      this.gain = ctx.createGain();
      this.gain.gain.value = 0.55;
      this.gain.connect(ctx.destination);
    }
    this.step = 0;
    this.nextT = ctx.currentTime + 0.1;
    // lookahead scheduler: queue everything due in the next 300ms
    this.timer = window.setInterval(() => {
      const c = SFX.ctx;
      if (!c) return;
      while (this.nextT < c.currentTime + 0.3) {
        if (G.music) {
          if (this.scene === 'village') this.villageStep(this.step, this.nextT);
          else this.battleStep(this.step, this.nextT);
        }
        this.nextT += this.scene === 'village' ? V_STEP : B_STEP;
        this.step++;
      }
    }, 90);
  },

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  setScene(s: MusicScene): void {
    if (this.scene === s) return;
    this.scene = s;
    this.step = 0;
    if (SFX.ctx) this.nextT = SFX.ctx.currentTime + 0.12;
  },

  /* ------------------------------ voices ------------------------------ */
  note(
    t: number, freq: number, dur: number, type: OscillatorType, v: number, lp = 2400,
  ): void {
    const ctx = SFX.ctx;
    if (!ctx || !this.gain) return;
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    f.type = 'lowpass';
    f.frequency.value = lp;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f);
    f.connect(g);
    g.connect(this.gain);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  kick(t: number): void {
    const ctx = SFX.ctx;
    if (!ctx || !this.gain) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.connect(g);
    g.connect(this.gain);
    o.start(t);
    o.stop(t + 0.15);
  },

  hit(t: number, dur: number, v: number, lp: number): void {
    const ctx = SFX.ctx;
    if (!ctx || !this.gain) return;
    const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = lp;
    s.buffer = buf;
    g.gain.value = v;
    s.connect(f);
    f.connect(g);
    g.connect(this.gain);
    s.start(t);
  },

  /* ------------------------------ scenes ------------------------------ */
  villageStep(step: number, t: number): void {
    const i = step % V_MEL.length;
    const bar = Math.floor(i / 8);
    const root = V_ROOT[bar]!;
    const e = i % 8;
    // plucked melody
    const m = V_MEL[i]!;
    if (m) this.note(t, N(m), 0.3, 'square', 0.026, 1900);
    // soft bass on the strong beats
    if (e === 0) this.note(t, N(root), 0.55, 'triangle', 0.05, 500);
    if (e === 4) this.note(t, N(root + 7), 0.4, 'triangle', 0.038, 500);
    // gentle harp arpeggio between phrases
    if (e === 2) this.note(t, N(root + 12), 0.22, 'triangle', 0.02, 2200);
    if (e === 6) this.note(t, N(root + 19), 0.22, 'triangle', 0.018, 2200);
    // brushed hat, sparse
    if (e === 4 && bar % 2 === 1) this.hit(t, 0.05, 0.015, 6000);
  },

  battleStep(step: number, t: number): void {
    const i = step % B_BASS.length;
    // war drums
    if (i % 4 === 0) this.kick(t);
    if (i % 8 === 4) this.hit(t, 0.11, 0.05, 2200);
    if (i % 2 === 1) this.hit(t, 0.035, 0.012, 7000);
    // driving bass
    const b = B_BASS[i]!;
    this.note(t, N(b), 0.16, 'square', 0.028, 700);
    // horn stabs
    const m = B_MEL[i]!;
    if (m) this.note(t, N(m), 0.2, 'sawtooth', 0.02, 1500);
  },
};
