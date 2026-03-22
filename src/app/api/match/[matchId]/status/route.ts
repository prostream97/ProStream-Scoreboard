import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { matches } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { matchId } = await params
  const id = parseInt(matchId, 10)
  const { status } = await req.json()

  const validStatuses = ['setup', 'active', 'paused', 'break', 'complete']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  try {
    await db.update(matches).set({ status }).where(eq(matches.id, id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Status update error:', err)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}
