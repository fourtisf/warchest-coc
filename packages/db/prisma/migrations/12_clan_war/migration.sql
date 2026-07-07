-- Clan wars: matched clans, fixed rosters, scored attacks
ALTER TABLE "Clan" ADD COLUMN "warState" TEXT NOT NULL DEFAULT 'idle';
ALTER TABLE "Clan" ADD COLUMN "warId" TEXT;
ALTER TABLE "Battle" ADD COLUMN "warId" TEXT;

CREATE TABLE "War" (
  "id" TEXT PRIMARY KEY,
  "clanAId" TEXT NOT NULL,
  "clanBId" TEXT NOT NULL,
  "nameA" TEXT NOT NULL,
  "nameB" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "rosterAJson" JSONB NOT NULL,
  "rosterBJson" JSONB NOT NULL,
  "starsA" INTEGER NOT NULL DEFAULT 0,
  "starsB" INTEGER NOT NULL DEFAULT 0,
  "pctA" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "pctB" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "winner" TEXT
);
CREATE INDEX "War_status_endsAt_idx" ON "War"("status", "endsAt");
CREATE INDEX "War_clanAId_startsAt_idx" ON "War"("clanAId", "startsAt");
CREATE INDEX "War_clanBId_startsAt_idx" ON "War"("clanBId", "startsAt");

CREATE TABLE "WarAttack" (
  "id" SERIAL PRIMARY KEY,
  "warId" TEXT NOT NULL,
  "attackerId" TEXT NOT NULL,
  "defenderId" TEXT NOT NULL,
  "stars" INTEGER NOT NULL,
  "pct" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WarAttack_warId_fkey" FOREIGN KEY ("warId") REFERENCES "War"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "WarAttack_warId_attackerId_idx" ON "WarAttack"("warId", "attackerId");
