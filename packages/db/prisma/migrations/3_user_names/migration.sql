-- Commander names: chosen at first entry, persisted on the account (and thus the wallet)
ALTER TABLE "User" ADD COLUMN "name" TEXT;
