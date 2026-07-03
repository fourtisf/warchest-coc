-- One-time grant: bring every existing village up to the new starting stash
-- (enough to upgrade everything to L3). New villages seed from START_RES.
UPDATE "Village" SET gold = GREATEST(gold, 20000), mana = GREATEST(mana, 12000);
