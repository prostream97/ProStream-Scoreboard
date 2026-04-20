import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { canAccessTournament, getTournamentPermissionContext } from '@/lib/auth/access'
import { db } from '@/lib/db'
import { tournaments, teams, matches, innings } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { getTournamentWithDetails } from '@/lib/db/queries/tournament'

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
    const detail = await getTournamentWithDetails(tournamentId)
    if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(detail)
  } catch (err) {
    console.error('Tournament detail error:', err)
    return NextResponse.json({ error: 'Failed to fetch tournament' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const tournamentId = parseInt(id, 10)

  const ctx = await getTournamentPermissionContext(session, tournamentId)
  if (!ctx) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!ctx.canEditTournament) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as Record<string, unknown>

  const allowedKeys = ['name', 'shortName', 'status', 'format', 'totalOvers', 'ballsPerOver', 'logoCloudinaryId', 'matchDaysFrom', 'matchDaysTo'] as const
  const patch: Record<string, unknown> = {}
  for (const key of allowedKeys) {
    if (key in body) patch[key] = body[key]
  }

  try {
    const [updated] = await db
      .update(tournaments)
      .set(patch)
      .where(eq(tournaments.id, tournamentId))
      .returning()

    if (!updated) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('Tournament update error:', err)
    return NextResponse.json({ error: 'Failed to update tournament' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const tournamentId = parseInt(id, 10)

  try {
    // 1. Get all team IDs in this tournament
    const tournamentTeams = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.tournamentId, tournamentId))
    const teamIds = tournamentTeams.map((t) => t.id)

    // 2. Get all match IDs for this tournament (by tournamentId or by team membership)
    let matchIds: number[] = []
    if (teamIds.length > 0) {
      const tournamentMatches = await db
        .select({ id: matches.id })
        .from(matches)
        .where(inArray(matches.homeTeamId, teamIds))
      matchIds = tournamentMatches.map((m) => m.id)
    }

    // 3. Delete innings for those matches (cascade handles deliveries, partnerships, match_state)
    if (matchIds.length > 0) {
      await db.delete(innings).where(inArray(innings.matchId, matchIds))
      await db.delete(matches).where(inArray(matches.id, matchIds))
    }

    // 4. Delete tournament (cascades: teams → players, tournament_access, overlay_links)
    const [deleted] = await db
      .delete(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .returning()

    if (!deleted) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Tournament delete error:', err)
    return NextResponse.json({ error: 'Failed to delete tournament' }, { status: 500 })
  }
}
