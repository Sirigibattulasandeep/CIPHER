ALTER TABLE "Evidence"
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "provenance" TEXT NOT NULL DEFAULT 'automated',
  ADD COLUMN "integrityHash" TEXT;
