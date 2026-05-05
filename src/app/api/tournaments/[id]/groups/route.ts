import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { canAccessTournament, canEditTournament } from '@/lib/auth/access'
import { db } from '@/lib/db'
import { teams, tournamentGroups } from '@/lib/db/schema'
import { asc, eq } from 'drizzle-orm'
import { createGroup } from '@/lib/db/queries/tournament'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  const { id } = await params
  const tournamentId = parseInt(id, 10)

  if (!await canAccessTournament(session, tournamentId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const groups = await db
    .select()
    .from(tournamentGroups)
    .where(eq(tournamentGroups.tournamentId, tournamentId))
    .orderBy(asc(tournamentGroups.sortOrder), asc(tournamentGroups.createdAt))

  const teamRows = await db
    .select({ id: teams.id, name: teams.name, shortCode: teams.shortCode, primaryColor: teams.primaryColor, groupId: teams.groupId })
    .from(teams)
    .where(eq(teams.tournamentId, tournamentId))

  const teamsByGroup = new Map<number, typeof teamRows>()
  for (const team of teamRows) {
    if (team.groupId === null) continue
    const existing = teamsByGroup.get(team.groupId) ?? []
    existing.push(team)
    teamsByGroup.set(team.groupId, existing)
  }

  return NextResponse.json({
    groups: groups.map((g) => ({
      id: g.id,
      tournamentId: g.tournamentId,
      name: g.name,
      shortName: g.shortName,
      qualifyCount: g.qualifyCount,
      sortOrder: g.sortOrder,
      teams: teamsByGroup.get(g.id) ?? [],
    })),
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const tournamentId = parseInt(id, 10)

  if (!await canEditTournament(session, tournamentId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as { name?: string; shortName?: string; qualifyCount?: number; sortOrder?: number }
  const { name, shortName, qualifyCount = 2, sortOrder = 0 } = body

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (!shortName || typeof shortName !== 'string' || shortName.trim().length === 0) {
    return NextResponse.json({ error: 'shortName is required' }, { status: 400 })
  }
  if (shortName.length > 10) {
    return NextResponse.json({ error: 'shortName must be 10 characters or fewer' }, { status: 400 })
  }
  if (typeof qualifyCount !== 'number' || qualifyCount < 1) {
    return NextResponse.json({ error: 'qualifyCount must be a positive number' }, { status: 400 })
  }

  const group = await createGroup(tournamentId, { name: name.trim(), shortName: shortName.trim(), qualifyCount, sortOrder })
  return NextResponse.json({ group }, { status: 201 })
}
