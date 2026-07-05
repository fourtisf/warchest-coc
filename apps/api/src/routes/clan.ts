/**
 * Clans + war-room chat. A finished Clan Hall unlocks everything here:
 * found a clan (gold), join one, and talk in the global / clan channels.
 * Clan capacity follows the LEADER's Clan Hall level (CLAN_CAP_BY_HALL).
 */
import type { FastifyInstance } from 'fastify';
import { prisma } from '@warchest/db';
import {
  CHAT_COOLDOWN_S,
  CHAT_MAX_LEN,
  CLAN_CREATE_COST,
  REQ_COOLDOWN_S,
  TROOP,
  clanCap,
  reqResCap,
  reqTroopCap,
} from '@warchest/game-core';
import { z } from 'zod';
import { materializeVillage } from '../materialize';
import { armyCap, asTroop, capOf, housingUsed } from '../rules';
import { serializeVillage } from '../serialize';
import { requireUser } from './auth';

const NAME_RE = /^[A-Za-z0-9_ ]{3,20}$/;

class ClanError extends Error {
  statusCode = 400;
}
const bad = (msg: string): never => {
  throw new ClanError(msg);
};

/** Highest FINISHED Clan Hall level for a user (0 = none built yet). */
async function hallLvOf(userId: string, now: Date): Promise<number> {
  const rows = await prisma().building.findMany({
    where: { village: { userId }, type: 'clan' },
    select: { level: true, busyUntil: true, jobKind: true },
  });
  let lv = 0;
  for (const b of rows) {
    const busyNew = b.jobKind === 'new' && b.busyUntil && b.busyUntil.getTime() > now.getTime();
    if (!busyNew) lv = Math.max(lv, b.level);
  }
  return lv;
}

async function myMembership(userId: string) {
  return prisma().clanMember.findUnique({ where: { userId }, include: { clan: true } });
}

/** Public clan tag, CoC-style: short, uppercase, shareable ("#X7K2P9"). */
const tagOf = (id: string): string => '#' + id.slice(-6).toUpperCase();

/** Full clan card: members (name + trophies), capacity from the leader's hall. */
async function clanInfo(clanId: string, now: Date): Promise<object | null> {
  const db = prisma();
  const clan = await db.clan.findUnique({
    where: { id: clanId },
    include: {
      members: {
        orderBy: { joinedAt: 'asc' },
        include: { user: { select: { id: true, name: true, village: { select: { trophies: true, power: true } } } } },
      },
    },
  });
  if (!clan) return null;
  const cap = clanCap(await hallLvOf(clan.leaderId, now));
  const members = clan.members.map((m) => ({
    id: m.user.id,
    name: m.user.name ?? 'Commander',
    trophies: m.user.village?.trophies ?? 0,
    power: m.user.village?.power ?? 0,
    role: m.role,
  }));
  return {
    id: clan.id,
    tag: tagOf(clan.id),
    name: clan.name,
    desc: clan.desc,
    badge: clan.badge,
    leaderId: clan.leaderId,
    cap,
    count: clan.members.length,
    power: members.reduce((a, m) => a + m.power, 0),
    // strongest first — the roster is a power ranking (leader ties broken by join order)
    members: members.sort((a, b) => b.power - a.power),
  };
}

/* one message per CHAT_COOLDOWN_S per user (in-memory: single API process) */
const lastMsgAt = new Map<string, number>();

export function clanRoutes(app: FastifyInstance): void {
  /* ------------------------------- clans ------------------------------- */
  app.get('/clan/me', async (req) => {
    const user = await requireUser(req);
    const now = new Date();
    const [m, hallLv] = await Promise.all([myMembership(user.id), hallLvOf(user.id, now)]);
    return { hallLv, clan: m ? await clanInfo(m.clanId, now) : null };
  });

  // browse: strongest clans first (total member power); search by name or "#TAG"
  app.get('/clan/list', async (req) => {
    const { q } = z.object({ q: z.string().max(20).optional() }).parse(req.query ?? {});
    const qTag = q?.replace(/^#/, '').toLowerCase();
    const where = q
      ? qTag && /^[a-z0-9]{3,8}$/.test(qTag)
        ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { id: { endsWith: qTag } }] }
        : { name: { contains: q, mode: 'insensitive' as const } }
      : undefined;
    const db = prisma();
    const clans = await db.clan.findMany({
      where,
      include: { members: { select: { userId: true } } },
      orderBy: { members: { _count: 'desc' } },
      take: 60,
    });
    const uids = clans.flatMap((c) => c.members.map((m) => m.userId));
    const vills = uids.length
      ? await db.village.findMany({ where: { userId: { in: uids } }, select: { userId: true, power: true } })
      : [];
    const pw = new Map(vills.map((v) => [v.userId, v.power]));
    return {
      clans: clans
        .map((c) => ({
          id: c.id,
          tag: tagOf(c.id),
          name: c.name,
          desc: c.desc,
          badge: c.badge,
          count: c.members.length,
          power: c.members.reduce((a, m) => a + (pw.get(m.userId) ?? 0), 0),
        }))
        .sort((a, b) => b.power - a.power)
        .slice(0, 20),
    };
  });

  app.post('/clan/create', async (req) => {
    const user = await requireUser(req);
    const body = z
      .object({
        name: z.string().min(1).max(40),
        desc: z.string().max(120).optional(),
        badge: z.number().int().min(0).max(11).optional(),
      })
      .parse(req.body ?? {});
    const name = body.name.trim().replace(/\s+/g, ' ');
    if (!NAME_RE.test(name)) bad('Clan name must be 3-20 letters, numbers, spaces or _');
    const now = new Date();
    const db = prisma();
    if (await myMembership(user.id)) bad('Leave your current clan first');
    if ((await hallLvOf(user.id, now)) < 1) bad('Build a Clan Hall first');
    const taken = await db.clan.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
    if (taken) bad('That clan name is taken');
    // atomic gold pay: the guard keeps a double-tap from founding two clans
    const paid = await db.village.updateMany({
      where: { userId: user.id, gold: { gte: CLAN_CREATE_COST } },
      data: { gold: { decrement: CLAN_CREATE_COST } },
    });
    if (paid.count === 0) bad(`Not enough Gold (founding costs ${CLAN_CREATE_COST.toLocaleString()})`);
    const clan = await db.clan.create({
      data: {
        name,
        desc: (body.desc ?? '').trim().slice(0, 120),
        badge: body.badge ?? 0,
        leaderId: user.id,
        members: { create: { userId: user.id, role: 'leader' } },
      },
    });
    return { ok: true, clan: await clanInfo(clan.id, now) };
  });

  app.post('/clan/join', async (req) => {
    const user = await requireUser(req);
    const { clanId } = z.object({ clanId: z.string().min(1).max(40) }).parse(req.body ?? {});
    const now = new Date();
    const db = prisma();
    if (await myMembership(user.id)) bad('Leave your current clan first');
    if ((await hallLvOf(user.id, now)) < 1) bad('Build a Clan Hall first');
    const clan = await db.clan.findUnique({
      where: { id: clanId },
      include: { _count: { select: { members: true } } },
    });
    if (!clan) bad('No such clan');
    const cap = clanCap(await hallLvOf(clan!.leaderId, now));
    if (clan!._count.members >= cap) bad('That clan is full');
    await db.clanMember.create({ data: { userId: user.id, clanId } });
    return { ok: true, clan: await clanInfo(clanId, now) };
  });

  app.post('/clan/leave', async (req) => {
    const user = await requireUser(req);
    const db = prisma();
    const m = await myMembership(user.id);
    if (!m) bad('You are not in a clan');
    await db.clanMember.delete({ where: { userId: user.id } });
    if (m!.role === 'leader') {
      // crown the longest-standing member; an empty clan disbands (chat cascades)
      const heir = await db.clanMember.findFirst({
        where: { clanId: m!.clanId },
        orderBy: { joinedAt: 'asc' },
      });
      if (heir) {
        await db.clanMember.update({ where: { userId: heir.userId }, data: { role: 'leader' } });
        await db.clan.update({ where: { id: m!.clanId }, data: { leaderId: heir.userId } });
      } else {
        await db.clan.delete({ where: { id: m!.clanId } });
      }
    }
    return { ok: true };
  });

  app.post('/clan/kick', async (req) => {
    const user = await requireUser(req);
    const { userId } = z.object({ userId: z.string().min(1).max(40) }).parse(req.body ?? {});
    const db = prisma();
    const me = await myMembership(user.id);
    if (!me || me.role !== 'leader') bad('Only the clan leader can kick');
    if (userId === user.id) bad('Use Leave instead');
    const target = await db.clanMember.findUnique({ where: { userId } });
    if (!target || target.clanId !== me!.clanId) bad('Not a member of your clan');
    await db.clanMember.delete({ where: { userId } });
    return { ok: true, clan: await clanInfo(me!.clanId, new Date()) };
  });

  /* --------------------- clan aid (CoC-style requests) --------------------- */
  const REQ_LABEL: Record<string, string> = { troops: '⚔️ troops', gold: '🪙 Gold', mana: '🔮 Mana' };
  type Donor = { n: string; t: string };
  const reqDto = (r: {
    id: number; userId: string; kind: string; amount: number; filled: number;
    donorsJson: unknown; user: { name: string | null };
  }): object => ({
    id: r.id,
    uid: r.userId,
    name: r.user.name ?? 'Commander',
    kind: r.kind,
    amount: r.amount,
    filled: r.filled,
    donors: ((r.donorsJson as Donor[]) ?? []).slice(-4),
  });

  /** Open requests of a clan, freshest last (48h window keeps stale asks out). */
  async function openRequests(clanId: string): Promise<object[]> {
    const rows = await prisma().clanRequest.findMany({
      where: { clanId, status: 'open', createdAt: { gt: new Date(Date.now() - 48 * 3600e3) } },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { name: true } } },
    });
    return rows.map(reqDto);
  }

  app.post('/clan/request', async (req) => {
    const user = await requireUser(req);
    const body = z
      .object({ kind: z.enum(['troops', 'gold', 'mana']), amount: z.number().int().min(1) })
      .parse(req.body ?? {});
    const now = new Date();
    const db = prisma();
    const m = await myMembership(user.id);
    if (!m) bad('Join a clan first');
    const hall = await hallLvOf(user.id, now);
    const cap = body.kind === 'troops' ? reqTroopCap(hall) : reqResCap(hall);
    if (body.amount > cap)
      bad(`Your Clan Hall L${hall} can request at most ${body.kind === 'troops' ? cap + ' housing' : cap.toLocaleString()}`);
    const open = await db.clanRequest.findFirst({ where: { userId: user.id, status: 'open' } });
    if (open) bad('You already have an open request');
    const last = await db.clanRequest.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
    if (last && now.getTime() - last.createdAt.getTime() < REQ_COOLDOWN_S * 1000) {
      const left = Math.ceil((REQ_COOLDOWN_S * 1000 - (now.getTime() - last.createdAt.getTime())) / 60000);
      bad(`Next request in ~${left}m`);
    }
    const r = await db.clanRequest.create({
      data: { clanId: m!.clanId, userId: user.id, kind: body.kind, amount: body.amount },
      include: { user: { select: { name: true } } },
    });
    // announce it in the clan channel so idle mates see it in the stream
    await db.chatMessage.create({
      data: {
        clanId: m!.clanId,
        userId: user.id,
        text: `📦 requesting ${REQ_LABEL[body.kind]} — ${body.kind === 'troops' ? body.amount + ' housing' : body.amount.toLocaleString()}`,
      },
    });
    return { ok: true, req: reqDto(r), reqs: await openRequests(m!.clanId) };
  });

  app.post('/clan/request/cancel', async (req) => {
    const user = await requireUser(req);
    const db = prisma();
    const m = await myMembership(user.id);
    if (!m) bad('Join a clan first');
    const r = await db.clanRequest.updateMany({
      where: { userId: user.id, status: 'open' },
      data: { status: 'cancelled' },
    });
    if (r.count === 0) bad('No open request');
    return { ok: true, reqs: await openRequests(m!.clanId) };
  });

  app.post('/clan/donate', async (req) => {
    const user = await requireUser(req);
    const body = z
      .object({
        requestId: z.number().int(),
        troop: z.string().optional(),
        n: z.number().int().min(1).max(10).default(1),
        amount: z.number().int().min(1).optional(),
      })
      .parse(req.body ?? {});
    const now = new Date();
    const db = prisma();
    const m = await myMembership(user.id);
    if (!m) bad('Join a clan first');
    const r = await db.clanRequest.findUnique({
      where: { id: body.requestId },
      include: { user: { select: { name: true } } },
    });
    if (!r || r.clanId !== m!.clanId || r.status !== 'open') bad('That request is gone');
    if (r!.userId === user.id) bad('You cannot fill your own request');
    const remaining = r!.amount - r!.filled;
    // the receiving village: donations must actually fit
    const rv = await db.village.findUnique({
      where: { userId: r!.userId },
      include: { buildings: true, army: true, trainJobs: true },
    });
    if (!rv || !rv.army) bad('That request is gone');

    let delta = 0;
    let donorTag = '';
    if (r!.kind === 'troops') {
      const t = asTroop(body.troop ?? '');
      const house = TROOP[t].house * body.n;
      if (house > remaining) bad(`Only ${remaining} housing left on that request`);
      const room = armyCap(rv!.buildings, now) - housingUsed(rv!.army!, rv!.trainJobs);
      if (room < house) bad('Their army camps are full');
      // claim the slice first (atomic guard: no overshoot when two donors race)
      const claimed = await db.clanRequest.updateMany({
        where: { id: r!.id, status: 'open', filled: { lte: r!.amount - house } },
        data: { filled: { increment: house } },
      });
      if (claimed.count === 0) bad('That request just filled up');
      // take the troops off the donor (atomic: must still own them)
      const paid = await db.army.updateMany({
        where: { villageId: (await db.village.findUniqueOrThrow({ where: { userId: user.id } })).id, [t]: { gte: body.n } },
        data: { [t]: { decrement: body.n } },
      });
      if (paid.count === 0) {
        await db.clanRequest.update({ where: { id: r!.id }, data: { filled: { decrement: house } } });
        bad(`You do not have ${body.n}× ${TROOP[t].n} ready`);
      }
      await db.army.update({ where: { villageId: rv!.id }, data: { [t]: { increment: body.n } } });
      delta = house;
      donorTag = `${TROOP[t].emoji}×${body.n}`;
    } else {
      const res = r!.kind === 'gold' ? 'g' : 'm';
      const want = Math.min(body.amount ?? remaining, remaining);
      const capRoom = Math.max(
        0,
        Math.floor(capOf(rv!.buildings, res, now) - (res === 'g' ? rv!.gold : rv!.mana)),
      );
      const give = Math.min(want, capRoom);
      if (give <= 0) bad('Their storage is full');
      const claimed = await db.clanRequest.updateMany({
        where: { id: r!.id, status: 'open', filled: { lte: r!.amount - give } },
        data: { filled: { increment: give } },
      });
      if (claimed.count === 0) bad('That request just filled up');
      const col = res === 'g' ? 'gold' : 'mana';
      const paid = await db.village.updateMany({
        where: { userId: user.id, [col]: { gte: give } },
        data: { [col]: { decrement: give } },
      });
      if (paid.count === 0) {
        await db.clanRequest.update({ where: { id: r!.id }, data: { filled: { decrement: give } } });
        bad(`Not enough ${r!.kind === 'gold' ? 'Gold' : 'Mana'}`);
      }
      await db.village.update({ where: { id: rv!.id }, data: { [col]: { increment: give } } });
      delta = give;
      donorTag = `${r!.kind === 'gold' ? '🪙' : '🔮'}${give.toLocaleString()}`;
    }
    // close it when full + log the donor (display only, race-tolerant)
    const fresh = await db.clanRequest.findUniqueOrThrow({ where: { id: r!.id } });
    const donors = [...(((fresh.donorsJson as Donor[]) ?? [])), { n: user.name ?? 'Commander', t: donorTag }];
    await db.clanRequest.update({
      where: { id: r!.id },
      data: { donorsJson: donors, ...(fresh.filled >= fresh.amount ? { status: 'done' } : {}) },
    });
    void delta;
    // donor gets their fresh village back (their army / stock just changed)
    const v = await materializeVillage(user.id, now);
    return { ok: true, reqs: await openRequests(m!.clanId), village: serializeVillage(v, user, now) };
  });

  /* -------------------------------- chat -------------------------------- */
  app.get('/chat', async (req) => {
    const user = await requireUser(req);
    const q = z
      .object({ ch: z.enum(['global', 'clan']).default('global'), after: z.coerce.number().int().min(0).default(0) })
      .parse(req.query ?? {});
    const db = prisma();
    let clanId: string | null = null;
    if (q.ch === 'clan') {
      const m = await myMembership(user.id);
      if (!m) bad('Join a clan to use its chat');
      clanId = m!.clanId;
    }
    // sender's clan rides along — global chat shows it as a tap-to-find badge
    const withClan = {
      user: { select: { name: true, clanMember: { select: { clan: { select: { id: true, name: true } } } } } },
    } as const;
    const msgs = q.after
      ? await db.chatMessage.findMany({
          where: { clanId, id: { gt: q.after } },
          orderBy: { id: 'asc' },
          take: 100,
          include: withClan,
        })
      : (
          await db.chatMessage.findMany({
            where: { clanId },
            orderBy: { id: 'desc' },
            take: 50,
            include: withClan,
          })
        ).reverse();
    return {
      me: user.id,
      msgs: msgs.map((m) => ({
        id: m.id,
        uid: m.userId,
        name: m.user.name ?? 'Commander',
        text: m.text,
        at: m.createdAt.getTime(),
        clan: m.user.clanMember
          ? { tag: tagOf(m.user.clanMember.clan.id), name: m.user.clanMember.clan.name }
          : null,
      })),
      // clan channel carries the aid board too (polled together with chat)
      ...(clanId ? { reqs: await openRequests(clanId) } : {}),
    };
  });

  app.post('/chat', async (req) => {
    const user = await requireUser(req);
    const body = z
      .object({ ch: z.enum(['global', 'clan']).default('global'), text: z.string().min(1).max(1000) })
      .parse(req.body ?? {});
    // control chars out, whitespace collapsed — chat is single-line
    // eslint-disable-next-line no-control-regex
    const text = body.text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX_LEN);
    if (!text) bad('Empty message');
    const now = new Date();
    const memb = await myMembership(user.id);
    let clanId: string | null = null;
    if (body.ch === 'clan') {
      if (!memb) bad('Join a clan to use its chat');
      clanId = memb!.clanId;
    } else if ((await hallLvOf(user.id, now)) < 1) {
      bad('Build a Clan Hall to talk in the war room');
    }
    const last = lastMsgAt.get(user.id) ?? 0;
    if (now.getTime() - last < CHAT_COOLDOWN_S * 1000) bad('Easy, commander — one message every few seconds');
    lastMsgAt.set(user.id, now.getTime());
    const msg = await prisma().chatMessage.create({ data: { clanId, userId: user.id, text } });
    return {
      ok: true,
      msg: {
        id: msg.id,
        uid: user.id,
        name: user.name ?? 'Commander',
        text,
        at: msg.createdAt.getTime(),
        clan: memb ? { tag: tagOf(memb.clanId), name: memb.clan.name } : null,
      },
    };
  });
}
