/**
 * Deterministic battle simulation — the prototype's battle engine ported to a
 * fixed-timestep, seeded, replayable core. The client steps a BattleSim for
 * rendering/prediction and records a deploy log; the server re-simulates the
 * same log with the same code to validate results (P2 anti-cheat).
 *
 * Determinism rules:
 *  - fixed timestep (TICK = 1/60), tick counter instead of wall clocks
 *  - seeded mulberry32 only; RNG draws happen in a fixed order
 *    (defense cooldowns at construction in list order, then one draw per deploy)
 *  - distances via sqrt (IEEE-exact), never Math.hypot
 *  - deploy positions quantized with Math.fround so a JSON round-trip of the
 *    log replays bit-identically
 */
import { BATTLE_TIME, BUILD, MAP, TICK, TROOP } from '../config';
import { mulberry32 } from '../rng';
import { clamp, dist, lerp } from '../util';
import type {
  ArmyCounts,
  BattleOutcome,
  DeployLogEntry,
  EnemyBase,
  Projectile,
  SimBuilding,
  SimEvent,
  SimTroop,
  TroopType,
} from '../types';

const DEFENSE_TYPES = ['cannon', 'arrow', 'mortar'] as const;
const isDefense = (t: string): t is (typeof DEFENSE_TYPES)[number] =>
  (DEFENSE_TYPES as readonly string[]).includes(t);

/** Closest point on a building's footprint rect to (px,py), plus its distance. */
export function nearRect(
  px: number,
  py: number,
  b: Pick<SimBuilding, 'type' | 'gx' | 'gy'>,
): { x: number; y: number; d: number } {
  const s = BUILD[b.type].s;
  const cx = clamp(px, b.gx, b.gx + s);
  const cy = clamp(py, b.gy, b.gy + s);
  return { x: cx, y: cy, d: dist(px, py, cx, cy) };
}

/** Ticks for the prototype's wall-clock end delays (600ms after 100%, 900ms out of army). */
const END_TICKS_FULL_CLEAR = Math.round(0.6 / TICK);
const END_TICKS_OUT_OF_ARMY = Math.round(0.9 / TICK);

export class BattleSim {
  readonly buildings: SimBuilding[];
  readonly occ: Int32Array;
  readonly deployOK: Uint8Array;
  troops: SimTroop[] = [];
  projs: Projectile[] = [];
  army: ArmyCounts;

  pct = 0;
  stars = 0;
  timeLeft = BATTLE_TIME;
  started = false;
  over = false;
  thDown = false;
  lootG = 0;
  lootM = 0;
  tick = 0;
  readonly nonWall: number;

  /** Drained by the client each frame for FX/SFX; ignored by the server. */
  events: SimEvent[] = [];
  /** Recorded attacker actions; POST this to the API after the battle (P2). */
  readonly log: DeployLogEntry[] = [];

  private uid = 1;
  private rng: () => number;
  private endIn: number | null = null;
  private endedEarly = false;

  constructor(base: EnemyBase, army: ArmyCounts) {
    this.buildings = base.list.map((b) => ({ ...b }));
    this.occ = base.occ.slice();
    this.army = { ...army };
    this.nonWall = this.buildings.filter((b) => b.type !== 'wall').length;
    this.rng = mulberry32(base.seed);
    // Deploy zone: everything outside building footprints +1 tile.
    this.deployOK = new Uint8Array(MAP * MAP).fill(1);
    for (const b of this.buildings) {
      const s = BUILD[b.type].s;
      for (let y = b.gy - 1; y < b.gy + s + 1; y++)
        for (let x = b.gx - 1; x < b.gx + s + 1; x++)
          if (x >= 0 && y >= 0 && x < MAP && y < MAP) this.deployOK[y * MAP + x] = 0;
    }
    // Defense cooldown jitter: the prototype drew Math.random() lazily; we draw
    // from the seeded stream up front, in list order, so replays are identical.
    for (const b of this.buildings) if (isDefense(b.type)) b.cd = this.rng();
  }

  buildingAt(gx: number, gy: number): SimBuilding | null {
    if (gx < 0 || gy < 0 || gx >= MAP || gy >= MAP) return null;
    const id = this.occ[gy * MAP + gx] ?? 0;
    return id > 0 ? (this.buildings.find((b) => b.id === id && !b.dead) ?? null) : null;
  }

  private byId(id: number | null | undefined): SimBuilding | null {
    return id == null ? null : (this.buildings.find((b) => b.id === id) ?? null);
  }

  private troopById(id: number | null | undefined): SimTroop | null {
    return id == null ? null : (this.troops.find((u) => u.id === id) ?? null);
  }

  canDeployAt(wx: number, wy: number): boolean {
    const gx = Math.floor(wx), gy = Math.floor(wy);
    return !(gx < 0 || gy < 0 || gx >= MAP || gy >= MAP || !this.deployOK[gy * MAP + gx]);
  }

  /** Deploy a troop at world coords. Returns false (and records nothing) if invalid. */
  deploy(type: TroopType, wx: number, wy: number, fromLog = false): boolean {
    if (this.over) return false;
    const x = Math.fround(wx), y = Math.fround(wy);
    if (!this.canDeployAt(x, y)) return false;
    if ((this.army[type] ?? 0) <= 0) return false;
    this.army[type]--;
    const T = TROOP[type];
    this.troops.push({
      id: this.uid++, type, x, y, hp: T.hp, maxhp: T.hp,
      cd: 0.3 + this.rng() * 0.3, targetId: null, moving: true, swing: 0,
    });
    this.started = true;
    if (!fromLog) this.log.push({ tick: this.tick, kind: 'deploy', troop: type, x, y });
    this.events.push({ k: 'deploy', x, y });
    return true;
  }

  /** Attacker pressed "End Battle". Aborts (no result) if nothing was deployed yet. */
  requestEnd(): void {
    if (this.over) return;
    if (!this.endedEarly) this.log.push({ tick: this.tick, kind: 'end' });
    this.endedEarly = true;
    this.finish();
  }

  private acquire(u: SimTroop): void {
    const T = TROOP[u.type];
    let cands = this.buildings.filter((b) => !b.dead && b.type !== 'wall');
    if (T.pref === 'def') {
      const defs = cands.filter((b) => isDefense(b.type));
      if (defs.length) cands = defs;
    }
    let best: SimBuilding | null = null, bd = 1e9;
    for (const b of cands) {
      const r = nearRect(u.x, u.y, b);
      if (r.d < bd) {
        bd = r.d;
        best = b;
      }
    }
    u.targetId = best ? best.id : null;
  }

  private dmgBuilding(b: SimBuilding, d: number): void {
    b.hp -= d;
    if (b.hp <= 0 && !b.dead) {
      b.dead = true;
      const s = BUILD[b.type].s;
      for (let y = b.gy; y < b.gy + s; y++)
        for (let x = b.gx; x < b.gx + s; x++)
          if (x >= 0 && y >= 0 && x < MAP && y < MAP) this.occ[y * MAP + x] = 0;
      this.events.push({
        k: 'boom', x: b.gx + s / 2, y: b.gy + s / 2,
        big: b.type === 'keep' ? 2.2 : s >= 3 ? 1.5 : 0.8,
      });
      if (b.lootG || b.lootM) {
        this.lootG += b.lootG;
        this.lootM += b.lootM;
        this.events.push({ k: 'loot', x: b.gx + s / 2, y: b.gy + s / 2, g: b.lootG, m: b.lootM });
      }
      if (b.type !== 'wall') {
        this.pct += 100 / this.nonWall;
        if (b.type === 'keep') this.thDown = true;
        const ns = (this.pct >= 49.99 ? 1 : 0) + (this.thDown ? 1 : 0) + (this.pct >= 99.5 ? 1 : 0);
        if (ns > this.stars) {
          this.stars = ns;
          this.events.push({ k: 'star', stars: ns });
        }
        if (this.pct >= 99.5)
          this.endIn = Math.min(this.endIn ?? Infinity, END_TICKS_FULL_CLEAR);
      }
      for (const t of this.troops) if (t.targetId === b.id) t.targetId = null;
    }
  }

  private dmgTroop(u: SimTroop, d: number): void {
    u.hp -= d;
    if (u.hp <= 0 && !u.dead) {
      u.dead = true;
      this.events.push({ k: 'troop-died', x: u.x, y: u.y });
    }
  }

  /** Advance one fixed 1/60s step. */
  step(): void {
    if (this.over) return;
    const dt = TICK;
    this.tick++;
    if (this.endIn !== null && --this.endIn <= 0) {
      this.finish();
      return;
    }
    if (this.started) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.finish();
        return;
      }
    }
    // troops
    for (const u of this.troops) {
      if (u.dead) continue;
      const T = TROOP[u.type];
      let target = this.byId(u.targetId);
      if (!target || target.dead) {
        this.acquire(u);
        target = this.byId(u.targetId);
      }
      if (!target) continue;
      const np = nearRect(u.x, u.y, target);
      const atkRng = Math.max(T.rng, 0.45);
      if (np.d <= atkRng + 0.02) {
        u.moving = false;
        u.cd -= dt;
        if (u.cd <= 0) {
          u.cd = T.rate;
          u.swing = 0.55;
          if (T.rng > 2) {
            this.projs.push({
              kind: 'arrow', x: u.x, y: u.y, h: 14, tgtBId: target.id,
              dmg: T.dmg, spd: 11, dx: np.x - u.x, dy: np.y - u.y,
            });
            this.events.push({ k: 'proj', kind: 'arrow', from: 'troop' });
          } else {
            this.dmgBuilding(target, T.dmg);
            this.events.push({ k: 'melee-hit', x: np.x, y: np.y });
          }
        }
      } else {
        u.moving = true;
        const dxn = (np.x - u.x) / np.d, dyn = (np.y - u.y) / np.d;
        const nx = u.x + dxn * T.spd * dt, ny = u.y + dyn * T.spd * dt;
        if (!T.fly) {
          const bb = this.buildingAt(Math.floor(nx), Math.floor(ny));
          if (bb && bb.id !== target.id) {
            u.targetId = bb.id;
            continue;
          }
        }
        u.x = nx;
        u.y = ny;
      }
    }
    this.troops = this.troops.filter((u) => !u.dead);
    // defenses
    for (const b of this.buildings) {
      if (b.dead || !isDefense(b.type)) continue;
      const D = BUILD[b.type];
      const L = D.lv[b.level - 1]!;
      const cx = b.gx + D.s / 2, cy = b.gy + D.s / 2;
      b.cd = (b.cd ?? 0) - dt;
      let best: SimTroop | null = null, bd = 1e9;
      for (const u of this.troops) {
        if (u.dead) continue;
        const T = TROOP[u.type];
        if (T.fly && !D.air) continue;
        const d = dist(cx, cy, u.x, u.y);
        if (d > L.rng! || (L.min && d < L.min)) continue;
        if (d < bd) {
          bd = d;
          best = u;
        }
      }
      if (best) {
        if (b.type === 'cannon') b.aim = Math.atan2((best.y - cy) * 0.5, best.x - cx);
        if (b.cd <= 0) {
          b.cd = L.rate!;
          if (b.type === 'mortar') {
            b.flash = 0.5;
            this.projs.push({
              kind: 'shell', x: cx, y: cy, sx: cx, sy: cy, ex: best.x, ey: best.y,
              tArc: 0, T: 1.05, dmg: L.dmg!, spl: L.spl!,
            });
            this.events.push({ k: 'proj', kind: 'shell', from: 'defense', bid: b.id });
          } else if (b.type === 'cannon') {
            b.recoil = 1;
            this.projs.push({
              kind: 'ball', x: cx, y: cy, h: 16, tgtUId: best.id, dmg: L.dmg!, spd: 10,
              dx: best.x - cx, dy: best.y - cy,
            });
            this.events.push({ k: 'proj', kind: 'ball', from: 'defense', bid: b.id });
          } else {
            this.projs.push({
              kind: 'arrow', x: cx, y: cy, h: 52, tgtUId: best.id, dmg: L.dmg!, spd: 13,
              dx: best.x - cx, dy: best.y - cy,
            });
            this.events.push({ k: 'proj', kind: 'arrow', from: 'defense', bid: b.id });
          }
        }
      }
    }
    // projectiles
    for (const p of this.projs) {
      if (p.kind === 'shell') {
        p.tArc += dt / p.T;
        p.x = lerp(p.sx, p.ex, p.tArc);
        p.y = lerp(p.sy, p.ey, p.tArc);
        if (p.tArc >= 1) {
          p.dead = true;
          this.events.push({ k: 'boom', x: p.ex, y: p.ey, big: 1 });
          for (const u of this.troops)
            if (!u.dead && !TROOP[u.type].fly && dist(p.ex, p.ey, u.x, u.y) <= p.spl)
              this.dmgTroop(u, p.dmg);
        }
      } else {
        const hasU = p.tgtUId != null;
        const tgtBId = p.kind === 'arrow' ? p.tgtBId : undefined;
        const hasB = tgtBId != null;
        const tgtU = hasU ? this.troopById(p.tgtUId) : null;
        const tgtB = hasB ? this.byId(tgtBId) : null;
        const tx = tgtU ? tgtU.x : tgtB ? clamp(p.x, tgtB.gx, tgtB.gx + BUILD[tgtB.type].s) : p.x;
        const ty = tgtU ? tgtU.y : tgtB ? clamp(p.y, tgtB.gy, tgtB.gy + BUILD[tgtB.type].s) : p.y;
        const d = dist(p.x, p.y, tx, ty);
        p.dx = tx - p.x;
        p.dy = ty - p.y;
        if ((hasU && (!tgtU || tgtU.dead)) || (hasB && (!tgtB || tgtB.dead))) {
          p.dead = true;
          continue;
        }
        if (d < 0.3) {
          p.dead = true;
          if (tgtU) this.dmgTroop(tgtU, p.dmg);
          else if (tgtB) {
            this.dmgBuilding(tgtB, p.dmg);
            this.events.push({ k: 'building-hit', x: tx, y: ty });
          }
        } else {
          p.x += (p.dx / d) * p.spd * dt;
          p.y += (p.dy / d) * p.spd * dt;
          p.h = lerp(p.h || 10, 10, dt * 3);
        }
      }
    }
    this.projs = this.projs.filter((p) => !p.dead);
    // out of army?
    if (this.started && !this.troops.length) {
      let left = 0;
      for (const k in this.army) left += this.army[k as TroopType];
      if (left <= 0 && this.endIn === null) this.endIn = END_TICKS_OUT_OF_ARMY;
    }
  }

  private finish(): void {
    if (this.over) return;
    this.over = true;
    this.events.push({ k: 'ended' });
  }

  outcome(): BattleOutcome {
    const win = this.stars > 0;
    const trophyDelta = this.started ? (win ? 10 + 6 * this.stars : -12) : 0;
    const warEarned = this.stars * 8 + (this.thDown ? 10 : 0) + (this.pct >= 99.5 ? 7 : 0);
    return {
      stars: this.stars,
      pct: this.pct,
      lootG: this.lootG,
      lootM: this.lootM,
      warEarned,
      trophyDelta,
      win,
      started: this.started,
      keepDestroyed: this.thDown,
      ticks: this.tick,
      armyLeft: { ...this.army },
    };
  }
}

/** Replay cap: battle time + end-delay slack, measured from the first logged action. */
const MAX_TICKS = Math.round((BATTLE_TIME + 5) / TICK);

/**
 * Server-style validation: re-simulate a recorded deploy log against a base
 * snapshot and return the authoritative outcome. Client-reported results are
 * ignored (P2 anti-cheat).
 *
 * The deploy screen is untimed (the 3:00 timer starts on the first deploy,
 * as in the prototype), so log ticks are anchored wherever the attacker
 * started acting — the cap must be relative to the first log entry, not to
 * sim construction, or deploy-screen idle would truncate legitimate replays.
 * P2 note: the server should still bound scout→first-deploy wall time (e.g.
 * matchmaking-token TTL) before replaying, so a hostile log can't demand an
 * arbitrarily long empty pre-roll.
 */
export function simulateBattle(
  base: EnemyBase,
  army: ArmyCounts,
  log: readonly DeployLogEntry[],
): BattleOutcome {
  const sim = new BattleSim(base, army);
  const capTick = (log.length ? log[0]!.tick : 0) + MAX_TICKS;
  let li = 0;
  while (!sim.over && sim.tick <= capTick) {
    while (li < log.length && log[li]!.tick === sim.tick) {
      const e = log[li++]!;
      if (e.kind === 'deploy') sim.deploy(e.troop, e.x, e.y, true);
      else sim.requestEnd();
    }
    if (sim.over) break;
    if (!sim.started && li >= log.length) break; // nothing ever deployed
    sim.step();
    sim.events.length = 0; // replays don't accumulate FX events
  }
  if (!sim.over) sim.requestEnd();
  return sim.outcome();
}
