import { NextRequest, NextResponse } from 'next/server'
import { getTournamentStandings } from '@/lib/db/queries/tournament'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const standings = await getTournamentStandings(parseInt(id, 10))
    return NextResponse.json(standings)
  } catch (err) {
    console.error('Standings error:', err)
    return NextResponse.json({ error: 'Failed to compute standings' }, { status: 500 })
  }
}
