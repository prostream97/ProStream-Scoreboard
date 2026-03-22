import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { players } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params
  const id = parseInt(teamId, 10)

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
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { teamId } = await params
  const id = parseInt(teamId, 10)
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
