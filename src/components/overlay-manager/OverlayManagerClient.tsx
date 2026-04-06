'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Monitor, Copy, Check, X, ChevronDown, ChevronRight, Loader2, Link2 } from 'lucide-react'
import type { Tournament, TournamentWithDetails, TournamentMatch } from '@/types/tournament'
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

type OverlayMode = 'bug' | 'card' | 'partnership' | 'boundary' | 'standard' | 'icc2023'

type OverlayLink = {
  id: number
  matchId: number
  token: string
  mode: OverlayMode
  label: string | null
  isActive: boolean
  createdAt: string
  user?: { username: string; displayName: string }
}

type MatchPanelState = {
  links: OverlayLink[]
  loading: boolean
  generating: boolean
  expanded: boolean
  label: string
  selectedMode: OverlayMode
}

type Props = {
  initialTournaments: Tournament[]
  isAdmin: boolean
}

const MODE_LABELS: Record<OverlayMode, string> = {
  bug: 'Score Bug',
  card: 'Player Card',
  partnership: 'Partnership',
  boundary: 'Boundary Alert',
  standard: 'Standard',
  icc2023: 'ICC World Cup 2023',
}

const stageLabels: Record<string, string> = {
  group: 'Group Stage',
  quarter_final: 'Quarter Final',
  semi_final: 'Semi Final',
  final: 'Final',
  third_place: 'Third Place',
}

export function OverlayManagerClient({ initialTournaments, isAdmin }: Props) {
  const [tournaments] = useState(initialTournaments)
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(
    initialTournaments[0]?.id ?? null,
  )
  const [tournamentDetail, setTournamentDetail] = useState<TournamentWithDetails | null>(null)
  const [loadingTournament, setLoadingTournament] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const [pricing, setPricing] = useState<{ overlay_per_match: number }>({ overlay_per_match: 100 })
  const [matchPanels, setMatchPanels] = useState<Record<number, MatchPanelState>>({})
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) {
      fetch('/api/wallet/me')
        .then((r) => r.json())
        .then((d) => setBalance(d.balance))
        .catch(() => {})
    }
    fetch('/api/admin/pricing')
      .then((r) => r.json())
      .then((d) => setPricing(d))
      .catch(() => {})
  }, [isAdmin])

  useEffect(() => {
    if (!selectedTournamentId) return
    setLoadingTournament(true)
    setMatchPanels({})
    fetch(`/api/tournaments/${selectedTournamentId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setTournamentDetail(d))
      .catch(() => toast.error('Failed to load tournament'))
      .finally(() => setLoadingTournament(false))
  }, [selectedTournamentId])

  function initPanel(matchId: number): MatchPanelState {
    return {
      links: [],
      loading: false,
      generating: false,
      expanded: false,
      label: '',
      selectedMode: 'standard',
    }
  }

  function updatePanel(matchId: number, patch: Partial<MatchPanelState>) {
    setMatchPanels((prev) => ({
      ...prev,
      [matchId]: { ...(prev[matchId] ?? initPanel(matchId)), ...patch },
    }))
  }

  async function toggleExpand(matchId: number) {
    const current = matchPanels[matchId] ?? initPanel(matchId)
    const nowExpanded = !current.expanded
    updatePanel(matchId, { expanded: nowExpanded })

    if (nowExpanded && current.links.length === 0) {
      updatePanel(matchId, { loading: true })
      try {
        const res = await fetch(`/api/overlay-links?matchId=${matchId}`)
        const data: OverlayLink[] = await res.json()
        updatePanel(matchId, { links: data, loading: false })
      } catch {
        updatePanel(matchId, { loading: false })
        toast.error('Failed to load overlay links')
      }
    }
  }

  async function generateUrl(matchId: number) {
    const panel = matchPanels[matchId] ?? initPanel(matchId)
    updatePanel(matchId, { generating: true })

    try {
      const res = await fetch('/api/overlay-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          mode: panel.selectedMode ?? 'standard',
          label: panel.label || undefined,
        }),
      })

      type ErrorBody = { error?: string; required?: number; balance?: number }
      type SuccessBody = { link: OverlayLink; newBalance: number | null }

      let body: ErrorBody | SuccessBody = {}
      try {
        body = await res.json()
      } catch {
        toast.error('Server error - please try again')
        return
      }

      if (!res.ok) {
        const err = body as ErrorBody
        if (res.status === 402) {
          toast.error(`Insufficient credits - need ${err.required} LKR, have ${err.balance} LKR`)
        } else {
          toast.error(err.error ?? 'Failed to generate URL')
        }
        return
      }

      const { link, newBalance } = body as SuccessBody
      updatePanel(matchId, {
        links: [{ ...link }, ...(matchPanels[matchId]?.links ?? [])],
        label: '',
      })

      if (newBalance !== null && newBalance !== undefined) {
        setBalance(newBalance)
        toast.success(`URL generated - balance: ${newBalance} LKR`)
      } else {
        toast.success('Overlay URL generated')
      }
    } catch {
      toast.error('Network error')
    } finally {
      updatePanel(matchId, { generating: false })
    }
  }

  async function revokeLink(matchId: number, linkId: number) {
    try {
      const res = await fetch(`/api/overlay-links/${linkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      })
      if (res.ok) {
        updatePanel(matchId, {
          links: (matchPanels[matchId]?.links ?? []).map((l) =>
            l.id === linkId ? { ...l, isActive: false } : l,
          ),
        })
        toast.success('Link revoked')
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Failed to revoke')
      }
    } catch {
      toast.error('Network error')
    }
  }

  function copyUrl(token: string) {
    const url = `${window.location.origin}/overlay/t/${token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2000)
    })
  }

  const matchesByStage = tournamentDetail?.matches?.reduce<Record<string, TournamentMatch[]>>(
    (acc, m) => {
      const key = m.matchStage ?? 'group'
      ;(acc[key] ??= []).push(m)
      return acc
    },
    {},
  )

  const insufficientBalance =
    !isAdmin && balance !== null && balance < pricing.overlay_per_match

  return (
    <AppPage className="max-w-7xl">
      <PageHeader
        eyebrow="Broadcast links"
        title="Overlay manager for active tournaments"
        description="Generate, copy, and revoke overlay URLs with the redesigned app shell while preserving the existing pricing and link lifecycle."
        actions={
          !isAdmin && balance !== null ? (
            <AppBadge tone={insufficientBalance ? 'red' : 'green'}>{balance} LKR available</AppBadge>
          ) : isAdmin ? (
            <AppBadge tone="blue">Admin unlimited</AppBadge>
          ) : null
        }
      />

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
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
        </SurfaceCard>

        <div className="space-y-4">
          {loadingTournament ? (
            <SurfaceCard>
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#10994c]" />
              </div>
            </SurfaceCard>
          ) : matchesByStage && Object.keys(matchesByStage).length > 0 ? (
            Object.entries(matchesByStage).map(([stage, stageMatches]) => (
              <SurfaceCard key={stage} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="app-kicker">Stage</p>
                    <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">{stageLabels[stage] ?? stage}</h2>
                  </div>
                  <AppBadge tone="neutral">{stageMatches.length} matches</AppBadge>
                </div>

                <div className="space-y-3">
                  {stageMatches.map((match) => {
                    const panel = matchPanels[match.id] ?? initPanel(match.id)
                    const activeCount = panel.links.filter((l) => l.isActive).length
                    return (
                      <div key={match.id} className="rounded-[1.5rem] border border-[#e1e7df] bg-[#f8faf7]">
                        <button
                          onClick={() => toggleExpand(match.id)}
                          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                        >
                          <div>
                            <p className="text-lg font-semibold tracking-[-0.03em] text-slate-950">
                              {match.homeTeam.shortCode} <span className="text-slate-300">vs</span> {match.awayTeam.shortCode}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {match.matchLabel ?? 'Match'} . {match.status}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {activeCount > 0 ? <AppBadge tone="green">{activeCount} active</AppBadge> : null}
                            {panel.expanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                          </div>
                        </button>

                        {panel.expanded ? (
                          <div className="space-y-4 border-t border-[#e1e7df] px-5 py-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                              <div className="flex-1">
                                <label className={appLabelClass}>Label (optional)</label>
                                <input
                                  type="text"
                                  placeholder="e.g. OBS Main"
                                  value={panel.label}
                                  onChange={(e) => updatePanel(match.id, { label: e.target.value })}
                                  className={appInputClass}
                                />
                              </div>
                              <div>
                                <label className={appLabelClass}>Theme</label>
                                <select
                                  value={panel.selectedMode ?? 'standard'}
                                  onChange={(e) => updatePanel(match.id, { selectedMode: e.target.value as OverlayMode })}
                                  className={appInputClass}
                                >
                                  <option value="standard">Standard</option>
                                  <option value="icc2023">ICC World Cup 2023</option>
                                </select>
                              </div>
                              <AppButton
                                onClick={() => generateUrl(match.id)}
                                disabled={panel.generating || insufficientBalance}
                                title={insufficientBalance ? `Insufficient credits (need ${pricing.overlay_per_match} LKR)` : undefined}
                              >
                                {panel.generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                                {isAdmin ? 'Generate URL' : `Generate - ${pricing.overlay_per_match} LKR`}
                              </AppButton>
                            </div>

                            {panel.loading ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                              </div>
                            ) : panel.links.length > 0 ? (
                              <div className="space-y-2">
                                {panel.links.map((link) => (
                                  <div
                                    key={link.id}
                                    className={`flex flex-col gap-3 rounded-[1.25rem] border px-4 py-3 sm:flex-row sm:items-center ${
                                      link.isActive ? 'border-[#d8e8dc] bg-white' : 'border-[#e7ece6] bg-[#f8faf7] opacity-60'
                                    }`}
                                  >
                                    <div className="flex flex-1 flex-wrap items-center gap-2">
                                      <AppBadge tone={link.isActive ? 'green' : 'neutral'}>{MODE_LABELS[link.mode] ?? link.mode}</AppBadge>
                                      {link.label ? <span className="text-sm text-slate-600">{link.label}</span> : null}
                                      <span className="font-mono text-xs text-slate-500">/overlay/t/{link.token.slice(0, 12)}...</span>
                                      {isAdmin && link.user ? <span className="text-xs text-slate-400">{link.user.username}</span> : null}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {link.isActive ? (
                                        <>
                                          <button onClick={() => copyUrl(link.token)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef6f0] text-[#10994c] transition hover:bg-[#dff0e4]" title="Copy URL">
                                            {copiedToken === link.token ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                          </button>
                                          <button onClick={() => revokeLink(match.id, link.id)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff1f0] text-[#c54e4c] transition hover:bg-[#ffe5e3]" title="Revoke link">
                                            <X className="h-4 w-4" />
                                          </button>
                                        </>
                                      ) : (
                                        <AppBadge tone="neutral">Revoked</AppBadge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <EmptyState title="No URLs generated yet" description="Generate an overlay URL for this match to start using it in OBS or browser sources." />
                            )}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </SurfaceCard>
            ))
          ) : tournamentDetail ? (
            <EmptyState title="No matches yet" description="This tournament does not have matches available for overlay generation yet." />
          ) : null}
        </div>
      </div>
    </AppPage>
  )
}
