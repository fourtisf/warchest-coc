/** P2: matchmaking from real village snapshots + deploy-log validation via the shared sim. */
import { randomInt } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { prisma } from '@warchest/db';
import {
  NEXT_COST,
  SPELL_ORDER,
  TROOP_ORDER,
  baseFromList,
  clamp,
  genEnemy,
  simulateBattle,
  villageBaseSnapshot,
  type DeployLogEntry,
  type SimBuilding,
} from '@warchest/game-core';
import { z } from 'zod';
import { ENV } from '../env';
import { materializeVillage, statOf } from '../materialize';
import { checkQuests } from '../quests';
import { SPELL_COLUMN, armyOf, asType, capOf, keepLv, levelsOf, spellsOf } from '../rules';
import { serializeVillage } from '../serialize';
import { bumpDaily, getDaily } from '../store';
import { requireUser } from './auth';

interface Snapshot {
  list: SimBuilding[];
  th: number;
  pool: number;
}

const ONLINE_WINDOW_MS = 3 * 60 * 1000;

async function currentSeason(): Promise<string> {
  const db = prisma();
  const now = new Date();
  const live = await db.season.findFirst({ where: { startsAt: { lte: now }, endsAt: { gt: now } } });
  if (live) return live.id;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const s = await db.season.create({ data: { startsAt: start, endsAt: end } });
  return s.id;
}

export function battleRoutes(app: FastifyInstance): void {
  app.post('/battle/scout', async (req, reply) => {
    const user = await requireUser(req);
    const body = z.object({ rerollFrom: z.string().optional(), revenge: z.string().optional() }).parse(req.body ?? {});
    const now = new Date();
    const v = await materializeVillage(user.id, now);
    const db = prisma();

    if (body.rerollFrom) {
      const prev = await db.battle.findUnique({ where: { id: body.rerollFrom } });
      if (!prev || prev.attackerId !== user.id || prev.status !== 'scouted')
        return reply.code(400).send({ error: 'nothing to reroll' });
      if (v.gold < NEXT_COST) return reply.code(400).send({ error: 'Not enough Gold' });
      v.gold -= NEXT_COST;
      await db.village.update({ where: { id: v.id }, data: { gold: v.gold } });
      await db.battle.update({ where: { id: prev.id }, data: { status: 'expired' } });
    }

    const seed = randomInt(1, 0x7fffffff);
    const myKeep = keepLv(v.buildings);
    // matchmaking pool: real villages in ±20% trophy range, not shielded, not online, not banned
    const lo = Math.floor(v.trophies * 0.8), hi = Math.ceil(v.trophies * 1.2);
    const candidates = await db.village.findMany({
      where: {
        userId: { not: user.id },
        trophies: { gte: lo, lte: hi },
        lastSeen: { lt: new Date(now.getTime() - ONLINE_WINDOW_MS) },
        OR: [{ shieldUntil: null }, { shieldUntil: { lt: now } }],
        user: { banned: false },
      },
      select: { userId: true },
      take: 30,
    });

    let snapshot: Snapshot;
    let defenderId: string | null = null;
    if (body.revenge) {
      // revenge: hit back the attacker from a defense-log entry (once per raid)
      const src = await db.battle.findUnique({
        where: { id: body.revenge },
        include: { attacker: { select: { id: true, banned: true } } },
      });
      if (!src || src.defenderId !== user.id || src.status !== 'resolved')
        return reply.code(400).send({ error: 'Nothing to revenge' });
      if (src.revenged) return reply.code(400).send({ error: 'Revenge already taken' });
      if (src.attacker.banned) return reply.code(400).send({ error: 'That raider was banned' });
      const av = await db.village.findUnique({ where: { userId: src.attackerId } });
      if (!av) return reply.code(400).send({ error: 'Their village is gone' });
      if (av.shieldUntil && av.shieldUntil.getTime() > now.getTime())
        return reply.code(400).send({ error: 'They are shielded right now — try later' });
      if (av.lastSeen.getTime() > now.getTime() - ONLINE_WINDOW_MS)
        return reply.code(400).send({ error: 'They are online right now — try later' });
      const dv = await materializeVillage(src.attackerId, now);
      const base = villageBaseSnapshot({
        buildings: dv.buildings.map((b) => ({ type: asType(b.type), level: b.level, gx: b.gx, gy: b.gy })),
        gold: dv.gold,
        mana: dv.mana,
        keepLevel: keepLv(dv.buildings),
        seed,
      });
      snapshot = { list: base.list, th: base.th, pool: base.pool };
      defenderId = src.attackerId;
      await db.battle.update({ where: { id: src.id }, data: { revenged: true } });
      const battle = await db.battle.create({
        data: { attackerId: user.id, defenderId, defenderSnapshotJson: snapshot as unknown as object, seed },
      });
      return {
        battleId: battle.id,
        seed,
        th: snapshot.th,
        list: snapshot.list,
        lootG: snapshot.list.reduce((a, b) => a + b.lootG, 0),
        lootM: snapshot.list.reduce((a, b) => a + b.lootM, 0),
        expiresAt: now.getTime() + ENV.SCOUT_TTL_MIN * 60 * 1000,
        village: serializeVillage(v, user, now),
      };
    }
    const raidsSoFar = statOf(v).raids;
    if (raidsSoFar < 3) {
      // FTUE: the first raids are always an easy level-1 camp with juicy loot,
      // whatever the player's Keep level (CoC-style soft landing).
      const base = genEnemy(seed, 1);
      for (const b of base.list) {
        b.lootG = Math.floor(b.lootG * 1.5);
        b.lootM = Math.floor(b.lootM * 1.5);
      }
      snapshot = { list: base.list, th: base.th, pool: base.pool };
    } else if (candidates.length) {
      const pick = candidates[randomInt(0, candidates.length)]!;
      const dv = await materializeVillage(pick.userId, now);
      const base = villageBaseSnapshot({
        buildings: dv.buildings.map((b) => ({ type: asType(b.type), level: b.level, gx: b.gx, gy: b.gy })),
        gold: dv.gold,
        mana: dv.mana,
        keepLevel: keepLv(dv.buildings),
        seed,
      });
      snapshot = { list: base.list, th: base.th, pool: base.pool };
      defenderId = pick.userId;
    } else {
      // pool is thin → procedural base, as specified
      const base = genEnemy(seed, myKeep);
      snapshot = { list: base.list, th: base.th, pool: base.pool };
    }

    const battle = await db.battle.create({
      data: {
        attackerId: user.id,
        defenderId,
        defenderSnapshotJson: snapshot as unknown as object,
        seed,
      },
    });
    return {
      battleId: battle.id,
      seed,
      th: snapshot.th,
      list: snapshot.list,
      lootG: snapshot.list.reduce((a, b) => a + b.lootG, 0),
      lootM: snapshot.list.reduce((a, b) => a + b.lootM, 0),
      expiresAt: now.getTime() + ENV.SCOUT_TTL_MIN * 60 * 1000,
      village: serializeVillage(v, user, now),
    };
  });

  const logSchema = z
    .array(
      z.union([
        z.object({
          tick: z.number().int().min(0),
          kind: z.literal('deploy'),
          troop: z.enum(TROOP_ORDER as [string, ...string[]]),
          x: z.number().finite(),
          y: z.number().finite(),
        }),
        z.object({
          tick: z.number().int().min(0),
          kind: z.literal('spell'),
          spell: z.enum(SPELL_ORDER as [string, ...string[]]),
          x: z.number().finite(),
          y: z.number().finite(),
        }),
        z.object({ tick: z.number().int().min(0), kind: z.literal('end') }),
      ]),
    )
    .max(400);

  app.post('/battle/:id/resolve', async (req, reply) => {
    const user = await requireUser(req);
    const { id } = req.params as { id: string };
    const body = z.object({ log: logSchema }).parse(req.body);
    const log = body.log as DeployLogEntry[];
    const now = new Date();
    const db = prisma();

    const battle = await db.battle.findUnique({ where: { id } });
    if (!battle || battle.attackerId !== user.id) return reply.code(404).send({ error: 'no such battle' });
    if (battle.status !== 'scouted') return reply.code(400).send({ error: 'battle already resolved' });
    if (now.getTime() - battle.createdAt.getTime() > ENV.SCOUT_TTL_MIN * 60 * 1000) {
      await db.battle.update({ where: { id }, data: { status: 'expired' } });
      return reply.code(400).send({ error: 'scout expired' });
    }
    for (let i = 1; i < log.length; i++)
      if (log[i]!.tick < log[i - 1]!.tick) return reply.code(400).send({ error: 'log not monotonic' });
    if (log.length && log[0]!.tick > ENV.MAX_PREROLL_TICKS)
      return reply.code(400).send({ error: 'pre-deploy idle too long' });

    const v = await materializeVillage(user.id, now);
    const army = armyOf(v.army);
    const spells = spellsOf(v.army);
    const levels = levelsOf(v.army);
    const snap = battle.defenderSnapshotJson as unknown as Snapshot;
    const base = baseFromList(snap.list, battle.seed, snap.th, snap.pool);
    const outcome = simulateBattle(base, army, log, spells, levels);

    // consume troops, credit loot (clamped to caps), $WAR with daily soft cap, trophies
    const capG = capOf(v.buildings, 'g', now), capM = capOf(v.buildings, 'm', now);
    // never negative even when the balance sits above cap (starting stash)
    const gotG = Math.max(0, clamp(v.gold + outcome.lootG, 0, capG) - v.gold);
    const gotM = Math.max(0, clamp(v.mana + outcome.lootM, 0, capM) - v.mana);
    let dW = outcome.warEarned;
    if (dW > 0) {
      const today = await getDaily('raidwar', user.id);
      if (today >= ENV.EARN_DAILY_CAP) dW = Math.floor(dW / 2);
      if (dW > 0) await bumpDaily('raidwar', user.id, dW);
    }
    v.gold += gotG;
    v.mana += gotM;
    v.war += dW;
    v.trophies = Math.max(0, v.trophies + outcome.trophyDelta);
    await db.village.update({
      where: { id: v.id },
      data: { gold: v.gold, mana: v.mana, war: v.war, trophies: v.trophies },
    });
    if (dW)
      await db.warLedger.create({ data: { userId: user.id, delta: dW, reason: 'raid', refId: id } });
    await db.army.update({
      where: { villageId: v.id },
      data: {
        ...outcome.armyLeft,
        [SPELL_COLUMN.heal]: outcome.spellsLeft.heal,
        [SPELL_COLUMN.rage]: outcome.spellsLeft.rage,
        [SPELL_COLUMN.bolt]: outcome.spellsLeft.bolt,
      },
    });
    const stat = statOf(v);
    if (outcome.started) {
      stat.raids += 1;
      if (stat.raids === 1 && user.refBy) {
        // referral: the inviter earns when the recruit fights their first raid
        const refV = await db.village.findUnique({ where: { userId: user.refBy } });
        if (refV) {
          await db.village.update({ where: { id: refV.id }, data: { war: { increment: 25 } } });
          await db.warLedger.create({
            data: { userId: user.refBy, delta: 25, reason: 'referral', refId: user.id },
          });
        }
      }
      if (outcome.win) stat.wins += 1;
      stat.stars += outcome.stars;
      if (outcome.stars === 3) stat.threeStar += 1;
      stat.lootG += outcome.lootG;
      stat.lootM += outcome.lootM;
    }
    v.statJson = stat as object;
    await db.village.update({ where: { id: v.id }, data: { statJson: stat as object } });

    // defender consequences: lose looted resources, 12h shield on ≥2★ defeat
    if (battle.defenderId && outcome.started) {
      const dv = await db.village.findUnique({ where: { userId: battle.defenderId } });
      if (dv) {
        await db.village.update({
          where: { id: dv.id },
          data: {
            gold: Math.max(0, dv.gold - outcome.lootG),
            mana: Math.max(0, dv.mana - outcome.lootM),
            ...(outcome.stars >= 2
              ? { shieldUntil: new Date(now.getTime() + 12 * 3600 * 1000) }
              : {}),
          },
        });
      }
    }

    await db.battle.update({
      where: { id },
      data: {
        status: outcome.started ? 'resolved' : 'aborted',
        validated: true,
        deployLogJson: log as unknown as object,
        levelsJson: levels as object,
        stars: outcome.stars,
        pct: outcome.pct,
        lootG: outcome.lootG,
        lootM: outcome.lootM,
        warEarned: dW,
        trophyDelta: outcome.trophyDelta,
        resolvedAt: now,
      },
    });

    const seasonId = await currentSeason();
    await db.seasonScore.upsert({
      where: { seasonId_userId: { seasonId, userId: user.id } },
      create: { seasonId, userId: user.id, trophies: v.trophies },
      update: { trophies: v.trophies },
    });

    const fresh = await materializeVillage(user.id, now);
    await checkQuests(fresh, !!user.wallet);
    return {
      outcome: { ...outcome, warEarned: dW },
      village: serializeVillage(fresh, user, now),
    };
  });

  // Watch any of your battles again: the deterministic sim replays the log.
  app.get('/battle/:id/replay', async (req, reply) => {
    const user = await requireUser(req);
    const { id } = req.params as { id: string };
    const db = prisma();
    const b = await db.battle.findUnique({
      where: { id },
      include: { attacker: { select: { wallet: true, id: true, name: true } } },
    });
    if (!b || b.status !== 'resolved' || !b.deployLogJson)
      return reply.code(404).send({ error: 'No replay for this battle' });
    if (b.defenderId !== user.id && b.attackerId !== user.id)
      return reply.code(403).send({ error: 'Not your battle' });
    const snap = b.defenderSnapshotJson as unknown as Snapshot;
    return {
      seed: b.seed,
      th: snap.th,
      list: snap.list,
      pool: snap.pool,
      log: b.deployLogJson,
      levels: b.levelsJson ?? {},
      stars: b.stars,
      pct: b.pct,
      attacker:
        b.attacker.name ??
        (b.attacker.wallet
          ? b.attacker.wallet.slice(0, 4) + '…' + b.attacker.wallet.slice(-4)
          : 'Chief-' + b.attacker.id.slice(-4)),
    };
  });

  // "You were raided" mail. ?peek=1 reads the unseen count without marking seen.
  app.get('/battle/defense-log', async (req) => {
    const user = await requireUser(req);
    const peek = (req.query as { peek?: string }).peek === '1';
    const db = prisma();
    const rows = await db.battle.findMany({
      where: { defenderId: user.id, status: 'resolved' },
      orderBy: { resolvedAt: 'desc' },
      take: 20,
      include: { attacker: { select: { wallet: true, id: true, name: true, banned: true } } },
    });
    const unseen = rows.filter((r) => !r.seenByDefender).length;
    if (!peek)
      await db.battle.updateMany({
        where: { defenderId: user.id, seenByDefender: false },
        data: { seenByDefender: true },
      });
    return {
      unseen,
      entries: rows.map((r) => ({
        id: r.id,
        canRevenge: !r.revenged && !r.attacker.banned,
        at: r.resolvedAt?.getTime() ?? r.createdAt.getTime(),
        stars: r.stars,
        pct: r.pct,
        lootG: r.lootG,
        lootM: r.lootM,
        attacker:
          r.attacker.name ??
          (r.attacker.wallet
            ? r.attacker.wallet.slice(0, 4) + '…' + r.attacker.wallet.slice(-4)
            : 'Chief-' + r.attacker.id.slice(-4)),
      })),
    };
  });
}
