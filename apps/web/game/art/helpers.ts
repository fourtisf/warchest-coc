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
  // pips restart per prestige tier: gold (L2-5), crimson (L6-8), mythic (L9-10)
  const n = lv >= 9 ? lv - 8 : lv >= 6 ? lv - 5 : lv - 1;
  const fill = lv >= 9 ? '#cfc4ff' : lv >= 6 ? '#ff7a5c' : '#ffd24a';
  const edge2 = lv >= 9 ? '#5a3f9a' : lv >= 6 ? '#8a2f1a' : '#8a5c00';
  for (let i = 0; i < n && i < 4; i++) {
    const x = p.x - i * 10, y = p.y + 3;
    c.fillStyle = fill;
    c.beginPath();
    c.moveTo(x, y - 4);
    c.lineTo(x + 3.4, y);
    c.lineTo(x, y + 4);
    c.lineTo(x - 3.4, y);
    c.closePath();
    c.fill();
    c.strokeStyle = edge2;
    c.lineWidth = 1;
    c.stroke();
  }
}

/**
 * Full re-theme per prestige tier — every major structure swaps material, not
 * just an accent: Timber (1-2) → Granite/slate (3-4) → Royal sandstone/gold
 * (5-6) → Obsidian/crimson (7-8) → Mythic marble/arcane (9-10).
 */
export interface TierTheme {
  /** main body prism [top, left, right] */
  wall: readonly [string, string, string];
  /** darker structural variant: bases, plinths, upper works */
  wallB: readonly [string, string, string];
  /** gabled roof [left, right, ridge] */
  roof: readonly [string, string, string];
  /** turret cone [main, shade] */
  cone: readonly [string, string];
  /** metallic trim: rims, finials, crests */
  trim: string;
  /** cloth: banners, flags, pennants */
  cloth: string;
}

export function tierTheme(lv: number): TierTheme {
  if (lv >= 9)
    return {
      wall: ['#f0edf8', '#aca3c8', '#d4cde6'],
      wallB: ['#ddd6ec', '#948bb4', '#bfb7d6'],
      roof: ['#8a76c8', '#5a4796', '#cfc4ff'],
      cone: ['#8a76c8', '#5a4796'],
      trim: '#cfc4ff',
      cloth: '#7a5cc8',
    };
  if (lv >= 7)
    return {
      wall: ['#5f5870', '#332e40', '#494256'],
      wallB: ['#4c4659', '#282331', '#3a3547'],
      roof: ['#5c2733', '#38141d', '#8a3a4a'],
      cone: ['#6e2c3c', '#421722'],
      trim: '#ff7a5c',
      cloth: '#c62f2f',
    };
  if (lv >= 5)
    return {
      wall: ['#e8d5aa', '#ab8c58', '#cbb27f'],
      wallB: ['#d6c193', '#977a48', '#b9a06b'],
      roof: ['#e0b23a', '#a8781a', '#ffd977'],
      cone: ['#e0b23a', '#a8781a'],
      trim: '#ffd977',
      cloth: '#e9b93c',
    };
  if (lv >= 3)
    return {
      wall: ['#c9d0da', '#7e8794', '#a7afbc'],
      wallB: ['#b2bac6', '#6a7280', '#909aa8'],
      roof: ['#4f6e8e', '#3a5570', '#7fa3c6'],
      cone: ['#4f6e8e', '#3a5570'],
      trim: '#e9b93c',
      cloth: '#3f7fbf',
    };
  return {
    wall: ['#d8d1bf', '#96897b', '#b7ac99'],
    wallB: ['#c3bba8', '#857b6c', '#a89d8a'],
    roof: ['#c8402f', '#a33325', '#f07a5a'],
    cone: ['#c8402f', '#a33325'],
    trim: '#e9b93c',
    cloth: '#c62f2f',
  };
}

/** Onion dome with a finial — the royal-tier tower top. */
export function onionDome(
  c: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  cA = '#e0b23a', cB = '#a8781a', finial = '#ffd24a',
): void {
  const outer = (): void => {
    c.beginPath();
    c.moveTo(x - r, y);
    c.quadraticCurveTo(x - r * 1.05, y - r * 1.02, x - r * 0.32, y - r * 1.26);
    c.quadraticCurveTo(x, y - r * 1.4, x, y - r * 1.82);
    c.quadraticCurveTo(x, y - r * 1.4, x + r * 0.32, y - r * 1.26);
    c.quadraticCurveTo(x + r * 1.05, y - r * 1.02, x + r, y);
    c.closePath();
  };
  outer();
  c.fillStyle = cA;
  c.fill();
  c.beginPath();
  c.moveTo(x, y - r * 1.82);
  c.quadraticCurveTo(x, y - r * 1.4, x + r * 0.32, y - r * 1.26);
  c.quadraticCurveTo(x + r * 1.05, y - r * 1.02, x + r, y);
  c.lineTo(x, y);
  c.closePath();
  c.fillStyle = cB;
  c.fill();
  outer();
  c.strokeStyle = 'rgba(52,38,24,.55)';
  c.lineWidth = 1.4;
  c.stroke();
  c.fillStyle = finial;
  c.beginPath();
  c.arc(x, y - r * 1.82 - 2.4, 2.4, 0, 7);
  c.fill();
  c.strokeStyle = '#8a5c00';
  c.lineWidth = 1;
  c.stroke();
}

/** Floating crystal shard with a soft glow — the mythic-tier crest. */
export function shard(
  c: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  fill = '#cfc4ff', edgeC = '#5a3f9a',
): void {
  c.fillStyle = 'rgba(190,160,255,.22)';
  c.beginPath();
  c.arc(x, y, r * 2.3, 0, 7);
  c.fill();
  poly(c, [
    { x, y: y - r * 1.6 }, { x: x + r, y }, { x, y: y + r * 1.6 }, { x: x - r, y },
  ], fill);
  c.strokeStyle = edgeC;
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(x, y - r * 1.6);
  c.lineTo(x + r, y);
  c.lineTo(x, y + r * 1.6);
  c.lineTo(x - r, y);
  c.closePath();
  c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.75)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(x - r * 0.3, y - r * 0.75);
  c.lineTo(x - r * 0.3, y + r * 0.6);
  c.stroke();
}

/** Crenellated flat cap for towers — the granite-tier top (no cone). */
export function crenelTop(
  c: CanvasRenderingContext2D,
  gx: number, gy: number, w: number, d: number, lift: number,
  wallB: readonly [string, string, string],
  wall: readonly [string, string, string],
): void {
  prism(c, gx - 0.06, gy - 0.06, w + 0.12, d + 0.12, 4.5, wallB[0], wallB[1], wallB[2], lift);
  for (const m of [[0, 0], [w - 0.22, 0], [0, d - 0.22], [w - 0.22, d - 0.22]] as const)
    prism(c, gx + m[0] - 0.05, gy + m[1] - 0.05, 0.3, 0.3, 5, wall[0], wall[1], wall[2], lift + 4.5, false);
}

/** Prestige aura for high-tier buildings: embers from L7, arcane runes from L9. */
export function prestigeFx(
  c: CanvasRenderingContext2D,
  b: DrawableBuilding,
  s: number,
  t: number,
): void {
  const lv = b.level;
  if (lv < 7) return;
  const p = I(b.gx + s / 2, b.gy + s / 2);
  const n = lv >= 9 ? 4 : 3;
  for (let i = 0; i < n; i++) {
    const ph = (t * 0.45 + i / n + (b.id || 1) * 0.137) % 1;
    const a = 1 - ph;
    const x = p.x + Math.sin(i * 2.1 + (b.id || 1) + ph * 2) * s * 13;
    const y = p.y - 6 - ph * (26 + s * 7);
    if (lv >= 9) {
      c.fillStyle = 'rgba(190,160,255,' + (0.6 * a).toFixed(3) + ')';
      c.beginPath();
      c.moveTo(x, y - 3.2);
      c.lineTo(x + 2.5, y);
      c.lineTo(x, y + 3.2);
      c.lineTo(x - 2.5, y);
      c.closePath();
      c.fill();
    } else {
      c.fillStyle = 'rgba(255,' + String(120 + ((60 * a) | 0)) + ',40,' + (0.55 * a).toFixed(3) + ')';
      c.beginPath();
      c.arc(x, y, 1.5 + a, 0, 7);
      c.fill();
    }
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
