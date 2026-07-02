/** Tile occupancy helpers, ported from the prototype. */
import { BUILD, MAP } from './config';
import type { BuildingType } from './types';

export interface Footprinted {
  id: number;
  type: BuildingType;
  gx: number;
  gy: number;
  dead?: boolean;
}

/** Build an occupancy grid (building id per tile, 0 = empty) from a building list. */
export function occOf(list: readonly Footprinted[]): Int32Array {
  const o = new Int32Array(MAP * MAP);
  for (const b of list) {
    if (b.dead) continue;
    const s = BUILD[b.type].s;
    for (let y = b.gy; y < b.gy + s; y++)
      for (let x = b.gx; x < b.gx + s; x++)
        if (x >= 0 && y >= 0 && x < MAP && y < MAP) o[y * MAP + x] = b.id;
  }
  return o;
}

/** Find the (live) building at a tile via an occupancy grid. */
export function bAt<T extends Footprinted>(
  occ: Int32Array,
  list: readonly T[],
  gx: number,
  gy: number,
): T | null {
  if (gx < 0 || gy < 0 || gx >= MAP || gy >= MAP) return null;
  const id = occ[gy * MAP + gx] ?? 0;
  if (id > 0) return list.find((b) => b.id === id && !b.dead) ?? null;
  return null;
}

/** Can a building of `type` be placed at (gx,gy)? Mirrors the prototype's 2-tile border rule. */
export function canPlace(
  occ: Int32Array,
  type: BuildingType,
  gx: number,
  gy: number,
  ignoreId?: number,
): boolean {
  const s = BUILD[type].s;
  if (gx < 2 || gy < 2 || gx + s > MAP - 2 || gy + s > MAP - 2) return false;
  for (let y = gy; y < gy + s; y++)
    for (let x = gx; x < gx + s; x++) {
      const id = occ[y * MAP + x] ?? 0;
      if (id !== 0 && id !== ignoreId) return false;
    }
  return true;
}
