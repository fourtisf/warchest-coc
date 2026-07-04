/** Unit art (HD) — ported verbatim from the prototype's UNIT_ART + drawUnit. */
import { TROOP, type TroopType } from '@warchest/game-core';
import { I, hpBar, shadowE } from './helpers';
import type { DrawableUnit, UnitArtFn } from './drawable';

export const UNIT_ART: Record<TroopType, UnitArtFn> = {
  raider(c, u, t, bob) {
    c.fillStyle = '#a14a34'; c.beginPath(); c.ellipse(0, -6 + bob, 5, 7, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(40,30,20,.55)'; c.lineWidth = 1; c.stroke();
    c.strokeStyle = '#5c2b1c'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-4, -4 + bob); c.lineTo(4, -4 + bob); c.stroke();
    c.fillStyle = '#e8c99a'; c.beginPath(); c.arc(0, -15 + bob, 4.6, 0, 7); c.fill();
    c.strokeStyle = 'rgba(40,30,20,.5)'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#c62f2f'; c.fillRect(-4.6, -18.4 + bob, 9.2, 2.6);
    c.save(); c.rotate(u.swing || 0);
    c.strokeStyle = '#6b4a2c'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(3, -8 + bob); c.lineTo(11, -16 + bob); c.stroke();
    c.fillStyle = '#c8ccd4'; c.beginPath(); c.moveTo(10, -19 + bob); c.lineTo(15.5, -15 + bob); c.lineTo(10, -12 + bob); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(40,45,55,.7)'; c.lineWidth = 1; c.stroke(); c.restore();
  },
  sniper(c, u, t, bob) {
    c.fillStyle = '#2f6b3a'; c.beginPath(); c.moveTo(-5.5, -1 + bob); c.lineTo(5.5, -1 + bob); c.lineTo(2.5, -12 + bob); c.lineTo(-2.5, -12 + bob); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(20,40,22,.6)'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#e8c99a'; c.beginPath(); c.arc(0, -15 + bob, 4, 0, 7); c.fill();
    c.fillStyle = '#3e8a4c'; c.beginPath(); c.moveTo(-4.4, -16.5 + bob); c.lineTo(4.4, -16.5 + bob); c.lineTo(0, -22.5 + bob); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(20,40,22,.6)'; c.lineWidth = 1; c.stroke();
    c.strokeStyle = '#7a5f3f'; c.lineWidth = 2; c.beginPath(); c.arc(5.5, -9 + bob, 6.4, -1.3, 1.3); c.stroke();
    c.strokeStyle = 'rgba(240,235,220,.85)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(5.5 + Math.cos(-1.3) * 6.4, -9 + bob + Math.sin(-1.3) * 6.4);
    c.lineTo(5.5 + Math.cos(1.3) * 6.4, -9 + bob + Math.sin(1.3) * 6.4); c.stroke();
    c.strokeStyle = '#8a5c2b'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-4, -4 + bob); c.lineTo(-7, -14 + bob); c.stroke();
  },
  bomber(c, u, t, bob) {
    // stubby sapper hugging a big black bomb, fuse sparking
    c.fillStyle = '#4a4f5a'; c.beginPath(); c.ellipse(0, -5.5 + bob, 4.8, 6.4, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(20,22,28,.6)'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#e8c99a'; c.beginPath(); c.arc(0, -13.5 + bob, 4.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(40,30,20,.5)'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#2d3038'; c.beginPath(); c.arc(0, -16.6 + bob, 3.4, Math.PI, 0); c.fill();
    c.save(); c.rotate((u.swing || 0) * 0.5);
    c.fillStyle = '#23262e'; c.beginPath(); c.arc(6.5, -10 + bob, 5.6, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(4.8, -12 + bob, 1.8, 0, 7); c.fill();
    c.strokeStyle = '#8a6a3a'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(8.5, -15 + bob); c.quadraticCurveTo(10.5, -18 + bob, 9, -20 + bob); c.stroke();
    const sp = 0.6 + Math.sin(t * 22 + u.id) * 0.4;
    c.fillStyle = `rgba(255,${170 + sp * 60 | 0},40,${0.7 + sp * 0.3})`;
    c.beginPath(); c.arc(9, -20.5 + bob, 1.6 + sp, 0, 7); c.fill();
    c.restore();
  },
  imp(c, u, t, bob) {
    // little crimson flyer — leathery wings, stubby horns, pitchfork
    const fl = Math.sin(t * 16 + u.id) * 4;
    c.fillStyle = 'rgba(160,50,45,.9)';
    c.beginPath(); c.moveTo(-2.5, -10 + bob); c.quadraticCurveTo(-11, -15 + bob - fl, -12.5, -7.5 + bob - fl);
    c.quadraticCurveTo(-7.5, -6.5 + bob, -2.5, -6 + bob); c.fill();
    c.beginPath(); c.moveTo(2.5, -10 + bob); c.quadraticCurveTo(11, -15 + bob - fl, 12.5, -7.5 + bob - fl);
    c.quadraticCurveTo(7.5, -6.5 + bob, 2.5, -6 + bob); c.fill();
    c.strokeStyle = 'rgba(70,15,15,.6)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-2.5, -10 + bob); c.quadraticCurveTo(-11, -15 + bob - fl, -12.5, -7.5 + bob - fl); c.stroke();
    c.beginPath(); c.moveTo(2.5, -10 + bob); c.quadraticCurveTo(11, -15 + bob - fl, 12.5, -7.5 + bob - fl); c.stroke();
    c.fillStyle = '#c0463c'; c.beginPath(); c.ellipse(0, -9 + bob, 4, 5.4, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(70,15,15,.65)'; c.lineWidth = 1; c.stroke();
    c.strokeStyle = '#a83a30'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(0, -4 + bob); c.quadraticCurveTo(5, -1 + bob, 7.5, -4 + bob); c.stroke();
    c.fillStyle = '#c0463c';
    c.beginPath(); c.moveTo(-2.8, -13 + bob); c.lineTo(-4.4, -17 + bob); c.lineTo(-1.2, -14 + bob); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(2.8, -13 + bob); c.lineTo(4.4, -17 + bob); c.lineTo(1.2, -14 + bob); c.closePath(); c.fill();
    c.fillStyle = '#ffe08a'; c.beginPath(); c.arc(-1.5, -10.5 + bob, 1.1, 0, 7); c.arc(1.5, -10.5 + bob, 1.1, 0, 7); c.fill();
    c.save(); c.rotate(u.swing || 0);
    c.strokeStyle = '#5c3a20'; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(4, -6 + bob); c.lineTo(10, -13 + bob); c.stroke();
    c.strokeStyle = '#d8dbe2'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(8.5, -14.5 + bob); c.lineTo(11.5, -11.5 + bob); c.stroke();
    c.beginPath(); c.moveTo(10, -15.5 + bob); c.lineTo(10, -11 + bob); c.stroke();
    c.restore();
  },
  bruiser(c, u, t, bob) {
    c.fillStyle = '#5c6270'; c.beginPath(); c.ellipse(0, -9 + bob, 8, 10.5, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(25,28,36,.6)'; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = '#454d5c'; c.beginPath(); c.arc(-6, -16 + bob, 3.4, 0, 7); c.arc(6, -16 + bob, 3.4, 0, 7); c.fill();
    c.fillStyle = '#d8a878'; c.beginPath(); c.arc(0, -21 + bob, 5.6, 0, 7); c.fill();
    c.strokeStyle = 'rgba(90,60,35,.6)'; c.lineWidth = 1; c.stroke();
    c.strokeStyle = '#8a4030'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-2.5, -19.5 + bob); c.lineTo(2.5, -19.5 + bob); c.stroke();
    c.fillStyle = '#8f97a5'; c.beginPath(); c.ellipse(-7, -8 + bob, 4, 8.6, -0.28, 0, 7); c.fill();
    c.strokeStyle = '#3a4150'; c.lineWidth = 1.4; c.stroke();
    c.fillStyle = '#d8b25c'; c.beginPath(); c.arc(-7, -8 + bob, 2, 0, 7); c.fill();
    c.save(); c.rotate(u.swing || 0);
    c.strokeStyle = '#6b4a2c'; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(6, -6 + bob); c.lineTo(14, -15 + bob); c.stroke(); c.lineCap = 'butt';
    c.fillStyle = '#454d5c'; c.beginPath(); c.arc(15, -16 + bob, 5, 0, 7); c.fill();
    c.strokeStyle = 'rgba(25,28,36,.7)'; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = '#c8ccd4'; c.beginPath(); c.arc(13.5, -17.5 + bob, 1.4, 0, 7); c.fill(); c.restore();
  },
  warlock(c, u, t, bob) {
    // hooded pyromancer — ember robe, staff crowned with a burning orb
    c.fillStyle = '#5a2a5e'; c.beginPath(); c.moveTo(-6, 0 + bob); c.lineTo(6, 0 + bob);
    c.lineTo(3, -13 + bob); c.lineTo(-3, -13 + bob); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(35,12,38,.65)'; c.lineWidth = 1; c.stroke();
    c.strokeStyle = '#e8862e'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-4.6, -3 + bob); c.lineTo(4.6, -3 + bob); c.stroke();
    c.fillStyle = '#e8c99a'; c.beginPath(); c.arc(0, -15.5 + bob, 3.8, 0, 7); c.fill();
    c.fillStyle = '#42204a'; c.beginPath(); c.moveTo(-5, -15.5 + bob); c.lineTo(5, -15.5 + bob);
    c.lineTo(0, -24 + bob); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(35,12,38,.7)'; c.lineWidth = 1; c.stroke();
    const gl = 0.6 + Math.sin(t * 8 + u.id) * 0.35;
    c.save(); c.rotate((u.swing || 0) * 0.6);
    c.strokeStyle = '#6b4a2c'; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(6, 0 + bob); c.lineTo(9, -18 + bob); c.stroke();
    c.fillStyle = `rgba(255,150,40,${0.35 + gl * 0.3})`;
    c.beginPath(); c.arc(9.3, -20.5 + bob, 5 + gl * 1.6, 0, 7); c.fill();
    c.fillStyle = '#ffb347'; c.beginPath(); c.arc(9.3, -20.5 + bob, 2.6, 0, 7); c.fill();
    c.fillStyle = '#fff1c9'; c.beginPath(); c.arc(9.3, -21 + bob, 1.2, 0, 7); c.fill();
    c.restore();
  },
  gargoyle(c, u, t, bob) {
    const fl = Math.sin(t * 14 + u.id) * 5;
    c.fillStyle = 'rgba(90,60,120,.92)';
    c.beginPath(); c.moveTo(-3, -11 + bob); c.quadraticCurveTo(-15, -18 + bob - fl, -17, -9 + bob - fl);
    c.quadraticCurveTo(-10, -7.5 + bob, -3, -6.5 + bob); c.fill();
    c.beginPath(); c.moveTo(3, -11 + bob); c.quadraticCurveTo(15, -18 + bob - fl, 17, -9 + bob - fl);
    c.quadraticCurveTo(10, -7.5 + bob, 3, -6.5 + bob); c.fill();
    c.strokeStyle = 'rgba(40,20,60,.6)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-3, -11 + bob); c.quadraticCurveTo(-15, -18 + bob - fl, -17, -9 + bob - fl); c.stroke();
    c.beginPath(); c.moveTo(3, -11 + bob); c.quadraticCurveTo(15, -18 + bob - fl, 17, -9 + bob - fl); c.stroke();
    c.strokeStyle = '#5a3d80'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, -4 + bob); c.quadraticCurveTo(6, 0 + bob, 9, -3 + bob); c.stroke();
    c.fillStyle = '#7a52a8'; c.beginPath(); c.ellipse(0, -10 + bob, 5, 6.6, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(40,20,60,.65)'; c.lineWidth = 1.1; c.stroke();
    c.fillStyle = '#7a52a8';
    c.beginPath(); c.moveTo(-3.5, -15 + bob); c.lineTo(-5.5, -20 + bob); c.lineTo(-1.5, -16.5 + bob); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(3.5, -15 + bob); c.lineTo(5.5, -20 + bob); c.lineTo(1.5, -16.5 + bob); c.closePath(); c.fill();
    c.fillStyle = '#e3ccff'; c.beginPath(); c.arc(-1.8, -12 + bob, 1.3, 0, 7); c.arc(1.8, -12 + bob, 1.3, 0, 7); c.fill();
  },
  mender(c, u, t, bob) {
    // winged field-medic — ivory robe, feathered wings, green healing charm
    const fl = Math.sin(t * 10 + u.id) * 4;
    c.fillStyle = 'rgba(238,244,240,.94)';
    c.beginPath(); c.moveTo(-3, -12 + bob); c.quadraticCurveTo(-14, -20 + bob - fl, -16.5, -10 + bob - fl);
    c.quadraticCurveTo(-9.5, -8 + bob, -3, -7 + bob); c.fill();
    c.beginPath(); c.moveTo(3, -12 + bob); c.quadraticCurveTo(14, -20 + bob - fl, 16.5, -10 + bob - fl);
    c.quadraticCurveTo(9.5, -8 + bob, 3, -7 + bob); c.fill();
    c.strokeStyle = 'rgba(140,160,150,.6)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-3, -12 + bob); c.quadraticCurveTo(-14, -20 + bob - fl, -16.5, -10 + bob - fl); c.stroke();
    c.beginPath(); c.moveTo(3, -12 + bob); c.quadraticCurveTo(14, -20 + bob - fl, 16.5, -10 + bob - fl); c.stroke();
    c.fillStyle = '#e9f0ea'; c.beginPath(); c.moveTo(-5.5, 0 + bob); c.lineTo(5.5, 0 + bob);
    c.lineTo(3, -13 + bob); c.lineTo(-3, -13 + bob); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(120,140,130,.55)'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#e8c99a'; c.beginPath(); c.arc(0, -15.5 + bob, 4, 0, 7); c.fill();
    c.strokeStyle = 'rgba(90,70,50,.5)'; c.lineWidth = 1; c.stroke();
    c.strokeStyle = '#d8b25c'; c.lineWidth = 1.4;
    c.beginPath(); c.ellipse(0, -21.5 + bob, 4.2, 1.6, 0, 0, 7); c.stroke();
    const gl = 0.5 + Math.sin(t * 7 + u.id) * 0.3;
    c.fillStyle = `rgba(80,230,160,${0.3 + gl * 0.3})`;
    c.beginPath(); c.arc(6.5, -9 + bob, 3.6 + gl, 0, 7); c.fill();
    c.fillStyle = '#3fe0a3'; c.beginPath(); c.arc(6.5, -9 + bob, 1.8, 0, 7); c.fill();
    c.strokeStyle = '#eafff4'; c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(6.5, -11 + bob); c.lineTo(6.5, -7 + bob);
    c.moveTo(4.5, -9 + bob); c.lineTo(8.5, -9 + bob); c.stroke();
  },
  dragon(c, u, t, bob) {
    // crimson wyrm — broad webbed wings, gold belly, ember breath
    const fl = Math.sin(t * 8 + u.id) * 7;
    for (const sgn of [-1, 1] as const) {
      c.fillStyle = 'rgba(178,52,36,.95)';
      c.beginPath();
      c.moveTo(sgn * 3, -12 + bob);
      c.quadraticCurveTo(sgn * 20, -22 + bob - fl, sgn * 24, -8 + bob - fl);
      c.quadraticCurveTo(sgn * 14, -9 + bob, sgn * 8, -6 + bob);
      c.quadraticCurveTo(sgn * 5, -7 + bob, sgn * 3, -7 + bob);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(90,16,10,.7)';
      c.lineWidth = 1.2;
      c.stroke();
      c.beginPath();
      c.moveTo(sgn * 4, -10 + bob);
      c.lineTo(sgn * 18, -15 + bob - fl * 0.8);
      c.stroke();
    }
    c.strokeStyle = '#a83324';
    c.lineWidth = 3.4;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-2, -4 + bob);
    c.quadraticCurveTo(-10, 1 + bob, -15, -3 + bob + Math.sin(t * 5 + u.id) * 2);
    c.stroke();
    c.lineCap = 'butt';
    c.fillStyle = '#e0632f';
    c.beginPath();
    c.moveTo(-15, -6 + bob);
    c.lineTo(-19, -3 + bob);
    c.lineTo(-14, 0 + bob);
    c.closePath();
    c.fill();
    c.fillStyle = '#c8402f';
    c.beginPath(); c.ellipse(0, -9 + bob, 7.2, 9.2, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(90,16,10,.65)'; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = '#ffcf7a';
    c.beginPath(); c.ellipse(1.5, -6.5 + bob, 3.4, 5.2, 0, 0, 7); c.fill();
    c.fillStyle = '#c8402f';
    c.beginPath(); c.ellipse(5.5, -16 + bob, 4.6, 3.8, 0.3, 0, 7); c.fill();
    c.strokeStyle = 'rgba(90,16,10,.65)'; c.stroke();
    c.fillStyle = '#ffe9c9';
    c.beginPath(); c.moveTo(3, -19 + bob); c.lineTo(1.5, -23.5 + bob); c.lineTo(4.8, -20.5 + bob); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(6, -19.5 + bob); c.lineTo(5.8, -24.5 + bob); c.lineTo(8.4, -20.5 + bob); c.closePath(); c.fill();
    c.fillStyle = '#ffd24a';
    c.beginPath(); c.arc(7.4, -16.5 + bob, 1.2, 0, 7); c.fill();
    const ph = (t * 3 + u.id) % 1;
    c.fillStyle = 'rgba(255,' + String(150 + ((80 * (1 - ph)) | 0)) + ',40,' + (0.7 * (1 - ph)).toFixed(3) + ')';
    c.beginPath(); c.arc(10.5 + ph * 9, -15 + bob + ph * 2.5, 1.6 + ph * 2.4, 0, 7); c.fill();
  },
};

export function drawUnit(c: CanvasRenderingContext2D, u: DrawableUnit, t: number): void {
  const p = I(u.x, u.y);
  const air = TROOP[u.type].fly ? 22 : 0;
  shadowE(c, p.x, p.y + 2, air ? 7.5 : 10, air ? 3.2 : 4.4, air ? 0.16 : 0.3);
  const bob = u.moving ? Math.sin(t * 11 + u.id) * 1.7 : 0;
  c.save(); c.translate(p.x, p.y - air); c.scale(1.28, 1.28);
  UNIT_ART[u.type](c, u, t, bob);
  c.restore();
  if (u.hp < u.maxhp) hpBar(c, p.x, p.y - air - 36, 22, u.hp / u.maxhp);
  if (u.swing > 0) u.swing -= 0.12; else if (u.swing < 0) u.swing = 0;
}
