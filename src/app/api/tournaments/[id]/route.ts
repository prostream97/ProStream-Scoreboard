import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { isAdminSession } from '@/lib/auth/utils'
import { canAccessTournament } from '@/lib/auth/access'
import { db } from '@/lib/db'
import { tournaments } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
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

  const isAdmin = isAdminSession(session)
  const userId = parseInt(session.user.id, 10)
  const { id } = await params
  const tournamentId = parseInt(id, 10)

  // Non-admins can only update tournaments they own
  if (!isAdmin) {
    const existing = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, tournamentId),
      columns: { createdBy: true },
    })
    if (!existing || existing.createdBy !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await req.json() as Record<string, unknown>

  const allowedKeys = ['name', 'shortName', 'status', 'format', 'totalOvers', 'ballsPerOver', 'logoCloudinaryId', 'matchDaysFrom', 'matchDaysTo'] as const
  const patch: Record<string, unknown> = {}
  for (const key of allowedKeys) {
    if (key in body) patch[key] = body[key]
  }

  const [updated] = await db
    .update(tournaments)
    .set(patch)
    .where(eq(tournaments.id, tournamentId))
    .returning()

  return NextResponse.json(updated)
}
