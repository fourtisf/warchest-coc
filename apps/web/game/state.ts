/**
 * Client game state — the prototype's `G` and village helpers.
 * P0: session-only, client-authoritative (exactly like the prototype).
 * P1 moves every mutation behind the API; this module then becomes a cache
 * of server state.
 */
import {
  BASE_CAP,
  BUILD,
  MAP,
  MAX_BUILDERS,
  START_BUILDERS,
  START_RES,
  START_TROPHIES,
  TROOP,
  clamp,
  fmt,
  occOf,
  type ArmyCounts,
  type BattleSim,
  type BuildingType,
  type DeployLogEntry,
  type EnemyBase,
  type ResourceKey,
  type SpellCounts,
  type SpellType,
  type TroopType,
} from '@warchest/game-core';
import { toast } from './ui/toasts';

/** Prototype ran its (already short) timers at 1x; kept as a tuning knob. */
export const DEMO_SPEED = 1;

/** serverNow - Date.now(), set on every hydrate; all countdowns use it. */
export const clock = { offset: 0 };
export const nowMs = (): number => Date.now() + clock.offset;

export interface VillageBuilding {
  id: number;
  type: BuildingType;
  gx: number;
  gy: number;
  level: number;
  hp: number;
  /** on-site stored resources (mine / well) */
  stored?: number;
  /** under construction / upgrade */
  busy?: boolean;
  /** server timestamps (epoch ms) driving the job countdown */
  busyUntil?: number;
  jobKind?: 'new' | 'up';
  jobTotalS?: number;
  dead?: boolean;
  /* presentational (renderer-managed) */
  aim?: number;
  recoil?: number;
  flash?: number;
}

export interface Obstacle {
  id: number;
  kind: 'tree' | 'rock';
  gx: number;
  gy: number;
  dead?: boolean;
  /** a builder is clearing it until this epoch-ms moment */
  clearUntil?: number;
  clearTotalS?: number;
}

export interface BuildJob {
  bid: number;
  tLeft: number;
  total: number;
  kind: 'up' | 'new';
}

export interface TrainJob {
  /** server row id */
  sid?: number;
  type: TroopType;
  tLeft: number;
  total: number;
  /** epoch ms; only set once the job is at the head of the queue */
  finishesAt?: number;
}

export interface PlaceState {
  type: BuildingType;
  gx: number;
  gy: number;
  moving: number | null;
  prevGx?: number;
  prevGy?: number;
}

export interface BattleUI {
  sim: BattleSim;
  base: EnemyBase;
  /** server battle row id — the deploy log resolves against it */
  battleId: string;
  /** currently selected troop card */
  sel: TroopType | null;
  /** currently selected spell card (overrides troop selection while set) */
  selSpell: SpellType | null;
  /** red no-deploy overlay, baked once per battle */
  red: HTMLCanvasElement;
  /** replay mode: the recorded log drives the sim instead of user input */
  replay?: { log: DeployLogEntry[]; idx: number; speed: number; attacker: string };
}

export type Mode = 'village' | 'placing' | 'battle_deploy' | 'battle';

export interface GameStat {
  trained: number;
  wins: number;
  raids: number;
  warClaimed: number;
  gCollected: number;
  mCollected: number;
  built: number;
  obst: number;
  lootG: number;
  lootM: number;
  stars: number;
  threeStar: number;
  claims: number;
  tTypes: Partial<Record<TroopType, number>>;
}

export interface GState {
  mode: Mode;
  t: number;
  res: Record<ResourceKey, number>;
  trophies: number;
  buildersTotal: number;
  buildings: VillageBuilding[];
  obstacles: Obstacle[];
  jobs: BuildJob[];
  army: ArmyCounts;
  spells: SpellCounts;
  /** War Lab research levels per troop (absent = level 1) */
  troopLv: Partial<Record<TroopType, number>>;
  /** active research, if any */
  research: { troop: TroopType; finishesAt: number; total: number } | null;
  trainQ: TrainJob[];
  stat: GameStat;
  questDone: Record<string, boolean>;
  daily: { ready: boolean; streak: number };
  wallet: { addr: string; short: string } | null;
  playerName: string | null;
  playerId: string;
  sfx: boolean;
  music: boolean;
  sel: number | null;
  place: PlaceState | null;
  battle: BattleUI | null;
  seed: number;
}

export function freshState(): GState {
  return {
    mode: 'village',
    t: 0,
    res: { ...START_RES },
    trophies: START_TROPHIES,
    buildersTotal: START_BUILDERS,
    buildings: [],
    obstacles: [],
    jobs: [],
    army: {
      raider: 0, sniper: 0, bomber: 0, imp: 0, bruiser: 0, warlock: 0, gargoyle: 0, mender: 0, dragon: 0,
    },
    spells: { heal: 0, rage: 0, bolt: 0, freeze: 0 },
    troopLv: {},
    research: null,
    trainQ: [],
    stat: {
      trained: 0, wins: 0, raids: 0, warClaimed: 0, gCollected: 0, mCollected: 0,
      built: 0, obst: 0, lootG: 0, lootM: 0, stars: 0, threeStar: 0, claims: 0, tTypes: {},
    },
    questDone: {},
    daily: { ready: false, streak: 0 },
    wallet: null,
    playerName: null,
    playerId: '',
    sfx: true,
    music: true,
    sel: null,
    place: null,
    battle: null,
    seed: (Math.random() * 1e9) | 0,
  };
}

export const G: GState = freshState();

let BID = 1;
export function resetBid(): void {
  BID = 1;
}
export function mkB(type: BuildingType, gx: number, gy: number, level = 1): VillageBuilding {
  const hp = BUILD[type].lv[level - 1]!.hp;
  return { id: BID++, type, gx, gy, level, hp };
}

/* ---------- occupancy (village grid; negative ids = obstacles) ---------- */
export let OCC: Int32Array = new Int32Array(MAP * MAP);
export function rebuildOcc(): void {
  OCC = occOf(G.buildings);
  for (const ob of G.obstacles) {
    if (ob.dead) continue;
    OCC[ob.gy * MAP + ob.gx] = -ob.id;
  }
}

/* ---------- village helpers (ported verbatim) ---------- */
export function keepLv(): number {
  const k = G.buildings.find((b) => b.type === 'keep');
  return k ? k.level : 1;
}

export function capOf(r: 'g' | 'm'): number {
  let c = BASE_CAP;
  const key: BuildingType = r === 'g' ? 'vault' : 'tank';
  for (const b of G.buildings)
    if (b.type === key && !b.busy) c += BUILD[key].lv[b.level - 1]!.add!;
  return c;
}

export function jobOf(bid: number): BuildJob | undefined {
  return G.jobs.find((j) => j.bid === bid);
}

export function clearingObstacles(): Obstacle[] {
  const now = nowMs();
  return G.obstacles.filter((o) => !o.dead && o.clearUntil !== undefined && o.clearUntil > now);
}

export function freeBuilders(): number {
  return G.buildersTotal - G.jobs.length - clearingObstacles().length;
}

export function countOf(type: BuildingType): number {
  return G.buildings.filter((b) => b.type === type).length;
}

export function armyCap(): number {
  let c = 0;
  for (const b of G.buildings)
    if (b.type === 'camp' && !b.busy) c += BUILD.camp.lv[b.level - 1]!.cap!;
  return c;
}

export function housingUsed(): number {
  let u = 0;
  for (const k in G.army) u += G.army[k as TroopType] * TROOP[k as TroopType].house;
  for (const q of G.trainQ) u += TROOP[q.type].house;
  return u;
}

export function addRes(r: ResourceKey, n: number, silent = false): number {
  const cap = r === 'w' ? Infinity : capOf(r);
  const before = G.res[r];
  G.res[r] = clamp(G.res[r] + n, 0, cap);
  const gained = G.res[r] - before;
  if (!silent && gained > 0 && r === 'w') toast(`◆ +${fmt(gained)} $WAR`, 'ok');
  return gained;
}

export function pay(cost: number, res: ResourceKey): boolean {
  if (G.res[res] < cost) return false;
  G.res[res] -= cost;
  return true;
}

export function maxBarracksLv(): number {
  let m = 0;
  for (const b of G.buildings) if (b.type === 'barracks' && !b.busy) m = Math.max(m, b.level);
  return m;
}

/** hut index (1-based) among the player's huts — used by hut art to show the busy builder. */
export function idxOfHut(b: { id: number }): number {
  let i = 0;
  for (const x of G.buildings) {
    if (x.type === 'hut') {
      i++;
      if (x.id === b.id) return i;
    }
  }
  return 1;
}

export { MAX_BUILDERS };
