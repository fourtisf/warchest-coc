/** SFX tiny synth — ported verbatim from the prototype. */
import { G } from './state';

export type SfxName =
  | 'tap'
  | 'coin'
  | 'mana'
  | 'build'
  | 'done'
  | 'shoot'
  | 'mortar'
  | 'arrowS'
  | 'boom'
  | 'deploy'
  | 'star'
  | 'win'
  | 'lose'
  | 'err';

export const SFX = {
  ctx: null as AudioContext | null,

  init(): void {
    if (!this.ctx) {
      try {
        const Ctor =
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctor) this.ctx = new Ctor();
      } catch {
        /* no audio available */
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  },

  tone(f: number, d: number, type: OscillatorType = 'square', v = 0.06, slide = 0): void {
    if (!G.sfx || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + d);
  },

  noise(d: number, v = 0.09, lp = 900): void {
    if (!G.sfx || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime,
      n = ctx.sampleRate * d,
      buf = ctx.createBuffer(1, n, ctx.sampleRate),
      ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(),
      g = ctx.createGain(),
      f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lp;
    s.buffer = buf;
    g.gain.value = v;
    s.connect(f);
    f.connect(g);
    g.connect(ctx.destination);
    s.start(t);
  },

  play(n: SfxName): void {
    if (!this.ctx) return;
    if (n === 'tap') this.tone(660, 0.05, 'square', 0.035);
    else if (n === 'coin') {
      this.tone(880, 0.07, 'square', 0.05);
      setTimeout(() => this.tone(1320, 0.09, 'square', 0.05), 60);
    } else if (n === 'mana') {
      this.tone(520, 0.09, 'sine', 0.06, 300);
    } else if (n === 'build') {
      this.noise(0.12, 0.08, 500);
      this.tone(140, 0.12, 'square', 0.05);
    } else if (n === 'done') {
      this.tone(700, 0.09, 'triangle', 0.06);
      setTimeout(() => this.tone(1050, 0.12, 'triangle', 0.06), 90);
    } else if (n === 'shoot') {
      this.noise(0.05, 0.045, 2200);
    } else if (n === 'mortar') {
      this.tone(90, 0.18, 'square', 0.08, 40);
      this.noise(0.1, 0.05, 400);
    } else if (n === 'arrowS') {
      this.noise(0.04, 0.03, 4000);
    } else if (n === 'boom') {
      this.noise(0.3, 0.12, 600);
      this.tone(70, 0.25, 'square', 0.07, -30);
    } else if (n === 'deploy') {
      this.tone(300, 0.06, 'square', 0.05, 120);
    } else if (n === 'star') {
      this.tone(920, 0.12, 'triangle', 0.07);
      setTimeout(() => this.tone(1380, 0.16, 'triangle', 0.07), 100);
    } else if (n === 'win') {
      [523, 659, 784, 1046].forEach((f, i) =>
        setTimeout(() => this.tone(f, 0.18, 'triangle', 0.07), i * 120),
      );
    } else if (n === 'lose') {
      [400, 340, 280].forEach((f, i) =>
        setTimeout(() => this.tone(f, 0.2, 'square', 0.05), i * 140),
      );
    } else if (n === 'err') {
      this.tone(180, 0.12, 'square', 0.06, -60);
    }
  },
};
