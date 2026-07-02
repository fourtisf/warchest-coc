# DECISIONS.md — WARCHEST production build

Senior-level decisions made during the port, per the build brief ("make
senior-level decisions and document them here"). Source of truth:
`reference/warchest-prototype.html`.

## P0 — Port

### Monorepo layout

```
apps/web            Next.js 14 (App Router), canvas-2D client. `/` landing, `/play` game.
apps/api            Fastify stub (health route). P1 makes it authoritative.
packages/game-core  Pure-TS shared sim: config, iso math, occupancy, enemy gen,
                    quests, deterministic battle engine. Zero DOM, zero deps.
packages/db         Placeholder for the Prisma schema (P1).
```

### D1. The client battle runs THROUGH the shared sim from day one
Instead of porting the prototype's battle loop into the client and writing a
"validation copy" later, `apps/web/game/battle.ts` drives
`game-core`'s `BattleSim` directly: the client steps it at the same fixed
1/60 timestep the prototype used, renders its state, and records the deploy
log. `simulateBattle(base, army, log)` re-runs the identical code path — P2
server validation is the same function call. A vitest proves interactive
play and log replay produce identical outcomes.

### D2. Determinism deviations from the prototype (approved by §BATTLES)
- **Seeded RNG**: troop deploy-cooldown jitter (`.3+rand*.3`) and defense
  cooldown init (`b.cd ?? Math.random()`) now draw from `mulberry32(seed)`.
  Defense cds are drawn up-front in building-list order; one draw per deploy
  after that. Distribution (and therefore balance) is unchanged.
- **`dist()` uses `sqrt(dx²+dy²)`**, not `Math.hypot` — IEEE-754 guarantees
  correct rounding for sqrt/+/−/×/÷, while hypot precision is
  implementation-defined. Keeps replays bit-identical across engines.
- **Wall-clock ends → tick counters**: the prototype's `setTimeout(end, 600)`
  after 100% and `setTimeout(end, 900)` when out of army are 36/54 sim ticks.
- **Deploy log format**: `{tick, kind:'deploy', troop, x, y}` with
  `Math.fround`-quantized fractional positions (the spec's `gx,gy` are tile
  coords; fround floats survive JSON round-trips exactly and keep the
  prototype's fractional-deploy feel), plus `{tick, kind:'end'}` so an early
  "End Battle" replays at the right moment.
- **Ids instead of object refs** for troop/projectile targets (serializable
  sim state); resolution order preserves prototype behavior exactly.
- `Math.atan2` (cannon aim) and `cos/sin` (genEnemy placement) remain; aim is
  presentational, and genEnemy runs on V8 on both sides (P2 snapshots come
  from the server anyway).

### D3. Presentational fields live on sim entities
`aim`, `recoil`, `flash` (buildings) and `swing` (troops) are written by the
sim on fire/attack and decayed by the renderer, exactly like the prototype.
They are documented as non-authoritative: no sim logic ever reads them.

### D4. P0 keeps prototype-accelerated timers
The brief's §TIMERS real durations ship in P1 with the server clock. P0 is
gated on "runs exactly like the prototype", so `CFG`'s accelerated `t`/`tt`
values are used verbatim. `config.ts` already carries `REAL_BUILD_TIMES`,
`REAL_TRAIN_TIMES` (launch values, env-tunable later) and both finish-now
formulas (`finishNowCostDemo` = prototype `max(2,ceil(sec/8))`,
`finishNowCostReal` = spec `max(2,ceil(min*1.5))`).

### D5. UI stays imperative DOM for P0, mounted once by React
The prototype's HUD/sheets/modals are ported verbatim: `markup.ts` holds the
exact prototype markup, `game.css` the exact stylesheet (fonts via `@import`;
the three global rules scoped under `.wc-game`/`html.wc-play` so the game
styles can't leak into the landing page). `GameRoot` mounts once and hands
the DOM to `client.ts`; the rAF loop, input and DOM updates never touch
React — satisfying the "canvas isolated from React re-renders" bar with zero
fidelity risk. P1 (server-driven state) is the right moment to reactify
panels one by one.

### D6. Wall auto-connect fix (intentional, visual-only)
The prototype's wall art looked up neighbors via the *global village
occupancy grid* even when rendering enemy bases in battle (a latent bug —
enemy walls connected based on your own village's ids). The port checks the
building's own draw list (`wallAt`). Village rendering is pixel-identical;
battle wall rendering is now correct.

### D7. Quests are data + pure conditions in game-core
The 22-quest table (ids, rewards, ◆615 pool, conditions, live-counter texts,
guide targets) lives in `game-core/quests.ts` as pure functions over a
`QuestView` so P1 can evaluate the same conditions server-side. Tap-to-guide
routing stays client-side (`ui/modals.ts`), as specified.

### D8. Session-only state in P0
`G` (client state) is a faithful port of the prototype's globals, reset on
mount. No persistence until P1 — matching the prototype's "session-only"
banner, which is kept in the intro modal.

### D9. Landing page is dependency-free
`/` is a static, system-font page (Lighthouse ≥85 target); the game route
loads the Cinzel/Rubik Google fonts via CSS `@import` exactly like the
prototype did, and canvas text keeps the literal `Rubik` family name.

### D10. api/db are stubs on purpose
`apps/api` boots Fastify with a `/health` route that imports
`simulateBattle` from game-core — proving the shared-sim dependency edge
works server-side — and nothing else. `packages/db` documents the P1 Prisma
models. No speculative code ahead of its phase.

## Verification (P0 gate)
- `game-core`: 40 vitest tests — determinism (same seed+log ⇒ identical
  result across 1000 runs; live-vs-replay equality), battle rules ($WAR/
  trophy formulas, gargoyle immunity), economy/config invariants, all 22
  quest conditions.
- Playwright drive of prototype vs port (train → raid → deploy → battle):
  village/shop/army/quests/scout/battle screenshots pixel-comparable;
  steady-state 60fps (village and zoomed).
- Full workspace: `tsc --strict` clean (zero `any` in game-core),
  `next build` clean.
