/**
 * Building art — ported VERBATIM from the prototype's `ART` object
 * (reference/warchest-prototype.html, lines ~638-960). Every number, color and
 * shape must match the prototype exactly.
 */
import { BUILD, clamp, type BuildingType } from '@warchest/game-core';
import { G, capOf, idxOfHut } from '../state';
import { wallAt, type BuildingArtFn } from './drawable';
import {
  I, lp, poly, edge, prism, faceLines, roof, roofCone,
  bShadow, pad, lvlPips, flame, woodPost, coin,
} from './helpers';

/** Roof/canvas colors by prestige tier: base → gold (5-6) → crimson obsidian (7-8) → mythic (9-10). */
const tierRoof = (
  lv: number,
  base: readonly [string, string, string],
): readonly [string, string, string] =>
  lv >= 9
    ? (['#e9e6f2', '#8a76c8', '#cfc4ff'] as const)
    : lv >= 7
      ? (['#5c2733', '#38141d', '#8a3a4a'] as const)
      : lv >= 5
        ? (['#e0b23a', '#a8781a', '#ffd977'] as const)
        : base;

export const ART: Record<BuildingType, BuildingArtFn> = {
  keep(c, b, t) {
    const s = 4;
    const lv = b.level;
    // the castle physically grows: walls, turrets and crown tower rise per level
    const W = 44 + (lv - 1) * 6;
    const TU = 58 + (lv - 1) * 8;
    const cone = 13 + (lv - 1) * 1.4;
    bShadow(c, b, s);
    pad(c, b, s, 'stone');
    prism(c, b.gx + 0.35, b.gy + 0.35, 3.3, 3.3, 10, '#cfc8b6', '#8f8674', '#b0a794');
    const M = prism(c, b.gx + 0.55, b.gy + 0.55, 2.9, 2.9, W, '#d8d1bf', '#96897b', '#b7ac99', 10);
    faceLines(c, M.f, M.e, M.F, M.E, 5, 'rgba(0,0,0,.10)', 1.2);
    faceLines(c, M.e, M.b, M.E, M.B, 5, 'rgba(0,0,0,.08)', 1.2);
    prism(c, b.gx + 0.45, b.gy + 0.45, 3.1, 3.1, 8, '#c3bba8', '#857b6c', '#a89d8a', 10 + W);
    const t1 = I(b.gx + 0.45, b.gy + 3.55), t2 = I(b.gx + 3.55, b.gy + 3.55), t3 = I(b.gx + 3.55, b.gy + 0.45);
    c.strokeStyle = '#e9b93c';
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(t1.x, t1.y - 10 - W);
    c.lineTo(t2.x, t2.y - 10 - W);
    c.lineTo(t3.x, t3.y - 10 - W);
    c.stroke();
    for (const dd of [[0.3, 0.3], [3.0, 0.3], [0.3, 3.0], [3.0, 3.0]] as const) {
      prism(c, b.gx + dd[0], b.gy + dd[1], 0.7, 0.7, TU, '#ded7c5', '#9a8f80', '#bdb2a0', 6);
      const rp = I(b.gx + dd[0] + 0.35, b.gy + dd[1] + 0.35);
      roofCone(c, rp.x, rp.y - 6 - TU, cone, cone + 4);
      if (lv >= 4) {
        // gilded finials on every turret
        c.fillStyle = '#ffd24a';
        c.beginPath();
        c.arc(rp.x, rp.y - 6 - TU - cone - 5, 2.6, 0, 7);
        c.fill();
        c.strokeStyle = '#8a5c00';
        c.lineWidth = 1;
        c.stroke();
      }
    }
    prism(c, b.gx + 1.25, b.gy + 1.25, 1.5, 1.5, 18, '#d8d1bf', '#96897b', '#b7ac99', 18 + W);
    // crown roof climbs the prestige tiers: red → gold → crimson → mythic
    const KR = tierRoof(lv, ['#c8402f', '#a33325', '#f07a5a'] as const);
    roof(c, b.gx + 1.25, b.gy + 1.25, 1.5, 1.5, 36 + W, 24 + (lv - 1) * 2, KR[0], KR[1], KR[2]);
    const gf = I(b.gx + 0.55, b.gy + 3.45), ge = I(b.gx + 3.45, b.gy + 3.45);
    for (const pt of [gf, ge]) pt.y -= 10;
    const gp = lp(gf, ge, 0.5);
    c.fillStyle = '#4b3722';
    c.beginPath();
    c.moveTo(gp.x - 11, gp.y);
    c.lineTo(gp.x - 11, gp.y - 18);
    c.arc(gp.x, gp.y - 18, 11, Math.PI, 0);
    c.lineTo(gp.x + 11, gp.y);
    c.closePath();
    c.fill();
    c.strokeStyle = '#2f2114';
    c.lineWidth = 2;
    c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.3)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(gp.x - 4, gp.y);
    c.lineTo(gp.x - 4, gp.y - 24);
    c.moveTo(gp.x + 4, gp.y);
    c.lineTo(gp.x + 4, gp.y - 24);
    c.stroke();
    for (const sx of [-7, 7]) {
      c.fillStyle = '#d8b25c';
      c.beginPath();
      c.arc(gp.x + sx, gp.y - 9, 1.6, 0, 7);
      c.fill();
    }
    poly(c, [
      { x: gp.x - 16, y: gp.y + 1 }, { x: gp.x + 16, y: gp.y + 1 },
      { x: gp.x + 19, y: gp.y + 5 }, { x: gp.x - 19, y: gp.y + 5 },
    ], '#b6ae9b');
    if (lv >= 2) {
      // hanging war banners high on the gate wall
      const wt = 10 + W;
      for (const u of [0.32, 0.68]) {
        const bp = lp(gf, ge, u);
        c.fillStyle = lv >= 5 ? '#e9b93c' : '#c62f2f';
        c.beginPath();
        c.moveTo(bp.x - 4, bp.y - wt + 2);
        c.lineTo(bp.x + 4, bp.y - wt + 2);
        c.lineTo(bp.x + 4, bp.y - wt + 21);
        c.lineTo(bp.x, bp.y - wt + 17);
        c.lineTo(bp.x - 4, bp.y - wt + 21);
        c.closePath();
        c.fill();
        c.strokeStyle = 'rgba(60,20,20,.55)';
        c.lineWidth = 1;
        c.stroke();
        c.fillStyle = lv >= 5 ? '#7d5406' : '#f2b430';
        c.beginPath();
        c.arc(bp.x, bp.y - wt + 9, 2, 0, 7);
        c.fill();
      }
    }
    if (lv >= 3) {
      for (const u of [0.22, 0.78]) {
        const tp = lp(gf, ge, u);
        flame(c, tp.x, tp.y - 26, t + u, 0.65);
      }
    }
    const pp = I(b.gx + 3.15, b.gy + 0.85);
    const bx = pp.x, by = pp.y - 20 - W;
    woodPost(c, bx, by, bx, by - 28, 3.6);
    const wv = Math.sin(t * 3 + (b.id || 1)) * 4;
    c.fillStyle = '#c62f2f';
    c.beginPath();
    c.moveTo(bx, by - 28);
    c.quadraticCurveTo(bx + 11, by - 26 + wv * 0.4, bx + 20, by - 24 + wv);
    c.lineTo(bx + 19, by - 16 + wv);
    c.quadraticCurveTo(bx + 10, by - 18 + wv * 0.4, bx, by - 18);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(90,20,20,.6)';
    c.lineWidth = 1;
    c.stroke();
    c.fillStyle = '#f2b430';
    c.beginPath();
    c.arc(bx + 9, by - 22 + wv * 0.3, 2.4, 0, 7);
    c.fill();
    lvlPips(c, b, s);
  },
  mine(c, b, t) {
    const s = 3;
    const lv = b.level;
    // the dig gets deeper and the headframe taller every level
    const mg = lv - 1;
    const mtop = 15 + mg * 4;
    const wr = 10 + mg * 1.3;
    bShadow(c, b, s);
    pad(c, b, s);
    prism(c, b.gx + 0.35 - Math.min(mg, 5) * 0.04, b.gy + 0.35 - Math.min(mg, 5) * 0.04, 2.3 + Math.min(mg, 5) * 0.08, 2.3 + Math.min(mg, 5) * 0.08, 8 + mg * 2, '#c2a76e', '#8f7a4b', '#a8905c');
    prism(c, b.gx + 0.68 - Math.min(mg, 5) * 0.03, b.gy + 0.68 - Math.min(mg, 5) * 0.03, 1.64 + Math.min(mg, 5) * 0.06, 1.64 + Math.min(mg, 5) * 0.06, 7 + mg * 2, '#cdb27a', '#96814f', '#b39a63', 8 + mg * 2, false);
    const hc = I(b.gx + 1.5, b.gy + 1.5);
    if (lv >= 2) {
      // exposed gold veins in the mound — richer dig, richer look
      for (const [vx, vy] of [[-17, -6], [14, -3], [-6, 2]] as const) {
        coin(c, hc.x + vx, hc.y + vy, 2.2);
        if (lv >= 4) coin(c, hc.x + vx + 4, hc.y + vy - 3, 1.7);
      }
    }
    c.fillStyle = '#241a10';
    c.beginPath();
    c.ellipse(hc.x, hc.y - mtop, 9 + mg * 0.6, 4.5 + mg * 0.3, 0, 0, 7);
    c.fill();
    const bl = I(b.gx + 1.02, b.gy + 1.98), br = I(b.gx + 1.98, b.gy + 1.02);
    bl.y -= mtop;
    br.y -= mtop;
    const ap = { x: hc.x, y: hc.y - mtop - 36 - mg * 7 };
    woodPost(c, bl.x, bl.y, ap.x, ap.y + 6, 4.5);
    woodPost(c, br.x, br.y, ap.x, ap.y + 6, 4.5);
    woodPost(c, bl.x + 4, bl.y - 14, br.x - 4, br.y - 14, 3.2);
    if (lv >= 4) woodPost(c, bl.x + 6, bl.y - 26, br.x - 6, br.y - 26, 2.6);
    if (lv >= 3) flame(c, (bl.x + br.x) / 2, bl.y - 18, t + (b.id || 1), 0.45);
    const ga = t * 1.5 + (b.id || 1);
    c.fillStyle = '#7a5230';
    c.beginPath();
    c.arc(ap.x, ap.y, wr, 0, 7);
    c.fill();
    c.strokeStyle = '#3f2c14';
    c.lineWidth = 2.2;
    c.stroke();
    if (lv >= 4) {
      // iron-and-gold banded hoist wheel
      c.strokeStyle = '#d8b25c';
      c.lineWidth = 1.6;
      c.beginPath();
      c.arc(ap.x, ap.y, wr + 2, 0, 7);
      c.stroke();
    }
    c.save();
    c.translate(ap.x, ap.y);
    c.rotate(ga);
    c.strokeStyle = lv >= 5 ? '#d8b25c' : '#4a3620';
    c.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      c.rotate(Math.PI / 3);
      c.beginPath();
      c.moveTo(-wr + 1, 0);
      c.lineTo(wr - 1, 0);
      c.stroke();
    }
    c.restore();
    c.fillStyle = '#4a3620';
    c.beginPath();
    c.arc(ap.x, ap.y, 2.8, 0, 7);
    c.fill();
    c.strokeStyle = '#d9c8a0';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(ap.x, ap.y + wr);
    c.lineTo(hc.x + Math.sin(t * 2) * 2, hc.y - mtop - 1);
    c.stroke();
    const f0 = I(b.gx + 0.35, b.gy + 2.65), f1 = I(b.gx + 2.65, b.gy + 2.65);
    const fm = lp(f0, f1, 0.62);
    c.fillStyle = '#2b2118';
    c.beginPath();
    c.moveTo(fm.x - 8, fm.y);
    c.lineTo(fm.x - 8, fm.y - 9);
    c.arc(fm.x, fm.y - 9, 8, Math.PI, 0);
    c.lineTo(fm.x + 8, fm.y);
    c.closePath();
    c.fill();
    woodPost(c, fm.x - 9, fm.y, fm.x - 9, fm.y - 12, 3);
    woodPost(c, fm.x + 9, fm.y, fm.x + 9, fm.y - 12, 3);
    woodPost(c, fm.x - 11, fm.y - 12, fm.x + 11, fm.y - 12, 3);
    c.fillStyle = 'rgba(255,190,90,.22)';
    c.beginPath();
    c.arc(fm.x + 13, fm.y - 10, 7, 0, 7);
    c.fill();
    c.fillStyle = '#ffd24a';
    c.beginPath();
    c.arc(fm.x + 13, fm.y - 10, 2.2, 0, 7);
    c.fill();
    c.strokeStyle = '#6b5a3a';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(fm.x - 14, fm.y + 3);
    c.lineTo(fm.x - 34, fm.y + 13);
    c.moveTo(fm.x - 8, fm.y + 6);
    c.lineTo(fm.x - 28, fm.y + 16);
    c.stroke();
    const cartX = fm.x - 26, cartY = fm.y + 9;
    poly(c, [
      { x: cartX - 9, y: cartY }, { x: cartX + 9, y: cartY },
      { x: cartX + 7, y: cartY - 8 }, { x: cartX - 7, y: cartY - 8 },
    ], '#5a3f24');
    edge(c, [
      { x: cartX - 9, y: cartY }, { x: cartX + 9, y: cartY },
      { x: cartX + 7, y: cartY - 8 }, { x: cartX - 7, y: cartY - 8 },
    ], 1.3);
    c.fillStyle = '#2e2418';
    c.beginPath();
    c.arc(cartX - 5, cartY + 2, 3.2, 0, 7);
    c.arc(cartX + 5, cartY + 2, 3.2, 0, 7);
    c.fill();
    if (lv >= 5) {
      // overflowing ore pile beside the tunnel
      for (const [px2, py2, r2] of [[20, 5, 3.2], [24, 2.5, 2.6], [16, 2, 2.4], [20, -1, 2.2]] as const)
        coin(c, fm.x + px2, fm.y + py2, r2);
    }
    const fill = clamp((b.stored ?? 0) / BUILD.mine.lv[b.level - 1]!.cap!, 0, 1);
    for (let i = 0; i < Math.ceil(fill * 6); i++)
      coin(c, cartX - 4 + (i % 3) * 4.5, cartY - 9 - Math.floor(i / 3) * 4, 2.8);
    if (fill >= 0.1) {
      const bo = Math.sin(t * 4) * 3;
      c.fillStyle = 'rgba(20,26,38,.72)';
      c.beginPath();
      c.arc(hc.x, hc.y - 62 + bo, 11, 0, 7);
      c.fill();
      c.strokeStyle = 'rgba(242,180,48,.8)';
      c.lineWidth = 1.5;
      c.stroke();
      coin(c, hc.x, hc.y - 62 + bo, 5);
    }
    lvlPips(c, b, s);
  },
  well(c, b, t) {
    const s = 3;
    const lv = b.level;
    // the basin rises and the mana pool sits higher every level
    const BH = 9 + (lv - 1) * 3.5;
    bShadow(c, b, s);
    pad(c, b, s, 'stone');
    prism(c, b.gx + 0.45, b.gy + 0.45, 2.1, 2.1, BH, '#b6bcc9', '#6d7383', '#929aa9');
    const P1 = I(b.gx + 0.75, b.gy + 0.75), P2 = I(b.gx + 2.25, b.gy + 0.75),
      P3 = I(b.gx + 2.25, b.gy + 2.25), P4 = I(b.gx + 0.75, b.gy + 2.25);
    for (const p of [P1, P2, P3, P4]) p.y -= BH;
    poly(c, [P1, P2, P3, P4], '#5a2f86');
    if (lv >= 5) {
      // gilded basin rim
      c.strokeStyle = '#e9b93c';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(P1.x, P1.y);
      c.lineTo(P2.x, P2.y);
      c.lineTo(P3.x, P3.y);
      c.lineTo(P4.x, P4.y);
      c.closePath();
      c.stroke();
    }
    if (lv >= 2) {
      // mana crystals sprout from the basin corners as the well deepens
      const clusters: Array<{ p: { x: number; y: number }; sc: number }> = [{ p: P3, sc: 1.3 }];
      if (lv >= 3) clusters.push({ p: P2, sc: 1.7 });
      if (lv >= 4) clusters.push({ p: P4, sc: 2.2 });
      if (lv >= 5) clusters.push({ p: P1, sc: 2.8 }); // hero crystal on the far corner
      for (const { p, sc } of clusters) {
        for (const [dx, h2, w2] of [[-3, 13, 3.4], [3, 9, 2.8]] as const) {
          c.fillStyle = '#b06ee0';
          c.beginPath();
          c.moveTo(p.x + dx * sc - w2 * sc, p.y);
          c.lineTo(p.x + dx * sc, p.y - h2 * sc);
          c.lineTo(p.x + dx * sc + w2 * sc, p.y);
          c.closePath();
          c.fill();
          c.strokeStyle = 'rgba(70,30,110,.65)';
          c.lineWidth = 1;
          c.stroke();
          c.strokeStyle = 'rgba(235,215,255,.8)';
          c.beginPath();
          c.moveTo(p.x + dx * sc, p.y - h2 * sc + 2);
          c.lineTo(p.x + dx * sc - 1.4 * sc, p.y - 2);
          c.stroke();
        }
      }
    }
    const pc = I(b.gx + 1.5, b.gy + 1.5);
    pc.y -= BH;
    const glow = 0.45 + Math.sin(t * 2.6 + (b.id || 1)) * 0.2;
    c.fillStyle = 'rgba(180,110,255,' + (0.30 * glow + 0.15) + ')';
    c.beginPath();
    c.ellipse(pc.x, pc.y, 22, 11, 0, 0, 7);
    c.fill();
    c.strokeStyle = 'rgba(220,185,255,.55)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.ellipse(pc.x - 4, pc.y - 2, 9, 4, 0, 0, 4);
    c.stroke();
    c.beginPath();
    c.ellipse(pc.x + 6, pc.y + 2, 6, 2.6, 0, 3, 6.5);
    c.stroke();
    const pv = I(b.gx + 0.72, b.gy + 2.28);
    pv.y -= BH;
    woodPost(c, pv.x, pv.y, pv.x, pv.y - 24, 4.5);
    const sw = Math.sin(t * 2.1 + (b.id || 1)) * 0.38 - 0.12;
    const ang = Math.atan2(pc.y - (pv.y - 24), pc.x - pv.x);
    c.save();
    c.translate(pv.x, pv.y - 24);
    c.rotate(ang + sw);
    c.strokeStyle = '#3f2c14';
    c.lineWidth = 7;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-11, 0);
    c.lineTo(30, 0);
    c.stroke();
    c.strokeStyle = '#8a5c2b';
    c.lineWidth = 4.6;
    c.beginPath();
    c.moveTo(-11, 0);
    c.lineTo(30, 0);
    c.stroke();
    c.lineCap = 'butt';
    c.fillStyle = '#4a3620';
    c.beginPath();
    c.arc(-11, 0, 4.4, 0, 7);
    c.fill();
    const rodX = 30, rodY = 0;
    c.strokeStyle = '#6b7480';
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(rodX, rodY);
    c.lineTo(rodX, rodY + 14);
    c.stroke();
    c.restore();
    if (Math.sin(t * 2.1 + (b.id || 1)) < -0.6) {
      c.strokeStyle = 'rgba(220,185,255,.5)';
      c.lineWidth = 1.4;
      c.beginPath();
      c.ellipse(pc.x + 8, pc.y + 1, 7, 3, 0, 0, 7);
      c.stroke();
    }
    if (lv >= 4) {
      // slowly circling rune ring above the pool
      c.save();
      c.strokeStyle = 'rgba(201,166,255,.65)';
      c.lineWidth = 1.6;
      c.setLineDash([7, 6]);
      c.lineDashOffset = -t * 10;
      c.beginPath();
      c.ellipse(pc.x, pc.y, 27, 13.5, 0, 0, 7);
      c.stroke();
      c.restore();
    }
    const fill = clamp((b.stored ?? 0) / BUILD.well.lv[b.level - 1]!.cap!, 0, 1);
    const n = Math.ceil(fill * 4);
    for (let i = 0; i < n; i++) {
      const a2 = t * 1.4 + i * 1.57;
      c.fillStyle = 'rgba(201,166,255,.9)';
      c.beginPath();
      c.arc(pc.x + Math.cos(a2) * 13, pc.y - 12 + Math.sin(a2) * 4 - i * 2, 2.4, 0, 7);
      c.fill();
    }
    if (fill >= 0.1) {
      const bo = Math.sin(t * 4 + 1) * 3;
      c.fillStyle = 'rgba(20,26,38,.72)';
      c.beginPath();
      c.arc(pc.x, pc.y - 46 + bo, 11, 0, 7);
      c.fill();
      c.strokeStyle = 'rgba(162,107,255,.8)';
      c.lineWidth = 1.5;
      c.stroke();
      c.fillStyle = '#c9a6ff';
      c.beginPath();
      c.moveTo(pc.x, pc.y - 53 + bo);
      c.lineTo(pc.x + 4.5, pc.y - 46 + bo);
      c.lineTo(pc.x, pc.y - 39 + bo);
      c.lineTo(pc.x - 4.5, pc.y - 46 + bo);
      c.closePath();
      c.fill();
    }
    lvlPips(c, b, s);
  },
  vault(c, b, _t) {
    const s = 3;
    const lv = b.level;
    // the war chest itself grows with every level
    const mg = lv - 1;
    const CH = 22 + mg * 4;
    const vg = Math.min(mg, 5);
    const LH = CH + 9;
    bShadow(c, b, s);
    pad(c, b, s);
    const B1 = prism(c, b.gx + 0.5 - vg * 0.045, b.gy + 0.8 - vg * 0.035, 2.0 + vg * 0.09, 1.5 + vg * 0.07, CH, lv >= 4 ? '#a8792f' : '#c98f3e', lv >= 4 ? '#654a1c' : '#7d5a24', lv >= 4 ? '#8a6226' : '#a3742f');
    faceLines(c, B1.f, B1.F, B1.e, B1.E, 5, 'rgba(0,0,0,.13)', 1.1);
    prism(c, b.gx + 0.42 - vg * 0.045, b.gy + 0.72 - vg * 0.035, 2.16 + vg * 0.09, 1.66 + vg * 0.07, 9, '#d9a34a', '#8a642a', '#b8853a', CH);
    const tA = I(b.gx + 0.42 - vg * 0.045, b.gy + 0.72 - vg * 0.035), tB = I(b.gx + 2.58 + vg * 0.045, b.gy + 0.72 - vg * 0.035);
    c.strokeStyle = 'rgba(255,235,180,.55)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(tA.x, tA.y - LH);
    c.lineTo(tB.x, tB.y - LH);
    c.stroke();
    if (lv >= 2) {
      // gold rivets studding the lid
      for (const u of [0.15, 0.38, 0.62, 0.85]) {
        const q = lp(tA, tB, u);
        c.fillStyle = '#ffd24a';
        c.beginPath();
        c.arc(q.x, q.y - LH + 3, 1.8, 0, 7);
        c.fill();
        c.strokeStyle = '#8a5c00';
        c.lineWidth = 0.8;
        c.stroke();
      }
    }
    if (lv >= 3) {
      // armored corner caps + a spillover strongbox beside the chest
      for (const q of [tA, tB]) {
        c.fillStyle = '#8f97a5';
        c.beginPath();
        c.moveTo(q.x - 4, q.y - LH);
        c.lineTo(q.x + 4, q.y - LH);
        c.lineTo(q.x, q.y - LH + 9);
        c.closePath();
        c.fill();
        c.strokeStyle = '#3a4150';
        c.lineWidth = 1.1;
        c.stroke();
      }
      prism(c, b.gx + 2.42, b.gy + 2.32, 0.5, 0.42, 8, '#c98f3e', '#7d5a24', '#a3742f');
      prism(c, b.gx + 2.38, b.gy + 2.28, 0.58, 0.5, 4, '#d9a34a', '#8a642a', '#b8853a', 8, false);
      const sb = I(b.gx + 2.67, b.gy + 2.53);
      coin(c, sb.x, sb.y - 13, 2.4);
    }
    for (const u of [0.26, 0.74]) {
      const p1 = lp(B1.f, B1.e, u - 0.045), p2 = lp(B1.f, B1.e, u + 0.045);
      poly(c, [p1, p2, { x: p2.x, y: p2.y - LH }, { x: p1.x, y: p1.y - LH }], lv >= 5 ? '#7d5406' : '#2e3540');
      c.fillStyle = lv >= 5 ? '#ffd24a' : '#8f97a5';
      c.beginPath();
      c.arc((p1.x + p2.x) / 2, p1.y - 6, 1.4, 0, 7);
      c.arc((p1.x + p2.x) / 2, p1.y - LH + 6, 1.4, 0, 7);
      c.fill();
    }
    const lm = lp(B1.f, B1.e, 0.5);
    c.fillStyle = lv >= 4 ? '#e9b93c' : '#d9d2c0';
    c.beginPath();
    c.arc(lm.x, lm.y - 13, 5.5, 0, 7);
    c.fill();
    c.strokeStyle = lv >= 4 ? '#8a5c00' : '#6b6255';
    c.lineWidth = 1.4;
    c.stroke();
    c.fillStyle = '#2b2118';
    c.beginPath();
    c.arc(lm.x, lm.y - 14.5, 1.7, 0, 7);
    c.fill();
    c.fillRect(lm.x - 1, lm.y - 14, 2, 4.5);
    const fr = clamp(G.res.g / Math.max(1, capOf('g')), 0, 1);
    for (let i = 0; i < Math.round(fr * 7); i++) {
      const q = lp(B1.f, B1.e, 0.14 + i * 0.115);
      coin(c, q.x, q.y - 2, 3.2);
    }
    lvlPips(c, b, s);
  },
  tank(c, b, t) {
    const s = 3;
    const lv = b.level;
    // the reservoir tower rises with every level
    const GH = 32 + (lv - 1) * 7;
    bShadow(c, b, s);
    pad(c, b, s, 'stone');
    prism(c, b.gx + 0.62, b.gy + 0.62, 1.76, 1.76, 5, '#a97a44', '#6f4a22', '#8a5c2b');
    const fr = clamp(G.res.m / Math.max(1, capOf('m')), 0, 1);
    const hh = 6 + fr * (GH - 8);
    prism(c, b.gx + 0.83, b.gy + 0.83, 1.34, 1.34, hh, '#c07af0', '#7a3fb8', '#9e5cd8', 5, false);
    const gl = prism(c, b.gx + 0.75, b.gy + 0.75, 1.5, 1.5, GH,
      'rgba(215,224,245,.26)', 'rgba(148,158,190,.26)', 'rgba(184,192,220,.28)', 5, false);
    c.strokeStyle = 'rgba(235,242,255,.65)';
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(gl.f.x, gl.f.y);
    c.lineTo(gl.e.x, gl.e.y);
    c.lineTo(gl.b.x, gl.b.y);
    c.lineTo(gl.B.x, gl.B.y);
    c.lineTo(gl.A.x, gl.A.y);
    c.lineTo(gl.F.x, gl.F.y);
    c.closePath();
    c.stroke();
    c.beginPath();
    c.moveTo(gl.e.x, gl.e.y);
    c.lineTo(gl.E.x, gl.E.y);
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.5)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(gl.f.x + 3, gl.f.y - 4);
    c.lineTo(gl.F.x + 3, gl.F.y + 4);
    c.stroke();
    const cap = prism(c, b.gx + 0.68, b.gy + 0.68, 1.64, 1.64, 4, '#454d5c', '#23272f', '#343b48', 5 + GH);
    if (lv >= 4) {
      // gold banding around the pressure cap
      c.strokeStyle = '#d8b25c';
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(cap.A.x, cap.A.y);
      c.lineTo(cap.F.x, cap.F.y);
      c.lineTo(cap.E.x, cap.E.y);
      c.lineTo(cap.B.x, cap.B.y);
      c.stroke();
    }
    const vp = I(b.gx + 2.32, b.gy + 1.5);
    c.strokeStyle = '#23272f';
    c.lineWidth = 4.6;
    c.beginPath();
    c.moveTo(vp.x, vp.y - 20);
    c.lineTo(vp.x + 10, vp.y - 14);
    c.lineTo(vp.x + 10, vp.y + 1);
    c.stroke();
    if (lv >= 3) {
      // second feed pipe on the south face
      const vq = I(b.gx + 1.5, b.gy + 2.32);
      c.strokeStyle = '#23272f';
      c.lineWidth = 4.6;
      c.beginPath();
      c.moveTo(vq.x, vq.y - 20);
      c.lineTo(vq.x - 10, vq.y - 14);
      c.lineTo(vq.x - 10, vq.y + 1);
      c.stroke();
    }
    c.fillStyle = lv >= 2 ? '#d8b25c' : '#8f97a5';
    c.beginPath();
    c.arc(vp.x + 10, vp.y - 8, 3.6, 0, 7);
    c.fill();
    c.strokeStyle = lv >= 2 ? '#7d5406' : '#3a4150';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(vp.x + 6.5, vp.y - 8);
    c.lineTo(vp.x + 13.5, vp.y - 8);
    c.moveTo(vp.x + 10, vp.y - 11.5);
    c.lineTo(vp.x + 10, vp.y - 4.5);
    c.stroke();
    if (lv >= 5) {
      // orbiting mana runes
      for (let i = 0; i < 2; i++) {
        const a2 = t * 1.1 + i * Math.PI;
        const rp = I(b.gx + 1.5, b.gy + 1.5);
        const rx = rp.x + Math.cos(a2) * 30, ry = rp.y - 26 + Math.sin(a2) * 9;
        c.fillStyle = 'rgba(201,166,255,.9)';
        c.beginPath();
        c.moveTo(rx, ry - 4);
        c.lineTo(rx + 3.2, ry);
        c.lineTo(rx, ry + 4);
        c.lineTo(rx - 3.2, ry);
        c.closePath();
        c.fill();
      }
    }
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.7 + i * 0.37 + (b.id || 1) * 0.1) % 1;
      const bp = I(b.gx + 1.1 + i * 0.35, b.gy + 1.6 - i * 0.2);
      c.fillStyle = 'rgba(230,210,255,' + (0.7 * (1 - ph)) + ')';
      c.beginPath();
      c.arc(bp.x, bp.y - 10 - ph * hh, 2 + i * 0.5, 0, 7);
      c.fill();
    }
    lvlPips(c, b, s);
  },
  cannon(c, b, t) {
    const s = 3;
    const lv = b.level;
    const mg = lv - 1;
    const barrelLen = 22 + mg * 2.6;
    const BT = 8 + mg * 1.1;
    const WR = 8.2 + mg * 1.1;
    bShadow(c, b, s);
    pad(c, b, s, 'stone');
    const pg = Math.min(mg, 5);
    const PF = lv >= 3
      ? prism(c, b.gx + 0.55 - pg * 0.06, b.gy + 0.55 - pg * 0.06, 1.9 + pg * 0.12, 1.9 + pg * 0.12, 6 + mg * 1.6, '#b6bcc9', '#6d7383', '#929aa9')
      : prism(c, b.gx + 0.55 - pg * 0.06, b.gy + 0.55 - pg * 0.06, 1.9 + pg * 0.12, 1.9 + pg * 0.12, 6 + mg * 1.6, '#a97a44', '#6f4a22', '#8a5c2b');
    faceLines(c, PF.f, PF.F, PF.e, PF.E, 4, 'rgba(0,0,0,.14)', 1.1);
    for (const w of [I(b.gx + 1.02, b.gy + 2.12), I(b.gx + 2.12, b.gy + 1.02)]) {
      c.fillStyle = '#6f4a22';
      c.beginPath();
      c.arc(w.x, w.y - WR, WR, 0, 7);
      c.fill();
      c.strokeStyle = '#3f2c14';
      c.lineWidth = 2.4;
      c.stroke();
      c.strokeStyle = '#3f2c14';
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(w.x - WR, w.y - WR);
      c.lineTo(w.x + WR, w.y - WR);
      c.moveTo(w.x, w.y - WR * 2);
      c.lineTo(w.x, w.y);
      c.stroke();
      c.fillStyle = '#d8b25c';
      c.beginPath();
      c.arc(w.x, w.y - WR, 2.2, 0, 7);
      c.fill();
    }
    prism(c, b.gx + 1.1, b.gy + 1.1, 0.8, 0.8, 8, '#5a3f24', '#3a2814', '#4a3420', 6, false);
    const cp = I(b.gx + 1.5, b.gy + 1.5);
    const aim = b.aim ?? (Math.sin(t * 0.4 + (b.id || 1)) * 0.8 + 0.9);
    c.save();
    c.translate(cp.x, cp.y - 19);
    c.rotate(aim);
    const rec = (b.recoil ?? 0) > 0 ? b.recoil! * 6 : 0;
    c.fillStyle = lv >= 4 ? '#1a1e26' : '#232833';
    c.beginPath();
    c.moveTo(-rec - 4, -BT);
    c.lineTo(barrelLen - rec, -BT);
    c.arc(barrelLen - rec, 0, BT, -Math.PI / 2, Math.PI / 2);
    c.lineTo(-rec - 4, BT);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(10,12,16,.7)';
    c.lineWidth = 1.6;
    c.stroke();
    c.fillStyle = '#3d4452';
    c.fillRect(-rec - 4, -BT, barrelLen + 4, 4);
    for (const bx of lv >= 3 ? [3, 13, barrelLen - 4] : [3, 13]) {
      c.fillStyle = '#d8b25c';
      c.fillRect(bx - rec, -BT - 0.6, 3.2, BT * 2 + 1.2);
      c.strokeStyle = '#7d5406';
      c.lineWidth = 0.8;
      c.strokeRect(bx - rec, -BT - 0.6, 3.2, BT * 2 + 1.2);
    }
    c.fillStyle = '#0c0e12';
    c.beginPath();
    c.arc(barrelLen + 2 - rec, 0, BT - 3, 0, 7);
    c.fill();
    c.strokeStyle = lv >= 5 ? '#d8b25c' : '#4a5160';
    c.lineWidth = 1.6;
    c.beginPath();
    c.arc(barrelLen + 2 - rec, 0, BT - 1.4, 0, 7);
    c.stroke();
    c.fillStyle = '#232833';
    c.beginPath();
    c.arc(-rec - 5, 0, BT - 1.6, 0, 7);
    c.fill();
    c.strokeStyle = 'rgba(10,12,16,.7)';
    c.lineWidth = 1.4;
    c.stroke();
    c.restore();
    if ((b.recoil ?? 0) > 0) b.recoil = b.recoil! - 0.08;
    lvlPips(c, b, s);
  },
  arrow(c, b, _t) {
    const s = 3;
    const lv = b.level;
    // the watchtower climbs with every level
    const SHH = 34 + (lv - 1) * 9;
    const TP = 20 + SHH;
    bShadow(c, b, s);
    pad(c, b, s, 'stone');
    const SB = prism(c, b.gx + 0.75, b.gy + 0.75, 1.5, 1.5, 20, '#cfc8b6', '#8f8674', '#b0a794');
    faceLines(c, SB.f, SB.e, SB.F, SB.E, 3, 'rgba(0,0,0,.10)', 1.1);
    const SH = lv >= 4
      ? prism(c, b.gx + 0.9, b.gy + 0.9, 1.2, 1.2, SHH, '#cfc8b6', '#8f8674', '#b0a794', 20)
      : prism(c, b.gx + 0.9, b.gy + 0.9, 1.2, 1.2, SHH, '#a97a44', '#6f4a22', '#8a5c2b', 20);
    faceLines(c, SH.f, SH.F, SH.e, SH.E, 4, 'rgba(0,0,0,.14)', 1);
    if (lv >= 2) {
      // regiment banner down the shaft
      const bp = lp(SH.f, SH.e, 0.5);
      c.fillStyle = lv >= 5 ? '#e9b93c' : '#3e8a4c';
      c.beginPath();
      c.moveTo(bp.x - 4, bp.y - TP + 6);
      c.lineTo(bp.x + 4, bp.y - TP + 6);
      c.lineTo(bp.x + 4, bp.y - TP + 26);
      c.lineTo(bp.x, bp.y - TP + 22);
      c.lineTo(bp.x - 4, bp.y - TP + 26);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(20,40,22,.6)';
      c.lineWidth = 1;
      c.stroke();
      c.fillStyle = lv >= 5 ? '#7d5406' : '#d9c08a';
      c.beginPath();
      c.arc(bp.x, bp.y - TP + 13, 1.8, 0, 7);
      c.fill();
    }
    c.strokeStyle = lv >= 4 ? 'rgba(60,58,50,.8)' : 'rgba(63,44,20,.8)';
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(SH.f.x, SH.f.y);
    c.lineTo(SH.e.x, SH.e.y - 24);
    c.moveTo(SH.e.x, SH.e.y);
    c.lineTo(SH.b.x, SH.b.y - 24);
    c.stroke();
    prism(c, b.gx + 0.72, b.gy + 0.72, 1.56, 1.56, 7, '#c2925a', '#7d5a30', '#a3773f', TP);
    if (lv >= 4) {
      // gilded platform edging
      const e1 = I(b.gx + 0.72, b.gy + 2.28), e2 = I(b.gx + 2.28, b.gy + 2.28), e3 = I(b.gx + 2.28, b.gy + 0.72);
      c.strokeStyle = '#e9b93c';
      c.lineWidth = 1.8;
      c.beginPath();
      c.moveTo(e1.x, e1.y - TP - 7);
      c.lineTo(e2.x, e2.y - TP - 7);
      c.lineTo(e3.x, e3.y - TP - 7);
      c.stroke();
    }
    for (const dd of [[0.72, 0.72], [2.14, 0.72], [0.72, 2.14], [2.14, 2.14]] as const)
      prism(c, b.gx + dd[0], b.gy + dd[1], 0.14, 0.14, 8, '#c2925a', '#7d5a30', '#a3773f', TP + 7, false);
    if (lv >= 3) {
      // watch pennant on the near corner post
      const pp2 = I(b.gx + 0.79, b.gy + 2.21);
      const py = pp2.y - TP - 15;
      woodPost(c, pp2.x, py + 8, pp2.x, py - 8, 2.2);
      c.fillStyle = '#3e8a4c';
      c.beginPath();
      c.moveTo(pp2.x, py - 8);
      c.lineTo(pp2.x + 11, py - 5.5);
      c.lineTo(pp2.x, py - 3);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(20,40,22,.6)';
      c.lineWidth = 1;
      c.stroke();
    }
    const tp = I(b.gx + 1.5, b.gy + 1.5);
    const ty = tp.y - TP - 12;
    c.fillStyle = '#2f6b3a';
    c.beginPath();
    c.ellipse(tp.x, ty + 5, 4.4, 5.6, 0, 0, 7);
    c.fill();
    c.strokeStyle = 'rgba(20,40,22,.6)';
    c.lineWidth = 1;
    c.stroke();
    c.fillStyle = '#e8c99a';
    c.beginPath();
    c.arc(tp.x, ty - 2, 3.6, 0, 7);
    c.fill();
    c.fillStyle = '#3e8a4c';
    c.beginPath();
    c.moveTo(tp.x - 4, ty - 4);
    c.lineTo(tp.x + 4, ty - 4);
    c.lineTo(tp.x, ty - 9);
    c.closePath();
    c.fill();
    c.strokeStyle = '#7a5f3f';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(tp.x + 6, ty + 2, 6.5, -1.25, 1.25);
    c.stroke();
    c.strokeStyle = 'rgba(240,235,220,.85)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(tp.x + 6 + Math.cos(-1.25) * 6.5, ty + 2 + Math.sin(-1.25) * 6.5);
    c.lineTo(tp.x + 6 + Math.cos(1.25) * 6.5, ty + 2 + Math.sin(1.25) * 6.5);
    c.stroke();
    lvlPips(c, b, s);
  },
  mortar(c, b, _t) {
    const s = 3;
    const lv = b.level;
    const R = 13.5 + Math.min(lv - 1, 6) * 2.4;
    bShadow(c, b, s);
    pad(c, b, s, 'stone');
    for (const a2 of [0.4, 1.1, 1.9, 2.7, 3.5, 4.5]) {
      const q = I(b.gx + 1.5 + Math.cos(a2) * 0.92, b.gy + 1.5 + Math.sin(a2) * 0.92);
      c.fillStyle = '#c9ae74';
      c.beginPath();
      c.ellipse(q.x, q.y - 3, 7.5, 4.2, 0, 0, 7);
      c.fill();
      c.strokeStyle = 'rgba(110,90,50,.7)';
      c.lineWidth = 1.2;
      c.stroke();
      c.beginPath();
      c.moveTo(q.x - 5, q.y - 3);
      c.lineTo(q.x + 5, q.y - 3);
      c.stroke();
    }
    const dz = Math.min(lv - 1, 6) * 3.5;
    const cp = I(b.gx + 1.5, b.gy + 1.5);
    if (lv >= 2) {
      // sandbag ring shoring up the pit
      for (let i = 0; i < 8; i++) {
        const a4 = i * 0.785 + 0.35;
        const q = I(b.gx + 1.5 + Math.cos(a4) * 1.18, b.gy + 1.5 + Math.sin(a4) * 1.18);
        c.fillStyle = i % 2 ? '#c9ae74' : '#b89b62';
        c.beginPath();
        c.ellipse(q.x, q.y - 5, 8.5, 5, 0, 0, 7);
        c.fill();
        c.strokeStyle = 'rgba(110,90,50,.7)';
        c.lineWidth = 1.2;
        c.stroke();
      }
    }
    prism(c, b.gx + 1.05, b.gy + 1.05, 0.9, 0.9, 5 + dz, '#454d5c', '#23272f', '#343b48');
    if (lv >= 3) {
      // armor studs around the emplacement
      for (const a3 of [0.9, 2.3, 4.0, 5.4]) {
        c.fillStyle = '#3d4452';
        c.beginPath();
        c.arc(cp.x + Math.cos(a3) * (R + 6), cp.y - 6 + Math.sin(a3) * 5, 2.2, 0, 7);
        c.fill();
      }
    }
    c.fillStyle = '#1c2027';
    c.beginPath();
    c.ellipse(cp.x, cp.y - 9 - dz, R, R * 0.555, 0, 0, 7);
    c.fill();
    c.fillRect(cp.x - R, cp.y - 22 - dz, R * 2, 13);
    c.beginPath();
    c.ellipse(cp.x, cp.y - 22 - dz, R, R * 0.555, 0, 0, 7);
    c.fill();
    c.strokeStyle = 'rgba(8,10,13,.8)';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(cp.x - R, cp.y - 9 - dz);
    c.lineTo(cp.x - R, cp.y - 22 - dz);
    c.moveTo(cp.x + R, cp.y - 9 - dz);
    c.lineTo(cp.x + R, cp.y - 22 - dz);
    c.stroke();
    c.strokeStyle = lv >= 3 ? '#d8b25c' : '#4a5160';
    c.lineWidth = 2.6;
    c.beginPath();
    c.ellipse(cp.x, cp.y - 22 - dz, R, R * 0.555, 0, 0, 7);
    c.stroke();
    c.fillStyle = '#05070a';
    c.beginPath();
    c.ellipse(cp.x, cp.y - 23 - dz, R - 4.5, R * 0.555 - 2.7, 0, 0, 7);
    c.fill();
    c.strokeStyle = '#d8b25c';
    c.lineWidth = 1.8;
    c.beginPath();
    c.ellipse(cp.x, cp.y - 15.5 - dz, R, R * 0.555, 0, lv >= 2 ? 0 : 0.5, lv >= 2 ? 7 : 2.6);
    c.stroke();
    if ((b.flash ?? 0) > 0) {
      c.fillStyle = 'rgba(255,190,80,' + b.flash + ')';
      c.beginPath();
      c.ellipse(cp.x, cp.y - 26 - dz, 10, 6, 0, 0, 7);
      c.fill();
      b.flash = b.flash! - 0.06;
    }
    lvlPips(c, b, s);
  },
  wall(c, b, _t) {
    const lv = b.level;
    const PALS: ReadonlyArray<readonly [string, string, string]> = [
      ['#d9cdb0', '#96897b', '#b8ab90'], ['#cfd4da', '#818a95', '#a9b1ba'],
      ['#8f97a5', '#4a515e', '#6a7280'], ['#f0ead8', '#a89f8c', '#cfc6b0'],
      ['#ffd977', '#a8781a', '#e0aa32'], ['#e8b84a', '#8a5c00', '#c8922a'],
      ['#4a4456', '#221e2c', '#363044'], ['#5c2733', '#2e1218', '#452029'],
      ['#e9e6f2', '#a099b8', '#c9c3dd'], ['#cfc4ff', '#7a5cc8', '#a58ae8'],
    ];
    const P2 = PALS[lv - 1] ?? PALS[0]!;
    const h = 16 + lv * 2.5;
    const right = wallAt(b._list ?? G.buildings, b.gx + 1, b.gy),
      down = wallAt(b._list ?? G.buildings, b.gx, b.gy + 1);
    if (right) prism(c, b.gx + 0.5, b.gy + 0.27, 1, 0.46, h - 6, P2[0], P2[1], P2[2], 0, false);
    if (down) prism(c, b.gx + 0.27, b.gy + 0.5, 0.46, 1, h - 6, P2[0], P2[1], P2[2], 0, false);
    const K = prism(c, b.gx + 0.14, b.gy + 0.14, 0.72, 0.72, h, P2[0], P2[1], P2[2]);
    prism(c, b.gx + 0.1, b.gy + 0.1, 0.8, 0.8, 3.4, lv === 4 ? '#ffd977' : P2[0], P2[1], P2[2], h, false);
    if (lv >= 3 && lv < 5) {
      c.fillStyle = '#c8ccd4';
      c.beginPath();
      c.arc(lp(K.f, K.e, 0.5).x, K.f.y - h * 0.5, 1.5, 0, 7);
      c.fill();
    }
  },
  barracks(c, b, t) {
    const s = 3;
    const lv = b.level;
    // the war hall rises with every level
    const H = 20 + (lv - 1) * 6;
    const RH = 20 + (lv - 1) * 3;
    bShadow(c, b, s);
    pad(c, b, s);
    const BD = lv >= 4
      ? prism(c, b.gx + 0.45, b.gy + 0.85, 2.1, 1.6, H, '#cfc8b6', '#8f8674', '#b0a794')
      : prism(c, b.gx + 0.45, b.gy + 0.85, 2.1, 1.6, H, '#c2925a', '#7d5a30', '#a3773f');
    faceLines(c, BD.f, BD.F, BD.e, BD.E, 5, 'rgba(0,0,0,.13)', 1);
    const BR = tierRoof(lv, ['#c8402f', '#a33325', '#f07a5a'] as const);
    const M2 = roof(c, b.gx + 0.45, b.gy + 0.85, 2.1, 1.6, H, RH, BR[0], BR[1], BR[2], 0.2);
    if (lv >= 4) {
      // gold eaves trim
      c.strokeStyle = '#e9b93c';
      c.lineWidth = 1.8;
      c.beginPath();
      c.moveTo(BD.F.x, BD.F.y);
      c.lineTo(BD.E.x, BD.E.y);
      c.lineTo(BD.B.x, BD.B.y);
      c.stroke();
    }
    const rf = I(b.gx + 0.25, b.gy + 2.65), re = I(b.gx + 2.75, b.gy + 2.65), rb = I(b.gx + 2.75, b.gy + 0.65);
    rf.y -= H;
    re.y -= H;
    rb.y -= H;
    faceLines(c, lp(rf, re, 0.2), M2, lp(rf, re, 0.5), M2, 2, lv >= 5 ? '#ffd977' : '#ef6d55', 4);
    faceLines(c, lp(re, rb, 0.35), M2, lp(re, rb, 0.7), M2, 2, lv >= 5 ? '#e8c25a' : '#d95c47', 4);
    const dm = lp(BD.f, BD.e, 0.32);
    c.fillStyle = '#3a2814';
    c.fillRect(dm.x - 6, dm.y - 15, 12, 15);
    c.strokeStyle = '#2b1d0e';
    c.lineWidth = 1.6;
    c.strokeRect(dm.x - 6, dm.y - 15, 12, 15);
    if (lv >= 4) {
      // iron-braced door
      c.strokeStyle = '#8f97a5';
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(dm.x - 6, dm.y - 11);
      c.lineTo(dm.x + 6, dm.y - 11);
      c.moveTo(dm.x - 6, dm.y - 5);
      c.lineTo(dm.x + 6, dm.y - 5);
      c.stroke();
    }
    const wm = lp(BD.e, BD.b, 0.5);
    c.fillStyle = '#2b2118';
    c.fillRect(wm.x - 4, wm.y - 16, 8, 7);
    c.strokeStyle = '#5a3f24';
    c.lineWidth = 1.4;
    c.strokeRect(wm.x - 4, wm.y - 16, 8, 7);
    const rk = I(b.gx + 2.55, b.gy + 2.35);
    woodPost(c, rk.x - 8, rk.y, rk.x + 8, rk.y - 3, 2.6);
    const y0 = (i: number): number => rk.y - 2 - i;
    for (let i = 0; i < 3; i++) {
      const x = rk.x - 5 + i * 5;
      c.strokeStyle = '#d8dde6';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x, y0(i));
      c.lineTo(x + 3, y0(i) - 12);
      c.stroke();
      c.fillStyle = '#d8b25c';
      c.fillRect(x - 1, y0(i) - 2, 5, 2);
    }
    const dy = I(b.gx + 0.6, b.gy + 0.55);
    woodPost(c, dy.x, dy.y, dy.x, dy.y - 16, 3);
    woodPost(c, dy.x - 7, dy.y - 11, dy.x + 7, dy.y - 11, 2.6);
    c.fillStyle = '#d9c08a';
    c.beginPath();
    c.arc(dy.x, dy.y - 20, 4, 0, 7);
    c.fill();
    c.strokeStyle = 'rgba(90,70,40,.7)';
    c.lineWidth = 1;
    c.stroke();
    c.strokeStyle = '#c8402f';
    c.lineWidth = 1.4;
    c.beginPath();
    c.arc(dy.x, dy.y - 9, 3, 0, 7);
    c.stroke();
    const fp = I(b.gx + 2.45, b.gy + 0.7);
    woodPost(c, fp.x, fp.y, fp.x, fp.y - 32, 3);
    const wv = Math.sin(t * 3.4 + (b.id || 1)) * 3;
    c.fillStyle = '#3f7fbf';
    c.beginPath();
    c.moveTo(fp.x, fp.y - 32);
    c.lineTo(fp.x + 14, fp.y - 29 + wv);
    c.lineTo(fp.x, fp.y - 24);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(20,50,90,.6)';
    c.lineWidth = 1;
    c.stroke();
    if (lv >= 3) {
      // battle honors: a second pennant under the first
      c.fillStyle = '#c62f2f';
      c.beginPath();
      c.moveTo(fp.x, fp.y - 22);
      c.lineTo(fp.x + 11, fp.y - 19.5 + wv * 0.7);
      c.lineTo(fp.x, fp.y - 16);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(90,20,20,.6)';
      c.lineWidth = 1;
      c.stroke();
    }
    if (lv >= 2) {
      // round shield racked beside the door
      const dmn = lp(BD.f, BD.e, 0.62);
      c.fillStyle = lv >= 4 ? '#d8b25c' : '#8f97a5';
      c.beginPath();
      c.arc(dmn.x, dmn.y - 7, 5.2, 0, 7);
      c.fill();
      c.strokeStyle = '#3a4150';
      c.lineWidth = 1.5;
      c.stroke();
      c.fillStyle = lv >= 4 ? '#7d5406' : '#d8b25c';
      c.beginPath();
      c.arc(dmn.x, dmn.y - 7, 1.8, 0, 7);
      c.fill();
    }
    if (G.trainQ.length) {
      const sp = I(b.gx + 1.5, b.gy + 1.6);
      for (let i = 0; i < 2; i++) {
        const ph = (t * 1.2 + i * 0.5) % 1;
        c.fillStyle = 'rgba(255,210,120,' + (0.8 * (1 - ph)) + ')';
        c.beginPath();
        c.arc(sp.x + Math.sin(ph * 9 + i) * 5, sp.y - 24 - ph * 14, 1.8, 0, 7);
        c.fill();
      }
    }
    lvlPips(c, b, s);
  },
  camp(c, b, t) {
    const s = 4;
    const lv = b.level;
    bShadow(c, b, s);
    pad(c, b, s, 'dirt');
    // tents grow OUTWARD each level (fire-facing edges stay put, seats stay clear)
    const g = Math.min(lv - 1, 4) * 0.1;
    const th2 = 9 + (lv - 1) * 2, rh2 = 13 + (lv - 1) * 3;
    const CR1 = tierRoof(lv, ['#c8402f', '#a33325', '#f07a5a'] as const);
    const CR2 = tierRoof(lv, ['#3f7fbf', '#2f6296', '#6aa4d8'] as const);
    const T1 = prism(c, b.gx + 0.45 - g, b.gy + 2.25, 1.3 + g, 1.15 + g, th2, '#d9cdb0', '#96897b', '#b8ab90', 0, false);
    roof(c, b.gx + 0.45 - g, b.gy + 2.25, 1.3 + g, 1.15 + g, th2, rh2, CR1[0], CR1[1], CR1[2], 0.12);
    const T2 = prism(c, b.gx + 2.3, b.gy + 0.5 - g, 1.3 + g, 1.15 + g, th2, '#d9cdb0', '#96897b', '#b8ab90', 0, false);
    roof(c, b.gx + 2.3, b.gy + 0.5 - g, 1.3 + g, 1.15 + g, th2, rh2, CR2[0], CR2[1], CR2[2], 0.12);
    if (lv >= 3) {
      // pennants on both tent peaks
      const peaks: Array<{ x: number; y: number }> = [
        I(b.gx + 0.45 - g + (1.3 + g) / 2, b.gy + 2.25 + (1.15 + g) / 2),
        I(b.gx + 2.3 + (1.3 + g) / 2, b.gy + 0.5 - g + (1.15 + g) / 2),
      ];
      const wv3 = Math.sin(t * 3.6 + (b.id || 1)) * 2.5;
      for (const pk of peaks) {
        const py2 = pk.y - th2 - rh2;
        woodPost(c, pk.x, py2 + 2, pk.x, py2 - 10, 2);
        c.fillStyle = lv >= 5 ? '#e9b93c' : '#c62f2f';
        c.beginPath();
        c.moveTo(pk.x, py2 - 10);
        c.lineTo(pk.x + 9, py2 - 8 + wv3);
        c.lineTo(pk.x, py2 - 5.5);
        c.closePath();
        c.fill();
      }
    }
    if (lv >= 2) {
      // shield rack leaning on the blue tent
      const sr = I(b.gx + 2.45, b.gy + 1.95);
      for (let i = 0; i < Math.min(3, lv); i++) {
        c.fillStyle = i % 2 ? '#8f97a5' : '#c8402f';
        c.beginPath();
        c.arc(sr.x + i * 9, sr.y - 5 - (i % 2) * 1.5, 4.6, 0, 7);
        c.fill();
        c.strokeStyle = '#3a4150';
        c.lineWidth = 1.3;
        c.stroke();
        c.fillStyle = '#d8b25c';
        c.beginPath();
        c.arc(sr.x + i * 9, sr.y - 5 - (i % 2) * 1.5, 1.5, 0, 7);
        c.fill();
      }
    }
    if (lv >= 3) {
      // company standard at the far corner
      const st = I(b.gx + 3.65, b.gy + 0.4);
      woodPost(c, st.x, st.y, st.x, st.y - 30, 2.6);
      const wv2 = Math.sin(t * 3.1 + (b.id || 1)) * 3;
      c.fillStyle = lv >= 5 ? '#e9b93c' : '#c62f2f';
      c.beginPath();
      c.moveTo(st.x, st.y - 30);
      c.lineTo(st.x + 13, st.y - 27 + wv2);
      c.lineTo(st.x, st.y - 22);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(90,20,20,.55)';
      c.lineWidth = 1;
      c.stroke();
    }
    if (lv >= 4) {
      // supply crates by the near corner
      prism(c, b.gx + 0.45, b.gy + 0.45, 0.55, 0.55, 9, '#c2925a', '#7d5a30', '#a3773f');
      prism(c, b.gx + 0.62, b.gy + 0.62, 0.38, 0.38, 7, '#cdb27a', '#96814f', '#b39a63', 9, false);
    }
    for (const TT of [T1, T2]) {
      const dm = lp(TT.f, TT.e, 0.5);
      c.fillStyle = '#3a2f22';
      c.beginPath();
      c.moveTo(dm.x - 5, dm.y);
      c.lineTo(dm.x, dm.y - 10);
      c.lineTo(dm.x + 5, dm.y);
      c.closePath();
      c.fill();
    }
    const fp = I(b.gx + 2, b.gy + 2);
    c.fillStyle = '#8d94a2';
    for (let i = 0; i < 7; i++) {
      const a2 = i * 0.9;
      c.beginPath();
      c.ellipse(fp.x + Math.cos(a2) * 12, fp.y + Math.sin(a2) * 5.5, 3.4, 2.2, 0, 0, 7);
      c.fill();
    }
    c.strokeStyle = '#4a3a28';
    c.lineWidth = 3.4;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(fp.x - 8, fp.y + 2);
    c.lineTo(fp.x + 8, fp.y - 4);
    c.moveTo(fp.x - 7, fp.y - 4);
    c.lineTo(fp.x + 8, fp.y + 3);
    c.stroke();
    c.lineCap = 'butt';
    flame(c, fp.x, fp.y - 5, t, 1.15 + (lv - 1) * 0.2);
    for (let i = 0; i < 2; i++) {
      const ph = (t * 0.4 + i * 0.5) % 1;
      c.fillStyle = 'rgba(150,150,150,' + (0.22 * (1 - ph)) + ')';
      c.beginPath();
      c.arc(fp.x + Math.sin(ph * 5) * 4, fp.y - 18 - ph * 22, 4 + ph * 5, 0, 7);
      c.fill();
    }
    const lg = I(b.gx + 3.1, b.gy + 2.6);
    c.fillStyle = '#8a5c2b';
    c.beginPath();
    c.ellipse(lg.x, lg.y - 3, 11, 4, 0, 0, 7);
    c.fill();
    c.fillStyle = '#a3773f';
    c.beginPath();
    c.ellipse(lg.x, lg.y - 5, 11, 4, 0, 0, 7);
    c.fill();
    c.strokeStyle = '#5a3f24';
    c.lineWidth = 1.3;
    c.stroke();
    c.fillStyle = '#c2925a';
    c.beginPath();
    c.ellipse(lg.x - 11, lg.y - 4, 2, 3.4, 0, 0, 7);
    c.fill();
    const sp2 = I(b.gx + 0.8, b.gy + 0.8);
    woodPost(c, sp2.x - 6, sp2.y, sp2.x + 3, sp2.y - 22, 2.4);
    woodPost(c, sp2.x + 6, sp2.y, sp2.x - 3, sp2.y - 22, 2.4);
    c.fillStyle = '#c8ccd4';
    c.beginPath();
    c.moveTo(sp2.x + 3, sp2.y - 22);
    c.lineTo(sp2.x + 6, sp2.y - 29);
    c.lineTo(sp2.x + 8, sp2.y - 22);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(sp2.x - 3, sp2.y - 22);
    c.lineTo(sp2.x - 6, sp2.y - 29);
    c.lineTo(sp2.x - 8, sp2.y - 22);
    c.closePath();
    c.fill();
    lvlPips(c, b, s);
  },
  hut(c, b, t) {
    const s = 2;
    bShadow(c, b, s);
    pad(c, b, s);
    const HB = prism(c, b.gx + 0.32, b.gy + 0.5, 1.2, 1.05, 13, '#c2925a', '#7d5a30', '#a3773f');
    faceLines(c, HB.f, HB.F, HB.e, HB.E, 4, 'rgba(0,0,0,.13)', 1);
    roof(c, b.gx + 0.32, b.gy + 0.5, 1.2, 1.05, 13, 14, '#c98f3e', '#a3742f', '#e0b565', 0.16);
    const dm = lp(HB.f, HB.e, 0.4);
    c.fillStyle = '#3a2814';
    c.fillRect(dm.x - 4.5, dm.y - 11, 9, 11);
    c.strokeStyle = '#2b1d0e';
    c.lineWidth = 1.3;
    c.strokeRect(dm.x - 4.5, dm.y - 11, 9, 11);
    const br = I(b.gx + 1.62, b.gy + 1.5);
    c.fillStyle = '#8a5c2b';
    c.fillRect(br.x - 4.5, br.y - 13, 9, 11);
    c.fillStyle = '#a3773f';
    c.beginPath();
    c.ellipse(br.x, br.y - 13, 4.5, 2.2, 0, 0, 7);
    c.fill();
    c.strokeStyle = '#3f2c14';
    c.lineWidth = 1.2;
    c.strokeRect(br.x - 4.5, br.y - 13, 9, 11);
    c.beginPath();
    c.moveTo(br.x - 4.5, br.y - 9);
    c.lineTo(br.x + 4.5, br.y - 9);
    c.moveTo(br.x - 4.5, br.y - 5);
    c.lineTo(br.x + 4.5, br.y - 5);
    c.stroke();
    for (let i = 0; i < 3; i++)
      prism(c, b.gx + 0.35 + i * 0.06, b.gy + 1.5 + i * 0.05, 0.7, 0.16, 2.4, '#c2a76e', '#8f7a4b', '#a8905c', i * 2.6, false);
    const busy = G.jobs.length >= idxOfHut(b);
    if (busy) {
      const hp2 = I(b.gx + 1, b.gy + 0.55);
      const sw = Math.sin(t * 7) * 0.6;
      c.save();
      c.translate(hp2.x + 7, hp2.y - 22);
      c.rotate(-0.6 + sw);
      c.fillStyle = '#8a8f9a';
      c.fillRect(-2.4, -11, 4.8, 7);
      c.strokeStyle = '#5a4632';
      c.lineWidth = 2.2;
      c.beginPath();
      c.moveTo(0, -4);
      c.lineTo(0, 9);
      c.stroke();
      c.restore();
    }
  },
  bomb(c, b, t) {
    // hidden bomb (visible only in your own village): half-buried iron sphere on a dirt mound
    const p = I(b.gx + 0.5, b.gy + 0.5);
    const s = 1;
    bShadow(c, b, s);
    c.fillStyle = '#a8905c';
    c.beginPath(); c.ellipse(p.x, p.y - 1, 15, 7.5, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(126,102,52,.7)'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = '#23262e';
    c.beginPath(); c.arc(p.x, p.y - 8, 8, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.16)';
    c.beginPath(); c.arc(p.x - 2.6, p.y - 10.8, 2.6, 0, 7); c.fill();
    c.strokeStyle = '#8a6a3a'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(p.x + 3, p.y - 15); c.quadraticCurveTo(p.x + 6, p.y - 19, p.x + 4.5, p.y - 21.5); c.stroke();
    const sp = 0.6 + Math.sin(t * 18 + b.id) * 0.4;
    c.fillStyle = `rgba(255,${(170 + sp * 60) | 0},40,${0.65 + sp * 0.3})`;
    c.beginPath(); c.arc(p.x + 4.5, p.y - 22, 1.7 + sp, 0, 7); c.fill();
    lvlPips(c, b, s);
  },
  spring(c, b, t) {
    // spring trap: iron plate with a coiled spring, faintly quivering
    const p = I(b.gx + 0.5, b.gy + 0.5);
    const s = 1;
    bShadow(c, b, s);
    const q = Math.sin(t * 9 + b.id) * 0.6;
    prism(c, b.gx + 0.16, b.gy + 0.16, 0.68, 0.68, 3, '#8f97a5', '#4a515e', '#6a7280');
    c.strokeStyle = '#c8ccd4'; c.lineWidth = 2;
    c.beginPath();
    for (let i = 0; i < 4; i++) {
      const y = p.y - 6 - i * 3 - (i ? q : 0);
      c.moveTo(p.x - 6 + i * 0.8, y);
      c.quadraticCurveTo(p.x, y - 2.6, p.x + 6 - i * 0.8, y);
    }
    c.stroke();
    c.fillStyle = '#5c6270';
    c.beginPath(); c.ellipse(p.x, p.y - 19 - q, 7, 3, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(25,28,36,.7)'; c.lineWidth = 1.2; c.stroke();
  },
};
