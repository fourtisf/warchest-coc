-- obstacle clearing becomes a timed builder job
ALTER TABLE "Obstacle" ADD COLUMN "clearUntil" TIMESTAMP(3);
ALTER TABLE "Obstacle" ADD COLUMN "clearTotalS" DOUBLE PRECISION;
