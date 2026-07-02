/** Projectile art — ported verbatim from the prototype's drawProj. */
import type { Projectile } from '@warchest/game-core';
import { I, shadowE } from './helpers';

export function drawProj(c: CanvasRenderingContext2D, pr: Projectile): void {
  if (pr.kind === 'arrow') {
    const p = I(pr.x, pr.y); const a = Math.atan2(pr.dy * 0.5, pr.dx);
    c.save(); c.translate(p.x, p.y - pr.h); c.rotate(a);
    c.strokeStyle = '#e8dcc0'; c.lineWidth = 2; c.beginPath(); c.moveTo(-6, 0); c.lineTo(6, 0); c.stroke();
    c.fillStyle = '#c9c2b2'; c.beginPath(); c.moveTo(6, 0); c.lineTo(2, -2.4); c.lineTo(2, 2.4); c.closePath(); c.fill(); c.restore();
  } else if (pr.kind === 'ball') {
    const p = I(pr.x, pr.y);
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(p.x, p.y, 3.5, 0, 7); c.fill();
    c.fillStyle = '#23262c'; c.beginPath(); c.arc(p.x, p.y - pr.h, 5, 0, 7); c.fill();
    c.fillStyle = '#4a5160'; c.beginPath(); c.arc(p.x - 1.5, p.y - pr.h - 1.5, 1.8, 0, 7); c.fill();
  } else if (pr.kind === 'shell') {
    const p = I(pr.x, pr.y); const hh = Math.sin(Math.PI * pr.tArc) * 58;
    shadowE(c, p.x, p.y, 5, 2.4, 0.3);
    c.fillStyle = '#1c2027'; c.beginPath(); c.arc(p.x, p.y - hh - 6, 5.5, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,160,60,.8)'; c.beginPath(); c.arc(p.x, p.y - hh - 6, 2.3, 0, 7); c.fill();
  }
}
