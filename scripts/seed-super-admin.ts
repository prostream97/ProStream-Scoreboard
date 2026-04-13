import { config } from 'dotenv'
config({ path: '.env.local' })

import bcrypt from 'bcryptjs'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../src/lib/db/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function main() {
  const username = process.env.OPERATOR_USERNAME?.trim().toLowerCase()
  const password = process.env.OPERATOR_PASSWORD ?? ''
  const displayName = process.env.OPERATOR_DISPLAY_NAME ?? process.env.OPERATOR_USERNAME ?? 'Super Admin'

  if (!username || !password) {
    console.error('OPERATOR_USERNAME and OPERATOR_PASSWORD must be set in .env.local')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const [user] = await db
    .insert(schema.users)
    .values({ username, passwordHash, displayName, role: 'admin' })
    .onConflictDoUpdate({
      target: schema.users.username,
      set: { passwordHash, displayName, updatedAt: new Date() },
    })
    .returning()

  console.log(`Super admin upserted — id: ${user.id}, username: ${user.username}, role: ${user.role}`)
}

main().catch((err) => { console.error(err); process.exit(1) })
