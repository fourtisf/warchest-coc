/** Procedural enemy base generation — ported verbatim from the prototype's genEnemy(). */
import { BUILD, MAP } from './config';
import { mulberry32 } from './rng';
import { clamp } from './util';
import type { BuildingType, EnemyBase, SimBuilding } from './types';

/**
 * Generate a deterministic enemy base for a seed.
 * @param seed      RNG seed (same seed ⇒ identical base).
 * @param keepLevel the attacker's Keep level (prototype used keepLv() of the player).
 */
export function genEnemy(seed: number, keepLevel: number): EnemyBase {
  const rng = mulberry32(seed);
  const th = clamp(keepLevel, 1, 10);
  const list: SimBuilding[] = [];
  let id = 1;
  const occ = new Int32Array(MAP * MAP);
  const put = (type: BuildingType, gx: number, gy: number, lvl: number): SimBuilding | null => {
    const s = BUILD[type].s;
    if (gx < 2 || gy < 2 || gx + s > MAP - 2 || gy + s > MAP - 2) return null;
    for (let y = gy; y < gy + s; y++)
      for (let x = gx; x < gx + s; x++) if (occ[y * MAP + x]) return null;
    const level = clamp(lvl, 1, BUILD[type].lv.length);
    const hp = BUILD[type].lv[level - 1]!.hp;
    const b: SimBuilding = { id: id++, type, gx, gy, level, hp, maxhp: hp, lootG: 0, lootM: 0 };
    for (let y = gy; y < gy + s; y++) for (let x = gx; x < gx + s; x++) occ[y * MAP + x] = b.id;
    list.push(b);
    return b;
  };
  put('keep', 18, 18, th);
  const defSlots: ReadonlyArray<readonly [number, number]> = [
    [19, 14], [19, 23], [14, 19], [23, 19], [14, 14], [23, 14], [14, 23], [23, 23],
  ];
  let si = 0;
  const take = () => defSlots[si++ % defSlots.length]!;
  for (let i = 0; i < BUILD.mortar.max[th - 1]!; i++) {
    const s = take();
    put('mortar', s[0], s[1], Math.max(1, th - 2));
  }
  for (let i = 0; i < BUILD.cannon.max[th - 1]!; i++) {
    const s = take();
    put('cannon', s[0], s[1], th);
  }
  for (let i = 0; i < BUILD.arrow.max[th - 1]!; i++) {
    const s = take();
    put('arrow', s[0], s[1], th);
  }
  const stoSlots: ReadonlyArray<readonly [number, number]> = [
    [15, 16], [22, 16], [15, 21], [22, 21],
  ];
  let sj = 0;
  for (let i = 0; i < BUILD.vault.max[th - 1]!; i++) {
    const s = stoSlots[sj++ % 4]!;
    put('vault', s[0], s[1], th);
  }
  for (let i = 0; i < BUILD.tank.max[th - 1]!; i++) {
    const s = stoSlots[sj++ % 4]!;
    put('tank', s[0], s[1], th);
  }
  if (th >= 2) {
    // wall ring around centre (20,20)
    const R = 7, c0 = 18 + 2 - R, c1 = 18 + 2 + R;
    for (let x = c0; x <= c1; x++) {
      put('wall', x, c0, Math.max(1, th - 1));
      put('wall', x, c1, Math.max(1, th - 1));
    }
    for (let y = c0 + 1; y < c1; y++) {
      put('wall', c0, y, Math.max(1, th - 1));
      put('wall', c1, y, Math.max(1, th - 1));
    }
  }
  const nCol = 2 + th;
  for (let i = 0; i < nCol; i++) {
    const a = rng() * Math.PI * 2, r = 10.5 + rng() * 3.5;
    const gx = Math.round(20 + Math.cos(a) * r) - 1, gy = Math.round(20 + Math.sin(a) * r * 0.9) - 1;
    put(i % 2 ? 'mine' : 'well', gx, gy, Math.max(1, th - 1));
  }
  for (let i = 0; i < BUILD.camp.max[th - 1]!; i++) {
    const a = rng() * Math.PI * 2;
    put('camp', Math.round(20 + Math.cos(a) * 12) - 2, Math.round(20 + Math.sin(a) * 11) - 2, th);
  }
  // loot pools
  const pool = Math.floor(320 * Math.pow(th, 1.55) * (0.85 + rng() * 0.5));
  const gHold = list.filter((b) => ['vault', 'mine', 'keep'].includes(b.type));
  const mHold = list.filter((b) => ['tank', 'well', 'keep'].includes(b.type));
  for (const b of gHold)
    b.lootG = Math.floor(
      pool *
        (b.type === 'vault'
          ? 0.5 / Math.max(1, list.filter((x) => x.type === 'vault').length)
          : b.type === 'keep'
            ? 0.3
            : 0.2 / Math.max(1, list.filter((x) => x.type === 'mine').length)),
    );
  for (const b of mHold)
    b.lootM = Math.floor(
      pool *
        (b.type === 'tank'
          ? 0.5 / Math.max(1, list.filter((x) => x.type === 'tank').length)
          : b.type === 'keep'
            ? 0.3
            : 0.2 / Math.max(1, list.filter((x) => x.type === 'well').length)),
    );
  // hidden traps inside the compound (drawn after all legacy rolls so the
  // building layout for a given seed is unchanged). The sim keeps traps out
  // of the occupancy grid and deploy-zone bake; the renderer hides them.
  const nBombs = Math.min(BUILD.bomb.max[th - 1] ?? 2, 1 + th);
  let placedBombs = 0;
  for (let i = 0; i < nBombs * 4 && placedBombs < nBombs; i++) {
    const a = rng() * Math.PI * 2, r = 3.5 + rng() * 4;
    if (put('bomb', Math.round(20 + Math.cos(a) * r), Math.round(20 + Math.sin(a) * r), Math.max(1, th - 2)))
      placedBombs++;
  }
  if (th >= 3) {
    const nSprings = Math.min(BUILD.spring.max[th - 1] ?? 1, 2);
    let placedSprings = 0;
    for (let i = 0; i < nSprings * 4 && placedSprings < nSprings; i++) {
      const a = rng() * Math.PI * 2, r = 3 + rng() * 3;
      if (put('spring', Math.round(20 + Math.cos(a) * r), Math.round(20 + Math.sin(a) * r), 1))
        placedSprings++;
    }
  }
  return { list, occ, th, pool, seed };
}
