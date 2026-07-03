/**
 * Living village units: freshly trained troops walk out of the barracks to an
 * army camp, then idle around it. While the queue is training, a recruit
 * drills in front of the barracks. Purely visual — counts come from the
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
  /** fixed hang-out slot inside the camp — no two units share one */
  slot: number;
  /** trainee drill: swings left before pacing to the other mark */
  drill?: number;
}

let vunits: VUnit[] = [];
let trainee: VUnit | null = null;
let uid = 5000;
let firstSync = true;

const IDLE_CAP = 12; // per type, as in the prototype

/**
 * Camp-relative idle spots, chosen around the art: fire pit at (2,2), red
 * tent (0.45,2.25)-(1.75,3.4), blue tent (2.3,0.5)-(3.6,1.65). Ring seats
 * around the fire first, then the two free corners — nobody stands in the
 * flames or inside a tent.
 */
const CAMP_SLOTS: ReadonlyArray<readonly [number, number]> = [
  [0.95, 2.0], [3.1, 2.1], [2.1, 3.2], [2.0, 0.9],
  [0.8, 0.85], [1.65, 0.55], [0.55, 1.55],
  [3.3, 2.8], [2.8, 3.35], [3.5, 3.5],
  [1.35, 1.3], [2.9, 2.9],
];

function camps(): Array<{ gx: number; gy: number }> {
  return G.buildings.filter((b) => b.type === 'camp' && !b.busy);
}

function slotPos(campIx: number, slot: number): { x: number; y: number } {
  const cs = camps();
  if (!cs.length) return { x: 20, y: 20 };
  const c = cs[campIx % cs.length]!;
  if (slot < CAMP_SLOTS.length) {
    const s = CAMP_SLOTS[slot]!;
    return { x: c.gx + s[0], y: c.gy + s[1] };
  }
  // overflow: golden-angle ring just inside the pad edge
  const a = slot * 2.399963;
  return { x: c.gx + 2 + Math.cos(a) * 1.85, y: c.gy + 2 + Math.sin(a) * 1.45 };
}

/** The unit's own seat, with a light shuffle so the camp never looks frozen. */
function wanderSpot(u: VUnit): { x: number; y: number } {
  const p = slotPos(u.campIx, u.slot);
  return { x: p.x + (Math.random() - 0.5) * 0.32, y: p.y + (Math.random() - 0.5) * 0.26 };
}

/** Smallest seat index not taken by anyone else in the same camp. */
function nextSlot(campIx: number): number {
  const used = new Set(vunits.filter((u) => u.campIx === campIx).map((u) => u.slot));
  let s = 0;
  while (used.has(s)) s++;
  return s;
}

function barracksDoor(): { x: number; y: number } {
  const b = G.buildings.find((x) => x.type === 'barracks');
  if (!b) return { x: 20, y: 20 };
  return { x: b.gx + 1.0, y: b.gy + 2.7 };
}

function spawn(type: TroopType, fromBarracks: boolean): void {
  const campIx = (uid + vunits.length) % Math.max(1, camps().length);
  const slot = nextSlot(campIx);
  const target = slotPos(campIx, slot);
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
    slot,
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

/** Recruit drilling in the barracks yard while the training queue runs. */
function tickTrainee(dt: number): void {
  const head = G.trainQ[0];
  const bar =
    G.buildings.find((b) => b.type === 'barracks' && !b.busy) ??
    G.buildings.find((b) => b.type === 'barracks');
  if (!head || !bar) {
    trainee = null;
    return;
  }
  // drill marks along the front of the barracks
  const yardY = bar.gy + 3.3;
  const markA = { x: bar.gx + 0.7, y: yardY };
  const markB = { x: bar.gx + 2.3, y: yardY };
  if (!trainee || trainee.type !== head.type) {
    trainee = {
      id: 4999,
      type: head.type,
      x: markA.x,
      y: markA.y,
      tx: markB.x,
      ty: markB.y,
      hp: 1,
      maxhp: 1,
      moving: true,
      swing: 0,
      waitT: 0,
      campIx: 0,
      slot: 0,
      drill: 0,
    };
  }
  const u = trainee;
  const dx = u.tx - u.x, dy = u.ty - u.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (u.moving) {
    if (d > 0.05) {
      u.x += (dx / d) * 0.95 * dt;
      u.y += (dy / d) * 0.95 * dt;
    } else {
      // arrived at a mark: plant feet and run a set of practice swings
      u.moving = false;
      u.drill = 3;
      u.waitT = 0.25;
    }
  } else {
    u.waitT -= dt;
    if (u.waitT <= 0) {
      if ((u.drill ?? 0) > 0) {
        u.swing = 0.55;
        u.drill = (u.drill ?? 1) - 1;
        u.waitT = 0.55;
      } else {
        // pace to the other mark
        const other = Math.abs(u.tx - markA.x) < 0.01 ? markB : markA;
        u.tx = other.x;
        u.ty = other.y;
        u.moving = true;
      }
    }
  }
}

/** Wander/idle behavior, ~CoC camp vibes. */
export function tickVillageUnits(dt: number): void {
  if (G.mode !== 'village' && G.mode !== 'placing') return;
  tickTrainee(dt);
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
        const s = wanderSpot(u);
        u.tx = s.x;
        u.ty = s.y;
        u.waitT = 2 + Math.random() * 5;
      }
    }
  }
}

export function villageUnits(): ReadonlyArray<DrawableUnit> {
  return trainee ? [...vunits, trainee] : vunits;
}

export function resetVillageUnits(): void {
  vunits = [];
  trainee = null;
  firstSync = true;
  uid = 5000;
}
