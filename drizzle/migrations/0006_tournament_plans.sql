-- Migration: Tournament plan types + tournament-scoped overlay links

-- 1. Add plan_type enum
CREATE TYPE "plan_type" AS ENUM ('tournament', 'match', 'daily');

-- 2. Add plan columns to tournaments
ALTER TABLE "tournaments"
  ADD COLUMN "plan_type" "plan_type" NOT NULL DEFAULT 'tournament',
  ADD COLUMN "match_limit" integer,
  ADD COLUMN "plan_day" date;

-- 3. Make overlay_links.match_id nullable (was NOT NULL)
ALTER TABLE "overlay_links"
  ALTER COLUMN "match_id" DROP NOT NULL;

-- 4. Add tournament_id to overlay_links
ALTER TABLE "overlay_links"
  ADD COLUMN "tournament_id" integer REFERENCES "tournaments"("id") ON DELETE CASCADE;
