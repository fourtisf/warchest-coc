/**
 * Battle snapshot builders.
 * - baseFromList: rebuild an EnemyBase (occ grid) from a serialized building list.
 * - villageBaseSnapshot: turn a REAL village into an attackable snapshot, with
 *   loot distributed by the prototype loot-pool shape (vault .5 / keep .3 /
 *   collectors .2) over a raidable share of the defender's stored resources.
 */
import { BUILD } from './config';
import { occOf } from './occupancy';
import type { BuildingType, EnemyBase, SimBuilding } from './types';

export function baseFromList(
  list: SimBuilding[],
  seed: number,
  th: number,
  pool: number,
): EnemyBase {
  return { list: list.map((b) => ({ ...b })), occ: occOf(list), th, pool, seed };
}

export interface VillageForSnapshot {
  buildings: ReadonlyArray<{ type: BuildingType; level: number; gx: number; gy: number }>;
  gold: number;
  mana: number;
  keepLevel: number;
  seed: number;
}

/** Share of a defender's stored resources that raiders can take (CoC-style). */
export const RAIDABLE_SHARE = 0.2;

export function villageBaseSnapshot(v: VillageForSnapshot): EnemyBase {
  let id = 1;
  const list: SimBuilding[] = v.buildings.map((b) => {
    const hp = BUILD[b.type].lv[Math.min(b.level, BUILD[b.type].lv.length) - 1]!.hp;
    return { id: id++, type: b.type, gx: b.gx, gy: b.gy, level: b.level, hp, maxhp: hp, lootG: 0, lootM: 0 };
  });
  const poolG = Math.max(0, Math.floor(v.gold * RAIDABLE_SHARE));
  const poolM = Math.max(0, Math.floor(v.mana * RAIDABLE_SHARE));
  // prototype distribution shape (genEnemy): vault .5 / keep .3 / collectors .2
  const nVault = Math.max(1, list.filter((b) => b.type === 'vault').length);
  const nTank = Math.max(1, list.filter((b) => b.type === 'tank').length);
  const nMine = Math.max(1, list.filter((b) => b.type === 'mine').length);
  const nWell = Math.max(1, list.filter((b) => b.type === 'well').length);
  for (const b of list) {
    if (b.type === 'vault') b.lootG = Math.floor((poolG * 0.5) / nVault);
    else if (b.type === 'mine') b.lootG = Math.floor((poolG * 0.2) / nMine);
    else if (b.type === 'keep') b.lootG = Math.floor(poolG * 0.3);
    if (b.type === 'tank') b.lootM = Math.floor((poolM * 0.5) / nTank);
    else if (b.type === 'well') b.lootM = Math.floor((poolM * 0.2) / nWell);
    if (b.type === 'keep') b.lootM = Math.floor(poolM * 0.3);
  }
  return { list, occ: occOf(list), th: v.keepLevel, pool: poolG + poolM, seed: v.seed };
}
