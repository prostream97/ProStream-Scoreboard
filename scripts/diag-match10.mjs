import { Pool } from '@neondatabase/serverless'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const ms = await pool.query(`SELECT * FROM match_state WHERE match_id=10`)
console.log('match_state:', JSON.stringify(ms.rows, null, 2))

const innings = await pool.query(`SELECT id, match_id, innings_number, status, total_runs, wickets, overs, balls FROM innings WHERE match_id=10 ORDER BY innings_number`)
console.log('\ninnings:', innings.rows)

for (const inn of innings.rows) {
  const dels = await pool.query(`SELECT id, over_number, ball_number, is_legal, runs, extra_runs, extra_type, is_wicket FROM deliveries WHERE innings_id=$1 ORDER BY id`, [inn.id])
  console.log(`\n--- deliveries for innings ${inn.innings_number} (id=${inn.id}) ---`)
  console.table(dels.rows)
  const legalCount = dels.rows.filter(d => d.is_legal).length
  console.log(`legal: ${legalCount} | total rows: ${dels.rows.length}`)
  const byOver = {}
  for (const d of dels.rows) {
    byOver[d.over_number] = (byOver[d.over_number] || 0) + (d.is_legal ? 1 : 0)
  }
  console.log('legal per over:', byOver)
}

await pool.end()
