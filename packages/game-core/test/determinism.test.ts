import { describe, expect, it } from 'vitest';
import {
  BattleSim,
  genEnemy,
  simulateBattle,
  type ArmyCounts,
  type DeployLogEntry,
} from '../src';

const ARMY: ArmyCounts = { raider: 8, sniper: 4, bruiser: 1, gargoyle: 2 };

/** A scripted raid: staggered deploys on two sides of the base. */
const LOG: DeployLogEntry[] = [
  { tick: 0, kind: 'deploy', troop: 'raider', x: 20.4, y: 6.2 },
  { tick: 6, kind: 'deploy', troop: 'raider', x: 21.1, y: 6.4 },
  { tick: 12, kind: 'deploy', troop: 'raider', x: 19.2, y: 6.1 },
  { tick: 30, kind: 'deploy', troop: 'sniper', x: 20.0, y: 7.0 },
  { tick: 36, kind: 'deploy', troop: 'sniper', x: 22.0, y: 7.2 },
  { tick: 60, kind: 'deploy', troop: 'bruiser', x: 6.5, y: 20.5 },
  { tick: 90, kind: 'deploy', troop: 'gargoyle', x: 6.8, y: 21.0 },
  { tick: 96, kind: 'deploy', troop: 'gargoyle', x: 7.4, y: 20.2 },
  { tick: 120, kind: 'deploy', troop: 'raider', x: 33.5, y: 20.5 },
  { tick: 126, kind: 'deploy', troop: 'raider', x: 33.2, y: 21.3 },
  { tick: 132, kind: 'deploy', troop: 'raider', x: 33.8, y: 19.6 },
  { tick: 150, kind: 'deploy', troop: 'raider', x: 33.1, y: 22.0 },
  { tick: 160, kind: 'deploy', troop: 'raider', x: 20.5, y: 33.5 },
  { tick: 200, kind: 'deploy', troop: 'sniper', x: 20.5, y: 32.5 },
  { tick: 210, kind: 'deploy', troop: 'sniper', x: 21.5, y: 32.8 },
];

describe('battle determinism', () => {
  it('same seed + log ⇒ identical result across 1000 runs', () => {
    const first = simulateBattle(genEnemy(1337, 3), ARMY, LOG);
    const key = JSON.stringify(first);
    for (let i = 0; i < 999; i++) {
      const r = simulateBattle(genEnemy(1337, 3), ARMY, LOG);
      expect(JSON.stringify(r)).toBe(key);
    }
    // the battle actually did something
    expect(first.started).toBe(true);
    expect(first.pct).toBeGreaterThan(0);
  });

  it('interactive sim (client path) matches log replay (server path) exactly', () => {
    const base = genEnemy(4242, 4);
    const sim = new BattleSim(genEnemy(4242, 4), ARMY);
    // drive the sim "live": deploy at the same ticks the log would
    const pending = [...LOG];
    while (!sim.over && sim.tick < 60 * 185) {
      while (pending.length && pending[0]!.tick === sim.tick) {
        const e = pending.shift()!;
        if (e.kind === 'deploy') sim.deploy(e.troop, e.x, e.y);
      }
      sim.step();
      sim.events.length = 0;
    }
    if (!sim.over) sim.requestEnd();
    const live = sim.outcome();
    const replay = simulateBattle(base, ARMY, sim.log);
    expect(replay).toEqual(live);
  });

  it('different seeds produce different bases', () => {
    const a = genEnemy(1, 3);
    const b = genEnemy(2, 3);
    expect(a.pool).not.toBe(b.pool);
  });

  it('genEnemy is deterministic for a seed', () => {
    const a = genEnemy(90210, 5);
    const b = genEnemy(90210, 5);
    expect(JSON.stringify(a.list)).toBe(JSON.stringify(b.list));
    expect(a.pool).toBe(b.pool);
  });

  it('early end via log entry is honoured', () => {
    const log: DeployLogEntry[] = [
      { tick: 0, kind: 'deploy', troop: 'raider', x: 20.4, y: 6.2 },
      { tick: 30, kind: 'end' },
    ];
    const r = simulateBattle(genEnemy(7, 2), { raider: 1, sniper: 0, bruiser: 0, gargoyle: 0 }, log);
    expect(r.started).toBe(true);
    expect(r.ticks).toBeLessThanOrEqual(31);
  });

  it('empty log ⇒ battle never starts, no rewards', () => {
    const r = simulateBattle(genEnemy(7, 2), ARMY, []);
    expect(r.started).toBe(false);
    expect(r.trophyDelta).toBe(0);
    expect(r.warEarned).toBe(0);
    expect(r.lootG).toBe(0);
  });

  it('invalid deploys (red zone / no troops) are rejected and unrecorded', () => {
    const base = genEnemy(9, 3);
    const sim = new BattleSim(base, { raider: 1, sniper: 0, bruiser: 0, gargoyle: 0 });
    expect(sim.deploy('raider', 20, 20)).toBe(false); // on top of the keep
    expect(sim.deploy('sniper', 5, 5)).toBe(false); // none in army
    expect(sim.deploy('raider', 5, 5)).toBe(true);
    expect(sim.deploy('raider', 5, 6)).toBe(false); // army exhausted
    expect(sim.log.length).toBe(1);
  });
});

describe('battle rules', () => {
  it('war formula: stars*8 + keep 10 + full-clear 7', () => {
    // brute-force a strong army to raze a level-1 base
    const army: ArmyCounts = { raider: 40, sniper: 20, bruiser: 4, gargoyle: 10 };
    const log: DeployLogEntry[] = [];
    let t = 0;
    for (let i = 0; i < 40; i++) log.push({ tick: (t += 3), kind: 'deploy', troop: 'raider', x: 12 + (i % 16) * 0.9, y: 8.2 });
    for (let i = 0; i < 20; i++) log.push({ tick: (t += 3), kind: 'deploy', troop: 'sniper', x: 12 + (i % 16), y: 30.6 });
    for (let i = 0; i < 4; i++) log.push({ tick: (t += 3), kind: 'deploy', troop: 'bruiser', x: 8.5, y: 16 + i });
    for (let i = 0; i < 10; i++) log.push({ tick: (t += 3), kind: 'deploy', troop: 'gargoyle', x: 31.5, y: 16 + (i % 8) });
    const r = simulateBattle(genEnemy(555, 1), army, log);
    expect(r.stars).toBe(3);
    expect(Math.round(r.pct)).toBe(100);
    expect(r.warEarned).toBe(3 * 8 + 10 + 7);
    expect(r.trophyDelta).toBe(10 + 6 * 3);
    expect(r.win).toBe(true);
  });

  it('gargoyles are immune to cannons and mortars (air:0)', () => {
    // A base with only ground-only defenses cannot kill a lone gargoyle.
    const base = genEnemy(31, 1); // L1 base: 1 cannon, 0 arrow towers
    expect(base.list.some((b) => b.type === 'arrow')).toBe(false);
    const log: DeployLogEntry[] = [{ tick: 0, kind: 'deploy', troop: 'gargoyle', x: 5, y: 5 }];
    const r = simulateBattle(base, { raider: 0, sniper: 0, bruiser: 0, gargoyle: 1 }, log);
    expect(r.pct).toBeGreaterThan(0); // it destroyed things unharmed until timeout
  });
});
