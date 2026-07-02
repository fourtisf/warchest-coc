/**
 * Village systems — since P1 the SERVER is authoritative. Local ticks only
 * animate countdowns/production for display; every mutation is an API call
 * whose response re-hydrates local state.
 */
import {
  BUILD,
  QUESTS,
  TROOP,
  MAP,
  OBSTACLE_COST,
  canPlace as canPlaceOn,
  finishNowCostReal,
  fmt,
  type BuildingType,
  type QuestView,
  type TroopType,
} from '@warchest/game-core';
import { api, nowMs, prodPerSec, realBuildSeconds, realTrainSeconds, withVillage } from './api';
import { $ } from './dom';
import { FX } from './fx';
import { SFX } from './sfx';
import {
  G,
  MAX_BUILDERS,
  OCC,
  armyCap,
  capOf,
  countOf,
  freeBuilders,
  housingUsed,
  jobOf,
  keepLv,
  maxBarracksLv,
  type Obstacle,
  type VillageBuilding,
} from './state';
import { renderHUD } from './ui/hud';
import { closeSheet, refreshSheet } from './ui/sheet';
import { toast } from './ui/toasts';

/** set when a local countdown crosses zero → the main loop pulls /me once */
export const sync = { dirty: false, inflight: false };
export function markDirty(): void {
  sync.dirty = true;
}

export function canPlaceVillage(type: BuildingType, gx: number, gy: number, ignoreId?: number): boolean {
  return canPlaceOn(OCC, type, gx, gy, ignoreId);
}

export function questView(): QuestView {
  return {
    stat: G.stat,
    buildings: G.buildings,
    trophies: G.trophies,
    buildersTotal: G.buildersTotal,
    hasWallet: !!G.wallet,
  };
}

/* -------------------- display ticks (server owns the truth) -------------------- */
export function tickProduction(dt: number): void {
  for (const b of G.buildings) {
    if (b.busy) continue;
    if (b.type === 'mine' || b.type === 'well') {
      const L = BUILD[b.type].lv[b.level - 1]!;
      b.stored = Math.min((b.stored ?? 0) + prodPerSec(b.type, b.level) * dt, L.cap!);
    }
  }
}

let dustAcc = 0;

/** Rebuild the jobs view from busyUntil stamps; request a sync when one completes. */
export function tickJobs(dt = 1 / 60): void {
  const now = nowMs();
  const jobs: typeof G.jobs = [];
  let completed = false;
  for (const b of G.buildings) {
    if (b.busy && b.busyUntil !== undefined) {
      const tLeft = (b.busyUntil - now) / 1000;
      if (tLeft <= 0) {
        completed = true;
        continue;
      }
      jobs.push({ bid: b.id, tLeft, total: b.jobTotalS ?? Math.max(1, tLeft), kind: b.jobKind ?? 'new' });
    }
  }
  G.jobs = jobs;
  // obstacle clears finishing also need a server sync
  for (const o of G.obstacles)
    if (o.clearUntil !== undefined && o.clearUntil <= now) completed = true;
  if (completed) markDirty();
  // construction dust on active work sites, CoC-style
  dustAcc += dt;
  if (dustAcc > 1.4) {
    dustAcc = 0;
    for (const j of jobs) {
      const b = G.buildings.find((x) => x.id === j.bid);
      if (b) FX.dust(b.gx + BUILD[b.type].s / 2, b.gy + BUILD[b.type].s / 2);
    }
    for (const o of G.obstacles)
      if (o.clearUntil !== undefined && o.clearUntil > now) FX.hit(o.gx + 0.5, o.gy + 0.5);
  }
}

export function tickTraining(dt: number): void {
  if (!G.trainQ.length) return;
  const q = G.trainQ[0]!;
  if (q.finishesAt !== undefined) {
    q.tLeft = (q.finishesAt - nowMs()) / 1000;
    if (q.tLeft <= 0) markDirty();
  } else {
    // head not yet scheduled server-side; keep the visual bar moving
    q.tLeft = Math.max(0.5, q.tLeft - dt);
  }
}

/* ------------------------------- actions ------------------------------- */
export function collect(b: VillageBuilding): void {
  void (async () => {
    const before = { g: G.res.g, m: G.res.m };
    if (!(await withVillage(api.collect(b.id)))) return;
    const r = b.type === 'mine' ? 'g' : 'm';
    const got = G.res[r] - before[r];
    if (got <= 0) return;
    const cx = b.gx + 1.5, cy = b.gy + 1.5;
    FX.float(cx, cy, (r === 'g' ? '🪙 +' : '🔮 +') + fmt(got), r === 'g' ? '#ffd977' : '#c9a6ff');
    if (r === 'g') {
      FX.coins(cx, cy, 6);
      SFX.play('coin');
    } else SFX.play('mana');
    renderHUD();
    refreshSheet();
    updateQuestBadge();
  })();
}

export function trainTroop(t: TroopType): void {
  const T = TROOP[t];
  if (maxBarracksLv() < T.unlock) {
    toast(`Requires Barracks Level ${T.unlock}`, 'warn');
    SFX.play('err');
    return;
  }
  if (housingUsed() + T.house > armyCap()) {
    toast('Army camps are full', 'warn');
    SFX.play('err');
    return;
  }
  if (G.res.m < T.cost) {
    toast('Not enough Mana', 'warn');
    SFX.play('err');
    return;
  }
  void (async () => {
    if (await withVillage(api.train(t))) {
      SFX.play('tap');
      renderHUD();
      refreshSheet();
    } else SFX.play('err');
  })();
}

/* ---------------- placement / moving (ghost stays local) ---------------- */
export function startPlace(type: BuildingType): void {
  const B = BUILD[type];
  closeSheet();
  G.sel = null;
  const c = Math.round(MAP / 2 - B.s / 2);
  let gx = c, gy = c;
  outer: for (let r = 0; r < 14; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (canPlaceVillage(type, c + dx, c + dy)) {
          gx = c + dx;
          gy = c + dy;
          break outer;
        }
      }
  G.place = { type, gx, gy, moving: null };
  G.mode = 'placing';
  $('placeUI').style.display = 'flex';
}

export function startMove(b: VillageBuilding): void {
  closeSheet();
  G.sel = null;
  G.place = { type: b.type, gx: b.gx, gy: b.gy, moving: b.id, prevGx: b.gx, prevGy: b.gy };
  G.mode = 'placing';
  $('placeUI').style.display = 'flex';
}

export function placeCancel(): void {
  if (G.place && G.place.moving) {
    const b = G.buildings.find((x) => x.id === G.place!.moving);
    if (b) {
      b.gx = G.place.prevGx!;
      b.gy = G.place.prevGy!;
    }
  }
  G.place = null;
  G.mode = 'village';
  $('placeUI').style.display = 'none';
}

function endPlacing(): void {
  G.place = null;
  G.mode = 'village';
  $('placeUI').style.display = 'none';
}

export function placeConfirm(): void {
  const P = G.place;
  if (!P) return;
  const B = BUILD[P.type];
  const ignore = P.moving ?? -999;
  if (!canPlaceVillage(P.type, P.gx, P.gy, ignore)) {
    SFX.play('err');
    return;
  }
  const { type, gx, gy, moving } = P;
  void (async () => {
    if (moving) {
      if (await withVillage(api.move(moving, gx, gy))) {
        endPlacing();
        SFX.play('build');
        FX.dust(gx + B.s / 2, gy + B.s / 2);
      }
      return;
    }
    if (G.res[B.res] < B.lv[0]!.c) {
      toast(B.res === 'w' ? 'Not enough $WAR' : 'Not enough resources', 'warn');
      SFX.play('err');
      return;
    }
    if (!(await withVillage(api.place(type, gx, gy)))) {
      SFX.play('err');
      return;
    }
    endPlacing();
    SFX.play('build');
    FX.dust(gx + B.s / 2, gy + B.s / 2);
    renderHUD();
    updateQuestBadge();
    // wall chaining like COC
    if (type === 'wall' && G.res[B.res] >= B.lv[0]!.c && countOf('wall') < BUILD.wall.max[keepLv() - 1]!) {
      startPlace('wall');
    }
  })();
}

/* ------------------------------- upgrades ------------------------------- */
export interface UpgradeCheck {
  ok: boolean;
  why?: string;
}

export function canUpgrade(b: VillageBuilding): UpgradeCheck {
  const B = BUILD[b.type];
  if (b.busy) return { ok: false, why: 'Under construction' };
  if (b.level >= B.lv.length) return { ok: false, why: 'Max level' };
  if (b.type !== 'keep' && b.level >= keepLv())
    return { ok: false, why: `Requires Keep Level ${b.level + 1}` };
  const lv = B.lv[b.level]!;
  if (G.res[B.res] < lv.c)
    return { ok: false, why: 'Not enough ' + (B.res === 'g' ? 'Gold' : B.res === 'm' ? 'Mana' : '$WAR') };
  if (realBuildSeconds(b.type, b.level + 1) > 0 && freeBuilders() <= 0)
    return { ok: false, why: 'All builders are busy' };
  return { ok: true };
}

export function startUpgrade(b: VillageBuilding): void {
  const chk = canUpgrade(b);
  if (!chk.ok) {
    toast(chk.why ?? '', 'warn');
    SFX.play('err');
    return;
  }
  void (async () => {
    if (await withVillage(api.upgrade(b.id))) {
      const B = BUILD[b.type];
      const nb = G.buildings.find((x) => x.id === b.id);
      if (nb && !nb.busy) {
        SFX.play('done');
        toast(`${B.emoji} ${B.n} → Level ${nb.level}`, 'ok');
      } else SFX.play('build');
      renderHUD();
      refreshSheet();
      updateQuestBadge();
    } else SFX.play('err');
  })();
}

export function finishNow(bid: number): void {
  void (async () => {
    if (await withVillage(api.finishNow(bid))) {
      SFX.play('done');
      renderHUD();
      refreshSheet();
      updateQuestBadge();
    } else SFX.play('err');
  })();
}

export function rushTraining(): void {
  void (async () => {
    if (await withVillage(api.rushTraining())) {
      SFX.play('done');
      renderHUD();
      refreshSheet();
      updateQuestBadge();
    } else SFX.play('err');
  })();
}

/* ------------------------------- obstacles ------------------------------ */
export function clearObstacle(ob: Obstacle): void {
  if (G.res.g < OBSTACLE_COST[ob.kind]) {
    toast('Not enough Gold', 'warn');
    SFX.play('err');
    return;
  }
  void (async () => {
    if (!(await withVillage(api.clearObstacle(ob.id)))) {
      SFX.play('err');
      return;
    }
    // a builder walks over and starts working — the ◆ pops when they finish
    FX.dust(ob.gx + 0.5, ob.gy + 0.5);
    SFX.play('build');
    G.sel = null;
    closeSheet();
    renderHUD();
    updateQuestBadge();
  })();
}

/* -------------------------------- quests -------------------------------- */
/** The server completes & credits quests; the client only maintains the badge. */
export function updateQuestBadge(): void {
  let n = 0;
  for (const q of QUESTS) if (!G.questDone[q.id]) n++;
  const badge = $('questBadge');
  badge.style.display = n ? 'flex' : 'none';
  badge.textContent = String(n);
}

/** Cost previews for the sheet UI (server recomputes authoritatively). */
export const uiFinishCost = (tLeft: number): number => finishNowCostReal(tLeft);
export const uiTrainSeconds = realTrainSeconds;
export const uiBuildSeconds = realBuildSeconds;
export { jobOf };
