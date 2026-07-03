/**
 * Canonical game config — extracted VERBATIM from the approved prototype
 * (/reference/warchest-prototype.html, `CFG`). Balance numbers must not drift
 * from the prototype; production-only knobs live at the bottom of this file.
 */
import type {
  BuildingDef,
  BuildingType,
  SpellDef,
  SpellType,
  TroopDef,
  TroopType,
} from './types';

/** Isometric tile width/height in px at zoom 1, map size in tiles, decorative pad. */
export const TW = 64;
export const TH = 32;
export const MAP = 40;
export const PAD = 13;

export const BUILD: Record<BuildingType, BuildingDef> = {
  keep: {
    n: 'Keep', s: 4, cat: 'core', res: 'g', emoji: '🏰', max: [1, 1, 1, 1, 1],
    lv: [
      { hp: 1700, c: 0, t: 0 },
      { hp: 2500, c: 1200, t: 20 },
      { hp: 3600, c: 4200, t: 45 },
      { hp: 5000, c: 12000, t: 90 },
      { hp: 6800, c: 30000, t: 180 },
    ],
    d: 'Heart of the warcamp. Its level gates every other building.',
  },
  mine: {
    n: 'Gold Mine', s: 3, cat: 'res', res: 'm', emoji: '⛏️', max: [1, 2, 3, 4, 5],
    lv: [
      { hp: 420, c: 150, t: 5, rate: 6, cap: 500 },
      { hp: 540, c: 420, t: 12, rate: 9, cap: 900 },
      { hp: 680, c: 1050, t: 25, rate: 13, cap: 1600 },
      { hp: 840, c: 2700, t: 50, rate: 19, cap: 2800 },
      { hp: 1020, c: 6200, t: 100, rate: 27, cap: 5000 },
    ],
    d: 'Digs Gold over time. Tap to collect.',
  },
  well: {
    n: 'Mana Well', s: 3, cat: 'res', res: 'g', emoji: '🔮', max: [1, 2, 3, 4, 5],
    lv: [
      { hp: 420, c: 150, t: 5, rate: 6, cap: 500 },
      { hp: 540, c: 420, t: 12, rate: 9, cap: 900 },
      { hp: 680, c: 1050, t: 25, rate: 13, cap: 1600 },
      { hp: 840, c: 2700, t: 50, rate: 19, cap: 2800 },
      { hp: 1020, c: 6200, t: 100, rate: 27, cap: 5000 },
    ],
    d: 'Condenses raw Mana. Tap to collect.',
  },
  vault: {
    n: 'Gold Vault', s: 3, cat: 'res', res: 'm', emoji: '🧰', max: [1, 1, 2, 2, 3],
    lv: [
      { hp: 620, c: 300, t: 8, add: 2000 },
      { hp: 780, c: 900, t: 20, add: 3800 },
      { hp: 960, c: 2500, t: 40, add: 7200 },
      { hp: 1180, c: 7000, t: 80, add: 13500 },
      { hp: 1450, c: 18000, t: 160, add: 25000 },
    ],
    d: 'Raises your Gold cap. Raiders love these.',
  },
  tank: {
    n: 'Mana Reservoir', s: 3, cat: 'res', res: 'g', emoji: '⚗️', max: [1, 1, 2, 2, 3],
    lv: [
      { hp: 620, c: 300, t: 8, add: 2000 },
      { hp: 780, c: 900, t: 20, add: 3800 },
      { hp: 960, c: 2500, t: 40, add: 7200 },
      { hp: 1180, c: 7000, t: 80, add: 13500 },
      { hp: 1450, c: 18000, t: 160, add: 25000 },
    ],
    d: 'Raises your Mana cap.',
  },
  cannon: {
    n: 'Cannon', s: 3, cat: 'def', res: 'g', emoji: '💣', max: [1, 2, 2, 3, 4],
    lv: [
      { hp: 440, c: 250, t: 6, dmg: 12, rate: 0.8, rng: 5.5 },
      { hp: 560, c: 700, t: 15, dmg: 15, rate: 0.8, rng: 5.5 },
      { hp: 710, c: 2000, t: 35, dmg: 19, rate: 0.8, rng: 5.7 },
      { hp: 900, c: 5500, t: 70, dmg: 24, rate: 0.8, rng: 5.7 },
      { hp: 1130, c: 14000, t: 140, dmg: 30, rate: 0.8, rng: 6 },
    ],
    d: 'Single-target ground defense. Cannot hit flyers.', air: 0,
  },
  arrow: {
    n: 'Arrow Tower', s: 3, cat: 'def', res: 'g', emoji: '🏹', max: [0, 1, 2, 3, 4],
    lv: [
      { hp: 390, c: 420, t: 8, dmg: 8, rate: 0.55, rng: 6.5 },
      { hp: 500, c: 1100, t: 18, dmg: 10, rate: 0.55, rng: 6.5 },
      { hp: 640, c: 3000, t: 40, dmg: 13, rate: 0.55, rng: 6.8 },
      { hp: 810, c: 8000, t: 80, dmg: 16, rate: 0.55, rng: 6.8 },
      { hp: 1010, c: 19000, t: 160, dmg: 20, rate: 0.5, rng: 7 },
    ],
    d: 'Fast arrows, hits ground and air.', air: 1,
  },
  mortar: {
    n: 'Mortar', s: 3, cat: 'def', res: 'g', emoji: '☄️', max: [0, 0, 1, 1, 2],
    lv: [
      { hp: 360, c: 1500, t: 25, dmg: 55, rate: 4.2, rng: 8, min: 3, spl: 1.5 },
      { hp: 460, c: 4500, t: 60, dmg: 72, rate: 4.2, rng: 8.5, min: 3, spl: 1.5 },
      { hp: 580, c: 12000, t: 120, dmg: 92, rate: 4, rng: 9, min: 3, spl: 1.6 },
    ],
    d: 'Long-range splash shells. Blind up close, cannot hit flyers.', air: 0,
  },
  wall: {
    n: 'Wall', s: 1, cat: 'def', res: 'g', emoji: '🧱', max: [25, 50, 75, 100, 125],
    lv: [
      { hp: 320, c: 30, t: 0 },
      { hp: 680, c: 90, t: 0 },
      { hp: 1250, c: 240, t: 0 },
      { hp: 2100, c: 600, t: 0 },
      { hp: 3400, c: 1400, t: 0 },
    ],
    d: 'Slows ground raiders. Builds instantly.',
  },
  barracks: {
    n: 'Barracks', s: 3, cat: 'army', res: 'm', emoji: '⚔️', max: [1, 1, 2, 2, 2],
    lv: [
      { hp: 360, c: 200, t: 6 },
      { hp: 460, c: 600, t: 15 },
      { hp: 580, c: 1800, t: 35 },
      { hp: 720, c: 5000, t: 70 },
      { hp: 880, c: 12000, t: 140 },
    ],
    d: 'Trains units. Higher levels unlock new units.',
  },
  camp: {
    n: 'Army Camp', s: 4, cat: 'army', res: 'm', emoji: '⛺', max: [1, 1, 2, 2, 3],
    lv: [
      { hp: 320, c: 250, t: 8, cap: 20 },
      { hp: 400, c: 900, t: 20, cap: 30 },
      { hp: 500, c: 2800, t: 45, cap: 40 },
      { hp: 620, c: 8000, t: 90, cap: 55 },
      { hp: 760, c: 20000, t: 180, cap: 75 },
    ],
    d: 'Houses your trained army.',
  },
  hut: {
    n: 'Builder Hut', s: 2, cat: 'core', res: 'w', emoji: '🔨', max: [3, 3, 3, 3, 3],
    lv: [{ hp: 260, c: 200, t: 0 }],
    d: 'Hires one more builder. Paid in $WAR.',
  },
  bomb: {
    n: 'Hidden Bomb', s: 1, cat: 'trap', res: 'g', emoji: '💥', max: [2, 3, 4, 5, 6],
    lv: [
      { hp: 1, c: 120, t: 0, dmg: 45, spl: 1.3 },
      { hp: 1, c: 600, t: 0, dmg: 70, spl: 1.3 },
      { hp: 1, c: 2400, t: 0, dmg: 100, spl: 1.4 },
    ],
    d: 'Invisible to attackers. Explodes when ground troops step close.',
  },
  spring: {
    n: 'Spring Trap', s: 1, cat: 'trap', res: 'g', emoji: '🌀', max: [1, 2, 3, 4, 5],
    lv: [{ hp: 1, c: 300, t: 0 }],
    d: 'Invisible to attackers. Launches a ground troop clean off the map.',
  },
};

export const TROOP: Record<TroopType, TroopDef> = {
  raider: {
    n: 'Raider', emoji: '🪓', house: 1, hp: 95, dmg: 12, rate: 0.9, rng: 0.65, spd: 2.3,
    cost: 40, tt: 2, fly: 0, pref: 'any', unlock: 1,
    d: 'Cheap melee brawler. Attacks the nearest building.',
  },
  sniper: {
    n: 'Sniper', emoji: '🏹', house: 1, hp: 45, dmg: 9, rate: 0.7, rng: 3.5, spd: 2.1,
    cost: 90, tt: 3, fly: 0, pref: 'any', unlock: 1,
    d: 'Ranged. Shoots over walls from a distance.',
  },
  bomber: {
    n: 'Bomber', emoji: '🧨', house: 2, hp: 65, dmg: 55, rate: 1, rng: 0.5, spd: 2.6,
    cost: 160, tt: 4, fly: 0, pref: 'wall', unlock: 2,
    suicide: true, wallMul: 10, splash: 1.4,
    d: 'Runs at the nearest wall and detonates. Massive wall damage, one use.',
  },
  imp: {
    n: 'Imp', emoji: '👺', house: 1, hp: 55, dmg: 8, rate: 0.7, rng: 1.0, spd: 3.2,
    cost: 80, tt: 3, fly: 1, pref: 'any', unlock: 2,
    d: 'Cheap flyer. Swarms over walls; cannons and mortars miss it.',
  },
  bruiser: {
    n: 'Bruiser', emoji: '🛡️', house: 5, hp: 780, dmg: 32, rate: 1.2, rng: 0.7, spd: 1.25,
    cost: 450, tt: 9, fly: 0, pref: 'def', unlock: 2,
    d: 'Walking wall. Targets defenses first.',
  },
  warlock: {
    n: 'Warlock', emoji: '🔥', house: 4, hp: 130, dmg: 26, rate: 1.4, rng: 3.2, spd: 1.9,
    cost: 380, tt: 8, fly: 0, pref: 'any', unlock: 3, splash: 1.1,
    d: 'Hurls exploding fireballs that splash across buildings.',
  },
  gargoyle: {
    n: 'Gargoyle', emoji: '🦇', house: 2, hp: 130, dmg: 14, rate: 0.8, rng: 1.3, spd: 2.7,
    cost: 280, tt: 6, fly: 1, pref: 'any', unlock: 3,
    d: "Flyer. Ignores walls; cannons and mortars can't touch it.",
  },
  mender: {
    n: 'Mender', emoji: '🕊️', house: 5, hp: 260, dmg: 45, rate: 1.2, rng: 2.5, spd: 1.9,
    cost: 550, tt: 10, fly: 1, pref: 'heal', unlock: 4, heals: true,
    d: 'Flying healer. Deals no damage — keeps your army standing instead.',
  },
};

export const TROOP_ORDER: readonly TroopType[] = [
  'raider', 'sniper', 'bomber', 'imp', 'bruiser', 'warlock', 'gargoyle', 'mender',
];
export const SHOP_ORDER: readonly BuildingType[] = [
  'cannon', 'arrow', 'mortar', 'wall', 'bomb', 'spring',
  'mine', 'well', 'vault', 'tank', 'barracks', 'camp', 'hut',
];

/** Battle spells — brewed with Mana, cast anywhere on the battlefield. */
export const SPELL: Record<SpellType, SpellDef> = {
  heal: {
    n: 'Healing Rune', emoji: '💚', cost: 300, unlock: 2, radius: 2.2, hps: 60, dur: 6,
    d: 'Restores troops inside the ring for 6 seconds.',
  },
  rage: {
    n: 'Rage Rune', emoji: '😡', cost: 400, unlock: 3, radius: 2.2, dmgMul: 1.6, spdMul: 1.5, dur: 8,
    d: 'Troops inside the ring hit 60% harder and move 50% faster.',
  },
  bolt: {
    n: 'Skybolt', emoji: '⚡', cost: 500, unlock: 4, radius: 1.2, dmg: 220,
    d: 'Instant lightning strike. Melts a defense or a chunk of wall.',
  },
};
export const SPELL_ORDER: readonly SpellType[] = ['heal', 'rage', 'bolt'];
/** Max spells carried into battle (all types combined). */
export const SPELL_CAP = 3;

export const BASE_CAP = 1200;
export const BATTLE_TIME = 180;
export const NEXT_COST = 50;

/** Obstacle clear costs (gold) and starting resources — prototype values. */
export const OBSTACLE_COST = { tree: 80, rock: 60 } as const;
export const START_RES = { g: 350, m: 350, w: 40 } as const;
export const START_TROPHIES = 10;
export const MAX_BUILDERS = 3;
export const START_BUILDERS = 2;

/** Fixed simulation timestep (the prototype's main loop runs the same step). */
export const TICK = 1 / 60;
export const TICKS_PER_SEC = 60;

/**
 * Finish-now pricing.
 * Prototype (accelerated timers): max(2, ceil(remainingSeconds / 8)) ◆ — used by the P0 client.
 * Production (real timers, per spec): max(2, ceil(remainingMinutes * 1.5)) ◆.
 */
export const finishNowCostDemo = (remainingSeconds: number): number =>
  Math.max(2, Math.ceil(remainingSeconds / 8));
export const finishNowCostReal = (remainingSeconds: number): number =>
  Math.max(2, Math.ceil((remainingSeconds / 60) * 1.5));

/**
 * Real-time durations (P1+), seconds. CoC-style progressive curve: the first
 * levels are seconds-to-minutes so a new player upgrades constantly on day
 * one; long timers only appear from L4/Keep L4 up. Env-tunable via
 * TIME_SCALE at runtime; index 0 = build at L1.
 */
export const REAL_BUILD_TIMES: Record<BuildingType, readonly number[]> = {
  //      L1   L2    L3     L4      L5
  keep: [0, 300, 7200, 43200, 129600], // 5m · 2h · 12h · 36h
  mine: [10, 60, 900, 7200, 28800], // 10s · 1m · 15m · 2h · 8h
  well: [10, 60, 900, 7200, 28800],
  vault: [10, 60, 900, 7200, 28800],
  tank: [10, 60, 900, 7200, 28800],
  cannon: [10, 60, 900, 7200, 28800],
  arrow: [10, 60, 900, 7200, 28800],
  mortar: [300, 7200, 28800],
  wall: [0, 0, 0, 0, 0],
  barracks: [10, 60, 900, 7200, 28800],
  camp: [10, 60, 900, 7200, 28800],
  hut: [0],
  bomb: [0, 0, 0],
  spring: [0],
};

/** Real troop training times for production (P1+), seconds. */
export const REAL_TRAIN_TIMES: Record<TroopType, number> = {
  raider: 20,
  sniper: 30,
  bomber: 45,
  imp: 15,
  bruiser: 120,
  warlock: 150,
  gargoyle: 180,
  mender: 240,
};

/** Real obstacle-clearing times (a builder works on it), seconds. */
export const REAL_CLEAR_TIMES: Record<'tree' | 'rock', number> = {
  tree: 30,
  rock: 20,
};
