/** Village systems — production, jobs, training, placement, upgrades, quests. Ported verbatim. */
import {
  BUILD,
  QUESTS,
  TROOP,
  MAP,
  canPlace as canPlaceOn,
  finishNowCostDemo,
  type BuildingType,
  type QuestView,
  type TroopType,
} from '@warchest/game-core';
import { fmt } from '@warchest/game-core';
import { $ } from './dom';
import { FX } from './fx';
import { SFX } from './sfx';
import {
  DEMO_SPEED,
  G,
  MAX_BUILDERS,
  OCC,
  addRes,
  armyCap,
  capOf,
  countOf,
  freeBuilders,
  housingUsed,
  jobOf,
  keepLv,
  maxBarracksLv,
  mkB,
  pay,
  rebuildOcc,
  type Obstacle,
  type VillageBuilding,
} from './state';
import { view } from './camera';
import { renderHUD } from './ui/hud';
import { closeSheet, refreshSheet } from './ui/sheet';
import { toast } from './ui/toasts';

/** Placement check against the live village occupancy grid (buildings + obstacles). */
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

/* ---------------- production / collection ---------------- */
export function tickProduction(dt: number): void {
  for (const b of G.buildings) {
    if (b.busy) continue;
    if (b.type === 'mine' || b.type === 'well') {
      const L = BUILD[b.type].lv[b.level - 1]!;
      b.stored = Math.min(Math.max((b.stored ?? 0) + L.rate! * dt * DEMO_SPEED, 0), L.cap!);
    }
  }
}

export function collect(b: VillageBuilding): boolean {
  const amt = Math.floor(b.stored ?? 0);
  if (amt < 5) return false;
  const r = b.type === 'mine' ? 'g' : 'm';
  const got = addRes(r, amt, true);
  b.stored = (b.stored ?? 0) - amt;
  if (r === 'g') G.stat.gCollected += got;
  else G.stat.mCollected += got;
  const cx = b.gx + 1.5, cy = b.gy + 1.5;
  FX.float(cx, cy, (r === 'g' ? '🪙 +' : '🔮 +') + fmt(got), r === 'g' ? '#ffd977' : '#c9a6ff');
  if (r === 'g') {
    FX.coins(cx, cy, 6);
    SFX.play('coin');
  } else SFX.play('mana');
  checkQuests();
  renderHUD();
  return true;
}

/* ---------------- build / upgrade jobs ---------------- */
export function tickJobs(dt: number): void {
  for (const j of [...G.jobs]) {
    j.tLeft -= dt * DEMO_SPEED;
    if (j.tLeft <= 0) {
      const b = G.buildings.find((x) => x.id === j.bid);
      G.jobs = G.jobs.filter((x) => x !== j);
      if (b) {
        if (j.kind === 'up') {
          b.level++;
          b.hp = BUILD[b.type].lv[b.level - 1]!.hp;
        }
        b.busy = false;
        FX.dust(b.gx + BUILD[b.type].s / 2, b.gy + BUILD[b.type].s / 2);
        SFX.play('done');
        toast(`${BUILD[b.type].emoji} ${BUILD[b.type].n} → Level ${b.level}`, 'ok');
      }
      renderHUD();
      refreshSheet();
      checkQuests();
    }
  }
}

/* ---------------- training ---------------- */
export function tickTraining(dt: number): void {
  if (!G.trainQ.length) return;
  const spd = Math.max(1, G.buildings.filter((b) => b.type === 'barracks' && !b.busy).length);
  const q = G.trainQ[0]!;
  q.tLeft -= dt * spd * DEMO_SPEED;
  if (q.tLeft <= 0) {
    G.trainQ.shift();
    G.army[q.type]++;
    G.stat.trained++;
    G.stat.tTypes[q.type] = (G.stat.tTypes[q.type] ?? 0) + 1;
    SFX.play('tap');
    checkQuests();
    refreshSheet();
    renderHUD();
  }
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
  if (!pay(T.cost, 'm')) {
    toast('Not enough Mana', 'warn');
    SFX.play('err');
    return;
  }
  G.trainQ.push({ type: t, tLeft: T.tt, total: T.tt });
  SFX.play('tap');
  renderHUD();
  refreshSheet();
}

/* ---------------- placement / moving ---------------- */
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
  rebuildOcc();
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
  if (P.moving) {
    const b = G.buildings.find((x) => x.id === P.moving);
    if (b) {
      b.gx = P.gx;
      b.gy = P.gy;
      G.place = null;
      G.mode = 'village';
      $('placeUI').style.display = 'none';
      rebuildOcc();
      SFX.play('build');
      FX.dust(b.gx + B.s / 2, b.gy + B.s / 2);
    }
    return;
  }
  const lv = B.lv[0]!;
  if (!pay(lv.c, B.res)) {
    toast(B.res === 'w' ? 'Not enough $WAR' : 'Not enough resources', 'warn');
    SFX.play('err');
    return;
  }
  const b = mkB(P.type, P.gx, P.gy, 1);
  G.buildings.push(b);
  G.stat.built++;
  if (P.type === 'hut') G.buildersTotal = Math.min(MAX_BUILDERS, G.buildersTotal + 1);
  if (lv.t > 0) {
    b.busy = true;
    G.jobs.push({ bid: b.id, tLeft: lv.t, total: lv.t, kind: 'new' });
  }
  rebuildOcc();
  SFX.play('build');
  FX.dust(P.gx + B.s / 2, P.gy + B.s / 2);
  G.place = null;
  G.mode = 'village';
  $('placeUI').style.display = 'none';
  renderHUD();
  checkQuests();
  // wall chaining like COC
  if (P.type === 'wall' && G.res[B.res] >= lv.c && countOf('wall') < BUILD.wall.max[keepLv() - 1]!) {
    startPlace('wall');
  }
}

/* ---------------- upgrades ---------------- */
export interface UpgradeCheck {
  ok: boolean;
  why?: string;
  lv?: (typeof BUILD)['keep']['lv'][number];
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
  if (freeBuilders() <= 0) return { ok: false, why: 'All builders are busy' };
  return { ok: true, lv };
}

export function startUpgrade(b: VillageBuilding): void {
  const chk = canUpgrade(b);
  if (!chk.ok || !chk.lv) {
    toast(chk.why ?? '', 'warn');
    SFX.play('err');
    return;
  }
  const B = BUILD[b.type];
  pay(chk.lv.c, B.res);
  if (chk.lv.t <= 0) {
    b.level++;
    b.hp = BUILD[b.type].lv[b.level - 1]!.hp;
    SFX.play('done');
    toast(`${B.emoji} ${B.n} → Level ${b.level}`, 'ok');
    checkQuests();
  } else {
    b.busy = true;
    G.jobs.push({ bid: b.id, tLeft: chk.lv.t, total: chk.lv.t, kind: 'up' });
    SFX.play('build');
  }
  renderHUD();
  refreshSheet();
}

export function finishNow(bid: number): void {
  const j = jobOf(bid);
  if (!j) return;
  const cost = finishNowCostDemo(j.tLeft);
  if (!pay(cost, 'w')) {
    toast('Not enough $WAR', 'warn');
    SFX.play('err');
    return;
  }
  j.tLeft = 0;
  renderHUD();
}

/* ---------------- obstacles ---------------- */
export function clearObstacle(ob: Obstacle): void {
  const cost = ob.kind === 'tree' ? 80 : 60;
  if (!pay(cost, 'g')) {
    toast('Not enough Gold', 'warn');
    SFX.play('err');
    return;
  }
  ob.dead = true;
  rebuildOcc();
  const rw = 3 + ((ob.id * 7) % 4);
  addRes('w', rw);
  FX.dust(ob.gx + 0.5, ob.gy + 0.5);
  FX.float(ob.gx + 0.5, ob.gy + 0.5, '◆ +' + rw, '#3fe0a3');
  SFX.play('build');
  G.stat.obst++;
  G.sel = null;
  closeSheet();
  checkQuests();
  renderHUD();
}

/* ---------------- quests ---------------- */
export function checkQuests(): void {
  let n = 0;
  const v = questView();
  for (const q of QUESTS) {
    if (G.questDone[q.id]) continue;
    if (q.chk(v)) {
      G.questDone[q.id] = true;
      addRes('w', q.reward, true);
      view.GUIDE = null;
      toast(`📜 War Order complete: +◆${q.reward}`, 'ok');
      SFX.play('done');
    } else n++;
  }
  const badge = $('questBadge');
  badge.style.display = n ? 'flex' : 'none';
  badge.textContent = String(n);
}
