import { Pool } from '@neondatabase/serverless'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const MATCH_ID = 10
const BPO = 6

// Find current innings
const innings = await pool.query(
  `SELECT id, innings_number, overs, balls, total_runs, wickets FROM innings WHERE match_id=$1 AND status='active' ORDER BY innings_number DESC LIMIT 1`,
  [MATCH_ID],
)
if (!innings.rows.length) {
  console.error('No active innings')
  process.exit(1)
}
const inn = innings.rows[0]
console.log('Active innings:', inn)

// Load all deliveries for this innings
const dels = await pool.query(
  `SELECT id, over_number, ball_number, batsman_id, bowler_id, runs, extra_runs, is_legal, is_boundary, extra_type, is_wicket, dismissal_type, dismissed_batter_id, fielder1_id, fielder2_id, timestamp
   FROM deliveries WHERE innings_id=$1 ORDER BY id`,
  [inn.id],
)

// Recompute authoritative counts
const legalTotal = dels.rows.filter((d) => d.is_legal).length
const computedOvers = Math.floor(legalTotal / BPO)
const computedBalls = legalTotal % BPO
const computedRuns = dels.rows.reduce((s, d) => s + d.runs + d.extra_runs, 0)
const computedWickets = dels.rows.filter((d) => d.is_wicket).length

console.log('\nRecomputed:', { legalTotal, computedOvers, computedBalls, computedRuns, computedWickets })

// Current-over buffer = deliveries with over_number === computedOvers
const currentOverDels = dels.rows.filter((d) => d.over_number === computedOvers)
const buffer = currentOverDels.map((d) => ({
  overNumber: d.over_number,
  ballNumber: d.ball_number,
  batsmanId: d.batsman_id,
  bowlerId: d.bowler_id,
  runs: d.runs,
  extraRuns: d.extra_runs,
  isLegal: d.is_legal,
  isBoundary: d.is_boundary,
  extraType: d.extra_type,
  isWicket: d.is_wicket,
  dismissalType: d.dismissal_type,
  dismissedBatterId: d.dismissed_batter_id,
  fielder1Id: d.fielder1_id,
  fielder2Id: d.fielder2_id,
  timestamp: new Date(d.timestamp).toISOString(),
}))

console.log(`\ncurrent_over_buffer will contain ${buffer.length} rows (over ${computedOvers})`)

// Apply repair
await pool.query(
  `UPDATE innings SET overs=$1, balls=$2, total_runs=$3, wickets=$4 WHERE id=$5`,
  [computedOvers, computedBalls, computedRuns, computedWickets, inn.id],
)

await pool.query(
  `UPDATE match_state SET current_over=$1, current_balls=$2, current_over_buffer=$3, last_updated=NOW() WHERE match_id=$4`,
  [computedOvers, computedBalls, JSON.stringify(buffer), MATCH_ID],
)

console.log('\nRepair applied.')

// Verify
const ms = await pool.query(`SELECT current_over, current_balls, jsonb_array_length(current_over_buffer) AS buflen FROM match_state WHERE match_id=$1`, [MATCH_ID])
const innAfter = await pool.query(`SELECT overs, balls, total_runs, wickets FROM innings WHERE id=$1`, [inn.id])
console.log('match_state after:', ms.rows[0])
console.log('innings after:', innAfter.rows[0])

await pool.end()
