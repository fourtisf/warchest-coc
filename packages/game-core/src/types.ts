/** Shared entity types for the WARCHEST simulation. Pure data — zero DOM. */

export type ResourceKey = 'g' | 'm' | 'w';

export type BuildingType =
  | 'keep'
  | 'mine'
  | 'well'
  | 'vault'
  | 'tank'
  | 'cannon'
  | 'arrow'
  | 'mortar'
  | 'wall'
  | 'barracks'
  | 'camp'
  | 'hut'
  | 'bomb'
  | 'spring';

export type TroopType =
  | 'raider'
  | 'sniper'
  | 'bomber'
  | 'imp'
  | 'bruiser'
  | 'warlock'
  | 'gargoyle'
  | 'mender';

export type SpellType = 'heal' | 'rage' | 'bolt';
export type SpellCounts = Record<SpellType, number>;

export type BuildingCategory = 'core' | 'res' | 'def' | 'army' | 'trap';

/** Per-level stats. Optional fields apply only to some building kinds. */
export interface BuildingLevel {
  hp: number;
  /** build / upgrade cost */
  c: number;
  /** build / upgrade time, seconds (prototype-accelerated values) */
  t: number;
  /** resource production per second (mine / well) */
  rate?: number;
  /** on-site storage cap (mine / well) or housing capacity (camp) */
  cap?: number;
  /** storage capacity bonus (vault / tank) */
  add?: number;
  /** damage per shot (defenses) */
  dmg?: number;
  /** attack range in tiles (defenses) */
  rng?: number;
  /** minimum range (mortar) */
  min?: number;
  /** splash radius (mortar) */
  spl?: number;
}

export interface BuildingDef {
  n: string;
  /** square footprint size in tiles */
  s: number;
  cat: BuildingCategory;
  /** resource the building is paid with */
  res: ResourceKey;
  emoji: string;
  /** max count per Keep level (index 0 = Keep L1) */
  max: readonly number[];
  lv: readonly BuildingLevel[];
  d: string;
  /** 1 = can target air units (defenses only); 0 / undefined = ground only */
  air?: 0 | 1;
}

export interface TroopDef {
  n: string;
  emoji: string;
  house: number;
  hp: number;
  dmg: number;
  /** seconds between attacks */
  rate: number;
  /** attack range in tiles */
  rng: number;
  /** movement speed, tiles/second */
  spd: number;
  /** training cost (mana) */
  cost: number;
  /** training time, seconds (prototype-accelerated) */
  tt: number;
  fly: 0 | 1;
  pref: 'any' | 'def' | 'wall' | 'heal';
  /** barracks level required */
  unlock: number;
  d: string;
  /** splash radius on impact (warlock) */
  splash?: number;
  /** suicide attacker: explodes on first strike (bomber) */
  suicide?: boolean;
  /** damage multiplier vs walls (bomber) */
  wallMul?: number;
  /** healing per pulse instead of damage (mender) */
  heals?: boolean;
}

export interface SpellDef {
  n: string;
  emoji: string;
  /** brew cost (mana) */
  cost: number;
  /** Keep level required */
  unlock: number;
  radius: number;
  d: string;
  /** heal per second (heal) */
  hps?: number;
  /** duration seconds (heal/rage) */
  dur?: number;
  /** damage/speed multipliers (rage) */
  dmgMul?: number;
  spdMul?: number;
  /** instant damage (bolt) */
  dmg?: number;
}

export type ArmyCounts = Record<TroopType, number>;

/** A building inside a battle snapshot / simulation. */
export interface SimBuilding {
  id: number;
  type: BuildingType;
  gx: number;
  gy: number;
  level: number;
  hp: number;
  maxhp: number;
  dead?: boolean;
  lootG: number;
  lootM: number;
  /** defense fire cooldown, seconds */
  cd?: number;
  /* Presentational fields — written by the sim on fire, read/decayed by the
     renderer only. They never feed back into simulation logic. */
  aim?: number;
  recoil?: number;
  flash?: number;
}

export interface SimTroop {
  id: number;
  type: TroopType;
  x: number;
  y: number;
  hp: number;
  maxhp: number;
  cd: number;
  targetId: number | null;
  moving: boolean;
  dead?: boolean;
  /** presentational attack-swing timer (renderer decays it) */
  swing: number;
  /** waypoints toward the target when pathing around walls */
  path?: Array<{ x: number; y: number }>;
  /** ticks until the path is recomputed */
  repath?: number;
}

export interface ActiveSpell {
  spell: SpellType;
  x: number;
  y: number;
  untilTick: number;
}

export type Projectile =
  | {
      kind: 'arrow';
      x: number;
      y: number;
      h: number;
      dx: number;
      dy: number;
      spd: number;
      dmg: number;
      tgtBId?: number;
      tgtUId?: number;
      /** splash radius on building impact (warlock fireball) */
      spl?: number;
      dead?: boolean;
    }
  | {
      kind: 'ball';
      x: number;
      y: number;
      h: number;
      dx: number;
      dy: number;
      spd: number;
      dmg: number;
      tgtUId: number;
      dead?: boolean;
    }
  | {
      kind: 'shell';
      x: number;
      y: number;
      sx: number;
      sy: number;
      ex: number;
      ey: number;
      tArc: number;
      T: number;
      dmg: number;
      spl: number;
      dead?: boolean;
    };

/** Enemy base snapshot, produced by genEnemy() or (later) a player-village snapshot. */
export interface EnemyBase {
  list: SimBuilding[];
  occ: Int32Array;
  th: number;
  pool: number;
  seed: number;
}

/** One attacker action in the deploy log. Positions are Math.fround-quantized world coords. */
export type DeployLogEntry =
  | { tick: number; kind: 'deploy'; troop: TroopType; x: number; y: number }
  | { tick: number; kind: 'spell'; spell: SpellType; x: number; y: number }
  | { tick: number; kind: 'end' };

export interface BattleOutcome {
  stars: number;
  pct: number;
  lootG: number;
  lootM: number;
  /** $WAR earned: stars*8 + keep bonus 10 + 100% bonus 7 */
  warEarned: number;
  /** +10+6*stars on win, -12 on loss, 0 if never started */
  trophyDelta: number;
  win: boolean;
  started: boolean;
  keepDestroyed: boolean;
  /** simulation ticks elapsed */
  ticks: number;
  /** troops left after the battle (deploys consumed) */
  armyLeft: ArmyCounts;
  /** spells left after the battle (casts consumed) */
  spellsLeft: SpellCounts;
}

/** Events emitted by the battle sim for the client to render FX / SFX. */
export type SimEvent =
  | { k: 'deploy'; x: number; y: number }
  | { k: 'spell'; spell: SpellType; x: number; y: number }
  | { k: 'trap'; kind: 'bomb' | 'spring'; x: number; y: number }
  | { k: 'heal'; x: number; y: number }
  | { k: 'melee-hit'; x: number; y: number }
  | { k: 'proj'; kind: 'arrow' | 'ball' | 'shell'; from: 'troop' | 'defense'; bid?: number }
  | { k: 'building-hit'; x: number; y: number }
  | { k: 'boom'; x: number; y: number; big: number }
  | { k: 'loot'; x: number; y: number; g: number; m: number }
  | { k: 'star'; stars: number }
  | { k: 'troop-died'; x: number; y: number }
  | { k: 'ended' };

/** Minimal view of player state used by quest conditions (client G or server row). */
export interface QuestStatView {
  trained: number;
  wins: number;
  raids: number;
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

export interface QuestView {
  stat: QuestStatView;
  buildings: ReadonlyArray<{ type: BuildingType; level: number }>;
  trophies: number;
  buildersTotal: number;
  hasWallet: boolean;
}

export type GuideTarget =
  | { k: 'b'; t: BuildingType }
  | { k: 'wallet' }
  | { k: 'sheet'; s: 'shop' | 'army'; hl?: string }
  | { k: 'obst' }
  | { k: 'raid' }
  | { k: 'keep' };

export interface QuestDef {
  id: string;
  ico: string;
  reward: number;
  txt: (v: QuestView) => string;
  chk: (v: QuestView) => boolean;
  go: GuideTarget;
  tip?: string;
}
