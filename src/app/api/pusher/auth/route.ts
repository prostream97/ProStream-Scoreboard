import { NextRequest, NextResponse } from 'next/server'
import { pusher } from '@/lib/pusher/server'
import { auth } from '@/lib/auth/config'

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

  // Private channels (private-match-*) require operator auth
  if (channel.startsWith('private-') && !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const authResponse = pusher.authorizeChannel(socketId, channel)
    return NextResponse.json(authResponse)
  } catch {
    return NextResponse.json({ error: 'Pusher auth failed' }, { status: 500 })
  }
}
