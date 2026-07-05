-- Clan power: cached per-village strength score, summed per clan
ALTER TABLE "Village" ADD COLUMN "power" INTEGER NOT NULL DEFAULT 0;
