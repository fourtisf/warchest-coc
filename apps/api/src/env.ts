/** Environment configuration (build spec §ENV). */

const num = (v: string | undefined, d: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && v !== undefined && v !== '' ? n : d;
};

export const ENV = {
  PORT: num(process.env.PORT, 8787),
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  REDIS_URL: process.env.REDIS_URL ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  WARCHEST_DOMAIN: process.env.WARCHEST_DOMAIN ?? 'warchest.fun',

  /**
   * Global speed knob for real-time durations. 1 = launch values from the
   * spec (§TIMERS). Set e.g. 60 to make everything 60× faster for testing.
   */
  TIME_SCALE: num(process.env.TIME_SCALE, 1),
  /**
   * Real production = rate / PROD_ACCEL * TIME_SCALE. The prototype's CFG
   * rates are demo-accelerated; 180 mapped them to slow CoC-like trickle
   * (mine L1 ≈ 200/h). Owner-directed pacing: 45 → collectors visibly fill
   * during a play session (mine L1 ≈ 800/h, L3 ≈ 1.6k/h).
   */
  PROD_ACCEL: num(process.env.PROD_ACCEL, 45),

  // $WAR economy
  CLAIM_MIN: num(process.env.CLAIM_MIN, 100),
  CLAIM_FEE_BPS: num(process.env.CLAIM_FEE_BPS, 500),
  CLAIM_DAILY_CAP: num(process.env.CLAIM_DAILY_CAP, 500),
  EARN_DAILY_CAP: num(process.env.EARN_DAILY_CAP, 400),
  /** anti-farm gates: claims need a real village, not a day-one bot */
  CLAIM_MIN_KEEP: num(process.env.CLAIM_MIN_KEEP, 3),
  CLAIM_MIN_AGE_H: num(process.env.CLAIM_MIN_AGE_H, 72),

  // Solana (P3)
  SOLANA_CLUSTER: process.env.SOLANA_CLUSTER ?? 'devnet',
  HELIUS_RPC_URL: process.env.HELIUS_RPC_URL ?? '',
  WAR_MINT: process.env.WAR_MINT ?? '',
  HOT_WALLET_KEYPAIR: process.env.HOT_WALLET_KEYPAIR ?? '/var/www/warchest/.keys/hot-wallet.json',
  TREASURY_ATA: process.env.TREASURY_ATA ?? '',
  /** 'mock' confirms claims without a chain tx (no mint configured); 'chain' sends SPL transfers. */
  CLAIM_MODE: process.env.CLAIM_MODE ?? (process.env.WAR_MINT ? 'chain' : 'mock'),

  ADMIN_WALLET: process.env.ADMIN_WALLET ?? '',

  // battle validation bounds
  SCOUT_TTL_MIN: num(process.env.SCOUT_TTL_MIN, 30),
  MAX_PREROLL_TICKS: num(process.env.MAX_PREROLL_TICKS, 60 * 600),
} as const;

export const rpcUrl = (): string =>
  ENV.HELIUS_RPC_URL ||
  (ENV.SOLANA_CLUSTER === 'mainnet-beta'
    ? 'https://api.mainnet-beta.solana.com'
    : `https://api.${ENV.SOLANA_CLUSTER}.solana.com`);
