import { NextRequest, NextResponse } from 'next/server'
import { pusher } from '@/lib/pusher/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { matches } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await auth()

  const body = await req.text()
  const params = new URLSearchParams(body)
  const socketId = params.get('socket_id')
  const channel = params.get('channel_name')

  if (!socketId || !channel) {
    return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 })
  }

  // Private channels require operator auth + match existence check
  if (channel.startsWith('private-')) {
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify the match referenced by the channel actually exists
    const matchIdStr = channel.replace(/^private-match-/, '')
    const matchId = parseInt(matchIdStr, 10)
    if (!isNaN(matchId)) {
      const match = await db.query.matches.findFirst({ where: eq(matches.id, matchId) })
      if (!match) {
        return NextResponse.json({ error: 'Match not found' }, { status: 404 })
      }
    }
  }

  try {
    const authResponse = pusher.authorizeChannel(socketId, channel)
    return NextResponse.json(authResponse)
  } catch {
    return NextResponse.json({ error: 'Pusher auth failed' }, { status: 500 })
  }
}
