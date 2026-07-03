/** Server-authoritative village actions. Every handler: materialize → validate → mutate → quests → state. */
import type { FastifyInstance } from 'fastify';
import { prisma } from '@warchest/db';
import {
  BUILD,
  MAX_BUILDERS,
  OBSTACLE_COST,
  SPELL,
  SPELL_CAP,
  TROOP,
  clamp,
  finishNowCostReal,
} from '@warchest/game-core';
import { z } from 'zod';
import { foldStored, materializeVillage, statOf, storedNow, type FullVillage } from '../materialize';
import { checkQuests } from '../quests';
import {
  RuleError,
  SPELL_COLUMN,
  activeJobs,
  armyCap,
  armyOf,
  asSpell,
  asTroop,
  asType,
  barracksSpeed,
  buildSeconds,
  clearSeconds,
  canPlaceVillage,
  capOf,
  housingUsed,
  isBusy,
  keepLv,
  maxBarracksLv,
  trainSeconds,
} from '../rules';
import { serializeVillage } from '../serialize';
import { requireUser } from './auth';

type Res = 'g' | 'm' | 'w';

async function payRes(v: FullVillage, res: Res, cost: number, reason: string, refId?: string): Promise<void> {
  const db = prisma();
  if (res === 'g') {
    if (v.gold < cost) throw new RuleError('poor', 'Not enough Gold');
    v.gold -= cost;
    await db.village.update({ where: { id: v.id }, data: { gold: v.gold } });
  } else if (res === 'm') {
    if (v.mana < cost) throw new RuleError('poor', 'Not enough Mana');
    v.mana -= cost;
    await db.village.update({ where: { id: v.id }, data: { mana: v.mana } });
  } else {
    if (v.war < cost) throw new RuleError('poor', 'Not enough $WAR');
    v.war -= cost;
    await db.village.update({ where: { id: v.id }, data: { war: v.war } });
    await db.warLedger.create({ data: { userId: v.userId, delta: -cost, reason, refId } });
  }
}

async function saveStat(v: FullVillage, stat: ReturnType<typeof statOf>): Promise<void> {
  v.statJson = stat as object;
  await prisma().village.update({ where: { id: v.id }, data: { statJson: stat as object } });
}

export function villageRoutes(app: FastifyInstance): void {
  const act = (
    path: string,
    schema: z.ZodTypeAny,
    handler: (v: FullVillage, body: never, now: Date) => Promise<void>,
  ): void => {
    app.post(`/village/${path}`, async (req, reply) => {
      const user = await requireUser(req);
      const body = schema.parse(req.body ?? {});
      const now = new Date();
      const v = await materializeVillage(user.id, now);
      try {
        await handler(v, body as never, now);
      } catch (e) {
        if (e instanceof RuleError) return reply.code(400).send({ error: e.message, code: e.code });
        throw e;
      }
      const fresh = await materializeVillage(user.id, now);
      await checkQuests(fresh, !!user.wallet);
      return serializeVillage(fresh, user, now);
    });
  };

  act('collect', z.object({ buildingId: z.number().int() }), async (v, body: { buildingId: number }, now) => {
    const b = v.buildings.find((x) => x.id === body.buildingId);
    if (!b || (b.type !== 'mine' && b.type !== 'well')) throw new RuleError('bad', 'Not a collector');
    if (isBusy(b, now)) throw new RuleError('busy', 'Under construction');
    const amt = Math.floor(storedNow(b, now));
    if (amt < 5) throw new RuleError('empty', 'Nothing to collect');
    const db = prisma();
    const res: Res = b.type === 'mine' ? 'g' : 'm';
    const cap = capOf(v.buildings, res, now);
    const cur = res === 'g' ? v.gold : v.mana;
    // never negative (balance can legitimately sit above cap, e.g. the starting
    // stash); bank only what fits and leave the rest in the collector
    const gained = Math.max(0, Math.min(amt, cap - cur));
    if (gained <= 0) throw new RuleError('full', 'Storage is full');
    await foldStored(b, now);
    b.storedFloat -= gained;
    await db.building.update({ where: { id: b.id }, data: { storedFloat: b.storedFloat } });
    const stat = statOf(v);
    if (res === 'g') {
      v.gold += gained;
      stat.gCollected += gained;
      await db.village.update({ where: { id: v.id }, data: { gold: v.gold } });
    } else {
      v.mana += gained;
      stat.mCollected += gained;
      await db.village.update({ where: { id: v.id }, data: { mana: v.mana } });
    }
    await saveStat(v, stat);
  });

  act(
    'place',
    z.object({ type: z.string(), gx: z.number().int().min(0), gy: z.number().int().min(0) }),
    async (v, body: { type: string; gx: number; gy: number }, now) => {
      const type = asType(body.type);
      const B = BUILD[type];
      const cnt = v.buildings.filter((b) => b.type === type).length;
      const isHut = type === 'hut';
      if (isHut) {
        if (v.buildersTotal >= MAX_BUILDERS) throw new RuleError('cap', 'Max builders');
      } else if (cnt >= B.max[keepLv(v.buildings) - 1]!) {
        throw new RuleError('cap', `Requires a higher Keep level`);
      }
      if (!canPlaceVillage(v.buildings, v.obstacles, type, body.gx, body.gy))
        throw new RuleError('blocked', 'Cannot place there');
      const dur = buildSeconds(type, 1);
      if (dur > 0 && activeJobs(v.buildings, v.obstacles, now) >= v.buildersTotal)
        throw new RuleError('builders', 'All builders are busy');
      await payRes(v, B.res, B.lv[0]!.c, 'spend', `place:${type}`);
      const db = prisma();
      await db.building.create({
        data: {
          villageId: v.id, type, gx: body.gx, gy: body.gy,
          busyUntil: dur > 0 ? new Date(now.getTime() + dur * 1000) : null,
          jobKind: dur > 0 ? 'new' : null,
          jobTotalS: dur > 0 ? dur : null,
        },
      });
      if (isHut) {
        v.buildersTotal = Math.min(MAX_BUILDERS, v.buildersTotal + 1);
        await db.village.update({ where: { id: v.id }, data: { buildersTotal: v.buildersTotal } });
      }
      const stat = statOf(v);
      stat.built += 1;
      await saveStat(v, stat);
    },
  );

  act(
    'move',
    z.object({ buildingId: z.number().int(), gx: z.number().int().min(0), gy: z.number().int().min(0) }),
    async (v, body: { buildingId: number; gx: number; gy: number }) => {
      const b = v.buildings.find((x) => x.id === body.buildingId);
      if (!b) throw new RuleError('bad', 'No such building');
      if (!canPlaceVillage(v.buildings, v.obstacles, asType(b.type), body.gx, body.gy, b.id))
        throw new RuleError('blocked', 'Cannot place there');
      await prisma().building.update({ where: { id: b.id }, data: { gx: body.gx, gy: body.gy } });
    },
  );

  act('upgrade', z.object({ buildingId: z.number().int() }), async (v, body: { buildingId: number }, now) => {
    const b = v.buildings.find((x) => x.id === body.buildingId);
    if (!b) throw new RuleError('bad', 'No such building');
    const type = asType(b.type);
    const B = BUILD[type];
    if (isBusy(b, now)) throw new RuleError('busy', 'Under construction');
    if (b.level >= B.lv.length) throw new RuleError('max', 'Max level');
    if (type !== 'keep' && b.level >= keepLv(v.buildings))
      throw new RuleError('keep', `Requires Keep Level ${b.level + 1}`);
    const dur = buildSeconds(type, b.level + 1);
    if (dur > 0 && activeJobs(v.buildings, v.obstacles, now) >= v.buildersTotal)
      throw new RuleError('builders', 'All builders are busy');
    await payRes(v, B.res, B.lv[b.level]!.c, 'spend', `upgrade:${type}:${b.level + 1}`);
    const db = prisma();
    if (type === 'mine' || type === 'well') await foldStored(b, now);
    if (dur <= 0) {
      await db.building.update({ where: { id: b.id }, data: { level: b.level + 1 } });
    } else {
      await db.building.update({
        where: { id: b.id },
        data: {
          busyUntil: new Date(now.getTime() + dur * 1000),
          jobKind: 'up',
          jobTotalS: dur,
        },
      });
    }
  });

  act('finish-now', z.object({ buildingId: z.number().int() }), async (v, body: { buildingId: number }, now) => {
    const b = v.buildings.find((x) => x.id === body.buildingId);
    if (!b || !b.busyUntil || b.busyUntil.getTime() <= now.getTime())
      throw new RuleError('bad', 'Nothing to finish');
    const remaining = (b.busyUntil.getTime() - now.getTime()) / 1000;
    const cost = finishNowCostReal(remaining);
    if (v.war < cost) throw new RuleError('poor', 'Not enough $WAR');
    // atomic claim: a double-tap fires two parallel requests — only the one
    // that flips busyUntil pays; the loser is a silent no-op, never a 2nd charge
    const claimed = await prisma().building.updateMany({
      where: { id: b.id, villageId: v.id, busyUntil: { gt: now } },
      data: { busyUntil: now },
    });
    if (claimed.count === 0) return;
    await payRes(v, 'w', cost, 'spend', `finish:${b.id}`);
  });

  act('train', z.object({ troop: z.string() }), async (v, body: { troop: string }, now) => {
    const t = asTroop(body.troop);
    const T = TROOP[t];
    if (maxBarracksLv(v.buildings, now) < T.unlock)
      throw new RuleError('unlock', `Requires Barracks Level ${T.unlock}`);
    if (housingUsed(v.army, v.trainJobs) + T.house > armyCap(v.buildings, now))
      throw new RuleError('housing', 'Army camps are full');
    await payRes(v, 'm', T.cost, 'spend');
    await prisma().trainJob.create({
      data: { villageId: v.id, troopType: t, totalS: trainSeconds(t) },
    });
  });

  act('rush-training', z.object({}), async (v, _body, now) => {
    if (!v.trainJobs.length) throw new RuleError('empty', 'Queue is empty');
    const spd = barracksSpeed(v.buildings, now);
    let rem = 0;
    for (let i = 0; i < v.trainJobs.length; i++) {
      const j = v.trainJobs[i]!;
      rem +=
        i === 0 && j.finishesAt
          ? Math.max(0, (j.finishesAt.getTime() - now.getTime()) / 1000)
          : j.totalS / spd;
    }
    const cost = finishNowCostReal(rem);
    await payRes(v, 'w', cost, 'spend', 'rush-training');
    const db = prisma();
    const stat = statOf(v);
    for (const j of v.trainJobs) {
      const t = asTroop(j.troopType);
      v.army[t] += 1;
      stat.trained += 1;
      stat.tTypes[t] = (stat.tTypes[t] ?? 0) + 1;
      await db.trainJob.delete({ where: { id: j.id } });
    }
    await db.army.update({ where: { villageId: v.id }, data: armyOf(v.army) });
    await saveStat(v, stat);
  });

  act('brew', z.object({ spell: z.string() }), async (v, body: { spell: string }) => {
    const s = (() => {
      try {
        return asSpell(body.spell);
      } catch {
        throw new RuleError('bad', 'No such spell');
      }
    })();
    const S = SPELL[s];
    if (keepLv(v.buildings) < S.unlock)
      throw new RuleError('unlock', `Requires Keep Level ${S.unlock}`);
    const total = v.army.spellHeal + v.army.spellRage + v.army.spellBolt;
    if (total >= SPELL_CAP) throw new RuleError('cap', `Spell rack is full (${SPELL_CAP} max)`);
    await payRes(v, 'm', S.cost, 'spend', `brew:${s}`);
    await prisma().army.update({
      where: { villageId: v.id },
      data: { [SPELL_COLUMN[s]]: { increment: 1 } },
    });
  });

  act('clear-obstacle', z.object({ obstacleId: z.number().int() }), async (v, body: { obstacleId: number }, now) => {
    const ob = v.obstacles.find((o) => o.id === body.obstacleId && !o.cleared);
    if (!ob) throw new RuleError('bad', 'No such obstacle');
    if (ob.clearUntil && ob.clearUntil.getTime() > now.getTime())
      throw new RuleError('busy', 'Already being cleared');
    if (activeJobs(v.buildings, v.obstacles, now) >= v.buildersTotal)
      throw new RuleError('builders', 'All builders are busy');
    const cost = ob.kind === 'tree' ? OBSTACLE_COST.tree : OBSTACLE_COST.rock;
    await payRes(v, 'g', cost, 'spend');
    const dur = clearSeconds(ob.kind as 'tree' | 'rock');
    await prisma().obstacle.update({
      where: { id: ob.id },
      data: { clearUntil: new Date(now.getTime() + dur * 1000), clearTotalS: dur },
    });
    // the ◆ reward + stat land in materialize when the builder finishes
  });
}
