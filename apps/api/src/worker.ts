/**
 * Claim worker (PM2 process `warchest-worker`): pays out pending $WAR claims.
 * CLAIM_MODE=mock  → confirm without a chain tx (no mint configured yet)
 * CLAIM_MODE=chain → SPL transfer from the hot wallet (devnet/mainnet per env)
 * Retries up to MAX_ATTEMPTS; a permanently failed claim refunds the ledger.
 */
import { prisma } from '@warchest/db';
import { ENV } from './env';
import { pushReady } from './push';
import { sweepCompletions } from './push-sweep';
import { sendWar } from './solana';

const MAX_ATTEMPTS = 5;
const POLL_MS = 10_000;

async function processOne(): Promise<boolean> {
  const db = prisma();
  const claim = await db.claim.findFirst({
    where: { status: 'pending' },
    orderBy: { createdAt: 'asc' },
  });
  if (!claim) return false;
  const payout = claim.amount - claim.fee;
  try {
    await db.claim.update({ where: { id: claim.id }, data: { status: 'sent', sentAt: new Date() } });
    let sig: string;
    if (ENV.CLAIM_MODE === 'chain' && ENV.WAR_MINT) {
      sig = await sendWar(payout, claim.wallet);
    } else {
      sig = `mock-${claim.id}`;
    }
    await db.claim.update({ where: { id: claim.id }, data: { status: 'confirmed', txSig: sig } });
    console.log(`claim ${claim.id}: ◆${payout} → ${claim.wallet} (${sig})`);
  } catch (e) {
    const attempts = claim.attempts + 1;
    const msg = e instanceof Error ? e.message.slice(0, 400) : String(e);
    if (attempts >= MAX_ATTEMPTS) {
      // refund and give up
      await db.claim.update({
        where: { id: claim.id },
        data: { status: 'failed', attempts, error: msg },
      });
      const v = await db.village.findUnique({ where: { userId: claim.userId } });
      if (v) {
        await db.village.update({ where: { id: v.id }, data: { war: v.war + claim.amount } });
        await db.warLedger.create({
          data: { userId: claim.userId, delta: claim.amount, reason: 'claim', refId: `refund:${claim.id}` },
        });
      }
      console.error(`claim ${claim.id} FAILED permanently: ${msg}`);
    } else {
      await db.claim.update({
        where: { id: claim.id },
        data: { status: 'pending', attempts, error: msg },
      });
      console.error(`claim ${claim.id} attempt ${attempts} failed: ${msg}`);
    }
  }
  return true;
}

console.log(`warchest-worker up (mode=${ENV.CLAIM_MODE}, cluster=${ENV.SOLANA_CLUSTER}, push=${pushReady()})`);

// comeback engine: every minute, notify offline players about finished work
let lastSweep = new Date();
setInterval(() => {
  const now = new Date();
  const since = lastSweep;
  lastSweep = now;
  sweepCompletions(since, now).catch((e) => console.error('push sweep error:', e));
}, 60_000);
// eslint-disable-next-line no-constant-condition
while (true) {
  try {
    while (await processOne()) {
      /* drain the queue */
    }
  } catch (e) {
    console.error('worker loop error:', e);
  }
  await new Promise((r) => setTimeout(r, POLL_MS));
}
