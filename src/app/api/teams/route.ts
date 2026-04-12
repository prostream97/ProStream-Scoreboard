import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { isAdminSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { teams } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tournamentId = searchParams.get('tournamentId')

  if (tournamentId !== null) {
    const tid = parseInt(tournamentId, 10)
    if (isNaN(tid)) return NextResponse.json({ error: 'Invalid tournamentId' }, { status: 400 })

    try {
      const rows = await db.select().from(teams).where(eq(teams.tournamentId, tid)).orderBy(asc(teams.name))
      return NextResponse.json(rows)
    } catch (err) {
      console.error('Teams fetch error:', err)
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
    }
  }

  try {
    const rows = await db.select().from(teams).orderBy(asc(teams.name))
    return NextResponse.json(rows)
  } catch (err) {
    console.error('Teams fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !isAdminSession(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, shortCode, primaryColor, logoCloudinaryId, tournamentId } = body

  if (!name || !shortCode || !tournamentId) {
    return NextResponse.json({ error: 'name, shortCode and tournamentId are required' }, { status: 400 })
  }

  try {
    const [team] = await db
      .insert(teams)
      .values({
        tournamentId,
        name,
        shortCode: shortCode.toUpperCase().slice(0, 3),
        primaryColor: primaryColor ?? '#4F46E5',
        logoCloudinaryId: logoCloudinaryId ?? null,
      })
      .returning()

    return NextResponse.json(team, { status: 201 })
  } catch (err) {
    console.error('Team create error:', err)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}
