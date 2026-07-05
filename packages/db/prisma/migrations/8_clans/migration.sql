-- Clans update: clans, membership, war-room chat (global + clan channels)
CREATE TABLE "Clan" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "desc" TEXT NOT NULL DEFAULT '',
  "badge" INTEGER NOT NULL DEFAULT 0,
  "leaderId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Clan_name_key" ON "Clan"("name");

CREATE TABLE "ClanMember" (
  "userId" TEXT PRIMARY KEY,
  "clanId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClanMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ClanMember_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ClanMember_clanId_idx" ON "ClanMember"("clanId");

CREATE TABLE "ChatMessage" (
  "id" SERIAL PRIMARY KEY,
  "clanId" TEXT,
  "userId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ChatMessage_clanId_id_idx" ON "ChatMessage"("clanId", "id");
