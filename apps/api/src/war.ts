/**
 * Clan wars — the shared engine used by the routes AND the worker.
 * Lifecycle: leader starts a search → two searching clans get paired by
 * total power → fixed equal rosters (top-power members) fight for
 * WAR_DURATION_S with WAR_ATTACKS_PER_MEMBER attacks each → stars are
 * best-per-defender (CoC style) → the worker closes it and pays $WAR.
 */
import { prisma } from '@warchest/db';
import {
  WAR_PRIZE_LOSE,
  WAR_PRIZE_TIE,
  WAR_PRIZE_WIN,
  WAR_ROSTER_MAX,
} from '@warchest/game-core';
import { ENV } from './env';
import { pushToUser } from './push';

export interface WarRosterEntry {
  uid: string;
  name: string;
  power: number;
}

type Send = typeof pushToUser;

/** Members of a clan ranked by power — the war roster source. */
export async function rosterOf(clanId: string): Promise<WarRosterEntry[]> {
  const db = prisma();
  const members = await db.clanMember.findMany({
    where: { clanId },
    include: { user: { select: { id: true, name: true, village: { select: { power: true } } } } },
  });
  return members
    .map((m) => ({
      uid: m.user.id,
      name: m.user.name ?? 'Commander',
      power: m.user.village?.power ?? 0,
    }))
    .sort((a, b) => b.power - a.power);
}

async function announce(clanId: string, authorId: string, text: string): Promise<void> {
  await prisma().chatMessage.create({ data: { clanId, userId: authorId, text } }).catch(() => undefined);
}

/**
 * Pair up searching clans (closest total power first). Called inline after
 * /war/search and by the worker sweep; the per-clan claim is atomic so a
 * concurrent run can never double-match a clan.
 */
export async function tryMatchWars(now = new Date(), send: Send = pushToUser): Promise<number> {
  const db = prisma();
  const searching = await db.clan.findMany({
    where: { warState: 'searching' },
    include: { members: { select: { userId: true } } },
  });
  if (searching.length < 2) return 0;
  const power = new Map<string, number>();
  for (const c of searching) {
    const roster = await rosterOf(c.id);
    power.set(c.id, roster.reduce((a, r) => a + r.power, 0));
  }
  const pool = [...searching].sort((a, b) => (power.get(b.id) ?? 0) - (power.get(a.id) ?? 0));
  let made = 0;
  for (let i = 0; i + 1 < pool.length; i += 2) {
    const A = pool[i]!, B = pool[i + 1]!;
    // atomic claim of both sides — losers of the race revert to searching
    const cA = await db.clan.updateMany({ where: { id: A.id, warState: 'searching' }, data: { warState: 'idle' } });
    const cB = await db.clan.updateMany({ where: { id: B.id, warState: 'searching' }, data: { warState: 'idle' } });
    if (cA.count !== 1 || cB.count !== 1) {
      if (cA.count === 1) await db.clan.update({ where: { id: A.id }, data: { warState: 'searching' } });
      if (cB.count === 1) await db.clan.update({ where: { id: B.id }, data: { warState: 'searching' } });
      continue;
    }
    const [fullA, fullB] = [await rosterOf(A.id), await rosterOf(B.id)];
    const size = Math.min(WAR_ROSTER_MAX, fullA.length, fullB.length);
    const rosterA = fullA.slice(0, size);
    const rosterB = fullB.slice(0, size);
    const endsAt = new Date(now.getTime() + ENV.WAR_DURATION_S * 1000);
    const war = await db.war.create({
      data: {
        clanAId: A.id,
        clanBId: B.id,
        nameA: A.name,
        nameB: B.name,
        endsAt,
        rosterAJson: rosterA as unknown as object,
        rosterBJson: rosterB as unknown as object,
      },
    });
    await db.clan.update({ where: { id: A.id }, data: { warState: 'war', warId: war.id } });
    await db.clan.update({ where: { id: B.id }, data: { warState: 'war', warId: war.id } });
    const hrs = Math.round(ENV.WAR_DURATION_S / 360) / 10;
    await announce(A.id, A.leaderId, `⚔️ WAR DECLARED vs ${B.name} — ${size}v${size}, ends in ${hrs}h. To arms!`);
    await announce(B.id, B.leaderId, `⚔️ WAR DECLARED vs ${A.name} — ${size}v${size}, ends in ${hrs}h. To arms!`);
    for (const r of [...rosterA, ...rosterB])
      void send(r.uid, {
        title: '⚔️ Clan War declared!',
        body: `Your clan is at war — you have 2 attacks. Make them count!`,
        url: '/play',
        tag: 'war',
      });
    made++;
  }
  return made;
}

/** Recompute a war's score: per enemy base, only the BEST attack counts. */
export async function rescoreWar(warId: string): Promise<void> {
  const db = prisma();
  const war = await db.war.findUnique({ where: { id: warId }, include: { attacks: true } });
  if (!war) return;
  const rosterA = war.rosterAJson as unknown as WarRosterEntry[];
  const rosterB = war.rosterBJson as unknown as WarRosterEntry[];
  const sideA = new Set(rosterA.map((r) => r.uid));
  const score = (defenders: WarRosterEntry[], attackerSide: Set<string>): { stars: number; pct: number } => {
    let stars = 0, pctSum = 0;
    for (const d of defenders) {
      let best = 0, bestPct = 0;
      for (const a of war.attacks) {
        if (a.defenderId !== d.uid || !attackerSide.has(a.attackerId)) continue;
        if (a.stars > best || (a.stars === best && a.pct > bestPct)) {
          best = a.stars;
          bestPct = a.pct;
        }
      }
      stars += best;
      pctSum += bestPct;
    }
    return { stars, pct: defenders.length ? pctSum / defenders.length : 0 };
  };
  const a = score(rosterB, sideA); // side A attacks side B's bases
  const b = score(rosterA, new Set(rosterB.map((r) => r.uid)));
  await db.war.update({
    where: { id: warId },
    data: { starsA: a.stars, pctA: a.pct, starsB: b.stars, pctB: b.pct },
  });
}

/** Close finished wars: pick the winner, pay the rosters, free the clans. */
export async function closeWars(now = new Date(), send: Send = pushToUser): Promise<number> {
  const db = prisma();
  const due = await db.war.findMany({ where: { status: 'active', endsAt: { lte: now } } });
  for (const war of due) {
    // atomic claim — a concurrent sweep can't pay a war twice
    const claimed = await db.war.updateMany({
      where: { id: war.id, status: 'active' },
      data: { status: 'ended' },
    });
    if (claimed.count === 0) continue;
    await rescoreWar(war.id);
    const fresh = await db.war.findUniqueOrThrow({ where: { id: war.id } });
    const winner =
      fresh.starsA !== fresh.starsB
        ? fresh.starsA > fresh.starsB
          ? war.clanAId
          : war.clanBId
        : fresh.pctA !== fresh.pctB
          ? fresh.pctA > fresh.pctB
            ? war.clanAId
            : war.clanBId
          : 'tie';
    await db.war.update({ where: { id: war.id }, data: { winner } });
    const rosterA = war.rosterAJson as unknown as WarRosterEntry[];
    const rosterB = war.rosterBJson as unknown as WarRosterEntry[];
    const pay = async (roster: WarRosterEntry[], amount: number, result: string): Promise<void> => {
      for (const r of roster) {
        await db.village.updateMany({ where: { userId: r.uid }, data: { war: { increment: amount } } });
        await db.warLedger.create({
          data: { userId: r.uid, delta: amount, reason: 'war', refId: war.id },
        });
        void send(r.uid, {
          title: result === 'win' ? '🏆 WAR WON!' : result === 'tie' ? '🤝 War ended in a tie' : '⚔️ War lost — regroup!',
          body: `${fresh.starsA}★ vs ${fresh.starsB}★ — ◆${amount} war bounty paid.`,
          url: '/play',
          tag: 'war',
        });
      }
    };
    if (winner === 'tie') {
      await pay(rosterA, WAR_PRIZE_TIE, 'tie');
      await pay(rosterB, WAR_PRIZE_TIE, 'tie');
    } else {
      await pay(winner === war.clanAId ? rosterA : rosterB, WAR_PRIZE_WIN, 'win');
      await pay(winner === war.clanAId ? rosterB : rosterA, WAR_PRIZE_LOSE, 'lose');
    }
    // free both clans (they may have disbanded mid-war — updateMany tolerates it)
    await db.clan.updateMany({
      where: { id: { in: [war.clanAId, war.clanBId] }, warId: war.id },
      data: { warState: 'idle', warId: null },
    });
    const headline =
      winner === 'tie'
        ? `🤝 War vs ${war.nameB} ended in a TIE (${fresh.starsA}★–${fresh.starsB}★). ◆${WAR_PRIZE_TIE} each.`
        : winner === war.clanAId
          ? `🏆 VICTORY over ${war.nameB}! ${fresh.starsA}★–${fresh.starsB}★. ◆${WAR_PRIZE_WIN} each.`
          : `⚔️ War lost to ${war.nameB} (${fresh.starsA}★–${fresh.starsB}★). ◆${WAR_PRIZE_LOSE} each — we go again.`;
    const headlineB =
      winner === 'tie'
        ? `🤝 War vs ${war.nameA} ended in a TIE (${fresh.starsB}★–${fresh.starsA}★). ◆${WAR_PRIZE_TIE} each.`
        : winner === war.clanBId
          ? `🏆 VICTORY over ${war.nameA}! ${fresh.starsB}★–${fresh.starsA}★. ◆${WAR_PRIZE_WIN} each.`
          : `⚔️ War lost to ${war.nameA} (${fresh.starsB}★–${fresh.starsA}★). ◆${WAR_PRIZE_LOSE} each — we go again.`;
    const clanA = await db.clan.findUnique({ where: { id: war.clanAId } });
    const clanB = await db.clan.findUnique({ where: { id: war.clanBId } });
    if (clanA) await announce(clanA.id, clanA.leaderId, headline);
    if (clanB) await announce(clanB.id, clanB.leaderId, headlineB);
  }
  return due.length;
}
