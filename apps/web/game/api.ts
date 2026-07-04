/**
 * Server API client + state hydration. Since P1 the server is authoritative:
 * every economy action is a POST; responses carry the full village which is
 * hydrated into the local G (kept only as a render cache / prediction layer).
 */
import {
  QUESTS,
  REAL_BUILD_TIMES,
  REAL_TRAIN_TIMES,
  BUILD,
  type ArmyCounts,
  type BuildingType,
  type DeployLogEntry,
  type SimBuilding,
  type SpellCounts,
  type SpellType,
  type TroopType,
} from '@warchest/game-core';
import { FX } from './fx';
import { SFX } from './sfx';
import { clock, G, rebuildOcc, type VillageBuilding } from './state';
import { syncVillageUnits } from './troops';
import { toast } from './ui/toasts';

const BASE = '/api';

export interface ServerConfig {
  domain: string;
  timeScale: number;
  prodAccel: number;
  claimMin: number;
  claimFeeBps: number;
  claimDailyCap: number;
}

export interface ServerVillage {
  serverNow: number;
  config: ServerConfig;
  user: { id: string; wallet: string | null; name: string | null; banned: boolean; isAdmin: boolean };
  res: { g: number; m: number; w: number };
  trophies: number;
  buildersTotal: number;
  shieldUntil: number | null;
  buildings: Array<{
    id: number; type: BuildingType; level: number; gx: number; gy: number;
    stored: number; busyUntil: number | null; jobKind: 'new' | 'up' | null; jobTotalS: number | null;
  }>;
  obstacles: Array<{
    id: number; kind: 'tree' | 'rock'; gx: number; gy: number;
    clearUntil: number | null; clearTotalS: number | null;
  }>;
  army: ArmyCounts;
  spells: SpellCounts;
  troopLv: Partial<Record<TroopType, number>>;
  research: { troop: TroopType; finishesAt: number; totalS: number | null } | null;
  trainQ: Array<{ id: number; type: TroopType; finishesAt: number | null; totalS: number }>;
  questDone: Record<string, boolean>;
  stat: typeof G.stat;
  daily: { ready: boolean; streak: number };
}

export interface ScoutResponse {
  battleId: string;
  seed: number;
  th: number;
  list: SimBuilding[];
  lootG: number;
  lootM: number;
  expiresAt: number;
  village: ServerVillage;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(res.status, data.error ?? `request failed (${res.status})`);
  return data as T;
}

/** serverNow - Date.now(): add to local clocks when computing countdowns. */
export let serverOffset = 0;

export let serverConfig: ServerConfig = {
  domain: 'warchest.fun', timeScale: 1, prodAccel: 45, claimMin: 100, claimFeeBps: 500, claimDailyCap: 500,
};

export const nowMs = (): number => Date.now() + serverOffset;

/** Real-world timer helpers (mirror apps/api rules.ts, using the server's knobs). */
export const realBuildSeconds = (type: BuildingType, level: number): number => {
  const t = REAL_BUILD_TIMES[type];
  return (t[Math.min(level, t.length) - 1] ?? 0) / serverConfig.timeScale;
};
export const realTrainSeconds = (t: TroopType): number =>
  REAL_TRAIN_TIMES[t] / serverConfig.timeScale;
export const prodPerSec = (type: BuildingType, level: number): number =>
  ((BUILD[type].lv[level - 1]?.rate ?? 0) / serverConfig.prodAccel) * serverConfig.timeScale;

let lastQuestDone: Record<string, boolean> = {};

/**
 * Bumped on every hydrate. Slow readers (the /me poller) capture it before
 * their request and drop the response if it changed — otherwise a GET that
 * started before a POST (e.g. finish-now) lands after it and reverts the UI
 * to the pre-action state ("the timer came back").
 */
export let hydrateSeq = 0;

/** Map a server village payload onto the local G render state. */
export function hydrate(payload: ServerVillage): void {
  hydrateSeq++;
  serverOffset = payload.serverNow - Date.now();
  clock.offset = serverOffset;
  serverConfig = payload.config;
  // obstacles that finished clearing since the last sync → reward pop
  const hadState = G.buildings.length > 0;
  const stillThere = new Set(payload.obstacles.map((o) => o.id));
  for (const o of G.obstacles) {
    if (o.clearUntil !== undefined && !stillThere.has(o.id) && hadState) {
      const rw = 3 + ((o.id * 7) % 4);
      FX.dust(o.gx + 0.5, o.gy + 0.5);
      FX.float(o.gx + 0.5, o.gy + 0.5, '◆ +' + rw, '#3fe0a3');
      SFX.play('done');
    }
  }
  G.res = { ...payload.res };
  G.trophies = payload.trophies;
  G.buildersTotal = payload.buildersTotal;
  G.wallet = payload.user.wallet
    ? { addr: payload.user.wallet, short: payload.user.wallet.slice(0, 4) + '…' + payload.user.wallet.slice(-4) }
    : null;
  G.playerName = payload.user.name;
  G.playerId = payload.user.id.slice(-6).toUpperCase();
  const prevLv = new Map(G.buildings.map((b) => [b.id, b.level]));
  G.buildings = payload.buildings.map((b): VillageBuilding => ({
    id: b.id,
    type: b.type,
    gx: b.gx,
    gy: b.gy,
    level: b.level,
    hp: BUILD[b.type].lv[b.level - 1]!.hp,
    stored: b.stored,
    busy: b.busyUntil !== null && b.busyUntil > payload.serverNow,
    busyUntil: b.busyUntil ?? undefined,
    jobKind: b.jobKind ?? undefined,
    jobTotalS: b.jobTotalS ?? undefined,
  }));
  // upgrade finished since the last sync → celebrate the new model on the spot
  if (hadState) {
    for (const b of G.buildings) {
      const old = prevLv.get(b.id);
      if (old !== undefined && b.level > old) {
        const s = BUILD[b.type].s;
        FX.boom(b.gx + s / 2, b.gy + s / 2, 1.1);
        FX.float(b.gx + s / 2, b.gy + s / 2 - 1, `⬆ ${BUILD[b.type].n} Lv ${b.level}!`, '#ffd977');
      }
    }
  }
  // rebuild the jobs view NOW, not on the next tick — any refreshSheet that
  // runs right after this hydrate must already see finished jobs as gone
  // (the stale-jobOf render left a ghost "Finish now" button on info sheets)
  G.jobs = G.buildings
    .filter((b) => b.busy && b.busyUntil !== undefined)
    .map((b) => {
      const tLeft = Math.max(0, (b.busyUntil! - payload.serverNow) / 1000);
      return { bid: b.id, tLeft, total: b.jobTotalS ?? Math.max(1, tLeft), kind: b.jobKind ?? ('new' as const) };
    });
  G.obstacles = payload.obstacles.map((o) => ({
    id: o.id,
    kind: o.kind,
    gx: o.gx,
    gy: o.gy,
    clearUntil: o.clearUntil ?? undefined,
    clearTotalS: o.clearTotalS ?? undefined,
  }));
  G.army = { ...payload.army };
  G.spells = { ...payload.spells };
  G.troopLv = { ...payload.troopLv };
  G.research = payload.research
    ? {
        troop: payload.research.troop,
        finishesAt: payload.research.finishesAt,
        total: payload.research.totalS ?? Math.max(1, (payload.research.finishesAt - payload.serverNow) / 1000),
      }
    : null;
  G.trainQ = payload.trainQ.map((j) => ({
    sid: j.id,
    type: j.type,
    finishesAt: j.finishesAt ?? undefined,
    total: j.totalS,
    tLeft: j.finishesAt ? Math.max(0, (j.finishesAt - payload.serverNow) / 1000) : j.totalS,
  }));
  G.stat = { ...G.stat, ...payload.stat, tTypes: { ...payload.stat.tTypes } };
  // toast newly completed War Orders (the server credits them)
  for (const q of QUESTS) {
    if (payload.questDone[q.id] && !lastQuestDone[q.id] && Object.keys(lastQuestDone).length) {
      toast(`📜 War Order complete: +◆${q.reward}`, 'ok');
    }
  }
  lastQuestDone = { ...payload.questDone };
  G.questDone = { ...payload.questDone };
  G.daily = { ...payload.daily };
  rebuildOcc();
  syncVillageUnits();
}

/* ------------------------------ endpoints ------------------------------ */
export const api = {
  guest: (ref?: string) => call<ServerVillage>('POST', '/auth/guest', ref ? { ref } : {}),
  me: () => call<ServerVillage>('GET', '/me'),
  logout: () => call<{ ok: true }>('POST', '/auth/logout'),
  setName: (name: string) => call<ServerVillage>('POST', '/profile/name', { name }),
  dailyClaim: () => call<ServerVillage>('POST', '/daily/claim', {}),
  nonce: () => call<{ nonce: string }>('GET', '/auth/nonce'),
  walletLogin: (wallet: string, signature: string, nonce: string) =>
    call<ServerVillage>('POST', '/auth/wallet', { wallet, signature, nonce }),

  collect: (buildingId: number) => call<ServerVillage>('POST', '/village/collect', { buildingId }),
  place: (type: BuildingType, gx: number, gy: number) =>
    call<ServerVillage>('POST', '/village/place', { type, gx, gy }),
  move: (buildingId: number, gx: number, gy: number) =>
    call<ServerVillage>('POST', '/village/move', { buildingId, gx, gy }),
  upgrade: (buildingId: number) => call<ServerVillage>('POST', '/village/upgrade', { buildingId }),
  finishNow: (buildingId: number) =>
    call<ServerVillage>('POST', '/village/finish-now', { buildingId }),
  train: (troop: TroopType) => call<ServerVillage>('POST', '/village/train', { troop }),
  research: (troop: TroopType) => call<ServerVillage>('POST', '/village/research', { troop }),
  researchNow: () => call<ServerVillage>('POST', '/village/research-now', {}),
  brew: (spell: SpellType) => call<ServerVillage>('POST', '/village/brew', { spell }),
  rushTraining: () => call<ServerVillage>('POST', '/village/rush-training', {}),
  clearObstacle: (obstacleId: number) =>
    call<ServerVillage>('POST', '/village/clear-obstacle', { obstacleId }),

  scout: (rerollFrom?: string, revenge?: string) =>
    call<ScoutResponse>('POST', '/battle/scout', {
      ...(rerollFrom ? { rerollFrom } : {}),
      ...(revenge ? { revenge } : {}),
    }),
  resolve: (battleId: string, log: unknown) =>
    call<{ outcome: BattleOutcomeDto; village: ServerVillage }>(
      'POST',
      `/battle/${battleId}/resolve`,
      { log },
    ),
  replay: (battleId: string) => call<ReplayDto>('GET', `/battle/${battleId}/replay`),
  defenseLog: () =>
    call<{ unseen: number; entries: DefenseEntry[] }>('GET', '/battle/defense-log'),

  claim: (amount: number) =>
    call<{ claim: { id: string; amount: number; fee: number; status: string }; village: ServerVillage }>(
      'POST',
      '/claim',
      { amount },
    ),
  claims: () =>
    call<{ claims: Array<{ id: string; amount: number; fee: number; status: string; txSig: string | null; at: number }> }>(
      'GET',
      '/claims',
    ),
  leaderboard: () =>
    call<{ top: LbRow[]; me: LbRow | null }>('GET', '/leaderboard'),
};

export interface BattleOutcomeDto {
  stars: number;
  pct: number;
  lootG: number;
  lootM: number;
  warEarned: number;
  trophyDelta: number;
  win: boolean;
  started: boolean;
}

export interface DefenseEntry {
  id: string;
  at: number;
  stars: number;
  pct: number;
  lootG: number;
  lootM: number;
  attacker: string;
  canRevenge: boolean;
}

/** Everything needed to re-run a recorded battle client-side (deterministic sim). */
export interface ReplayDto {
  seed: number;
  th: number;
  list: SimBuilding[];
  pool: number;
  log: DeployLogEntry[];
  levels: Partial<Record<TroopType, number>>;
  stars: number;
  pct: number;
  attacker: string;
}

export interface LbRow {
  rank: number;
  name: string;
  trophies: number;
  me?: boolean;
}

/** Run an API action; hydrate on success; toast the server's error on failure. */
export async function withVillage(
  p: Promise<ServerVillage>,
  onError?: (e: ApiError) => void,
): Promise<boolean> {
  try {
    hydrate(await p);
    return true;
  } catch (e) {
    if (e instanceof ApiError) {
      toast(e.message, 'warn');
      onError?.(e);
    } else {
      toast('Network error — retrying soon', 'warn');
    }
    return false;
  }
}
