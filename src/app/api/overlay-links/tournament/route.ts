import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { eq, and, isNull } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { getTournamentPermissionContext } from '@/lib/auth/access'
import { db } from '@/lib/db'
import { overlayLinks, tournaments } from '@/lib/db/schema'

export const runtime = 'nodejs'

// POST /api/overlay-links/tournament
// Creates a tournament-level overlay link (matchId null) for a tournament the user can edit.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { tournamentId, mode = 'standard' } = body

  if (!tournamentId || isNaN(parseInt(tournamentId, 10))) {
    return NextResponse.json({ error: 'tournamentId is required' }, { status: 400 })
  }

  const tournamentIdNum = parseInt(tournamentId, 10)

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentIdNum),
    columns: { id: true, name: true },
  })
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })

  const permissionContext = await getTournamentPermissionContext(session, tournamentIdNum)
  if (!permissionContext?.canEditTournament) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check if an active link already exists for this tournament + mode
  const existing = await db.query.overlayLinks.findFirst({
    where: and(
      eq(overlayLinks.tournamentId, tournamentIdNum),
      isNull(overlayLinks.matchId),
      eq(overlayLinks.isActive, true),
      eq(overlayLinks.mode, mode),
    ),
  })
  if (existing) {
    return NextResponse.json({ error: 'An active overlay link already exists for this theme' }, { status: 409 })
  }

  const token = randomBytes(32).toString('hex')
  const userId = parseInt(session.user.id, 10)

  const [link] = await db
    .insert(overlayLinks)
    .values({
      matchId: null,
      tournamentId: tournamentIdNum,
      userId,
      token,
      mode,
      label: `${tournament.name} — ${mode}`,
    })
    .returning()

  return NextResponse.json({ link }, { status: 201 })
}
