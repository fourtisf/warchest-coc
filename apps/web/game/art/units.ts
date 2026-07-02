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
