import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { isAdminSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { tournaments, tournamentAccess } from '@/lib/db/schema'
import { getTournamentList, getAccessibleTournaments } from '@/lib/db/queries/tournament'

export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    if (isAdminSession(session)) {
      const rows = await getTournamentList()
      return NextResponse.json(rows)
    }
    const userId = parseInt(session.user.id, 10)
    const rows = await getAccessibleTournaments(userId)
    return NextResponse.json(rows)
  } catch (err) {
    console.error('Tournaments fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = isAdminSession(session)
  const userId = parseInt(session.user.id, 10)
  const body = await req.json()
  const { name, shortName, format = 'T20', totalOvers = 20, ballsPerOver = 6, logoCloudinaryId } = body

  if (!name?.trim() || !shortName?.trim()) {
    return NextResponse.json({ error: 'name and shortName are required' }, { status: 400 })
  }

  // Operators must provide a match days window (max 2 days)
  if (!isAdmin) {
    const { match_days_from, match_days_to } = body
    if (!match_days_from || !match_days_to) {
      return NextResponse.json({ error: 'match_days_from and match_days_to are required' }, { status: 400 })
    }

    const from = new Date(match_days_from)
    const to = new Date(match_days_to)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }
    if (from < today) {
      return NextResponse.json({ error: 'match_days_from cannot be in the past' }, { status: 400 })
    }
    if (to < from) {
      return NextResponse.json({ error: 'match_days_to must be on or after match_days_from' }, { status: 400 })
    }
    const diffDays = Math.round((to.getTime() - from.getTime()) / 86_400_000)
    if (diffDays > 1) {
      return NextResponse.json({ error: 'Match days window cannot exceed 2 days' }, { status: 400 })
    }
  }

  try {
    const [tournament] = await db
      .insert(tournaments)
      .values({
        name: name.trim(),
        shortName: shortName.trim(),
        format,
        totalOvers,
        ballsPerOver,
        logoCloudinaryId: logoCloudinaryId || null,
        status: 'upcoming',
        createdBy: isAdmin ? null : userId,
        matchDaysFrom: !isAdmin ? body.match_days_from : (body.match_days_from ?? null),
        matchDaysTo: !isAdmin ? body.match_days_to : (body.match_days_to ?? null),
      })
      .returning()

    // Auto-insert tournament_access so existing grant-based checks also pass
    if (!isAdmin) {
      await db
        .insert(tournamentAccess)
        .values({ userId, tournamentId: tournament.id, grantedBy: null })
        .onConflictDoNothing()
    }

    return NextResponse.json(tournament, { status: 201 })
  } catch (err) {
    console.error('Tournament create error:', err)
    return NextResponse.json({ error: 'Failed to create tournament' }, { status: 500 })
  }
}
