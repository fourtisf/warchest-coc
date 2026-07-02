/** Shared canvas drawing primitives — ported verbatim from the prototype's ART helpers. */
import { clamp, iso, lerp, mulberry32, type Pt } from '@warchest/game-core';
import type { DrawableBuilding } from './drawable';

/** iso() alias used across all art code. */
export const I = iso;

export const lp = (a: Pt, b: Pt, t: number): Pt => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

export function poly(c: CanvasRenderingContext2D, pts: readonly Pt[], fill: string): void {
  c.fillStyle = fill;
  c.beginPath();
  c.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i]!.x, pts[i]!.y);
  c.closePath();
  c.fill();
}

export function edge(
  c: CanvasRenderingContext2D,
  pts: readonly Pt[],
  w = 1.6,
  col = 'rgba(52,38,24,.5)',
): void {
  c.strokeStyle = col;
  c.lineWidth = w;
  c.beginPath();
  c.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i]!.x, pts[i]!.y);
  c.closePath();
  c.stroke();
}

export interface PrismPts {
  a: Pt; b: Pt; e: Pt; f: Pt;
  A: Pt; B: Pt; E: Pt; F: Pt;
}

export function prism(
  c: CanvasRenderingContext2D,
  gx: number, gy: number, w: number, d: number, h: number,
  cT: string, cL: string, cR: string,
  lift = 0, ol = true,
): PrismPts {
  const a = I(gx, gy), b = I(gx + w, gy), e = I(gx + w, gy + d), f = I(gx, gy + d);
  a.y -= lift; b.y -= lift; e.y -= lift; f.y -= lift;
  const A = { x: a.x, y: a.y - h }, B = { x: b.x, y: b.y - h },
    E = { x: e.x, y: e.y - h }, F = { x: f.x, y: f.y - h };
  poly(c, [f, e, E, F], cL);
  poly(c, [e, b, B, E], cR);
  poly(c, [A, B, E, F], cT);
  c.strokeStyle = 'rgba(255,255,255,.30)';
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(F.x, F.y);
  c.lineTo(E.x, E.y);
  c.lineTo(B.x, B.y);
  c.stroke();
  if (ol) edge(c, [f, e, b, B, A, F]);
  return { a, b, e, f, A, B, E, F };
}

export function faceLines(
  c: CanvasRenderingContext2D,
  p1: Pt, p2: Pt, q1: Pt, q2: Pt,
  n: number, style: string, lw = 1,
): void {
  c.strokeStyle = style;
  c.lineWidth = lw;
  c.beginPath();
  for (let i = 1; i < n; i++) {
    const t = i / n;
    c.moveTo(lerp(p1.x, q1.x, t), lerp(p1.y, q1.y, t));
    c.lineTo(lerp(p2.x, q2.x, t), lerp(p2.y, q2.y, t));
  }
  c.stroke();
}

export function roof(
  c: CanvasRenderingContext2D,
  gx: number, gy: number, w: number, d: number,
  lift: number, h: number,
  cL: string, cR: string, ridge: string, ov = 0.16,
): Pt {
  const b = I(gx + w + ov, gy - ov), e = I(gx + w + ov, gy + d + ov), f = I(gx - ov, gy + d + ov);
  b.y -= lift; e.y -= lift; f.y -= lift;
  const m0 = I(gx + w / 2, gy + d / 2);
  const M = { x: m0.x, y: m0.y - lift - h };
  poly(c, [f, e, M], cL);
  poly(c, [e, b, M], cR);
  faceLines(c, f, e, M, M, 4, 'rgba(0,0,0,.14)', 1.2);
  faceLines(c, e, b, M, M, 4, 'rgba(0,0,0,.12)', 1.2);
  c.strokeStyle = ridge;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(f.x, f.y);
  c.lineTo(M.x, M.y);
  c.lineTo(b.x, b.y);
  c.stroke();
  c.strokeStyle = 'rgba(52,38,24,.55)';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(f.x, f.y);
  c.lineTo(e.x, e.y);
  c.lineTo(b.x, b.y);
  c.stroke();
  c.beginPath();
  c.moveTo(e.x, e.y);
  c.lineTo(M.x, M.y);
  c.stroke();
  return M;
}

export function roofCone(
  c: CanvasRenderingContext2D,
  x: number, y: number, r: number, h: number,
  cA = '#c8402f', cB = '#a33325',
): void {
  c.beginPath();
  c.moveTo(x - r, y);
  c.quadraticCurveTo(x, y + r * 0.55, x + r, y);
  c.lineTo(x, y - h);
  c.closePath();
  c.fillStyle = cA;
  c.fill();
  c.beginPath();
  c.moveTo(x, y + r * 0.27);
  c.quadraticCurveTo(x + r * 0.5, y + r * 0.45, x + r, y);
  c.lineTo(x, y - h);
  c.closePath();
  c.fillStyle = cB;
  c.fill();
  c.strokeStyle = 'rgba(52,38,24,.55)';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(x - r, y);
  c.quadraticCurveTo(x, y + r * 0.55, x + r, y);
  c.lineTo(x, y - h);
  c.closePath();
  c.stroke();
  c.fillStyle = '#ffd24a';
  c.beginPath();
  c.arc(x, y - h, 2.6, 0, 7);
  c.fill();
  c.strokeStyle = '#8a5c00';
  c.lineWidth = 1;
  c.stroke();
}

export function shadowE(
  c: CanvasRenderingContext2D,
  x: number, y: number, rx: number, ry: number, a = 0.28,
): void {
  c.fillStyle = 'rgba(10,20,8,' + a + ')';
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, 7);
  c.fill();
}

export function bShadow(c: CanvasRenderingContext2D, b: DrawableBuilding, s: number): void {
  const p = I(b.gx + s / 2, b.gy + s / 2);
  shadowE(c, p.x, p.y + 4, s * 21, s * 8.5, 0.22);
}

export function pad(
  c: CanvasRenderingContext2D,
  b: DrawableBuilding,
  s: number,
  kind: 'dirt' | 'stone' = 'dirt',
): void {
  const m = 0.07;
  const a = I(b.gx + m, b.gy + m), bb = I(b.gx + s - m, b.gy + m),
    e = I(b.gx + s - m, b.gy + s - m), f = I(b.gx + m, b.gy + s - m);
  poly(c, [a, bb, e, f], kind === 'stone' ? '#b6ae9b' : '#cdb47e');
  c.strokeStyle = kind === 'stone' ? 'rgba(90,82,66,.7)' : 'rgba(126,102,52,.7)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(a.x, a.y);
  c.lineTo(bb.x, bb.y);
  c.lineTo(e.x, e.y);
  c.lineTo(f.x, f.y);
  c.closePath();
  c.stroke();
  const rng = mulberry32((b.id || 7) * 13 + 5);
  c.fillStyle = 'rgba(0,0,0,.10)';
  for (let i = 0; i < 5; i++) {
    const q = I(b.gx + m + rng() * (s - 2 * m), b.gy + m + rng() * (s - 2 * m));
    c.beginPath();
    c.ellipse(q.x, q.y, 2.5, 1.4, 0, 0, 7);
    c.fill();
  }
}

export function hpBar(
  c: CanvasRenderingContext2D,
  cx: number, cy: number, w: number, frac: number, col = '#57d163',
): void {
  c.fillStyle = 'rgba(0,0,0,.55)';
  c.fillRect(cx - w / 2, cy, w, 5);
  c.fillStyle = frac > 0.5 ? col : frac > 0.25 ? '#f2b430' : '#e05252';
  c.fillRect(cx - w / 2 + 1, cy + 1, (w - 2) * clamp(frac, 0, 1), 3);
}

export function lvlPips(c: CanvasRenderingContext2D, b: DrawableBuilding, s: number): void {
  const lv = b.level;
  if (lv < 2) return;
  const p = I(b.gx + s - 0.32, b.gy + s - 0.32);
  for (let i = 0; i < lv - 1 && i < 4; i++) {
    const x = p.x - i * 10, y = p.y + 3;
    c.fillStyle = '#ffd24a';
    c.beginPath();
    c.moveTo(x, y - 4);
    c.lineTo(x + 3.4, y);
    c.lineTo(x, y + 4);
    c.lineTo(x - 3.4, y);
    c.closePath();
    c.fill();
    c.strokeStyle = '#8a5c00';
    c.lineWidth = 1;
    c.stroke();
  }
}

export function flame(c: CanvasRenderingContext2D, x: number, y: number, t: number, sc = 1): void {
  const f = Math.sin(t * 9) * 2, f2 = Math.cos(t * 13) * 1.5;
  c.fillStyle = 'rgba(255,120,30,.85)';
  c.beginPath();
  c.ellipse(x, y - 6 * sc + f2, 4.5 * sc, 8 * sc + f, 0, 0, 7);
  c.fill();
  c.fillStyle = 'rgba(255,220,90,.9)';
  c.beginPath();
  c.ellipse(x, y - 5 * sc, 2.4 * sc, 4.5 * sc + f * 0.5, 0, 0, 7);
  c.fill();
}

export function woodPost(
  c: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number, w = 5,
): void {
  c.strokeStyle = '#3f2c14';
  c.lineWidth = w + 2.4;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  c.stroke();
  c.strokeStyle = '#8a5c2b';
  c.lineWidth = w;
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  c.stroke();
  c.lineCap = 'butt';
}

export function coin(c: CanvasRenderingContext2D, x: number, y: number, r = 3.6): void {
  c.fillStyle = '#ffd24a';
  c.beginPath();
  c.arc(x, y, r, 0, 7);
  c.fill();
  c.strokeStyle = '#a06c0c';
  c.lineWidth = 1.2;
  c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.7)';
  c.lineWidth = 1;
  c.beginPath();
  c.arc(x - r * 0.25, y - r * 0.25, r * 0.45, 3.6, 5.6);
  c.stroke();
}
