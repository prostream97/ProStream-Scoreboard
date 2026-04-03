// Run with: node scripts/migrate.mjs
// Adds only the new columns: balls_per_over (tournaments + matches) and logo_cloudinary_id (tournaments)

import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env.local') })

const sql = neon(process.env.DATABASE_URL)

const statements = [
  `ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "balls_per_over" integer NOT NULL DEFAULT 6`,
  `ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "logo_cloudinary_id" text`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "balls_per_over" integer NOT NULL DEFAULT 6`,
]

for (const stmt of statements) {
  console.log('Running:', stmt)
  await sql.query(stmt)
  console.log('  ✓ done')
}

console.log('\nAll migrations applied.')
