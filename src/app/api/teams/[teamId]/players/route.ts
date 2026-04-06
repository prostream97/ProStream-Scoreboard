import { NextRequest, NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth/config'
import { canAccessTournament } from '@/lib/auth/access'
import { db } from '@/lib/db'
import { players, teams } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'

async function checkTeamAccess(session: Session | null, teamId: number) {
  if (!session) return false
  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId), columns: { tournamentId: true } })
  if (!team) return null
  return canAccessTournament(session, team.tournamentId)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { teamId } = await params
  const id = parseInt(teamId, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid teamId' }, { status: 400 })

  try {
    const rows = await db.query.players.findMany({
      where: eq(players.teamId, id),
      orderBy: (p, { asc }) => [asc(p.name)],
    })
    return NextResponse.json(rows)
  } catch (err) {
    console.error('Players fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { teamId } = await params
  const id = parseInt(teamId, 10)

  const access = await checkTeamAccess(session, id)
  if (access === null) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  // Accept single player or array
  const playerList = Array.isArray(body) ? body : [body]

  try {
    const inserted = await db
      .insert(players)
      .values(
        playerList.map((p) => ({
          teamId: id,
          name: p.name,
          displayName: p.displayName ?? p.name,
          role: p.role ?? 'batsman',
          battingStyle: p.battingStyle ?? null,
          bowlingStyle: p.bowlingStyle ?? null,
          headshotCloudinaryId: p.headshotCloudinaryId ?? null,
        }))
      )
      .returning()

    return NextResponse.json(inserted, { status: 201 })
  } catch (err) {
    console.error('Player create error:', err)
    return NextResponse.json({ error: 'Failed to create player(s)' }, { status: 500 })
  }
}
