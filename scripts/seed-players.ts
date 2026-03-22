import { config } from 'dotenv'
config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../src/lib/db/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

const miPlayers = [
  { name: 'Rohit Sharma',       displayName: 'RG Sharma',      role: 'batsman',   battingStyle: 'right-hand', bowlingStyle: 'right-arm-offbreak' },
  { name: 'Ishan Kishan',       displayName: 'I Kishan',        role: 'keeper',    battingStyle: 'left-hand',  bowlingStyle: null },
  { name: 'Suryakumar Yadav',   displayName: 'SK Yadav',        role: 'batsman',   battingStyle: 'right-hand', bowlingStyle: null },
  { name: 'Tilak Varma',        displayName: 'T Varma',         role: 'batsman',   battingStyle: 'left-hand',  bowlingStyle: null },
  { name: 'Hardik Pandya',      displayName: 'H Pandya',        role: 'allrounder',battingStyle: 'right-hand', bowlingStyle: 'right-arm-medium' },
  { name: 'Tim David',          displayName: 'T David',         role: 'batsman',   battingStyle: 'right-hand', bowlingStyle: null },
  { name: 'Romario Shepherd',   displayName: 'R Shepherd',      role: 'allrounder',battingStyle: 'right-hand', bowlingStyle: 'right-arm-medium' },
  { name: 'Jasprit Bumrah',     displayName: 'JJ Bumrah',       role: 'bowler',    battingStyle: 'right-hand', bowlingStyle: 'right-arm-fast' },
  { name: 'Trent Boult',        displayName: 'TA Boult',        role: 'bowler',    battingStyle: 'left-hand',  bowlingStyle: 'left-arm-fast' },
  { name: 'Gerald Coetzee',     displayName: 'G Coetzee',       role: 'bowler',    battingStyle: 'right-hand', bowlingStyle: 'right-arm-fast' },
]

const cskPlayers = [
  { name: 'Ruturaj Gaikwad',    displayName: 'RD Gaikwad',     role: 'batsman',   battingStyle: 'right-hand', bowlingStyle: null },
  { name: 'Devon Conway',       displayName: 'DP Conway',       role: 'keeper',    battingStyle: 'left-hand',  bowlingStyle: null },
  { name: 'Daryl Mitchell',     displayName: 'D Mitchell',      role: 'allrounder',battingStyle: 'right-hand', bowlingStyle: 'right-arm-medium' },
  { name: 'Shivam Dube',        displayName: 'S Dube',          role: 'allrounder',battingStyle: 'left-hand',  bowlingStyle: 'right-arm-medium' },
  { name: 'MS Dhoni',           displayName: 'MS Dhoni',        role: 'keeper',    battingStyle: 'right-hand', bowlingStyle: null },
  { name: 'Ravindra Jadeja',    displayName: 'RA Jadeja',       role: 'allrounder',battingStyle: 'left-hand',  bowlingStyle: 'left-arm-orthodox' },
  { name: 'Moeen Ali',          displayName: 'MM Ali',          role: 'allrounder',battingStyle: 'left-hand',  bowlingStyle: 'right-arm-offbreak' },
  { name: 'Deepak Chahar',      displayName: 'DL Chahar',       role: 'bowler',    battingStyle: 'right-hand', bowlingStyle: 'right-arm-medium' },
  { name: 'Tushar Deshpande',   displayName: 'T Deshpande',     role: 'bowler',    battingStyle: 'right-hand', bowlingStyle: 'right-arm-fast' },
  { name: 'Matheesha Pathirana',displayName: 'M Pathirana',     role: 'bowler',    battingStyle: 'right-hand', bowlingStyle: 'right-arm-fast' },
]

async function seed() {
  console.log('Seeding MI players...')
  const miInserted = await db.insert(schema.players).values(
    miPlayers.map((p) => ({ ...p, teamId: 1, headshotCloudinaryId: null }))
  ).returning()
  console.log(`  ✓ ${miInserted.length} MI players inserted`)

  console.log('Seeding CSK players...')
  const cskInserted = await db.insert(schema.players).values(
    cskPlayers.map((p) => ({ ...p, teamId: 2, headshotCloudinaryId: null }))
  ).returning()
  console.log(`  ✓ ${cskInserted.length} CSK players inserted`)

  console.log('Done!')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
