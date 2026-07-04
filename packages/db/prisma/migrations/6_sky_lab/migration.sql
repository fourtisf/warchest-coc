-- Sky & Lab update: dragons, frost rune, War Lab troop research
ALTER TABLE "Army" ADD COLUMN "dragon" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Army" ADD COLUMN "spellFreeze" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Army" ADD COLUMN "levelsJson" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Army" ADD COLUMN "researchTroop" TEXT;
ALTER TABLE "Army" ADD COLUMN "researchUntil" TIMESTAMP(3);
ALTER TABLE "Army" ADD COLUMN "researchTotalS" DOUBLE PRECISION;

-- attacker troop levels frozen at resolve time so replays stay deterministic
ALTER TABLE "Battle" ADD COLUMN "levelsJson" JSONB;
