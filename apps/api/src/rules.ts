/** Server-side validation rules — mirrors the prototype systems, over DB rows. */
import type { Army, Building, Obstacle, TrainJob } from '@warchest/db';
import {
  BASE_CAP,
  BUILD,
  MAP,
  REAL_BUILD_TIMES,
  REAL_TRAIN_TIMES,
  TROOP,
  canPlace as canPlaceOn,
  occOf,
  type BuildingType,
  type TroopType,
} from '@warchest/game-core';
import { ENV } from './env';

export const asType = (t: string): BuildingType => {
  if (!(t in BUILD)) throw new Error(`bad building type ${t}`);
  return t as BuildingType;
};
export const asTroop = (t: string): TroopType => {
  if (!(t in TROOP)) throw new Error(`bad troop type ${t}`);
  return t as TroopType;
};

/** Real seconds for building/upgrading to `level`, honoring TIME_SCALE. */
export function buildSeconds(type: BuildingType, level: number): number {
  const table = REAL_BUILD_TIMES[type];
  const s = table[Math.min(level, table.length) - 1] ?? 0;
  return s / ENV.TIME_SCALE;
}

export function trainSeconds(t: TroopType): number {
  return REAL_TRAIN_TIMES[t] / ENV.TIME_SCALE;
}

/** Real production per second (prototype rates are ~PROD_ACCEL× demo-accelerated). */
export function prodPerSec(type: BuildingType, level: number): number {
  const rate = BUILD[type].lv[level - 1]?.rate ?? 0;
  return (rate / ENV.PROD_ACCEL) * ENV.TIME_SCALE;
}

export const isBusy = (b: Building, now: Date): boolean =>
  !!b.busyUntil && b.busyUntil.getTime() > now.getTime();

export function keepLv(buildings: readonly Building[]): number {
  const k = buildings.find((b) => b.type === 'keep');
  return k ? k.level : 1;
}

export function capOf(buildings: readonly Building[], r: 'g' | 'm', now: Date): number {
  let c = BASE_CAP;
  const key = r === 'g' ? 'vault' : 'tank';
  for (const b of buildings)
    if (b.type === key && !isBusy(b, now)) c += BUILD[key].lv[b.level - 1]!.add!;
  return c;
}

export function armyCap(buildings: readonly Building[], now: Date): number {
  let c = 0;
  for (const b of buildings)
    if (b.type === 'camp' && !isBusy(b, now)) c += BUILD.camp.lv[b.level - 1]!.cap!;
  return c;
}

export function housingUsed(army: Army, trainJobs: readonly TrainJob[]): number {
  let u =
    army.raider * TROOP.raider.house +
    army.sniper * TROOP.sniper.house +
    army.bruiser * TROOP.bruiser.house +
    army.gargoyle * TROOP.gargoyle.house;
  for (const j of trainJobs) u += TROOP[asTroop(j.troopType)].house;
  return u;
}

export function maxBarracksLv(buildings: readonly Building[], now: Date): number {
  let m = 0;
  for (const b of buildings)
    if (b.type === 'barracks' && !isBusy(b, now)) m = Math.max(m, b.level);
  return m;
}

export function barracksSpeed(buildings: readonly Building[], now: Date): number {
  return Math.max(1, buildings.filter((b) => b.type === 'barracks' && !isBusy(b, now)).length);
}

export function activeJobs(buildings: readonly Building[], now: Date): number {
  return buildings.filter((b) => isBusy(b, now)).length;
}

/** Village occupancy grid: building ids positive, obstacle ids negative. */
export function occGrid(buildings: readonly Building[], obstacles: readonly Obstacle[]): Int32Array {
  const occ = occOf(
    buildings.map((b) => ({ id: b.id, type: asType(b.type), gx: b.gx, gy: b.gy })),
  );
  for (const o of obstacles) {
    if (o.cleared) continue;
    if (o.gx >= 0 && o.gy >= 0 && o.gx < MAP && o.gy < MAP) occ[o.gy * MAP + o.gx] = -o.id;
  }
  return occ;
}

export function canPlaceVillage(
  buildings: readonly Building[],
  obstacles: readonly Obstacle[],
  type: BuildingType,
  gx: number,
  gy: number,
  ignoreId?: number,
): boolean {
  return canPlaceOn(occGrid(buildings, obstacles), type, gx, gy, ignoreId);
}

export class RuleError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
