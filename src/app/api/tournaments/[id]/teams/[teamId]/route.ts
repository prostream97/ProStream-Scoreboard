import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { isAdminSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { teams } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> },
) {
  const session = await auth()
  if (!session || !isAdminSession(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, teamId } = await params
  const tournamentId = parseInt(id, 10)
  const teamIdNum = parseInt(teamId, 10)

  await db
    .delete(teams)
    .where(and(eq(teams.id, teamIdNum), eq(teams.tournamentId, tournamentId)))

  return NextResponse.json({ ok: true })
}
