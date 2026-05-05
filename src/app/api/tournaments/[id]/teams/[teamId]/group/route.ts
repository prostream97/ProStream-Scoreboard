import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { canEditTournament } from '@/lib/auth/access'
import { db } from '@/lib/db'
import { teams, tournamentGroups } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { assignTeamToGroup } from '@/lib/db/queries/tournament'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, teamId: teamIdStr } = await params
  const tournamentId = parseInt(id, 10)
  const teamId = parseInt(teamIdStr, 10)

  if (!await canEditTournament(session, tournamentId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    columns: { id: true, tournamentId: true },
  })
  if (!team || team.tournamentId !== tournamentId) {
    return NextResponse.json({ error: 'Team not found in this tournament' }, { status: 404 })
  }

  const body = await req.json() as { groupId: number | null }
  const { groupId } = body

  if (groupId !== null) {
    if (typeof groupId !== 'number') {
      return NextResponse.json({ error: 'groupId must be a number or null' }, { status: 400 })
    }
    const group = await db.query.tournamentGroups.findFirst({
      where: eq(tournamentGroups.id, groupId),
      columns: { id: true, tournamentId: true },
    })
    if (!group || group.tournamentId !== tournamentId) {
      return NextResponse.json({ error: 'Group not found in this tournament' }, { status: 404 })
    }
  }

  await assignTeamToGroup(teamId, groupId)
  return NextResponse.json({ success: true })
}
