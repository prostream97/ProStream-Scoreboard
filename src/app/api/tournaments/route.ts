import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { tournaments } from '@/lib/db/schema'
import { getTournamentList } from '@/lib/db/queries/tournament'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const rows = await getTournamentList()
    return NextResponse.json(rows)
  } catch (err) {
    console.error('Tournaments fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, shortName, format = 'T20', totalOvers = 20 } = body

  if (!name?.trim() || !shortName?.trim()) {
    return NextResponse.json({ error: 'name and shortName are required' }, { status: 400 })
  }

  try {
    const [tournament] = await db
      .insert(tournaments)
      .values({ name: name.trim(), shortName: shortName.trim(), format, totalOvers, status: 'upcoming' })
      .returning()
    return NextResponse.json(tournament, { status: 201 })
  } catch (err) {
    console.error('Tournament create error:', err)
    return NextResponse.json({ error: 'Failed to create tournament' }, { status: 500 })
  }
}
