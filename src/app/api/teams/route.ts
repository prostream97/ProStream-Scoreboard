import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { teams } from '@/lib/db/schema'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const rows = await db.query.teams.findMany({
      orderBy: (t, { asc }) => [asc(t.name)],
    })
    return NextResponse.json(rows)
  } catch (err) {
    console.error('Teams fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, shortCode, primaryColor, secondaryColor, logoCloudinaryId } = body

  if (!name || !shortCode) {
    return NextResponse.json({ error: 'name and shortCode are required' }, { status: 400 })
  }

  try {
    const [team] = await db
      .insert(teams)
      .values({
        name,
        shortCode: shortCode.toUpperCase().slice(0, 3),
        primaryColor: primaryColor ?? '#4F46E5',
        secondaryColor: secondaryColor ?? '#10B981',
        logoCloudinaryId: logoCloudinaryId ?? null,
      })
      .returning()

    return NextResponse.json(team, { status: 201 })
  } catch (err) {
    console.error('Team create error:', err)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}
