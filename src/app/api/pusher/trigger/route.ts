import { NextRequest, NextResponse } from 'next/server'
import { pusher } from '@/lib/pusher/server'
import { auth } from '@/lib/auth/config'

export const runtime = 'nodejs'

const ALLOWED_EVENTS = new Set([
  'delivery.added',
  'wicket.fell',
  'innings.change',
  'over.complete',
  'break.start',
  'break.end',
  'match.status',
  'display.toggle',
])

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { matchId, event, payload } = await req.json()

  if (!matchId || !event || !payload) {
    return NextResponse.json({ error: 'Missing matchId, event, or payload' }, { status: 400 })
  }

  if (!ALLOWED_EVENTS.has(event)) {
    return NextResponse.json({ error: `Unknown event: ${event}` }, { status: 400 })
  }

  try {
    await pusher.trigger(`match-${matchId}`, event, payload)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Pusher trigger error:', err)
    return NextResponse.json({ error: 'Pusher trigger failed' }, { status: 500 })
  }
}
