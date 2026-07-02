/**
 * Living village units: freshly trained troops walk out of the barracks to an
 * army camp, then wander/idle around it. Purely visual — counts come from the
 * server; this layer only gives them bodies.
 */
import { TROOP_ORDER, type TroopType } from '@warchest/game-core';
import type { DrawableUnit } from './art/drawable';
import { G } from './state';

interface VUnit extends DrawableUnit {
  tx: number;
  ty: number;
  waitT: number;
  campIx: number;
}

let vunits: VUnit[] = [];
let uid = 5000;
let firstSync = true;

const IDLE_CAP = 12; // per type, as in the prototype

function camps(): Array<{ gx: number; gy: number }> {
  return G.buildings.filter((b) => b.type === 'camp' && !b.busy);
}

function campSpot(campIx: number): { x: number; y: number } {
  const cs = camps();
  if (!cs.length) return { x: 20, y: 20 };
  const c = cs[campIx % cs.length]!;
  const ang = Math.random() * Math.PI * 2;
  const rad = 0.9 + Math.random() * 1.1;
  return { x: c.gx + 2 + Math.cos(ang) * rad, y: c.gy + 2 + Math.sin(ang) * rad * 0.8 };
}

function barracksDoor(): { x: number; y: number } {
  const b = G.buildings.find((x) => x.type === 'barracks');
  if (!b) return campSpot(0);
  return { x: b.gx + 1.0, y: b.gy + 2.7 };
}

function spawn(type: TroopType, fromBarracks: boolean): void {
  const campIx = (uid + vunits.length) % Math.max(1, camps().length);
  const target = campSpot(campIx);
  const at = fromBarracks ? barracksDoor() : target;
  vunits.push({
    id: uid++,
    type,
    x: at.x,
    y: at.y,
    tx: target.x,
    ty: target.y,
    hp: 1,
    maxhp: 1,
    moving: fromBarracks,
    swing: 0,
    waitT: 1 + Math.random() * 3,
    campIx,
  });
}

/** Reconcile visual units with the authoritative army counts (call after hydrate). */
export function syncVillageUnits(): void {
  if (!camps().length) {
    vunits = [];
    return;
  }
  for (const t of TROOP_ORDER) {
    const target = Math.min(G.army[t], IDLE_CAP);
    const mine = vunits.filter((u) => u.type === t);
    if (mine.length < target) {
      // new troops march out of the barracks (except on the very first load)
      for (let i = mine.length; i < target; i++) spawn(t, !firstSync);
    } else if (mine.length > target) {
      let toRemove = mine.length - target;
      vunits = vunits.filter((u) => {
        if (u.type === t && toRemove > 0) {
          toRemove--;
          return false;
        }
        return true;
      });
    }
  }
  firstSync = false;
}

/** Wander/walk behavior, ~CoC camp vibes. */
export function tickVillageUnits(dt: number): void {
  if (G.mode !== 'village' && G.mode !== 'placing') return;
  for (const u of vunits) {
    const dx = u.tx - u.x, dy = u.ty - u.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 0.06) {
      u.moving = true;
      const spd = 0.65;
      u.x += (dx / d) * spd * dt;
      u.y += (dy / d) * spd * dt;
    } else {
      u.moving = false;
      u.waitT -= dt;
      if (u.waitT <= 0) {
        const s = campSpot(u.campIx);
        u.tx = s.x;
        u.ty = s.y;
        u.waitT = 2 + Math.random() * 5;
      }
    }
  }
}

export function villageUnits(): ReadonlyArray<DrawableUnit> {
  return vunits;
}

export function resetVillageUnits(): void {
  vunits = [];
  firstSync = true;
  uid = 5000;
}
