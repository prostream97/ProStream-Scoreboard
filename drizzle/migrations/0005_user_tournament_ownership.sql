ALTER TABLE "tournaments"
  ADD COLUMN "created_by" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN "match_days_from" DATE,
  ADD COLUMN "match_days_to" DATE;
