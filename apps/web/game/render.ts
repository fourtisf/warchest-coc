/** Main renderer — ported verbatim from the prototype's render(). */
import { BUILD, TROOP, TROOP_ORDER, mulberry32, tstr, type TroopType } from '@warchest/game-core';
import { ART } from './art/buildings';
import type { DrawableBuilding, DrawableUnit } from './art/drawable';
import { I, bShadow, hpBar, pad, prism, woodPost } from './art/helpers';
import { OBST_ART } from './art/obstacles';
import { drawProj } from './art/projectiles';
import { drawUnit } from './art/units';
import { CAM, VP, ctx2d, view, w2s } from './camera';
import { $ } from './dom';
import { FX } from './fx';
import { G, jobOf, nowMs, type VillageBuilding } from './state';
import { canPlaceVillage } from './systems';
import { groundOrThrow } from './world';

function jobTimeText(c: CanvasRenderingContext2D, x: number, y: number, secs: number): void {
  c.font = '700 11px Rubik,sans-serif';
  c.textAlign = 'center';
  const txt = tstr(Math.max(0, secs));
  c.lineWidth = 3;
  c.strokeStyle = 'rgba(0,0,0,.65)';
  c.strokeText(txt, x, y);
  c.fillStyle = '#ffd977';
  c.fillText(txt, x, y);
}

function workerHammer(c: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const sw = Math.sin(t * 7) * 0.6;
  c.save();
  c.translate(x, y);
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

/** CoC-style construction site drawn instead of the finished art while a NEW building is going up. */
function drawConstructionSite(c: CanvasRenderingContext2D, b: DrawableBuilding, s: number, t: number): void {
  bShadow(c, b, s);
  pad(c, b, s, 'dirt');
  prism(c, b.gx + 0.25, b.gy + 0.25, s - 0.5, s - 0.5, 6, '#c2a76e', '#8f7a4b', '#a8905c');
  // corner scaffold posts + beams
  const corners: Array<[number, number]> = [
    [0.3, 0.3], [s - 0.3, 0.3], [0.3, s - 0.3], [s - 0.3, s - 0.3],
  ];
  for (const [dx, dy] of corners) {
    const p = I(b.gx + dx, b.gy + dy);
    woodPost(c, p.x, p.y - 4, p.x, p.y - 26, 3);
  }
  const a = I(b.gx + 0.3, b.gy + 0.3), b2 = I(b.gx + s - 0.3, b.gy + 0.3), d = I(b.gx + 0.3, b.gy + s - 0.3);
  woodPost(c, a.x, a.y - 24, b2.x, b2.y - 24, 2.2);
  woodPost(c, a.x, a.y - 24, d.x, d.y - 24, 2.2);
  // plank pile + swinging hammer
  prism(c, b.gx + s / 2 - 0.35, b.gy + s / 2 - 0.2, 0.7, 0.45, 4, '#c2925a', '#7d5a30', '#a3773f');
  const hp = I(b.gx + s / 2, b.gy + s / 2);
  workerHammer(c, hp.x + 9, hp.y - 16, t);
}

function drawSel(c: CanvasRenderingContext2D, b: DrawableBuilding): void {
  const s = BUILD[b.type].s;
  const a = I(b.gx - 0.1, b.gy - 0.1), bb = I(b.gx + s + 0.1, b.gy - 0.1),
    e = I(b.gx + s + 0.1, b.gy + s + 0.1), f = I(b.gx - 0.1, b.gy + s + 0.1);
  c.strokeStyle = `rgba(255,255,255,${0.5 + Math.sin(G.t * 5) * 0.25})`;
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(a.x, a.y);
  c.lineTo(bb.x, bb.y);
  c.lineTo(e.x, e.y);
  c.lineTo(f.x, f.y);
  c.closePath();
  c.stroke();
}

function drawGhost(c: CanvasRenderingContext2D): void {
  const P = G.place;
  if (!P) return;
  const s = BUILD[P.type].s;
  const ok = canPlaceVillage(P.type, P.gx, P.gy, P.moving ?? -999);
  const a = I(P.gx, P.gy), bb = I(P.gx + s, P.gy), e = I(P.gx + s, P.gy + s), f = I(P.gx, P.gy + s);
  c.fillStyle = ok ? 'rgba(80,220,110,.32)' : 'rgba(230,70,70,.35)';
  c.beginPath();
  c.moveTo(a.x, a.y);
  c.lineTo(bb.x, bb.y);
  c.lineTo(e.x, e.y);
  c.lineTo(f.x, f.y);
  c.closePath();
  c.fill();
  c.save();
  c.globalAlpha = 0.85;
  const src = P.moving ? G.buildings.find((x) => x.id === P.moving) : { id: 9999, level: 1, hp: 1, stored: 0 };
  const dummy = { ...src, type: P.type, gx: P.gx, gy: P.gy, _list: [] } as DrawableBuilding;
  try {
    ART[P.type](c, dummy, G.t);
  } catch {
    /* ghost art errors are non-fatal, as in the prototype */
  }
  c.restore();
}

/** Troops lounging around army camps in village mode. */
function idleUnits(): DrawableUnit[] {
  const out: DrawableUnit[] = [];
  if (G.mode !== 'village' && G.mode !== 'placing') return out;
  const camps = G.buildings.filter((b) => b.type === 'camp' && !b.busy);
  if (!camps.length) return out;
  let ci = 0, slot = 0;
  for (const t of TROOP_ORDER) {
    for (let i = 0; i < Math.min(G.army[t], 12); i++) {
      const camp = camps[ci % camps.length]!;
      const rr = mulberry32(slot * 97 + 7);
      const ang = rr() * Math.PI * 2, rad = 0.9 + rr() * 1.1;
      out.push({
        id: 1000 + slot,
        type: t,
        x: camp.gx + 2 + Math.cos(ang) * rad,
        y: camp.gy + 2 + Math.sin(ang) * rad * 0.8,
        hp: 1, maxhp: 1, moving: false, swing: 0,
      });
      ci++;
      slot++;
    }
  }
  return out;
}

type RenderItem =
  | { k: 'b'; o: DrawableBuilding; z: number }
  | { k: 'o'; o: (typeof G.obstacles)[number]; z: number }
  | { k: 'u'; o: DrawableUnit; z: number };

export function render(): void {
  const ctx = ctx2d();
  const ground = groundOrThrow();
  ctx.setTransform(VP.DPR, 0, 0, VP.DPR, 0, 0);
  const bg = ctx.createLinearGradient(0, 0, 0, VP.H);
  bg.addColorStop(0, '#101821');
  bg.addColorStop(1, '#0a0f16');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VP.W, VP.H);
  ctx.setTransform(
    VP.DPR * CAM.z, 0, 0, VP.DPR * CAM.z,
    VP.DPR * (VP.W / 2 - CAM.x * CAM.z),
    VP.DPR * (VP.H / 2 - CAM.y * CAM.z),
  );
  ctx.drawImage(ground.cv, -ground.ox, -ground.oy);
  const inBattle = G.mode === 'battle' || G.mode === 'battle_deploy';
  if (inBattle && G.battle && !G.battle.sim.over)
    ctx.drawImage(G.battle.red, -ground.ox, -ground.oy);
  // selection under buildings
  if (!inBattle && G.sel) {
    const b = G.buildings.find((x) => x.id === G.sel);
    if (b) drawSel(ctx, b);
  }
  // drawables
  const list: ReadonlyArray<DrawableBuilding> = inBattle && G.battle ? G.battle.sim.buildings : G.buildings;
  const items: RenderItem[] = [];
  for (const b of list) {
    if (b.dead) continue;
    if (G.place && G.place.moving === b.id) continue;
    (b as { _list?: ReadonlyArray<DrawableBuilding> })._list = list;
    items.push({ k: 'b', o: b, z: b.gx + b.gy + BUILD[b.type].s });
  }
  if (!inBattle)
    for (const ob of G.obstacles) {
      if (ob.dead) continue;
      items.push({ k: 'o', o: ob, z: ob.gx + ob.gy + 1 });
    }
  const units: ReadonlyArray<DrawableUnit> = inBattle && G.battle ? G.battle.sim.troops : idleUnits();
  for (const u of units) {
    if (u.dead) continue;
    items.push({ k: 'u', o: u, z: u.x + u.y + (TROOP[u.type as TroopType].fly ? 3 : 0) });
  }
  items.sort((a, b) => a.z - b.z);
  for (const it of items) {
    if (it.k === 'b') {
      const b = it.o;
      const s = BUILD[b.type].s, cx = b.gx + s / 2;
      const job = !inBattle ? jobOf(b.id) : undefined;
      const underConstruction = job && (b as VillageBuilding).jobKind === 'new';
      if (underConstruction) drawConstructionSite(ctx, b, s, G.t);
      else ART[b.type](ctx, b, G.t);
      if (!inBattle) {
        if (job) {
          const p = I(cx, b.gy + s / 2);
          const top = underConstruction
            ? p.y - 46
            : p.y - (b.type === 'keep' ? 120 : b.type === 'arrow' ? 96 : b.type === 'wall' ? 34 : 70);
          hpBar(ctx, p.x, top, 34, 1 - job.tLeft / job.total, '#f2b430');
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🔨', p.x, top - 6);
          jobTimeText(ctx, p.x, top + 16, job.tLeft);
        }
      } else if (b.hp !== undefined && b.maxhp !== undefined && b.hp < b.maxhp) {
        const p = I(cx, b.gy + s / 2);
        hpBar(
          ctx, p.x,
          p.y - (b.type === 'keep' ? 126 : b.type === 'arrow' ? 102 : b.type === 'wall' ? 36 : 76),
          30, b.hp / b.maxhp,
        );
      }
    } else if (it.k === 'o') {
      OBST_ART[it.o.kind](ctx, it.o, G.t);
      const ob = it.o;
      if (ob.clearUntil !== undefined && ob.clearTotalS) {
        const tLeft = (ob.clearUntil - nowMs()) / 1000;
        if (tLeft > 0) {
          const p = I(ob.gx + 0.5, ob.gy + 0.5);
          hpBar(ctx, p.x, p.y - 46, 30, 1 - tLeft / ob.clearTotalS, '#f2b430');
          workerHammer(ctx, p.x + 12, p.y - 12, G.t);
          jobTimeText(ctx, p.x, p.y - 52, tLeft);
        }
      }
    } else drawUnit(ctx, it.o, G.t);
  }
  if (inBattle && G.battle) for (const p of G.battle.sim.projs) drawProj(ctx, p);
  if (G.mode === 'placing') drawGhost(ctx);
  // quest guide arrow
  const GUIDE = view.GUIDE;
  if (GUIDE && G.t < GUIDE.until && (G.mode === 'village' || G.mode === 'placing')) {
    const gp = I(GUIDE.gx, GUIDE.gy);
    const bo = Math.sin(G.t * 6) * 6;
    const ay = gp.y - GUIDE.h - 26 - bo;
    const hs = GUIDE.s / 2;
    const ra = I(GUIDE.gx - hs, GUIDE.gy - hs), rb = I(GUIDE.gx + hs, GUIDE.gy - hs),
      re = I(GUIDE.gx + hs, GUIDE.gy + hs), rf = I(GUIDE.gx - hs, GUIDE.gy + hs);
    ctx.strokeStyle = 'rgba(242,180,48,' + (0.55 + Math.sin(G.t * 5) * 0.3) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ra.x, ra.y);
    ctx.lineTo(rb.x, rb.y);
    ctx.lineTo(re.x, re.y);
    ctx.lineTo(rf.x, rf.y);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = '#f2b430';
    ctx.strokeStyle = '#7d5406';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gp.x, ay + 18);
    ctx.lineTo(gp.x - 13, ay);
    ctx.lineTo(gp.x - 5, ay);
    ctx.lineTo(gp.x - 5, ay - 14);
    ctx.lineTo(gp.x + 5, ay - 14);
    ctx.lineTo(gp.x + 5, ay);
    ctx.lineTo(gp.x + 13, ay);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  FX.draw(ctx);
  // place UI position (DOM)
  if (G.mode === 'placing' && G.place) {
    const s = BUILD[G.place.type].s;
    const sp = w2s(G.place.gx + s / 2, G.place.gy + s);
    const ui = $('placeUI');
    ui.style.left = sp.x + 'px';
    ui.style.top = Math.min(VP.H - 70, sp.y + 16) + 'px';
    ($('placeOK') as HTMLButtonElement).disabled = !canPlaceVillage(
      G.place.type, G.place.gx, G.place.gy, G.place.moving ?? -999,
    );
  }
}
