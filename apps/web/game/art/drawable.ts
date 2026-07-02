/** Types the procedural art layer draws — satisfied by both village buildings and battle SimBuildings. */
import type { BuildingType, TroopType } from '@warchest/game-core';

export interface DrawableBuilding {
  id: number;
  type: BuildingType;
  gx: number;
  gy: number;
  level: number;
  hp?: number;
  maxhp?: number;
  dead?: boolean;
  stored?: number;
  busy?: boolean;
  lootG?: number;
  lootM?: number;
  /* presentational fields, decayed by the renderer */
  aim?: number;
  recoil?: number;
  flash?: number;
  /** the list this building is rendered with (walls auto-connect within it) */
  _list?: ReadonlyArray<DrawableBuilding>;
}

export interface DrawableUnit {
  id: number;
  type: TroopType;
  x: number;
  y: number;
  hp: number;
  maxhp: number;
  moving: boolean;
  swing: number;
  dead?: boolean;
}

export interface DrawableObstacle {
  id: number;
  kind: 'tree' | 'rock';
  gx: number;
  gy: number;
  dead?: boolean;
}

/** Wall at exactly (gx,gy) within a draw list (walls are 1x1). */
export function wallAt(
  list: ReadonlyArray<DrawableBuilding>,
  gx: number,
  gy: number,
): DrawableBuilding | null {
  for (const b of list)
    if (!b.dead && b.type === 'wall' && b.gx === gx && b.gy === gy) return b;
  return null;
}

export type BuildingArtFn = (c: CanvasRenderingContext2D, b: DrawableBuilding, t: number) => void;
export type UnitArtFn = (c: CanvasRenderingContext2D, u: DrawableUnit, t: number, bob: number) => void;
export type ObstacleArtFn = (c: CanvasRenderingContext2D, o: DrawableObstacle, t: number) => void;
