/**
 * Canonical game config — originally extracted from the approved prototype
 * (/reference/warchest-prototype.html, `CFG`).
 *
 * Deliberate balance drift from the prototype (owner-directed):
 * - CoC-style early economy: build/upgrade costs through L3 are cheap enough
 *   that starting resources + early production cover them; L4-L5 costs are
 *   unchanged (steep) so late progression is funded by raiding.
 * - L1-L3 collector rates raised so day-one income keeps pace.
 * Combat stats (hp/dmg/capacity) are untouched.
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
    n: 'Keep', s: 4, cat: 'core', res: 'g', emoji: '🏰', max: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    lv: [
      { hp: 1700, c: 0, t: 0 },
      { hp: 2500, c: 500, t: 20 },
      { hp: 3600, c: 1500, t: 45 },
      { hp: 5000, c: 12000, t: 90 },
      { hp: 6800, c: 30000, t: 180 },
      { hp: 8800, c: 60000, t: 300 },
      { hp: 11200, c: 110000, t: 420 },
      { hp: 14000, c: 190000, t: 560 },
      { hp: 17400, c: 300000, t: 720 },
      { hp: 21500, c: 450000, t: 900 },
    ],
    d: 'Heart of the warcamp. Its level gates every other building.',
  },
  mine: {
    n: 'Gold Mine', s: 3, cat: 'res', res: 'm', emoji: '⛏️', max: [1, 2, 3, 4, 5, 5, 6, 6, 7, 7],
    lv: [
      { hp: 420, c: 80, t: 5, rate: 10, cap: 500 },
      { hp: 540, c: 200, t: 12, rate: 15, cap: 900 },
      { hp: 680, c: 500, t: 25, rate: 20, cap: 1600 },
      { hp: 840, c: 2700, t: 50, rate: 26, cap: 2800 },
      { hp: 1020, c: 6200, t: 100, rate: 34, cap: 5000 },
      { hp: 1230, c: 12000, t: 150, rate: 42, cap: 8000 },
      { hp: 1470, c: 24000, t: 220, rate: 50, cap: 12000 },
      { hp: 1750, c: 45000, t: 300, rate: 60, cap: 18000 },
      { hp: 2080, c: 80000, t: 400, rate: 72, cap: 26000 },
      { hp: 2460, c: 140000, t: 520, rate: 85, cap: 36000 },
    ],
    d: 'Digs Gold over time. Tap to collect.',
  },
  well: {
    n: 'Mana Well', s: 3, cat: 'res', res: 'g', emoji: '🔮', max: [1, 2, 3, 4, 5, 5, 6, 6, 7, 7],
    lv: [
      { hp: 420, c: 80, t: 5, rate: 10, cap: 500 },
      { hp: 540, c: 200, t: 12, rate: 15, cap: 900 },
      { hp: 680, c: 500, t: 25, rate: 20, cap: 1600 },
      { hp: 840, c: 2700, t: 50, rate: 26, cap: 2800 },
      { hp: 1020, c: 6200, t: 100, rate: 34, cap: 5000 },
      { hp: 1230, c: 12000, t: 150, rate: 42, cap: 8000 },
      { hp: 1470, c: 24000, t: 220, rate: 50, cap: 12000 },
      { hp: 1750, c: 45000, t: 300, rate: 60, cap: 18000 },
      { hp: 2080, c: 80000, t: 400, rate: 72, cap: 26000 },
      { hp: 2460, c: 140000, t: 520, rate: 85, cap: 36000 },
    ],
    d: 'Condenses raw Mana. Tap to collect.',
  },
  vault: {
    n: 'Gold Vault', s: 3, cat: 'res', res: 'm', emoji: '🧰', max: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
    lv: [
      { hp: 620, c: 150, t: 8, add: 2000 },
      { hp: 780, c: 400, t: 20, add: 3800 },
      { hp: 960, c: 1000, t: 40, add: 7200 },
      // L4/L6 raised so every Keep upgrade fits under the cap of its era
      // (2×13500+1200 = 28,200 could never bank the 30,000 Keep-5 costs)
      { hp: 1180, c: 7000, t: 80, add: 16500 },
      { hp: 1450, c: 18000, t: 160, add: 25000 },
      { hp: 1750, c: 40000, t: 240, add: 46000 },
      { hp: 2100, c: 75000, t: 340, add: 60000 },
      { hp: 2520, c: 130000, t: 460, add: 90000 },
      { hp: 3000, c: 220000, t: 600, add: 130000 },
      { hp: 3600, c: 360000, t: 780, add: 180000 },
    ],
    d: 'Raises your Gold cap. Raiders love these.',
  },
  tank: {
    n: 'Mana Reservoir', s: 3, cat: 'res', res: 'g', emoji: '⚗️', max: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
    lv: [
      { hp: 620, c: 150, t: 8, add: 2000 },
      { hp: 780, c: 400, t: 20, add: 3800 },
      { hp: 960, c: 1000, t: 40, add: 7200 },
      // mirrors the Gold Vault L4/L6 bump (mana costs scale the same way)
      { hp: 1180, c: 7000, t: 80, add: 16500 },
      { hp: 1450, c: 18000, t: 160, add: 25000 },
      { hp: 1750, c: 40000, t: 240, add: 46000 },
      { hp: 2100, c: 75000, t: 340, add: 60000 },
      { hp: 2520, c: 130000, t: 460, add: 90000 },
      { hp: 3000, c: 220000, t: 600, add: 130000 },
      { hp: 3600, c: 360000, t: 780, add: 180000 },
    ],
    d: 'Raises your Mana cap.',
  },
  cannon: {
    n: 'Cannon', s: 3, cat: 'def', res: 'g', emoji: '💣', max: [1, 2, 2, 3, 4, 4, 5, 5, 6, 6],
    lv: [
      { hp: 440, c: 120, t: 6, dmg: 12, rate: 0.8, rng: 5.5 },
      { hp: 560, c: 350, t: 15, dmg: 15, rate: 0.8, rng: 5.5 },
      { hp: 710, c: 900, t: 35, dmg: 19, rate: 0.8, rng: 5.7 },
      { hp: 900, c: 5500, t: 70, dmg: 24, rate: 0.8, rng: 5.7 },
      { hp: 1130, c: 14000, t: 140, dmg: 30, rate: 0.8, rng: 6 },
      { hp: 1400, c: 32000, t: 210, dmg: 37, rate: 0.8, rng: 6 },
      { hp: 1720, c: 65000, t: 300, dmg: 45, rate: 0.8, rng: 6.2 },
      { hp: 2100, c: 120000, t: 420, dmg: 54, rate: 0.8, rng: 6.2 },
      { hp: 2550, c: 210000, t: 560, dmg: 64, rate: 0.8, rng: 6.4 },
      { hp: 3100, c: 350000, t: 720, dmg: 75, rate: 0.8, rng: 6.5 },
    ],
    d: 'Single-target ground defense. Cannot hit flyers.', air: 0,
  },
  arrow: {
    n: 'Arrow Tower', s: 3, cat: 'def', res: 'g', emoji: '🏹', max: [0, 1, 2, 3, 4, 4, 5, 5, 6, 6],
    lv: [
      { hp: 390, c: 200, t: 8, dmg: 8, rate: 0.55, rng: 6.5 },
      { hp: 500, c: 500, t: 18, dmg: 10, rate: 0.55, rng: 6.5 },
      { hp: 640, c: 1200, t: 40, dmg: 13, rate: 0.55, rng: 6.8 },
      { hp: 810, c: 8000, t: 80, dmg: 16, rate: 0.55, rng: 6.8 },
      { hp: 1010, c: 19000, t: 160, dmg: 20, rate: 0.5, rng: 7 },
      { hp: 1250, c: 42000, t: 220, dmg: 25, rate: 0.5, rng: 7 },
      { hp: 1540, c: 85000, t: 320, dmg: 30, rate: 0.5, rng: 7.2 },
      { hp: 1890, c: 150000, t: 440, dmg: 36, rate: 0.5, rng: 7.2 },
      { hp: 2300, c: 260000, t: 580, dmg: 43, rate: 0.5, rng: 7.4 },
      { hp: 2800, c: 420000, t: 750, dmg: 51, rate: 0.5, rng: 7.5 },
    ],
    d: 'Fast arrows, hits ground and air.', air: 1,
  },
  mortar: {
    n: 'Mortar', s: 3, cat: 'def', res: 'g', emoji: '☄️', max: [0, 0, 1, 1, 2, 2, 3, 3, 4, 4],
    lv: [
      { hp: 360, c: 800, t: 25, dmg: 55, rate: 4.2, rng: 8, min: 3, spl: 1.5 },
      { hp: 460, c: 4500, t: 60, dmg: 72, rate: 4.2, rng: 8.5, min: 3, spl: 1.5 },
      { hp: 580, c: 12000, t: 120, dmg: 92, rate: 4, rng: 9, min: 3, spl: 1.6 },
      { hp: 720, c: 30000, t: 200, dmg: 115, rate: 4, rng: 9.5, min: 3, spl: 1.7 },
      { hp: 880, c: 60000, t: 300, dmg: 140, rate: 4, rng: 10, min: 3, spl: 1.8 },
      { hp: 1060, c: 110000, t: 420, dmg: 170, rate: 4, rng: 10, min: 3, spl: 1.9 },
      { hp: 1270, c: 190000, t: 560, dmg: 205, rate: 4, rng: 10.5, min: 3, spl: 2 },
      { hp: 1510, c: 300000, t: 700, dmg: 245, rate: 3.8, rng: 10.5, min: 3, spl: 2.1 },
      { hp: 1780, c: 450000, t: 860, dmg: 290, rate: 3.8, rng: 11, min: 3, spl: 2.2 },
      { hp: 2080, c: 650000, t: 1040, dmg: 340, rate: 3.8, rng: 11, min: 3, spl: 2.3 },
    ],
    d: 'Long-range splash shells. Blind up close, cannot hit flyers.', air: 0,
  },
  airdef: {
    n: 'Sky Ballista', s: 3, cat: 'def', res: 'g', emoji: '🎯', max: [0, 0, 0, 0, 1, 1, 2, 2, 3, 3],
    lv: [
      { hp: 700, c: 20000, t: 140, dmg: 60, rate: 1.9, rng: 9 },
      { hp: 850, c: 40000, t: 210, dmg: 75, rate: 1.9, rng: 9 },
      { hp: 1020, c: 70000, t: 300, dmg: 92, rate: 1.8, rng: 9.2 },
      { hp: 1220, c: 110000, t: 420, dmg: 112, rate: 1.8, rng: 9.2 },
      { hp: 1450, c: 160000, t: 560, dmg: 135, rate: 1.8, rng: 9.4 },
      { hp: 1700, c: 230000, t: 700, dmg: 160, rate: 1.7, rng: 9.4 },
      { hp: 1980, c: 320000, t: 860, dmg: 190, rate: 1.7, rng: 9.6 },
      { hp: 2290, c: 430000, t: 1040, dmg: 225, rate: 1.7, rng: 9.6 },
      { hp: 2630, c: 560000, t: 1220, dmg: 265, rate: 1.6, rng: 9.8 },
      { hp: 3000, c: 700000, t: 1400, dmg: 310, rate: 1.6, rng: 10 },
    ],
    d: 'Skewers dragons and flyers from afar. Cannot hit ground troops.', air: 1, airOnly: true,
  },
  wall: {
    n: 'Wall', s: 1, cat: 'def', res: 'g', emoji: '🧱', max: [25, 50, 75, 100, 125, 150, 175, 200, 225, 250],
    lv: [
      { hp: 320, c: 20, t: 0 },
      { hp: 680, c: 50, t: 0 },
      { hp: 1250, c: 120, t: 0 },
      { hp: 2100, c: 600, t: 0 },
      { hp: 3400, c: 1400, t: 0 },
      { hp: 5200, c: 3000, t: 0 },
      { hp: 7500, c: 6500, t: 0 },
      { hp: 10500, c: 14000, t: 0 },
      { hp: 14200, c: 30000, t: 0 },
      { hp: 19000, c: 60000, t: 0 },
    ],
    d: 'Slows ground raiders. Builds instantly.',
  },
  barracks: {
    n: 'Barracks', s: 3, cat: 'army', res: 'm', emoji: '⚔️', max: [1, 1, 2, 2, 2, 2, 3, 3, 3, 3],
    lv: [
      { hp: 360, c: 100, t: 6 },
      { hp: 460, c: 300, t: 15 },
      { hp: 580, c: 800, t: 35 },
      { hp: 720, c: 5000, t: 70 },
      { hp: 880, c: 12000, t: 140 },
      { hp: 1060, c: 30000, t: 210 },
      { hp: 1270, c: 60000, t: 300 },
      { hp: 1520, c: 110000, t: 420 },
      { hp: 1820, c: 190000, t: 560 },
      { hp: 2180, c: 300000, t: 720 },
    ],
    d: 'Trains units. Higher levels unlock new units.',
  },
  lab: {
    n: 'War Lab', s: 3, cat: 'army', res: 'm', emoji: '⚗️', max: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
    lv: [
      { hp: 420, c: 2500, t: 45 },
      { hp: 540, c: 8000, t: 90 },
      { hp: 680, c: 20000, t: 180 },
      { hp: 840, c: 45000, t: 260 },
      { hp: 1020, c: 85000, t: 360 },
      { hp: 1220, c: 140000, t: 480 },
      { hp: 1450, c: 210000, t: 620 },
      { hp: 1700, c: 300000, t: 800 },
      { hp: 1980, c: 400000, t: 1000 },
      { hp: 2300, c: 520000, t: 1200 },
    ],
    d: 'Researches troop power. Higher labs unlock deeper levels.',
  },
  camp: {
    n: 'Army Camp', s: 4, cat: 'army', res: 'm', emoji: '⛺', max: [1, 1, 2, 2, 3, 3, 3, 4, 4, 4],
    lv: [
      { hp: 320, c: 120, t: 8, cap: 20 },
      { hp: 400, c: 400, t: 20, cap: 30 },
      { hp: 500, c: 1000, t: 45, cap: 40 },
      { hp: 620, c: 8000, t: 90, cap: 55 },
      { hp: 760, c: 20000, t: 180, cap: 75 },
      { hp: 920, c: 48000, t: 260, cap: 95 },
      { hp: 1100, c: 90000, t: 360, cap: 115 },
      { hp: 1320, c: 160000, t: 480, cap: 140 },
      { hp: 1580, c: 280000, t: 620, cap: 165 },
      { hp: 1900, c: 450000, t: 800, cap: 200 },
    ],
    d: 'Houses your trained army.',
  },
  clan: {
    n: 'Clan Hall', s: 3, cat: 'core', res: 'g', emoji: '🛡️', max: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    // costs sit at ~70-80% of the gold cap of each level's era — always
    // reachable the moment the Keep allows the upgrade (no cap deadlocks)
    lv: [
      { hp: 900, c: 4000, t: 60 },
      { hp: 1150, c: 8000, t: 120 },
      { hp: 1450, c: 12000, t: 220 },
      { hp: 1800, c: 26000, t: 320 },
      { hp: 2200, c: 55000, t: 440 },
      { hp: 2650, c: 100000, t: 560 },
      { hp: 3150, c: 170000, t: 700 },
      { hp: 3700, c: 260000, t: 860 },
      { hp: 4300, c: 400000, t: 1040 },
      { hp: 5000, c: 600000, t: 1240 },
    ],
    d: 'Join or found a clan and open the war-room chat. Higher halls host more clanmates (as leader).',
  },
  hut: {
    n: 'Builder Hut', s: 2, cat: 'core', res: 'w', emoji: '🔨', max: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    lv: [{ hp: 260, c: 200, t: 0 }],
    d: 'Hires one more builder. Paid in $WAR.',
  },
  bomb: {
    n: 'Hidden Bomb', s: 1, cat: 'trap', res: 'g', emoji: '💥', max: [2, 3, 4, 5, 6, 6, 7, 7, 8, 8],
    lv: [
      { hp: 1, c: 80, t: 0, dmg: 45, spl: 1.3 },
      { hp: 1, c: 400, t: 0, dmg: 70, spl: 1.3 },
      { hp: 1, c: 2400, t: 0, dmg: 100, spl: 1.4 },
    ],
    d: 'Invisible to attackers. Explodes when ground troops step close.',
  },
  spring: {
    n: 'Spring Trap', s: 1, cat: 'trap', res: 'g', emoji: '🌀', max: [1, 2, 3, 4, 5, 5, 6, 6, 7, 7],
    lv: [{ hp: 1, c: 150, t: 0 }],
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
  dragon: {
    n: 'Dragon', emoji: '🐉', house: 10, hp: 1900, dmg: 55, rate: 1.1, rng: 1.6, spd: 1.7,
    cost: 9000, tt: 30, fly: 1, pref: 'any', unlock: 5, splash: 0.9,
    d: 'Flying terror. Splashing fire breath; only arrows and sky ballistae can answer.',
  },
};

export const TROOP_ORDER: readonly TroopType[] = [
  'raider', 'sniper', 'bomber', 'imp', 'bruiser', 'warlock', 'gargoyle', 'mender', 'dragon',
];
export const SHOP_ORDER: readonly BuildingType[] = [
  'cannon', 'arrow', 'mortar', 'airdef', 'wall', 'bomb', 'spring',
  'mine', 'well', 'vault', 'tank', 'barracks', 'lab', 'camp', 'clan', 'hut',
];

/* ------------------------------- Clans -------------------------------- */
/** Gold cost to found a clan (needs a Clan Hall of any level). */
export const CLAN_CREATE_COST = 10000;
/** Clan member capacity by the LEADER's Clan Hall level (index = level-1). */
export const CLAN_CAP_BY_HALL = [10, 15, 20, 25, 30, 35, 40, 45, 50, 50] as const;
export const clanCap = (hallLv: number): number =>
  CLAN_CAP_BY_HALL[Math.min(Math.max(hallLv, 1), CLAN_CAP_BY_HALL.length) - 1]!;
/** Chat: max message length + min seconds between messages per player. */
export const CHAT_MAX_LEN = 200;
export const CHAT_COOLDOWN_S = 3;

/**
 * Clan aid (CoC-style requests): caps follow the REQUESTER's own Clan Hall
 * level — a bigger hall asks for more. Troops are measured in housing space,
 * resources in raw amount. One open request at a time + a cooldown.
 */
export const REQ_TROOP_CAP_BY_HALL = [5, 8, 12, 16, 20, 25, 30, 35, 40, 50] as const;
export const REQ_RES_CAP_BY_HALL = [
  5000, 10000, 20000, 35000, 60000, 90000, 130000, 180000, 240000, 300000,
] as const;
export const reqTroopCap = (hallLv: number): number =>
  REQ_TROOP_CAP_BY_HALL[Math.min(Math.max(hallLv, 1), REQ_TROOP_CAP_BY_HALL.length) - 1]!;
export const reqResCap = (hallLv: number): number =>
  REQ_RES_CAP_BY_HALL[Math.min(Math.max(hallLv, 1), REQ_RES_CAP_BY_HALL.length) - 1]!;
export const REQ_COOLDOWN_S = 300;

/**
 * Village power — the CoC-ish strength score shown on clan rosters.
 * Sum of building levels (weighted by kind) + War Lab research + trophies.
 * Clan power = the sum over all members.
 */
export const POWER_W: Record<BuildingType, number> = {
  keep: 30, mine: 4, well: 4, vault: 5, tank: 5,
  cannon: 12, arrow: 12, mortar: 14, airdef: 14, wall: 1,
  barracks: 10, lab: 12, camp: 8, clan: 10, hut: 6, bomb: 2, spring: 2,
};
export function villagePower(
  buildings: ReadonlyArray<{ type: BuildingType; level: number }>,
  troopLv: Partial<Record<string, number>>,
  trophies: number,
): number {
  let p = Math.max(0, trophies);
  for (const b of buildings) p += b.level * (POWER_W[b.type] ?? 5);
  for (const lv of Object.values(troopLv)) p += Math.max(0, (lv ?? 1) - 1) * 15;
  return Math.round(p);
}

/* ----------------------- War Lab troop research ----------------------- */
/** Max research level for every troop. */
export const TROOP_MAX_LVL = 5;
/** hp/dmg/heal multiplier per troop level (index = level-1). */
export const TROOP_LVL_MUL = [1, 1.16, 1.34, 1.55, 1.8] as const;
export const troopMul = (lvl: number): number =>
  TROOP_LVL_MUL[Math.min(Math.max(lvl, 1), TROOP_MAX_LVL) - 1]!;
/** Mana cost to research TO level index+1 (so [1] = cost of level 2). */
export const RESEARCH_COST = [0, 25000, 90000, 250000, 600000] as const;
/** Real research durations in seconds (same indexing as RESEARCH_COST). */
export const REAL_RESEARCH_TIMES = [0, 6 * 3600, 24 * 3600, 48 * 3600, 96 * 3600] as const;
/** War Lab level required to research TO level index+1. */
export const LAB_REQ = [0, 1, 3, 5, 7] as const;

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
  freeze: {
    n: 'Frost Rune', emoji: '❄️', cost: 700, unlock: 6, radius: 2.6, dur: 6,
    d: 'Defenses inside the ring stop firing for 6 seconds.',
  },
};
export const SPELL_ORDER: readonly SpellType[] = ['heal', 'rage', 'bolt', 'freeze'];
/** Max spells carried into battle (all types combined). */
export const SPELL_CAP = 3;

export const BASE_CAP = 1200;
export const BATTLE_TIME = 180;
export const NEXT_COST = 50;

/**
 * Obstacle clear costs (gold) and starting resources. The starting stash is
 * deliberately rich (owner-directed): enough to take EVERY building to L3
 * (~17.8k gold + ~10.4k mana incl. the Keep-2/3 unlocks) — the grind begins
 * at L4+, funded by raids.
 */
export const OBSTACLE_COST = { tree: 40, rock: 30 } as const;
export const START_RES = { g: 20000, m: 12000, w: 40 } as const;
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
  keep: [0, 300, 7200, 43200, 129600, 216000, 345600, 518400, 691200, 864000], // …2.5d · 4d · 6d · 8d · 10d
  mine: [10, 60, 900, 7200, 28800, 86400, 172800, 259200, 345600, 432000], // 10s · 1m · 15m · 2h · 8h
  well: [10, 60, 900, 7200, 28800, 86400, 172800, 259200, 345600, 432000],
  vault: [10, 60, 900, 7200, 28800, 86400, 172800, 259200, 345600, 432000],
  tank: [10, 60, 900, 7200, 28800, 86400, 172800, 259200, 345600, 432000],
  cannon: [10, 60, 900, 7200, 28800, 86400, 172800, 259200, 345600, 432000],
  arrow: [10, 60, 900, 7200, 28800, 86400, 172800, 259200, 345600, 432000],
  mortar: [300, 7200, 28800, 86400, 172800, 259200, 345600, 432000, 518400, 604800],
  airdef: [900, 7200, 28800, 86400, 172800, 259200, 345600, 432000, 518400, 604800],
  wall: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  barracks: [10, 60, 900, 7200, 28800, 86400, 172800, 259200, 345600, 432000],
  lab: [900, 7200, 28800, 86400, 172800, 259200, 345600, 432000, 518400, 604800],
  camp: [10, 60, 900, 7200, 28800, 86400, 172800, 259200, 345600, 432000],
  clan: [600, 7200, 28800, 86400, 172800, 259200, 345600, 432000, 518400, 604800],
  hut: [0],
  bomb: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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
  dragon: 1200,
};

/** Real obstacle-clearing times (a builder works on it), seconds. */
export const REAL_CLEAR_TIMES: Record<'tree' | 'rock', number> = {
  tree: 30,
  rock: 20,
};
