/**
 * Dev/admin utility: max out one account for testing.
 *
 *   cd apps/api && node node_modules/tsx/dist/cli.mjs scripts/max-village.ts <player-id-suffix>
 *
 * - levels every existing building to its top level (and finishes any job)
 * - builds everything still missing at max Keep (placed on free tiles:
 *   buildings spiral out from the center, walls form concentric rings)
 * - tops up resources and unlocks all builders
 *
 * Touches ONLY the account whose user id ends with the given suffix
 * (the in-game Player ID is that suffix, uppercased).
 */
import { prisma } from '@warchest/db';
import { BUILD, MAP, SHOP_ORDER, type BuildingType } from '@warchest/game-core';

const suffix = (process.argv[2] ?? '').toLowerCase();
if (!/^[a-z0-9]{4,12}$/.test(suffix)) {
  console.error('usage: tsx scripts/max-village.ts <player-id-suffix>');
  process.exit(1);
}

const db = prisma();
const user = await db.user.findFirst({ where: { id: { endsWith: suffix } } });
if (!user) {
  console.error(`no user found with id ending "${suffix}"`);
  process.exit(1);
}
const v = await db.village.findUniqueOrThrow({
  where: { userId: user.id },
  include: { buildings: true, obstacles: true },
});

/* occupancy of the 40x40 grid: existing buildings + live obstacles */
const occ = new Uint8Array(MAP * MAP);
const stamp = (gx: number, gy: number, s: number): void => {
  for (let y = gy; y < gy + s; y++)
    for (let x = gx; x < gx + s; x++)
      if (x >= 0 && y >= 0 && x < MAP && y < MAP) occ[y * MAP + x] = 1;
};
const fits = (gx: number, gy: number, s: number): boolean => {
  if (gx < 1 || gy < 1 || gx > MAP - 1 - s || gy > MAP - 1 - s) return false;
  for (let y = gy; y < gy + s; y++)
    for (let x = gx; x < gx + s; x++) if (occ[y * MAP + x]) return false;
  return true;
};
for (const b of v.buildings) stamp(b.gx, b.gy, BUILD[b.type as BuildingType].s);
for (const o of v.obstacles) if (!o.cleared) stamp(o.gx, o.gy, 1);

/* 1. every existing building → its top level, any running job finished */
for (const t of Object.keys(BUILD) as BuildingType[]) {
  const top = BUILD[t].lv.length;
  await db.building.updateMany({
    where: { villageId: v.id, type: t },
    data: { level: top, busyUntil: null, jobKind: null, jobTotalS: null },
  });
}

/* 2. build whatever is still missing at max Keep */
const C = MAP / 2;
const spotsFor = (s: number): Array<[number, number]> => {
  const out: Array<[number, number]> = [];
  for (let y = 1; y <= MAP - 1 - s; y++)
    for (let x = 1; x <= MAP - 1 - s; x++) out.push([x, y]);
  out.sort((a, b) => {
    const da = (a[0] + s / 2 - C) ** 2 + (a[1] + s / 2 - C) ** 2;
    const dbb = (b[0] + s / 2 - C) ** 2 + (b[1] + s / 2 - C) ** 2;
    return da - dbb;
  });
  return out;
};
/* concentric square rings for walls (Chebyshev radius r around the center) */
const wallRing = (r: number): Array<[number, number]> => {
  const out: Array<[number, number]> = [];
  for (let x = C - r; x <= C + r; x++) out.push([x, C - r], [x, C + r]);
  for (let y = C - r + 1; y <= C + r - 1; y++) out.push([C - r, y], [C + r, y]);
  return out.filter(([x, y]) => x >= 1 && y >= 1 && x <= MAP - 2 && y <= MAP - 2);
};

const created: Record<string, number> = {};
const rows: Array<{ villageId: string; type: string; level: number; gx: number; gy: number }> = [];
for (const t of SHOP_ORDER) {
  const B = BUILD[t];
  const top = B.lv.length;
  const target = B.max[B.max.length - 1]!;
  let have = v.buildings.filter((b) => b.type === t).length;
  if (have >= target) continue;
  const candidates = t === 'wall'
    ? [...wallRing(12), ...wallRing(13), ...wallRing(14), ...wallRing(15)]
    : spotsFor(B.s);
  for (const [gx, gy] of candidates) {
    if (have >= target) break;
    if (!fits(gx, gy, B.s)) continue;
    rows.push({ villageId: v.id, type: t, level: top, gx, gy });
    stamp(gx, gy, B.s);
    have++;
    created[t] = (created[t] ?? 0) + 1;
  }
  if (have < target) console.warn(`⚠ ${t}: ran out of free tiles at ${have}/${target}`);
}
if (rows.length) await db.building.createMany({ data: rows });

/* 3. full coffers + all builders */
await db.village.update({
  where: { id: v.id },
  data: { gold: 10_000_000, mana: 10_000_000, war: 10_000_000, buildersTotal: 3 },
});

const after = await db.building.groupBy({
  by: ['type'],
  where: { villageId: v.id },
  _count: true,
  _min: { level: true },
});
console.log(`maxed village of ${user.name ?? user.id} (#${suffix.toUpperCase()}):`);
for (const r of after.sort((a, b) => a.type.localeCompare(b.type)))
  console.log(`  ${r.type.padEnd(9)} ×${String(r._count).padStart(3)}  Lv ${r._min.level}`);
console.log(`created ${rows.length} new buildings; resources set to 10M each.`);
process.exit(0);
