import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { canAccessTournament } from '@/lib/auth/access'
import { getTournamentStandings } from '@/lib/db/queries/tournament'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const tournamentId = parseInt(id, 10)

  if (!await canAccessTournament(session, tournamentId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const standings = await getTournamentStandings(tournamentId)
    return NextResponse.json(standings)
  } catch (err) {
    console.error('Standings error:', err)
    return NextResponse.json({ error: 'Failed to compute standings' }, { status: 500 })
  }
}
