import { NextRequest, NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth/config'
import { canAccessTournament } from '@/lib/auth/access'
import { db } from '@/lib/db'
import { teams } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'

async function resolveAccess(session: Session | null, teamId: number) {
  if (!session) return false
  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId), columns: { tournamentId: true } })
  if (!team) return null // team not found
  return canAccessTournament(session, team.tournamentId)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { teamId } = await params
  const id = parseInt(teamId, 10)

  const access = await resolveAccess(session, id)
  if (access === null) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as Record<string, unknown>

  const allowed: (keyof typeof teams.$inferInsert)[] = [
    'name', 'shortCode', 'primaryColor', 'logoCloudinaryId',
  ]
  const patch: Partial<typeof teams.$inferInsert> = {}
  for (const key of allowed) {
    if (key in body) (patch as Record<string, unknown>)[key] = body[key]
  }

  try {
    const [updated] = await db.update(teams).set(patch).where(eq(teams.id, id)).returning()
    if (!updated) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('Team update error:', err)
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { teamId } = await params
  const id = parseInt(teamId, 10)

  const access = await resolveAccess(session, id)
  if (access === null) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    await db.delete(teams).where(eq(teams.id, id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Team delete error:', err)
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 })
  }
}
