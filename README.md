# WARCHEST — Build. Raid. Earn.

Clash-style base builder + raid game with a $WAR token economy on Solana.
Standalone brand. This repo is the production build of the approved
single-file prototype (`reference/warchest-prototype.html` — source of truth).

## Layout

| Path | What |
| --- | --- |
| `apps/web` | Next.js 14 client. `/` landing, `/play` the game (canvas 2D, imperative loop). |
| `apps/api` | Fastify API (P0: health stub; P1: server-authoritative economy). |
| `packages/game-core` | Shared simulation: config/balance, iso math, enemy gen, quests, deterministic battle engine. Pure TS, zero DOM. |
| `packages/db` | Prisma schema (P1). |
| `reference/` | The approved prototype. Do not edit. |

## Develop

```bash
pnpm install
pnpm dev          # Next.js on :3000  (game at /play)
pnpm test         # game-core vitest: determinism ×1000, quests, economy
pnpm typecheck    # strict TS across the workspace
pnpm build        # all packages
```

## Phases

- **P0 — Port** ✅ monorepo, game-core extraction, client-only game 1:1 with the prototype (accelerated timers, session-only state, mock wallet).
- **P1 — Accounts & persistence**: SIWS auth, Prisma, server-authoritative actions, real timers (`REAL_BUILD_TIMES` in game-core), server-side quest tracking.
- **P2 — Real battles**: village snapshot pool, deploy-log re-simulation (`simulateBattle` already shared), shields, defense logs.
- **P3 — On-chain**: $WAR SPL mint (devnet first), claim worker, ledger UI, fees/caps.
- **P4 — Meta**: season leaderboard, profile, admin panel.

Architecture decisions: see [DECISIONS.md](./DECISIONS.md).
