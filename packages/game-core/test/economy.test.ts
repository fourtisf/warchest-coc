import { describe, expect, it } from 'vitest';
import {
  BASE_CAP,
  BUILD,
  MAP,
  TROOP,
  canPlace,
  finishNowCostDemo,
  finishNowCostReal,
  genEnemy,
  occOf,
} from '../src';

describe('config invariants', () => {
  it('every building level table matches its max-count table length or is hut/mortar-shaped', () => {
    for (const [type, def] of Object.entries(BUILD)) {
      expect(def.max.length, type).toBe(10);
      expect(def.lv.length, type).toBeGreaterThan(0);
      for (const lv of def.lv) {
        expect(lv.hp, type).toBeGreaterThan(0);
        expect(lv.c, type).toBeGreaterThanOrEqual(0);
        expect(lv.t, type).toBeGreaterThanOrEqual(0);
      }
    }
    expect(BUILD.mortar.lv.length).toBe(10);
    expect(BUILD.hut.lv.length).toBe(1);
    expect(BUILD.wall.max).toEqual([25, 50, 75, 100, 125, 150, 175, 200, 225, 250]);
  });

  it('troop stats match the prototype', () => {
    expect(TROOP.raider.house).toBe(1);
    expect(TROOP.bruiser.house).toBe(5);
    expect(TROOP.gargoyle.house).toBe(2);
    expect(TROOP.gargoyle.fly).toBe(1);
    expect(TROOP.bruiser.pref).toBe('def');
    expect(TROOP.gargoyle.unlock).toBe(3);
    expect(BASE_CAP).toBe(1200);
  });

  it('finish-now formulas', () => {
    expect(finishNowCostDemo(1)).toBe(2); // floor of 2
    expect(finishNowCostDemo(80)).toBe(10); // ceil(80/8)
    expect(finishNowCostReal(60 * 60)).toBe(90); // 60min * 1.5
    expect(finishNowCostReal(30)).toBe(2); // floor of 2
  });
});

describe('placement / occupancy', () => {
  it('rejects placement outside the 2-tile border and on occupied tiles', () => {
    const keep = { id: 1, type: 'keep' as const, gx: 18, gy: 18 };
    const occ = occOf([keep]);
    expect(canPlace(occ, 'cannon', 0, 0)).toBe(false); // border
    expect(canPlace(occ, 'cannon', MAP - 3, MAP - 3)).toBe(false); // border (needs +s <= MAP-2)
    expect(canPlace(occ, 'cannon', 17, 17)).toBe(false); // overlaps keep
    expect(canPlace(occ, 'cannon', 5, 5)).toBe(true);
    expect(canPlace(occ, 'cannon', 17, 17, 1)).toBe(true); // ignoring the keep itself
  });
});

describe('loot economy', () => {
  it('enemy loot pools scale with keep level and never go negative', () => {
    let prev = 0;
    for (let th = 1; th <= 10; th++) {
      // average over seeds to smooth the ±25% roll
      let sum = 0;
      const n = 30;
      for (let s = 0; s < n; s++) {
        const base = genEnemy(1000 + s * 17, th);
        expect(base.pool).toBeGreaterThan(0);
        for (const b of base.list) {
          expect(b.lootG).toBeGreaterThanOrEqual(0);
          expect(b.lootM).toBeGreaterThanOrEqual(0);
        }
        sum += base.pool;
      }
      const avg = sum / n;
      expect(avg).toBeGreaterThan(prev);
      prev = avg;
    }
  });

  it('total collectible loot never exceeds the base pool bounds', () => {
    for (let s = 0; s < 20; s++) {
      const base = genEnemy(31337 + s, 3);
      const g = base.list.reduce((a, b) => a + b.lootG, 0);
      const m = base.list.reduce((a, b) => a + b.lootM, 0);
      expect(g).toBeLessThanOrEqual(base.pool);
      expect(m).toBeLessThanOrEqual(base.pool);
    }
  });
});
