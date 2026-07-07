/** Clan war routes: state view, search/cancel (leader), attack (roster). */
import type { FastifyInstance } from 'fastify';
import { randomInt } from 'node:crypto';
import { prisma } from '@warchest/db';
import { WAR_ATTACKS_PER_MEMBER, villageBaseSnapshot } from '@warchest/game-core';
import { z } from 'zod';
import { ENV } from '../env';
import { materializeVillage } from '../materialize';
import { asType, keepLv } from '../rules';
import { serializeVillage } from '../serialize';
import { rescoreWar, tryMatchWars, type WarRosterEntry } from '../war';
import { requireUser } from './auth';

class WarError extends Error {
  statusCode = 400;
}
const bad = (msg: string): never => {
  throw new WarError(msg);
};

async function myClan(userId: string) {
  const m = await prisma().clanMember.findUnique({ where: { userId }, include: { clan: true } });
  return m;
}

/** Everything the war tab renders, from the caller's point of view. */
async function warView(userId: string, clanId: string, warId: string): Promise<object | null> {
  const db = prisma();
  const war = await db.war.findUnique({ where: { id: warId }, include: { attacks: true } });
  if (!war) return null;
  const aSide = war.clanAId === clanId;
  const us = (aSide ? war.rosterAJson : war.rosterBJson) as unknown as WarRosterEntry[];
  const them = (aSide ? war.rosterBJson : war.rosterAJson) as unknown as WarRosterEntry[];
  const usIds = new Set(us.map((r) => r.uid));
  const attacksBy = new Map<string, number>();
  const starsBy = new Map<string, number>();
  const bestOn = new Map<string, number>();
  for (const a of war.attacks) {
    attacksBy.set(a.attackerId, (attacksBy.get(a.attackerId) ?? 0) + 1);
    if (usIds.has(a.attackerId)) {
      starsBy.set(a.attackerId, (starsBy.get(a.attackerId) ?? 0) + a.stars);
      bestOn.set(a.defenderId, Math.max(bestOn.get(a.defenderId) ?? 0, a.stars));
    }
  }
  const myUsed = attacksBy.get(userId) ?? 0;
  return {
    id: war.id,
    status: war.status,
    endsAt: war.endsAt.getTime(),
    size: us.length,
    winner: war.winner,
    us: {
      name: aSide ? war.nameA : war.nameB,
      stars: aSide ? war.starsA : war.starsB,
      pct: aSide ? war.pctA : war.pctB,
      roster: us.map((r) => ({
        ...r,
        attacksUsed: attacksBy.get(r.uid) ?? 0,
        stars: starsBy.get(r.uid) ?? 0,
      })),
    },
    them: {
      name: aSide ? war.nameB : war.nameA,
      stars: aSide ? war.starsB : war.starsA,
      pct: aSide ? war.pctB : war.pctA,
      roster: them.map((r) => ({ ...r, bestStars: bestOn.get(r.uid) ?? 0 })),
    },
    amParticipant: usIds.has(userId),
    myAttacksLeft: usIds.has(userId) ? Math.max(0, WAR_ATTACKS_PER_MEMBER - myUsed) : 0,
  };
}

export function warRoutes(app: FastifyInstance): void {
  app.get('/war/me', async (req) => {
    const user = await requireUser(req);
    const m = await myClan(user.id);
    if (!m) return { state: 'noclan' };
    const db = prisma();
    if (m.clan.warState === 'searching')
      return { state: 'searching', canManage: m.role === 'leader' };
    if (m.clan.warId) {
      const war = await warView(user.id, m.clanId, m.clan.warId);
      if (war) return { state: 'active', war, canManage: m.role === 'leader' };
    }
    // most recent finished war (48h window) — the result card
    const recent = await db.war.findFirst({
      where: {
        status: 'ended',
        OR: [{ clanAId: m.clanId }, { clanBId: m.clanId }],
        endsAt: { gt: new Date(Date.now() - 48 * 3600e3) },
      },
      orderBy: { endsAt: 'desc' },
    });
    if (recent) {
      const war = await warView(user.id, m.clanId, recent.id);
      return { state: 'ended', war, canManage: m.role === 'leader' };
    }
    return { state: 'idle', canManage: m.role === 'leader' };
  });

  app.post('/war/search', async (req) => {
    const user = await requireUser(req);
    const m = await myClan(user.id);
    if (!m) bad('Join a clan first');
    if (m!.role !== 'leader') bad('Only the clan leader can declare war');
    if (m!.clan.warState === 'war' || m!.clan.warId) bad('Your clan is already at war');
    if (m!.clan.warState === 'searching') bad('Already searching for a war');
    const members = await prisma().clanMember.count({ where: { clanId: m!.clanId } });
    if (members < 2) bad('You need at least 2 clanmates to go to war');
    await prisma().clan.update({ where: { id: m!.clanId }, data: { warState: 'searching' } });
    await tryMatchWars(new Date());
    const fresh = await prisma().clan.findUniqueOrThrow({ where: { id: m!.clanId } });
    return { ok: true, state: fresh.warId ? 'active' : 'searching' };
  });

  app.post('/war/search/cancel', async (req) => {
    const user = await requireUser(req);
    const m = await myClan(user.id);
    if (!m) bad('Join a clan first');
    if (m!.role !== 'leader') bad('Only the clan leader can cancel');
    const done = await prisma().clan.updateMany({
      where: { id: m!.clanId, warState: 'searching' },
      data: { warState: 'idle' },
    });
    if (done.count === 0) bad('Not searching');
    return { ok: true };
  });

  // scout an enemy war base: same shape as /battle/scout so the whole battle
  // client path (deploy → resolve → replay) is reused untouched
  app.post('/war/attack', async (req) => {
    const user = await requireUser(req);
    const { defenderId } = z.object({ defenderId: z.string().min(1).max(40) }).parse(req.body ?? {});
    const now = new Date();
    const db = prisma();
    const m = await myClan(user.id);
    if (!m || !m.clan.warId) bad('Your clan is not at war');
    const war = await db.war.findUnique({ where: { id: m!.clan.warId! } });
    if (!war || war.status !== 'active') bad('The war is over');
    if (war!.endsAt.getTime() <= now.getTime()) bad('The war just ended — scores are being tallied');
    const aSide = war!.clanAId === m!.clanId;
    const us = (aSide ? war!.rosterAJson : war!.rosterBJson) as unknown as WarRosterEntry[];
    const them = (aSide ? war!.rosterBJson : war!.rosterAJson) as unknown as WarRosterEntry[];
    if (!us.some((r) => r.uid === user.id)) bad('You are not on the war roster');
    if (!them.some((r) => r.uid === defenderId)) bad('That base is not in this war');
    // attacks used = resolved war attacks + still-open war scouts (no hoarding)
    const [used, open] = await Promise.all([
      db.warAttack.count({ where: { warId: war!.id, attackerId: user.id } }),
      db.battle.count({
        where: {
          warId: war!.id,
          attackerId: user.id,
          status: 'scouted',
          createdAt: { gt: new Date(now.getTime() - ENV.SCOUT_TTL_MIN * 60 * 1000) },
        },
      }),
    ]);
    if (used + open >= WAR_ATTACKS_PER_MEMBER) bad('No war attacks left');
    const v = await materializeVillage(user.id, now);
    const dv = await materializeVillage(defenderId, now);
    const seed = randomInt(1, 0x7fffffff);
    const base = villageBaseSnapshot({
      buildings: dv.buildings.map((b) => ({ type: asType(b.type), level: b.level, gx: b.gx, gy: b.gy })),
      gold: dv.gold,
      mana: dv.mana,
      keepLevel: keepLv(dv.buildings),
      seed,
    });
    // war bases carry no loot — stars are the currency here
    for (const b of base.list) {
      b.lootG = 0;
      b.lootM = 0;
    }
    const snapshot = { list: base.list, th: base.th, pool: 0 };
    const battle = await db.battle.create({
      data: {
        attackerId: user.id,
        defenderId,
        defenderSnapshotJson: snapshot as unknown as object,
        seed,
        warId: war!.id,
      },
    });
    return {
      battleId: battle.id,
      seed,
      th: snapshot.th,
      list: snapshot.list,
      lootG: 0,
      lootM: 0,
      expiresAt: now.getTime() + ENV.SCOUT_TTL_MIN * 60 * 1000,
      village: serializeVillage(v, user, now),
      war: true,
    };
  });
}

export { rescoreWar };
