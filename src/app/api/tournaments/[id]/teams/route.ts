import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { tournamentTeams } from '@/lib/db/schema'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const tournamentId = parseInt(id, 10)
  const { teamId, groupName } = await req.json()

  if (!teamId) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
  }

  try {
    const [row] = await db
      .insert(tournamentTeams)
      .values({ tournamentId, teamId, groupName: groupName ?? null })
      .returning()
    return NextResponse.json(row, { status: 201 })
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'Team already enrolled' }, { status: 409 })
    }
    console.error('Enroll team error:', err)
    return NextResponse.json({ error: 'Failed to enroll team' }, { status: 500 })
  }
}
