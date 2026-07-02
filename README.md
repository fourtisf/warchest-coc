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

- **P0 — Port** ✅ monorepo, game-core extraction, client 1:1 with the prototype.
- **P1 — Accounts & persistence** ✅ guest + SIWS auth, Prisma/PostgreSQL, every village action server-authoritative, real timers (`TIME_SCALE` env knob), server-side quest tracking + WarLedger.
- **P2 — Real battles** ✅ matchmaking against real village snapshots (procedural fallback), server-side deploy-log re-simulation, shields, trophies, defense log ("you were raided").
- **P3 — On-chain** ✅ claim API (min/fee/daily cap/rate limit) + PM2 worker; `CLAIM_MODE=mock` out of the box, `pnpm --filter @warchest/api setup:devnet` mints devnet $WAR and flips to real SPL payouts.
- **P4 — Meta** ✅ season leaderboard (top 100 + around-me), $WAR ledger endpoint, admin API (ban / adjust / overview via `ADMIN_WALLET`).
- **Next**: content depth (more troops/spells/traps), clans, revenge raids, PWA.

Deploy: `deploy/vps-deploy.sh` (nivar cleanup → Postgres/Redis → migrate → PM2 ×3 → nginx + TLS).
Architecture decisions: see [DECISIONS.md](./DECISIONS.md).
