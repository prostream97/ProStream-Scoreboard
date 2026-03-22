'use client'

import { createContext, useContext, useEffect, useRef } from 'react'
import { getPusherClient } from '@/lib/pusher/client'
import type { Channel } from 'pusher-js'
import type { PusherEvents } from '@/types/pusher'

type PusherContextValue = {
  subscribe: (channelName: string) => Channel
}

const PusherContext = createContext<PusherContextValue | null>(null)

export function PusherProvider({ children }: { children: React.ReactNode }) {
  const channelCache = useRef<Map<string, Channel>>(new Map())

  function subscribe(channelName: string): Channel {
    const client = getPusherClient()
    if (!channelCache.current.has(channelName)) {
      channelCache.current.set(channelName, client.subscribe(channelName))
    }
    return channelCache.current.get(channelName)!
  }

  useEffect(() => {
    return () => {
      const client = getPusherClient()
      channelCache.current.forEach((_, name) => client.unsubscribe(name))
      channelCache.current.clear()
    }
  }, [])

  return (
    <PusherContext.Provider value={{ subscribe }}>
      {children}
    </PusherContext.Provider>
  )
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useChannel(channelName: string): Channel | null {
  const ctx = useContext(PusherContext)
  if (!ctx) return null
  return ctx.subscribe(channelName)
}

export function useEvent<K extends keyof PusherEvents>(
  channelName: string,
  event: K,
  handler: (data: PusherEvents[K]) => void
) {
  const channel = useChannel(channelName)
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!channel) return undefined
    const cb = (data: PusherEvents[K]) => handlerRef.current(data)
    channel.bind(event, cb)
    return () => { channel.unbind(event, cb) }
  }, [channel, event])
}
