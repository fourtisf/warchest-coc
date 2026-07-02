/** GROUND (full world, offscreen) — ported verbatim from the prototype. */
import { TW, TH, MAP, PAD, clamp, mulberry32 } from '@warchest/game-core';

export interface Ground {
  cv: HTMLCanvasElement;
  ox: number;
  oy: number;
}

export function bakeTree(
  g: CanvasRenderingContext2D,
  px: number,
  py: number,
  sc: number,
  v: number,
): void {
  g.fillStyle = 'rgba(15,35,12,.30)';
  g.beginPath();
  g.ellipse(px, py + 2, 13 * sc, 5 * sc, 0, 0, 7);
  g.fill();
  g.fillStyle = '#6b4a2c';
  g.fillRect(px - 2.4 * sc, py - 13 * sc, 4.8 * sc, 14 * sc);
  g.fillStyle = 'rgba(0,0,0,.18)';
  g.fillRect(px + 0.4 * sc, py - 13 * sc, 2 * sc, 14 * sc);
  const pal = v < 0.5 ? ['#2e6a33', '#3f8a41', '#5aa851'] : ['#2a5f3d', '#3a7d4a', '#54a05e'];
  g.fillStyle = pal[0]!;
  g.beginPath();
  g.arc(px, py - 20 * sc, 12.5 * sc, 0, 7);
  g.arc(px - 8 * sc, py - 15 * sc, 8.5 * sc, 0, 7);
  g.arc(px + 8 * sc, py - 15 * sc, 8.5 * sc, 0, 7);
  g.fill();
  g.strokeStyle = 'rgba(18,42,16,.55)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(px, py - 20 * sc, 12.5 * sc, 0, 7);
  g.stroke();
  g.fillStyle = pal[1]!;
  g.beginPath();
  g.arc(px - 4 * sc, py - 22 * sc, 8 * sc, 0, 7);
  g.arc(px + 6 * sc, py - 20 * sc, 7 * sc, 0, 7);
  g.fill();
  g.fillStyle = pal[2]!;
  g.beginPath();
  g.arc(px + 1 * sc, py - 25 * sc, 5.5 * sc, 0, 7);
  g.fill();
}

export function buildGround(): Ground {
  const NT = MAP + 2 * PAD,
    w = NT * TW + 140,
    h = NT * TH + 260,
    ox = w / 2,
    oy = PAD * TH + 150;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d')!,
    P = (x: number, y: number) => ({ x: ox + ((x - y) * TW) / 2, y: oy + ((x + y) * TH) / 2 });
  const rng = mulberry32(90210);
  g.fillStyle = '#2b4726';
  g.fillRect(0, 0, w, h);
  const X0 = -ox,
    X1 = w - ox,
    Y0 = -oy,
    Y1 = h - oy;
  const gxA = Math.floor((X0 / 32 + Y0 / 16) / 2) - 1,
    gxB = Math.ceil((X1 / 32 + Y1 / 16) / 2) + 1;
  const gyA = Math.floor((Y0 / 16 - X1 / 32) / 2) - 1,
    gyB = Math.ceil((Y1 / 16 - X0 / 32) / 2) + 1;
  for (let y = gyA; y <= gyB; y++)
    for (let x = gxA; x <= gxB; x++) {
      const p = P(x, y);
      if (p.x < -40 || p.x > w + 40 || p.y < -60 || p.y > h + 20) continue;
      const inb = x >= 0 && y >= 0 && x < MAP && y < MAP;
      const r = rng();
      let col: string;
      if (inb) {
        const stripe = ((x + y) >> 1) % 2 === 0;
        col = stripe ? '#7bb558' : '#74ad52';
        if (r < 0.05) col = '#83bd60';
        else if (r > 0.95) col = '#6ea24c';
      } else {
        const dd = Math.max(-x, -y, x - MAP + 1, y - MAP + 1);
        const k = clamp(1 - dd * 0.04, 0.62, 1);
        const bb = (x + y) % 2 ? [97, 150, 74] : [92, 143, 70];
        col =
          'rgb(' +
          Math.round(bb[0]! * k) +
          ',' +
          Math.round(bb[1]! * k) +
          ',' +
          Math.round(bb[2]! * k) +
          ')';
      }
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(p.x + TW / 2, p.y + TH / 2);
      g.lineTo(p.x, p.y + TH);
      g.lineTo(p.x - TW / 2, p.y + TH / 2);
      g.closePath();
      g.fill();
    }
  g.strokeStyle = 'rgba(0,0,0,.045)';
  g.lineWidth = 1;
  for (let i = 0; i <= MAP; i++) {
    let a = P(i, 0),
      b = P(i, MAP);
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.stroke();
    a = P(0, i);
    b = P(MAP, i);
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const p = P(3 + rng() * (MAP - 6), 3 + rng() * (MAP - 6));
    g.fillStyle = 'rgba(190,160,105,.15)';
    g.beginPath();
    g.ellipse(p.x, p.y, 26 + rng() * 34, 13 + rng() * 17, 0, 0, 7);
    g.fill();
  }
  for (let i = 0; i < 70; i++) {
    const p = P(rng() * MAP, rng() * MAP);
    g.fillStyle = rng() < 0.5 ? 'rgba(140,150,140,.5)' : 'rgba(120,130,118,.5)';
    g.beginPath();
    g.ellipse(p.x, p.y, 2.2, 1.3, 0, 0, 7);
    g.fill();
  }
  for (let i = 0; i < 90; i++) {
    const p = P(rng() * MAP, rng() * MAP);
    const cly = ['#fff6d8', '#ffd24a', '#ff9fb8', '#c9a6ff'][(rng() * 4) | 0]!;
    g.strokeStyle = 'rgba(40,80,30,.6)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(p.x, p.y);
    g.lineTo(p.x, p.y - 3.5);
    g.stroke();
    g.fillStyle = cly;
    g.beginPath();
    g.arc(p.x, p.y - 4.4, 1.7, 0, 7);
    g.fill();
  }
  for (let i = 0; i < 260; i++) {
    const p = P(rng() * MAP, rng() * MAP);
    g.strokeStyle = 'rgba(35,75,25,.4)';
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(p.x, p.y);
    g.lineTo(p.x - 2, p.y - 4);
    g.moveTo(p.x + 2, p.y);
    g.lineTo(p.x + 3, p.y - 4);
    g.stroke();
  }
  const c1 = P(0, 0),
    c2 = P(MAP, 0),
    c3 = P(MAP, MAP),
    c4 = P(0, MAP);
  g.strokeStyle = 'rgba(244,236,210,.85)';
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(c1.x, c1.y);
  g.lineTo(c2.x, c2.y);
  g.lineTo(c3.x, c3.y);
  g.lineTo(c4.x, c4.y);
  g.closePath();
  g.stroke();
  g.fillStyle = '#efe6c6';
  for (let i = 0; i <= MAP; i += 5) {
    for (const p of [P(i, 0), P(i, MAP), P(0, i), P(MAP, i)]) g.fillRect(p.x - 1.5, p.y - 7, 3, 8);
  }
  const deco: { x: number; y: number; s: number; v: number; k: 'r' | 't' }[] = [];
  for (let y = gyA; y <= gyB; y++)
    for (let x = gxA; x <= gxB; x++) {
      const inb = x >= 0 && y >= 0 && x < MAP && y < MAP;
      if (inb) continue;
      const dd = Math.max(-x, -y, x - MAP + 1, y - MAP + 1);
      if (dd < 2) continue;
      const q = P(x, y);
      if (q.x < -30 || q.x > w + 30 || q.y < -40 || q.y > h + 50) continue;
      const pr = dd < 3 ? 0.22 : dd < 5 ? 0.62 : dd < 8 ? 0.86 : 0.94;
      if (rng() < pr)
        deco.push({
          x: x + 0.15 + rng() * 0.7,
          y: y + 0.15 + rng() * 0.7,
          s: 0.75 + rng() * 0.8,
          v: rng(),
          k: rng() < 0.05 ? 'r' : 't',
        });
    }
  deco.sort((a, b) => a.x + a.y - (b.x + b.y));
  for (const d of deco) {
    const p = P(d.x, d.y);
    if (d.k === 'r') {
      g.fillStyle = 'rgba(15,35,12,.30)';
      g.beginPath();
      g.ellipse(p.x, p.y + 2, 10, 4, 0, 0, 7);
      g.fill();
      g.fillStyle = '#7e8a80';
      g.beginPath();
      g.moveTo(p.x - 9, p.y);
      g.lineTo(p.x - 4, p.y - 9);
      g.lineTo(p.x + 4, p.y - 10);
      g.lineTo(p.x + 9, p.y - 2);
      g.lineTo(p.x + 5, p.y + 3);
      g.lineTo(p.x - 6, p.y + 3);
      g.closePath();
      g.fill();
      g.fillStyle = '#97a399';
      g.beginPath();
      g.moveTo(p.x - 4, p.y - 9);
      g.lineTo(p.x + 4, p.y - 10);
      g.lineTo(p.x + 5, p.y - 4);
      g.lineTo(p.x - 2, p.y - 4);
      g.closePath();
      g.fill();
    } else bakeTree(g, p.x, p.y, d.s, d.v);
  }
  return { cv, ox, oy };
}
