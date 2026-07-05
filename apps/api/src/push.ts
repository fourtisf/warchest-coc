/**
 * Web Push (VAPID). Notifications are the comeback engine: "you were raided",
 * "construction finished", "research done" — sent only when it matters and
 * pruned aggressively when endpoints die.
 */
import { prisma } from '@warchest/db';
import webpush from 'web-push';
import { ENV } from './env';

let ready: boolean | null = null;

export function pushReady(): boolean {
  if (ready === null) {
    if (ENV.VAPID_PUBLIC_KEY && ENV.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(ENV.VAPID_SUBJECT, ENV.VAPID_PUBLIC_KEY, ENV.VAPID_PRIVATE_KEY);
      ready = true;
    } else ready = false;
  }
  return ready;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  /** same tag replaces the previous notification instead of stacking */
  tag?: string;
}

/** Send to every subscription of a user. Dead endpoints (404/410) are pruned. */
export async function pushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!pushReady()) return 0;
  const db = prisma();
  const subs = await db.pushSub.findMany({ where: { userId } });
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 6 * 3600 },
      );
      sent++;
      if (s.failCount) await db.pushSub.update({ where: { id: s.id }, data: { failCount: 0 } }).catch(() => {});
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode ?? 0;
      if (code === 404 || code === 410) {
        await db.pushSub.delete({ where: { id: s.id } }).catch(() => {});
      } else {
        const fails = s.failCount + 1;
        if (fails >= 8) await db.pushSub.delete({ where: { id: s.id } }).catch(() => {});
        else await db.pushSub.update({ where: { id: s.id }, data: { failCount: fails } }).catch(() => {});
      }
    }
  }
  return sent;
}
