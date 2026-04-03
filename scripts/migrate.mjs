// Run with: node scripts/migrate.mjs
// Idempotent migration script using neon HTTP driver (avoids websocket hang from drizzle-kit migrate)

import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env.local') })

const sql = neon(process.env.DATABASE_URL)

const statements = [
  // ── User profile fields ───────────────────────────────────────────────────
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(20)`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "photo_cloudinary_id" text`,

  // ── Previous migrations (idempotent) ──────────────────────────────────────
  `ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "balls_per_over" integer NOT NULL DEFAULT 6`,
  `ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "logo_cloudinary_id" text`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "balls_per_over" integer NOT NULL DEFAULT 6`,

  // ── Overlay Manager + Wallet System ───────────────────────────────────────
  `DO $$ BEGIN
    CREATE TYPE "public"."overlay_mode" AS ENUM('bug','card','partnership','boundary');
  EXCEPTION WHEN duplicate_object THEN null; END $$`,

  `DO $$ BEGIN
    CREATE TYPE "public"."transaction_type" AS ENUM('topup','deduction');
  EXCEPTION WHEN duplicate_object THEN null; END $$`,

  `CREATE TABLE IF NOT EXISTS "overlay_links" (
    "id" serial PRIMARY KEY,
    "match_id" integer NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
    "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "token" varchar(64) NOT NULL UNIQUE,
    "mode" "overlay_mode" NOT NULL DEFAULT 'bug',
    "label" text,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamp NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS "wallets" (
    "id" serial PRIMARY KEY,
    "user_id" integer NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
    "balance" integer NOT NULL DEFAULT 0,
    "updated_at" timestamp NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS "wallet_transactions" (
    "id" serial PRIMARY KEY,
    "wallet_id" integer NOT NULL REFERENCES "wallets"("id") ON DELETE CASCADE,
    "type" "transaction_type" NOT NULL,
    "amount" integer NOT NULL,
    "balance_before" integer NOT NULL,
    "balance_after" integer NOT NULL,
    "description" text NOT NULL,
    "reference_id" integer,
    "created_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" timestamp NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS "pricing_config" (
    "id" serial PRIMARY KEY,
    "key" varchar(64) NOT NULL UNIQUE,
    "value" integer NOT NULL,
    "updated_at" timestamp NOT NULL DEFAULT now()
  )`,

  // Seed default pricing (no-op if already set)
  `INSERT INTO "pricing_config" ("key", "value")
   VALUES ('overlay_per_match', 100), ('overlay_per_tournament', 500)
   ON CONFLICT ("key") DO NOTHING`,

  // ── Add standard overlay mode to enum ────────────────────────────────────
  `DO $$ BEGIN
    ALTER TYPE "public"."overlay_mode" ADD VALUE IF NOT EXISTS 'standard';
  EXCEPTION WHEN others THEN null; END $$`,

  // ── Tournament Access Control ─────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "tournament_access" (
    "id" serial PRIMARY KEY,
    "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "tournament_id" integer NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
    "granted_at" timestamp NOT NULL DEFAULT now(),
    "granted_by" integer REFERENCES "users"("id") ON DELETE SET NULL
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "tournament_access_user_tournament_idx"
    ON "tournament_access" ("user_id", "tournament_id")`,
]

for (const stmt of statements) {
  const preview = stmt.trim().split('\n')[0].slice(0, 80)
  console.log('Running:', preview, '...')
  await sql.query(stmt)
  console.log('  ✓ done')
}

console.log('\nAll migrations applied successfully.')
