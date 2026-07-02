/** Server-side quest tracking: evaluate the shared 22-quest table after mutations. */
import { prisma } from '@warchest/db';
import { QUESTS, type QuestView } from '@warchest/game-core';
import { statOf, type FullVillage } from './materialize';
import { asType } from './rules';

export function questViewOf(v: FullVillage, hasWallet: boolean): QuestView {
  return {
    stat: statOf(v),
    buildings: v.buildings.map((b) => ({ type: asType(b.type), level: b.level })),
    trophies: v.trophies,
    buildersTotal: v.buildersTotal,
    hasWallet,
  };
}

/** Check all quests; credit rewards (war + ledger) for newly completed ones. */
export async function checkQuests(v: FullVillage, hasWallet: boolean): Promise<string[]> {
  const db = prisma();
  const done = new Set(v.questStates.filter((q) => q.done).map((q) => q.questId));
  const view = questViewOf(v, hasWallet);
  const newly: string[] = [];
  for (const q of QUESTS) {
    if (done.has(q.id)) continue;
    if (!q.chk(view)) continue;
    newly.push(q.id);
    await db.questState.upsert({
      where: { villageId_questId: { villageId: v.id, questId: q.id } },
      create: { villageId: v.id, questId: q.id, done: true, doneAt: new Date() },
      update: { done: true, doneAt: new Date() },
    });
    await db.village.update({ where: { id: v.id }, data: { war: { increment: q.reward } } });
    await db.warLedger.create({
      data: { userId: v.userId, delta: q.reward, reason: 'quest', refId: q.id },
    });
    v.war += q.reward;
    v.questStates.push({ villageId: v.id, questId: q.id, done: true, doneAt: new Date() });
  }
  return newly;
}
