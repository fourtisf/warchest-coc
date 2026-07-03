/** Village → client DTO. Timers travel as epoch millis; client renders countdowns. */
import type { User } from '@warchest/db';
import { ENV } from './env';
import { statOf, storedNow, type FullVillage } from './materialize';
import { armyOf, spellsOf } from './rules';

export function serializeVillage(v: FullVillage, user: User, now = new Date()): object {
  return {
    serverNow: now.getTime(),
    config: {
      domain: ENV.WARCHEST_DOMAIN,
      timeScale: ENV.TIME_SCALE,
      prodAccel: ENV.PROD_ACCEL,
      claimMin: ENV.CLAIM_MIN,
      claimFeeBps: ENV.CLAIM_FEE_BPS,
      claimDailyCap: ENV.CLAIM_DAILY_CAP,
    },
    user: { id: user.id, wallet: user.wallet, name: user.name, banned: user.banned, isAdmin: user.isAdmin },
    res: { g: v.gold, m: v.mana, w: v.war },
    trophies: v.trophies,
    buildersTotal: v.buildersTotal,
    shieldUntil: v.shieldUntil ? v.shieldUntil.getTime() : null,
    buildings: v.buildings.map((b) => ({
      id: b.id,
      type: b.type,
      level: b.level,
      gx: b.gx,
      gy: b.gy,
      stored: storedNow(b, now),
      busyUntil: b.busyUntil ? b.busyUntil.getTime() : null,
      jobKind: b.jobKind,
      jobTotalS: b.jobTotalS,
    })),
    obstacles: v.obstacles
      .filter((o) => !o.cleared)
      .map((o) => ({
        id: o.id,
        kind: o.kind,
        gx: o.gx,
        gy: o.gy,
        clearUntil: o.clearUntil ? o.clearUntil.getTime() : null,
        clearTotalS: o.clearTotalS,
      })),
    army: armyOf(v.army),
    spells: spellsOf(v.army),
    trainQ: v.trainJobs.map((j) => ({
      id: j.id,
      type: j.troopType,
      finishesAt: j.finishesAt ? j.finishesAt.getTime() : null,
      totalS: j.totalS,
    })),
    questDone: Object.fromEntries(v.questStates.filter((q) => q.done).map((q) => [q.questId, true])),
    stat: statOf(v),
    daily: {
      ready: (v.lastDailyAt?.getTime() ?? 0) < now.getTime() - 20 * 3600e3,
      streak: v.dailyStreak,
    },
  };
}
