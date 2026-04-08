'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Monitor, Copy, Check, X, Loader2, Link2 } from 'lucide-react'
import type { Tournament, TournamentWithDetails } from '@/types/tournament'
import {
  AppBadge,
  AppButton,
  AppPage,
  EmptyState,
  PageHeader,
  SurfaceCard,
  appInputClass,
  appLabelClass,
} from '@/components/shared/AppPrimitives'

type TournamentOverlayLink = {
  id: number
  tournamentId: number | null
  matchId: number | null
  token: string
  mode: string
  label: string | null
  isActive: boolean
  createdAt: string
  user?: { username: string; displayName: string }
}

type Props = {
  initialTournaments: Tournament[]
  isAdmin: boolean
}

const PLAN_LABELS: Record<string, string> = {
  tournament: 'Tournament Plan',
  match: 'Match Plan',
  daily: 'Daily Plan',
}

export function OverlayManagerClient({ initialTournaments, isAdmin }: Props) {
  const [tournaments] = useState(initialTournaments)
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(
    initialTournaments[0]?.id ?? null,
  )
  const [tournamentDetail, setTournamentDetail] = useState<TournamentWithDetails | null>(null)
  const [loadingTournament, setLoadingTournament] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const [tournamentLink, setTournamentLink] = useState<TournamentOverlayLink | null>(null)
  const [loadingLink, setLoadingLink] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) {
      fetch('/api/wallet/me')
        .then((r) => r.json())
        .then((d) => setBalance(d.balance))
        .catch(() => {})
    }
  }, [isAdmin])

  useEffect(() => {
    if (!selectedTournamentId) return
    setLoadingTournament(true)
    setTournamentLink(null)

    fetch(`/api/tournaments/${selectedTournamentId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setTournamentDetail(d))
      .catch(() => toast.error('Failed to load tournament'))
      .finally(() => setLoadingTournament(false))

    // Fetch the tournament-level overlay link
    setLoadingLink(true)
    fetch(`/api/overlay-links?tournamentId=${selectedTournamentId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((links: TournamentOverlayLink[]) => {
        const active = links.find((l) => l.isActive && l.matchId === null)
        setTournamentLink(active ?? null)
      })
      .catch(() => {})
      .finally(() => setLoadingLink(false))
  }, [selectedTournamentId])

  function copyUrl(token: string) {
    const url = `${window.location.origin}/overlay/t/${token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token)
      toast.success('URL copied to clipboard')
      setTimeout(() => setCopiedToken(null), 2000)
    })
  }

  async function revokeLink(linkId: number) {
    try {
      const res = await fetch(`/api/overlay-links/${linkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      })
      if (res.ok) {
        setTournamentLink((l) => l ? { ...l, isActive: false } : l)
        toast.success('Link revoked')
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Failed to revoke')
      }
    } catch {
      toast.error('Network error')
    }
  }

  const selectedTournament = tournaments.find((t) => t.id === selectedTournamentId)
  const planType = (selectedTournament as any)?.planType as string | undefined
  const matchLimit = (selectedTournament as any)?.matchLimit as number | undefined
  const matchCount = tournamentDetail?.matches?.length ?? 0

  return (
    <AppPage className="max-w-7xl">
      <PageHeader
        eyebrow="Broadcast links"
        title="Overlay manager"
        description="Generate and copy overlay URLs"
        actions={
          !isAdmin && balance !== null ? (
            <AppBadge tone="green">{balance} LKR available</AppBadge>
          ) : isAdmin ? (
            <AppBadge tone="blue">Admin unlimited</AppBadge>
          ) : null
        }
      />

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        {/* Tournament selector */}
        <SurfaceCard className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ebf5ff] text-[#2d6fb0]">
            <Monitor className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Choose tournament</h2>
            <p className="mt-1 text-sm text-slate-500">Only active tournaments are shown here.</p>
          </div>
          {tournaments.length === 0 ? (
            <EmptyState title="No active tournaments" description="Start by creating or activating a tournament." />
          ) : (
            <div>
              <label className={appLabelClass}>Tournament</label>
              <select
                value={selectedTournamentId ?? ''}
                onChange={(e) => setSelectedTournamentId(parseInt(e.target.value, 10))}
                className={appInputClass}
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.shortName})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Plan info */}
          {planType && (
            <div className="rounded-2xl border border-[#e1e7df] bg-[#f8faf7] p-4 space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Plan</p>
              <AppBadge tone="blue">{PLAN_LABELS[planType] ?? planType}</AppBadge>
              {planType === 'match' && matchLimit !== undefined && (
                <p className="text-sm text-slate-600">
                  {matchCount} / {matchLimit} matches used
                </p>
              )}
            </div>
          )}
        </SurfaceCard>

        {/* Tournament overlay URL */}
        <div className="space-y-4">
          {loadingTournament || loadingLink ? (
            <SurfaceCard>
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#10994c]" />
              </div>
            </SurfaceCard>
          ) : selectedTournamentId ? (
            <SurfaceCard className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef6f0] text-[#10994c]">
                  <Link2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="app-kicker">Tournament overlay URL</p>
                  <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                    Shared broadcast link
                  </h2>
                </div>
              </div>

              <p className="text-sm text-slate-500">
                This single URL automatically shows the currently active match. Use it in OBS or any browser source.
              </p>

              {tournamentLink && tournamentLink.isActive ? (
                <div className="rounded-2xl border border-[#d8e8dc] bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-slate-500 break-all">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/overlay/t/{tournamentLink.token}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => copyUrl(tournamentLink.token)}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef6f0] text-[#10994c] transition hover:bg-[#dff0e4]"
                        title="Copy URL"
                      >
                        {copiedToken === tournamentLink.token ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => revokeLink(tournamentLink.id)}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff1f0] text-[#c54e4c] transition hover:bg-[#ffe5e3]"
                          title="Revoke link"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <AppBadge tone="green">Active</AppBadge>
                    <span className="text-xs text-slate-400">Auto-switches to active match</span>
                  </div>
                </div>
              ) : tournamentLink && !tournamentLink.isActive ? (
                <div className="rounded-2xl border border-[#e7ece6] bg-[#f8faf7] p-4 opacity-60">
                  <p className="text-sm text-slate-500">Overlay URL has been revoked.</p>
                  <AppBadge tone="neutral">Revoked</AppBadge>
                </div>
              ) : (
                <EmptyState
                  title="No overlay URL found"
                  description="The tournament overlay URL is generated automatically when a tournament is created. Contact your admin if missing."
                />
              )}

              {/* Match list — informational only */}
              {tournamentDetail?.matches && tournamentDetail.matches.length > 0 && (
                <div className="space-y-2">
                  <p className="app-kicker">Matches in this tournament</p>
                  {tournamentDetail.matches.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-2xl border border-[#e1e7df] bg-[#f8faf7] px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {m.homeTeam.shortCode} <span className="text-slate-400">vs</span> {m.awayTeam.shortCode}
                        </p>
                        <p className="text-xs text-slate-500">{m.matchLabel ?? 'Match'}</p>
                      </div>
                      <AppBadge tone={m.status === 'active' ? 'green' : 'neutral'}>{m.status}</AppBadge>
                    </div>
                  ))}
                </div>
              )}
            </SurfaceCard>
          ) : null}
        </div>
      </div>
    </AppPage>
  )
}
