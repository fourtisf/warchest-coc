-- Clan aid: CoC-style troop/resource requests filled by clanmates
CREATE TABLE "ClanRequest" (
  "id" SERIAL PRIMARY KEY,
  "clanId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "filled" INTEGER NOT NULL DEFAULT 0,
  "donorsJson" JSONB NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClanRequest_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ClanRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ClanRequest_clanId_status_idx" ON "ClanRequest"("clanId", "status");
CREATE INDEX "ClanRequest_userId_createdAt_idx" ON "ClanRequest"("userId", "createdAt");
