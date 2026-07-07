-- Multi-account guards: salted IP hash + daily aid caps
ALTER TABLE "User" ADD COLUMN "ipHash" TEXT;
CREATE INDEX "User_ipHash_idx" ON "User"("ipHash");

CREATE TABLE "AidDay" (
  "userId" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "given" INTEGER NOT NULL DEFAULT 0,
  "received" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "AidDay_pkey" PRIMARY KEY ("userId", "day")
);
