import { NextRequest, NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth/config'
import { canAccessTournament } from '@/lib/auth/access'
import { db } from '@/lib/db'
import { players, teams } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { InferInsertModel } from 'drizzle-orm'

export const runtime = 'nodejs'

async function checkTeamAccess(session: Session | null, teamId: number) {
  if (!session) return false
  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId), columns: { tournamentId: true } })
  if (!team) return null
  return canAccessTournament(session, team.tournamentId)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string; playerId: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { teamId, playerId } = await params
  const access = await checkTeamAccess(session, parseInt(teamId, 10))
  if (access === null) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = parseInt(playerId, 10)
  const body = await req.json() as Record<string, unknown>

  const allowed = ['name', 'displayName', 'role', 'battingStyle', 'bowlingStyle', 'headshotCloudinaryId']
  const patch: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }

  const [updated] = await db
    .update(players)
    .set(patch as Partial<InferInsertModel<typeof players>>)
    .where(eq(players.id, id))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string; playerId: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { teamId, playerId } = await params
  const access = await checkTeamAccess(session, parseInt(teamId, 10))
  if (access === null) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.delete(players).where(eq(players.id, parseInt(playerId, 10)))
  return NextResponse.json({ ok: true })
}
