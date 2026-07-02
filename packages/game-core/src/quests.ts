/**
 * The 22-quest "War Orders" table — conditions, rewards, and guide targets
 * ported verbatim from the prototype. Conditions are pure functions over a
 * QuestView so the same code runs client-side (P0) and server-side (P1+).
 */
import { fmt } from './util';
import type { QuestDef, QuestView } from './types';

const keepLevel = (v: QuestView): number =>
  v.buildings.find((b) => b.type === 'keep')?.level ?? 0;

export const QUESTS: readonly QuestDef[] = [
  // — Phase 1 · First Steps —
  {
    id: 'c1', ico: '🪙', reward: 5,
    txt: (v) => `Collect 300 Gold from your Mine (${Math.min(v.stat.gCollected, 300) | 0}/300)`,
    chk: (v) => v.stat.gCollected >= 300,
    go: { k: 'b', t: 'mine' }, tip: 'Tap your Gold Mine to collect',
  },
  {
    id: 'c2', ico: '🔮', reward: 5,
    txt: (v) => `Collect 300 Mana from your Well (${Math.min(v.stat.mCollected, 300) | 0}/300)`,
    chk: (v) => v.stat.mCollected >= 300,
    go: { k: 'b', t: 'well' }, tip: 'Tap your Mana Well to collect',
  },
  {
    id: 'c3', ico: '👛', reward: 10,
    txt: () => 'Connect your wallet',
    chk: (v) => v.hasWallet,
    go: { k: 'wallet' },
  },
  {
    id: 'c4', ico: '🏗️', reward: 10,
    txt: () => 'Buy & place any building from the Shop',
    chk: (v) => v.stat.built >= 1,
    go: { k: 'sheet', s: 'shop' },
  },
  {
    id: 'c5', ico: '🌳', reward: 10,
    txt: (v) => `Clear 2 obstacles (${Math.min(v.stat.obst, 2)}/2)`,
    chk: (v) => v.stat.obst >= 2,
    go: { k: 'obst' }, tip: 'Tap a tree or rock, then hit Clear',
  },
  // — Phase 2 · Raise an Army —
  {
    id: 'a1', ico: '🗡️', reward: 15,
    txt: (v) => `Train 10 units (${Math.min(v.stat.trained, 10)}/10)`,
    chk: (v) => v.stat.trained >= 10,
    go: { k: 'sheet', s: 'army' },
  },
  {
    id: 'a2', ico: '🏹', reward: 15,
    txt: () => 'Build an Arrow Tower',
    chk: (v) => v.buildings.some((b) => b.type === 'arrow'),
    go: { k: 'sheet', s: 'shop', hl: 'arrow' },
  },
  {
    id: 'a3', ico: '🧱', reward: 15,
    txt: (v) =>
      `Own 30 Walls (${Math.min(v.buildings.filter((b) => b.type === 'wall').length, 30)}/30)`,
    chk: (v) => v.buildings.filter((b) => b.type === 'wall').length >= 30,
    go: { k: 'sheet', s: 'shop', hl: 'wall' },
  },
  // — Phase 3 · First Blood —
  {
    id: 'r1', ico: '⚔️', reward: 20,
    txt: () => 'Launch your first raid',
    chk: (v) => v.stat.raids >= 1,
    go: { k: 'raid' },
  },
  {
    id: 'r2', ico: '⭐', reward: 25,
    txt: () => 'Win a raid (earn at least 1★)',
    chk: (v) => v.stat.wins >= 1,
    go: { k: 'raid' },
  },
  {
    id: 'r3', ico: '💰', reward: 25,
    txt: (v) => `Loot 1,000 Gold from raids (${fmt(Math.min(v.stat.lootG, 1000))}/1,000)`,
    chk: (v) => v.stat.lootG >= 1000,
    go: { k: 'raid' },
  },
  {
    id: 'r4', ico: '🌟', reward: 30,
    txt: (v) => `Earn 5 battle stars (${Math.min(v.stat.stars, 5)}/5)`,
    chk: (v) => v.stat.stars >= 5,
    go: { k: 'raid' },
  },
  // — Phase 4 · Rise of the Warlord —
  {
    id: 'p1', ico: '🏰', reward: 40,
    txt: () => 'Upgrade your Keep to Level 2',
    chk: (v) => keepLevel(v) >= 2,
    go: { k: 'keep' },
  },
  {
    id: 'p2', ico: '🔨', reward: 30,
    txt: () => 'Hire a 3rd Builder (Builder Hut)',
    chk: (v) => v.buildersTotal >= 3,
    go: { k: 'sheet', s: 'shop', hl: 'hut' },
  },
  {
    id: 'p3', ico: '💣', reward: 30,
    txt: () => 'Build a Mortar',
    chk: (v) => v.buildings.some((b) => b.type === 'mortar'),
    go: { k: 'sheet', s: 'shop', hl: 'mortar' },
  },
  {
    id: 'p4', ico: '🛡️', reward: 20,
    txt: () => 'Train a Bruiser (Barracks L2)',
    chk: (v) => (v.stat.tTypes.bruiser ?? 0) >= 1,
    go: { k: 'sheet', s: 'army', hl: 'bruiser' },
  },
  {
    id: 'p5', ico: '🦇', reward: 25,
    txt: () => 'Train a Gargoyle (Barracks L3)',
    chk: (v) => (v.stat.tTypes.gargoyle ?? 0) >= 1,
    go: { k: 'sheet', s: 'army', hl: 'gargoyle' },
  },
  {
    id: 'p6', ico: '💥', reward: 50,
    txt: () => 'Destroy a base 100% (3★ raid)',
    chk: (v) => v.stat.threeStar >= 1,
    go: { k: 'raid' },
  },
  {
    id: 'p7', ico: '👑', reward: 60,
    txt: () => 'Upgrade your Keep to Level 3',
    chk: (v) => keepLevel(v) >= 3,
    go: { k: 'keep' },
  },
  // — Phase 5 · On-Chain Legend —
  {
    id: 'w1', ico: '⛓️', reward: 15,
    txt: () => 'Claim $WAR on-chain once',
    chk: (v) => v.stat.claims >= 1,
    go: { k: 'wallet' },
  },
  {
    id: 't1', ico: '🏆', reward: 60,
    txt: (v) => `Reach 100 Trophies (${Math.min(v.trophies, 100)}/100)`,
    chk: (v) => v.trophies >= 100,
    go: { k: 'raid' },
  },
  {
    id: 't2', ico: '💎', reward: 100,
    txt: (v) => `Reach 250 Trophies (${Math.min(v.trophies, 250)}/250)`,
    chk: (v) => v.trophies >= 250,
    go: { k: 'raid' },
  },
];

/** Total $WAR pool across all quests (spec: ◆615). */
export const QUEST_POOL = QUESTS.reduce((a, q) => a + q.reward, 0);
