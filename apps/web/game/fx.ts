/** FX particle system — ported verbatim from the prototype. Presentational only (Math.random ok). */
import { clamp } from '@warchest/game-core';
import { I } from './art/helpers';
import { SFX } from './sfx';

export interface Part {
  k: 'sm' | 'ring' | 'sp' | 'coin';
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  l: number;
  L: number;
  r?: number;
}

export interface Float {
  x: number;
  y: number;
  txt: string;
  col: string;
  l: number;
  L: number;
}

export const FX = {
  parts: [] as Part[],
  floats: [] as Float[],

  boom(x: number, y: number, big = 1): void {
    for (let i = 0; i < 10 * big; i++) {
      const a = Math.random() * 7,
        s = 1.2 + Math.random() * 2.4;
      this.parts.push({
        k: 'sm',
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s * 0.5 - 1.4,
        l: 0.7 + Math.random() * 0.5,
        L: 1,
        r: 4 + Math.random() * 5 * big,
      });
    }
    this.parts.push({ k: 'ring', x, y, l: 0.35, L: 0.35, r: 6 * big });
    SFX.play('boom');
  },

  hit(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * 7;
      this.parts.push({
        k: 'sp',
        x,
        y,
        vx: Math.cos(a) * 2.4,
        vy: Math.sin(a) * 1.2 - 1.8,
        l: 0.35,
        L: 0.35,
      });
    }
  },

  coins(x: number, y: number, n = 6): void {
    for (let i = 0; i < n; i++) {
      const a = -0.6 - Math.random() * 2;
      this.parts.push({
        k: 'coin',
        x,
        y,
        vx: Math.cos(a) * (1 + Math.random() * 1.6),
        vy: -2.6 - Math.random() * 1.6,
        l: 0.85,
        L: 0.85,
      });
    }
  },

  dust(x: number, y: number): void {
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * 7;
      this.parts.push({
        k: 'sm',
        x,
        y,
        vx: Math.cos(a) * 1.6,
        vy: Math.sin(a) * 0.7 - 0.4,
        l: 0.5,
        L: 0.5,
        r: 3 + Math.random() * 3,
      });
    }
  },

  float(x: number, y: number, txt: string, col = '#ffd977'): void {
    this.floats.push({ x, y, txt, col, l: 1.15, L: 1.15 });
  },

  update(dt: number): void {
    for (const p of this.parts) {
      p.l -= dt;
      p.x += (p.vx ?? 0) * dt * 2;
      p.y += (p.vy ?? 0) * dt * 2;
      if (p.k === 'coin') p.vy = p.vy! + dt * 9;
      if (p.k === 'sp') p.vy = p.vy! + dt * 6;
    }
    this.parts = this.parts.filter((p) => p.l > 0);
    for (const f of this.floats) {
      f.l -= dt;
      f.y -= dt * 0.7;
    }
    this.floats = this.floats.filter((f) => f.l > 0);
  },

  draw(c: CanvasRenderingContext2D): void {
    for (const p of this.parts) {
      const a = clamp(p.l / p.L, 0, 1);
      const q = I(p.x, p.y);
      if (p.k === 'sm') {
        c.fillStyle = `rgba(120,110,95,${a * 0.55})`;
        c.beginPath();
        c.arc(q.x, q.y - 8, p.r! * (1.6 - a * 0.6), 0, 7);
        c.fill();
      } else if (p.k === 'ring') {
        // NOTE: the prototype's radius formula (p.r+(1-a/p.L)*26) goes negative
        // for a young ring — ctx.ellipse throws and kills the frame. Use the
        // intended expanding-ring shape: r grows from p.r as the ring ages.
        const rr = Math.max(0.1, p.r! + (1 - a) * 26);
        c.strokeStyle = `rgba(255,190,90,${a * 2 * 0.9})`;
        c.lineWidth = 3;
        c.beginPath();
        c.ellipse(q.x, q.y - 4, rr, rr * 0.5, 0, 0, 7);
        c.stroke();
      } else if (p.k === 'sp') {
        c.fillStyle = `rgba(255,210,110,${a * 2})`;
        c.fillRect(q.x - 1.5, q.y - 9, 3, 3);
      } else if (p.k === 'coin') {
        c.fillStyle = `rgba(242,180,48,${Math.min(1, a * 2)})`;
        c.beginPath();
        c.arc(q.x, q.y - 6, 3.6, 0, 7);
        c.fill();
        c.strokeStyle = `rgba(160,108,12,${Math.min(1, a * 2)})`;
        c.lineWidth = 1;
        c.stroke();
      }
    }
    c.textAlign = 'center';
    c.font = '700 13px Rubik,sans-serif';
    for (const f of this.floats) {
      const a = clamp(f.l / f.L, 0, 1);
      const q = I(f.x, f.y);
      c.save();
      c.globalAlpha = Math.min(1, a * 1.6);
      c.lineWidth = 3;
      c.strokeStyle = 'rgba(0,0,0,.6)';
      c.strokeText(f.txt, q.x, q.y - 30 - (1 - a) * 26);
      c.fillStyle = f.col;
      c.fillText(f.txt, q.x, q.y - 30 - (1 - a) * 26);
      c.restore();
    }
  },
};
