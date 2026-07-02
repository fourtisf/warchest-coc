/** Obstacle art (trees / rocks) — ported verbatim from the prototype's OBST_ART. */
import { I, shadowE } from './helpers';
import type { ObstacleArtFn } from './drawable';

export const OBST_ART: Record<'tree' | 'rock', ObstacleArtFn> = {
  tree(c, o, t) {
    const p = I(o.gx + 0.5, o.gy + 0.5); const sw = Math.sin(t * 1.2 + o.id) * 1.5;
    shadowE(c, p.x, p.y + 2, 14, 5.5, 0.3);
    c.fillStyle = '#6b4a2c'; c.fillRect(p.x - 2.6, p.y - 14, 5.2, 16);
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(p.x + 0.4, p.y - 14, 2.2, 16);
    c.fillStyle = '#2e6a33'; c.beginPath(); c.arc(p.x, p.y - 24, 13, 0, 7);
    c.arc(p.x - 8, p.y - 18, 9, 0, 7); c.arc(p.x + 8, p.y - 18, 9, 0, 7); c.fill();
    c.strokeStyle = 'rgba(18,42,16,.55)'; c.lineWidth = 1.3;
    c.beginPath(); c.arc(p.x, p.y - 24, 13, 0, 7); c.stroke();
    c.fillStyle = '#3f8a41'; c.beginPath(); c.arc(p.x - 4 + sw, p.y - 27, 8.5, 0, 7); c.arc(p.x + 6 + sw, p.y - 24, 7.5, 0, 7); c.fill();
    c.fillStyle = '#5aa851'; c.beginPath(); c.arc(p.x + 1 + sw, p.y - 30, 5.8, 0, 7); c.fill();
  },
  rock(c, o, t) {
    const p = I(o.gx + 0.5, o.gy + 0.5); shadowE(c, p.x, p.y + 2, 12, 5, 0.3);
    c.fillStyle = '#7e8a80'; c.beginPath(); c.moveTo(p.x - 11, p.y); c.lineTo(p.x - 5, p.y - 11);
    c.lineTo(p.x + 4, p.y - 13); c.lineTo(p.x + 11, p.y - 3); c.lineTo(p.x + 7, p.y + 3); c.lineTo(p.x - 7, p.y + 3); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(50,60,52,.6)'; c.lineWidth = 1.4; c.stroke();
    c.fillStyle = '#97a399'; c.beginPath(); c.moveTo(p.x - 5, p.y - 11); c.lineTo(p.x + 4, p.y - 13);
    c.lineTo(p.x + 6, p.y - 6); c.lineTo(p.x - 2, p.y - 5); c.closePath(); c.fill();
    c.fillStyle = 'rgba(90,160,80,.55)'; c.beginPath(); c.ellipse(p.x - 6, p.y - 2, 4, 2.2, 0, 0, 7); c.fill();
  },
};
