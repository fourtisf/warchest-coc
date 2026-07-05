/**
 * Lazy time advancement: every read/mutation first materializes a village to
 * "now" — completed build jobs level up, the training queue drains
 * sequentially, and production accrues from timestamps. No server ticks.
 */
import { prisma, type Army, type Building, type Obstacle, type QuestState, type TrainJob, type Village } from '@warchest/db';
import { BUILD, MAP, TROOP_MAX_LVL, clamp, villagePower } from '@warchest/game-core';
import { armyOf, asTroop, asType, barracksSpeed, isBusy, levelsOf, occGrid, prodPerSec, trainSeconds } from './rules';

export interface FullVillage extends Village {
  buildings: Building[];
  obstacles: Obstacle[];
  army: Army;
  trainJobs: TrainJob[];
  questStates: QuestState[];
}

export interface VillageStat {
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
  tTypes: Record<string, number>;
}

export function statOf(v: Village): VillageStat {
  const base: VillageStat = {
    trained: 0, wins: 0, raids: 0, warClaimed: 0, gCollected: 0, mCollected: 0,
    built: 0, obst: 0, lootG: 0, lootM: 0, stars: 0, threeStar: 0, claims: 0, tTypes: {},
  };
  return { ...base, ...(v.statJson as Partial<VillageStat>) };
}

/** Current on-site storage of a mine/well (display + collect basis). */
export function storedNow(b: Building, now: Date): number {
  if (b.type !== 'mine' && b.type !== 'well') return 0;
  if (isBusy(b, now)) return b.storedFloat;
  const L = BUILD[asType(b.type)].lv[b.level - 1]!;
  const dt = Math.max(0, (now.getTime() - b.storedAt.getTime()) / 1000);
  return clamp(b.storedFloat + prodPerSec(asType(b.type), b.level) * dt, 0, L.cap!);
}

export async function loadVillage(userId: string): Promise<FullVillage> {
  const v = await prisma().village.findUnique({
    where: { userId },
    include: { buildings: true, obstacles: true, army: true, trainJobs: { orderBy: { id: 'asc' } }, questStates: true },
  });
  if (!v || !v.army) throw new Error('village not found');
  return v as FullVillage;
}

/** Advance a village to `now`, persist completions, return the fresh state. */
export async function materializeVillage(userId: string, now = new Date()): Promise<FullVillage> {
  const v = await loadVillage(userId);
  const db = prisma();
  const stat = statOf(v);
  let statDirty = false;

  // 1. finished build/upgrade jobs
  for (const b of v.buildings) {
    if (b.busyUntil && b.busyUntil.getTime() <= now.getTime()) {
      const doneAt = b.busyUntil;
      const up = b.jobKind === 'up';
      b.level = up ? b.level + 1 : b.level;
      b.busyUntil = null;
      b.jobKind = null;
      b.jobTotalS = null;
      // production paused while busy: resume accrual from completion time
      b.storedAt = doneAt;
      await db.building.update({
        where: { id: b.id },
        data: { level: b.level, busyUntil: null, jobKind: null, jobTotalS: null, storedAt: doneAt },
      });
    }
  }

  // 1b. finished obstacle clears → reward ◆ and mark cleared
  for (const ob of v.obstacles) {
    if (!ob.cleared && ob.clearUntil && ob.clearUntil.getTime() <= now.getTime()) {
      ob.cleared = true;
      const rw = 3 + ((ob.id * 7) % 4);
      await db.obstacle.update({ where: { id: ob.id }, data: { cleared: true } });
      await db.village.update({ where: { id: v.id }, data: { war: { increment: rw } } });
      await db.warLedger.create({
        data: { userId: v.userId, delta: rw, reason: 'obstacle', refId: String(ob.id) },
      });
      v.war += rw;
      stat.obst += 1;
      statDirty = true;
    }
  }

  // 1c. nature reclaims the map: a new obstacle sprouts every ~12h (cap 8)
  {
    const alive = v.obstacles.filter((o) => !o.cleared).length;
    const last = v.lastObstAt?.getTime() ?? v.createdAt.getTime();
    if (alive < 8 && now.getTime() - last > 12 * 3600e3) {
      const occ = occGrid(v.buildings, v.obstacles);
      for (let tries = 0; tries < 24; tries++) {
        const gx = 2 + Math.floor(Math.random() * (MAP - 4));
        const gy = 2 + Math.floor(Math.random() * (MAP - 4));
        if (occ[gy * MAP + gx]) continue;
        const kind = Math.random() < 0.7 ? 'tree' : 'rock';
        const ob = await db.obstacle.create({ data: { villageId: v.id, kind, gx, gy } });
        v.obstacles.push(ob);
        break;
      }
      await db.village.update({ where: { id: v.id }, data: { lastObstAt: now } });
      v.lastObstAt = now;
    }
  }

  // 1d. finished War Lab research → the troop grows permanently stronger
  if (
    v.army.researchTroop &&
    v.army.researchUntil &&
    v.army.researchUntil.getTime() <= now.getTime()
  ) {
    const t = asTroop(v.army.researchTroop);
    const levels = levelsOf(v.army);
    levels[t] = Math.min(TROOP_MAX_LVL, (levels[t] ?? 1) + 1);
    await db.army.update({
      where: { villageId: v.id },
      data: {
        levelsJson: levels as object,
        researchTroop: null,
        researchUntil: null,
        researchTotalS: null,
      },
    });
    v.army.levelsJson = levels as object;
    v.army.researchTroop = null;
    v.army.researchUntil = null;
    v.army.researchTotalS = null;
  }

  // 2. training queue (sequential; speed = non-busy barracks count)
  if (v.trainJobs.length) {
    const spd = barracksSpeed(v.buildings, now);
    let cursor: Date | null = null;
    while (v.trainJobs.length) {
      const head = v.trainJobs[0]!;
      if (!head.finishesAt) {
        const startAt: Date = cursor ?? now;
        head.finishesAt = new Date(startAt.getTime() + (trainSeconds(asTroop(head.troopType)) / spd) * 1000);
        await db.trainJob.update({ where: { id: head.id }, data: { finishesAt: head.finishesAt } });
      }
      if (head.finishesAt.getTime() > now.getTime()) break;
      // completed
      const t = asTroop(head.troopType);
      v.army[t] += 1;
      stat.trained += 1;
      stat.tTypes[t] = (stat.tTypes[t] ?? 0) + 1;
      statDirty = true;
      cursor = head.finishesAt;
      await db.trainJob.delete({ where: { id: head.id } });
      v.trainJobs.shift();
    }
    await db.army.update({ where: { villageId: v.id }, data: armyOf(v.army) });
  }

  // 3. refresh the cached strength score (clan rosters sum it)
  const power = villagePower(
    v.buildings.map((b) => ({ type: asType(b.type), level: b.level })),
    levelsOf(v.army),
    v.trophies,
  );
  await db.village.update({
    where: { id: v.id },
    data: {
      lastSeen: now,
      ...(power !== v.power ? { power } : {}),
      ...(statDirty ? { statJson: stat as object } : {}),
    },
  });
  v.power = power;
  v.statJson = stat as object;
  v.lastSeen = now;
  return v;
}

/** Fold live production into storedFloat (call before collect / starting a job on a collector). */
export async function foldStored(b: Building, now: Date): Promise<void> {
  const s = storedNow(b, now);
  b.storedFloat = s;
  b.storedAt = now;
  await prisma().building.update({ where: { id: b.id }, data: { storedFloat: s, storedAt: now } });
}
