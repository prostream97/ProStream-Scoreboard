'use client'

import PusherClient from 'pusher-js'

// Module-level singleton — prevents reconnection on re-renders
let pusherClient: PusherClient | null = null

export function getPusherClient(): PusherClient {
  if (!pusherClient) {
    pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
    })
  }
  return pusherClient
}
