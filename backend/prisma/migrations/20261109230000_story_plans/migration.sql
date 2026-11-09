BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE "Story" RENAME COLUMN "durationDays" TO "durationHours";
UPDATE "Story" SET "durationHours" = "durationHours" * 24;
ALTER TABLE "Story" ADD COLUMN "textFormat" TEXT NOT NULL DEFAULT 'PLAIN',
  ADD COLUMN "videoUrl" TEXT,
  ADD COLUMN "videoDurationSeconds" DOUBLE PRECISION;
COMMIT;
