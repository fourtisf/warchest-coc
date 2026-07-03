-- Retention update: daily war chest, revenge, obstacle respawn, referrals
ALTER TABLE "User" ADD COLUMN "refBy" TEXT;
ALTER TABLE "Village"
  ADD COLUMN "lastDailyAt" TIMESTAMP(3),
  ADD COLUMN "dailyStreak" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastObstAt" TIMESTAMP(3);
ALTER TABLE "Battle" ADD COLUMN "revenged" BOOLEAN NOT NULL DEFAULT false;
