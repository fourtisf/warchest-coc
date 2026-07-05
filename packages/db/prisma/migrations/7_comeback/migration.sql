-- Comeback update: web-push subscriptions + retrain preset
CREATE TABLE "PushSub" (
  "id" SERIAL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "failCount" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PushSub_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PushSub_endpoint_key" ON "PushSub"("endpoint");
CREATE INDEX "PushSub_userId_idx" ON "PushSub"("userId");

ALTER TABLE "Village" ADD COLUMN "lastArmyJson" JSONB;
