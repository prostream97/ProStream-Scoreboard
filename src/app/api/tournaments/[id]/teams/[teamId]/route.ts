import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { tournamentTeams } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, teamId } = await params
  const tournamentId = parseInt(id, 10)
  const teamIdNum = parseInt(teamId, 10)

  await db
    .delete(tournamentTeams)
    .where(
      and(
        eq(tournamentTeams.tournamentId, tournamentId),
        eq(tournamentTeams.teamId, teamIdNum),
      ),
    )

  return NextResponse.json({ ok: true })
}
