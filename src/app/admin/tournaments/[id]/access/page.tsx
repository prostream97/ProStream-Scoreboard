'use client'

import { use, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ShieldCheck } from 'lucide-react'
import { TournamentNav } from '@/components/shared/TournamentNav'
import { TournamentAccessSection } from '@/components/tournament/TournamentAccessSection'
import {
  AppPage,
  EmptyState,
  SurfaceCard,
} from '@/components/shared/AppPrimitives'
import type { TournamentUserSummary } from '@/types/tournament'

type AccessPayload = {
  owner: TournamentUserSummary | null
  operators: TournamentUserSummary[]
  availableOperators: TournamentUserSummary[]
}

export default function TournamentAccessPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const tournamentId = parseInt(id, 10)
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated'
  const isAdmin = isAuthenticated && session?.user?.role === 'admin'

  const [access, setAccess] = useState<AccessPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) return

    fetch(`/api/tournaments/${tournamentId}/access`)
      .then((r) => r.ok ? r.json() : null)
      .then((a) => { if (a) setAccess(a) })
      .finally(() => setLoading(false))
  }, [isAuthenticated, tournamentId])

  const canManage = isAdmin || (
    access?.owner !== null &&
    session?.user?.id !== undefined &&
    String(access?.owner?.id) === session?.user?.id
  )

  return (
    <AppPage className="space-y-6">

      <TournamentNav tournamentId={tournamentId} />

      {loading ? (
        <SurfaceCard>
          <p className="py-12 text-center text-sm text-slate-500">Loading access data...</p>
        </SurfaceCard>
      ) : !isAuthenticated ? (
        <EmptyState title="Not authenticated" description="Please log in to manage tournament access." />
      ) : access ? (
        <TournamentAccessSection
          tournamentId={tournamentId}
          initialOwner={access.owner}
          initialOperators={access.operators}
          canManage={!!canManage}
        />
      ) : (
        <SurfaceCard>
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <ShieldCheck className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">Failed to load access data.</p>
          </div>
        </SurfaceCard>
      )}
    </AppPage>
  )
}
