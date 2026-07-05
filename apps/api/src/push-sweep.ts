/**
 * Notification sweep (runs in the worker): finds construction/research that
 * finished in the (since, now] window for OFFLINE players and pushes once.
 * Completed jobs keep their timestamps until the owner materializes, so the
 * window scan needs no extra bookkeeping.
 */
import { prisma } from '@warchest/db';
import { BUILD, TROOP } from '@warchest/game-core';
import { asTroop, asType } from './rules';
import { pushToUser, type PushPayload } from './push';

const ONLINE_MS = 3 * 60 * 1000;

export type PushSender = (userId: string, payload: PushPayload) => Promise<number>;

/** Returns the userIds notified (for tests). */
export async function sweepCompletions(
  since: Date,
  now: Date,
  send: PushSender = pushToUser,
): Promise<string[]> {
  const db = prisma();
  const notified: string[] = [];

  // finished builds/upgrades
  const builds = await db.building.findMany({
    where: { busyUntil: { gt: since, lte: now } },
    include: { village: { select: { userId: true, lastSeen: true } } },
  });
  const byUser = new Map<string, string[]>();
  for (const b of builds) {
    if (b.village.lastSeen.getTime() >= now.getTime() - ONLINE_MS) continue; // they'll see it live
    const list = byUser.get(b.village.userId) ?? [];
    list.push(BUILD[asType(b.type)].n);
    byUser.set(b.village.userId, list);
  }
  for (const [uid, names] of byUser) {
    const body =
      names.length === 1
        ? `${names[0]} is finished — come see it!`
        : `${names.length} constructions finished — come see them!`;
    await send(uid, { title: '🔨 Construction complete!', body, url: '/play', tag: 'build' });
    notified.push(uid);
  }

  // finished lab research
  const labs = await db.army.findMany({
    where: { researchUntil: { gt: since, lte: now }, researchTroop: { not: null } },
    include: { village: { select: { userId: true, lastSeen: true } } },
  });
  for (const a of labs) {
    if (a.village.lastSeen.getTime() >= now.getTime() - ONLINE_MS) continue;
    const t = asTroop(a.researchTroop!);
    await send(a.village.userId, {
      title: '⚗️ Research complete!',
      body: `${TROOP[t].n} just got stronger — your lab is free for the next brew.`,
      url: '/play',
      tag: 'lab',
    });
    notified.push(a.village.userId);
  }
  return notified;
}
