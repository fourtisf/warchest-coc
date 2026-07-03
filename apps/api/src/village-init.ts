/** Starting village layout — identical to the prototype's init(). */
import { prisma } from '@warchest/db';
import { START_RES } from '@warchest/game-core';

const START_BUILDINGS: ReadonlyArray<readonly [string, number, number]> = [
  ['keep', 18, 18], ['mine', 24, 19], ['well', 13, 19], ['vault', 24, 14], ['tank', 13, 14],
  ['cannon', 19, 24], ['barracks', 12, 24], ['camp', 25, 24],
];

const START_OBSTACLES: ReadonlyArray<readonly [string, number, number]> = [
  ['tree', 6, 8], ['tree', 30, 6], ['tree', 8, 29], ['tree', 31, 30], ['tree', 26, 5],
  ['tree', 5, 20], ['tree', 33, 17], ['tree', 12, 33], ['rock', 28, 11], ['rock', 10, 12],
];

export async function createUserWithVillage(): Promise<string> {
  const db = prisma();
  const user = await db.user.create({ data: {} });
  const village = await db.village.create({
    data: { userId: user.id, gold: START_RES.g, mana: START_RES.m, war: START_RES.w },
  });
  const walls: Array<{ gx: number; gy: number }> = [];
  for (let x = 17; x <= 22; x++) walls.push({ gx: x, gy: 17 }, { gx: x, gy: 22 });
  for (let y = 18; y <= 21; y++) walls.push({ gx: 17, gy: y }, { gx: 22, gy: y });
  await db.building.createMany({
    data: [
      ...START_BUILDINGS.map(([type, gx, gy]) => ({
        villageId: village.id,
        type,
        gx,
        gy,
        // head start on the collectors, as in the prototype
        storedFloat: type === 'mine' || type === 'well' ? 120 : 0,
      })),
      ...walls.map((w) => ({ villageId: village.id, type: 'wall', gx: w.gx, gy: w.gy })),
    ],
  });
  await db.obstacle.createMany({
    data: START_OBSTACLES.map(([kind, gx, gy]) => ({ villageId: village.id, kind, gx, gy })),
  });
  await db.army.create({ data: { villageId: village.id } });
  return user.id;
}
