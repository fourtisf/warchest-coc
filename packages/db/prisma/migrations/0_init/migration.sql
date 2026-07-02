-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "wallet" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Village" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gold" DOUBLE PRECISION NOT NULL DEFAULT 350,
    "mana" DOUBLE PRECISION NOT NULL DEFAULT 350,
    "war" INTEGER NOT NULL DEFAULT 40,
    "trophies" INTEGER NOT NULL DEFAULT 10,
    "buildersTotal" INTEGER NOT NULL DEFAULT 2,
    "shieldUntil" TIMESTAMP(3),
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statJson" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "Village_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" SERIAL NOT NULL,
    "villageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "gx" INTEGER NOT NULL,
    "gy" INTEGER NOT NULL,
    "storedFloat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "storedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "busyUntil" TIMESTAMP(3),
    "jobKind" TEXT,
    "jobTotalS" DOUBLE PRECISION,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Obstacle" (
    "id" SERIAL NOT NULL,
    "villageId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "gx" INTEGER NOT NULL,
    "gy" INTEGER NOT NULL,
    "cleared" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Obstacle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Army" (
    "villageId" TEXT NOT NULL,
    "raider" INTEGER NOT NULL DEFAULT 0,
    "sniper" INTEGER NOT NULL DEFAULT 0,
    "bruiser" INTEGER NOT NULL DEFAULT 0,
    "gargoyle" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Army_pkey" PRIMARY KEY ("villageId")
);

-- CreateTable
CREATE TABLE "TrainJob" (
    "id" SERIAL NOT NULL,
    "villageId" TEXT NOT NULL,
    "troopType" TEXT NOT NULL,
    "finishesAt" TIMESTAMP(3),
    "totalS" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TrainJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestState" (
    "villageId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "QuestState_pkey" PRIMARY KEY ("villageId","questId")
);

-- CreateTable
CREATE TABLE "Battle" (
    "id" TEXT NOT NULL,
    "attackerId" TEXT NOT NULL,
    "defenderId" TEXT,
    "defenderSnapshotJson" JSONB NOT NULL,
    "seed" INTEGER NOT NULL,
    "deployLogJson" JSONB,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lootG" INTEGER NOT NULL DEFAULT 0,
    "lootM" INTEGER NOT NULL DEFAULT 0,
    "warEarned" INTEGER NOT NULL DEFAULT 0,
    "trophyDelta" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'scouted',
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "seenByDefender" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Battle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarLedger" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL,
    "wallet" TEXT NOT NULL,
    "txSig" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonScore" (
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trophies" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SeasonScore_pkey" PRIMARY KEY ("seasonId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_wallet_key" ON "User"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "Village_userId_key" ON "Village"("userId");

-- CreateIndex
CREATE INDEX "Village_trophies_idx" ON "Village"("trophies");

-- CreateIndex
CREATE INDEX "Building_villageId_idx" ON "Building"("villageId");

-- CreateIndex
CREATE INDEX "Obstacle_villageId_idx" ON "Obstacle"("villageId");

-- CreateIndex
CREATE INDEX "TrainJob_villageId_idx" ON "TrainJob"("villageId");

-- CreateIndex
CREATE INDEX "Battle_attackerId_status_idx" ON "Battle"("attackerId", "status");

-- CreateIndex
CREATE INDEX "Battle_defenderId_resolvedAt_idx" ON "Battle"("defenderId", "resolvedAt");

-- CreateIndex
CREATE INDEX "WarLedger_userId_createdAt_idx" ON "WarLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Claim_status_createdAt_idx" ON "Claim"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SeasonScore_seasonId_trophies_idx" ON "SeasonScore"("seasonId", "trophies");

-- AddForeignKey
ALTER TABLE "Village" ADD CONSTRAINT "Village_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obstacle" ADD CONSTRAINT "Obstacle_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Army" ADD CONSTRAINT "Army_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainJob" ADD CONSTRAINT "TrainJob_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestState" ADD CONSTRAINT "QuestState_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_attackerId_fkey" FOREIGN KEY ("attackerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_defenderId_fkey" FOREIGN KEY ("defenderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarLedger" ADD CONSTRAINT "WarLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonScore" ADD CONSTRAINT "SeasonScore_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonScore" ADD CONSTRAINT "SeasonScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

