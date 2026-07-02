/**
 * Redis-backed counters/nonces (rate limits, daily caps, SIWS nonces),
 * with an in-memory fallback so dev environments work without Redis.
 */
import { Redis } from 'ioredis';
import { ENV } from './env';

interface KV {
  get(k: string): Promise<string | null>;
  setex(k: string, ttlS: number, v: string): Promise<void>;
  del(k: string): Promise<void>;
  incrby(k: string, n: number, ttlS: number): Promise<number>;
}

class MemKV implements KV {
  private m = new Map<string, { v: string; exp: number }>();
  private live(k: string): { v: string; exp: number } | undefined {
    const e = this.m.get(k);
    if (e && e.exp < Date.now()) {
      this.m.delete(k);
      return undefined;
    }
    return e;
  }
  async get(k: string): Promise<string | null> {
    return this.live(k)?.v ?? null;
  }
  async setex(k: string, ttlS: number, v: string): Promise<void> {
    this.m.set(k, { v, exp: Date.now() + ttlS * 1000 });
  }
  async del(k: string): Promise<void> {
    this.m.delete(k);
  }
  async incrby(k: string, n: number, ttlS: number): Promise<number> {
    const cur = Number(this.live(k)?.v ?? '0') + n;
    this.m.set(k, { v: String(cur), exp: this.live(k)?.exp ?? Date.now() + ttlS * 1000 });
    return cur;
  }
}

class RedisKV implements KV {
  constructor(private r: Redis) {}
  async get(k: string): Promise<string | null> {
    return this.r.get(k);
  }
  async setex(k: string, ttlS: number, v: string): Promise<void> {
    await this.r.setex(k, ttlS, v);
  }
  async del(k: string): Promise<void> {
    await this.r.del(k);
  }
  async incrby(k: string, n: number, ttlS: number): Promise<number> {
    const v = await this.r.incrby(k, n);
    if (v === n) await this.r.expire(k, ttlS);
    return v;
  }
}

let kv: KV | null = null;
export function store(): KV {
  if (!kv) kv = ENV.REDIS_URL ? new RedisKV(new Redis(ENV.REDIS_URL)) : new MemKV();
  return kv;
}

export const dayKey = (): string => new Date().toISOString().slice(0, 10).replace(/-/g, '');
const DAY_TTL = 60 * 60 * 26;

/** Add to a per-user daily counter; returns the new total. */
export const bumpDaily = (kind: string, userId: string, n: number): Promise<number> =>
  store().incrby(`wc:${kind}:${userId}:${dayKey()}`, n, DAY_TTL);

export const getDaily = async (kind: string, userId: string): Promise<number> =>
  Number((await store().get(`wc:${kind}:${userId}:${dayKey()}`)) ?? '0');
