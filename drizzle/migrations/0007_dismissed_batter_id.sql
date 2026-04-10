ALTER TABLE "deliveries"
ADD COLUMN IF NOT EXISTS "dismissed_batter_id" integer REFERENCES "players"("id");
