'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Monitor, Copy, Check, X, ChevronDown, ChevronRight, Loader2, Link2 } from 'lucide-react'
import type { Tournament, TournamentWithDetails, TournamentMatch } from '@/types/tournament'

type OverlayMode = 'bug' | 'card' | 'partnership' | 'boundary' | 'standard'

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
  selectedMode: OverlayMode
  label: string
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
}

const matchStatusColors: Record<string, string> = {
  setup: 'bg-gray-700 text-gray-300',
  active: 'bg-secondary/20 text-secondary border border-secondary/50',
  paused: 'bg-yellow-500/20 text-yellow-400',
  complete: 'bg-gray-700 text-gray-400',
  break: 'bg-orange-500/20 text-orange-400',
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

  // Fetch wallet balance (operators only)
  useEffect(() => {
    if (!isAdmin) {
      fetch('/api/wallet/me')
        .then((r) => r.json())
        .then((d) => setBalance(d.balance))
        .catch(() => {})
    }
    // Fetch pricing for cost display
    fetch('/api/admin/pricing')
      .then((r) => r.json())
      .then((d) => setPricing(d))
      .catch(() => {})
  }, [isAdmin])

  // Load tournament detail on selection change
  useEffect(() => {
    if (!selectedTournamentId) return
    setLoadingTournament(true)
    setMatchPanels({})
    fetch(`/api/tournaments/${selectedTournamentId}`)
      .then((r) => r.json())
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
      selectedMode: 'bug',
      label: '',
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
          mode: panel.selectedMode,
          label: panel.label || undefined,
        }),
      })

      type ErrorBody = { error?: string; required?: number; balance?: number }
      type SuccessBody = { link: OverlayLink; newBalance: number | null }

      let body: ErrorBody | SuccessBody = {}
      try {
        body = await res.json()
      } catch {
        toast.error('Server error — please try again')
        return
      }

      if (!res.ok) {
        const err = body as ErrorBody
        if (res.status === 402) {
          toast.error(`Insufficient credits — need ${err.required} LKR, have ${err.balance} LKR`)
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
        toast.success(`URL generated — balance: ${newBalance} LKR`)
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

  // Group matches by stage
  const matchesByStage = tournamentDetail?.matches.reduce<Record<string, TournamentMatch[]>>(
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
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Monitor className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl text-primary tracking-wider">Overlay Manager</h1>
              <p className="font-stats text-sm text-gray-500">Generate & manage OBS overlay URLs</p>
            </div>
          </div>
          {/* Wallet balance (operators only) */}
          {!isAdmin && balance !== null && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-stats text-sm ${
                insufficientBalance
                  ? 'border-red-500/40 bg-red-500/10 text-red-400'
                  : 'border-primary/30 bg-primary/10 text-primary'
              }`}
            >
              <span className="text-base leading-none">◈</span>
              <span>{balance} LKR</span>
            </div>
          )}
          {isAdmin && (
            <span className="font-stats text-xs text-gray-500 border border-gray-700 px-2.5 py-1 rounded-full">
              Admin · Unlimited
            </span>
          )}
        </div>

        {/* Tournament Selector */}
        {tournaments.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
            <p className="font-stats text-gray-500">No active tournaments found.</p>
          </div>
        ) : (
          <>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <label className="block text-xs font-stats text-gray-400 mb-2 uppercase tracking-wider">
                Tournament
              </label>
              <select
                value={selectedTournamentId ?? ''}
                onChange={(e) => setSelectedTournamentId(parseInt(e.target.value, 10))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-body focus:outline-none focus:border-primary text-sm"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.shortName})
                  </option>
                ))}
              </select>
            </div>

            {/* Match List */}
            {loadingTournament ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : matchesByStage && Object.keys(matchesByStage).length > 0 ? (
              Object.entries(matchesByStage).map(([stage, stageMatches]) => (
                <section key={stage}>
                  <h2 className="font-stats text-xs text-gray-500 uppercase tracking-wider mb-2">
                    {stageLabels[stage] ?? stage}
                  </h2>
                  <div className="space-y-3">
                    {stageMatches.map((match) => {
                      const panel = matchPanels[match.id] ?? initPanel(match.id)
                      return (
                        <div
                          key={match.id}
                          className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden"
                        >
                          {/* Match header — click to expand */}
                          <button
                            onClick={() => toggleExpand(match.id)}
                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 text-left">
                              <span className="font-display text-lg text-white tracking-wide">
                                {match.homeTeam.shortCode}
                                <span className="text-gray-600 mx-1.5 text-base">vs</span>
                                {match.awayTeam.shortCode}
                              </span>
                              {match.matchLabel && (
                                <span className="font-stats text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                                  {match.matchLabel}
                                </span>
                              )}
                              <span
                                className={`font-stats text-xs px-2 py-0.5 rounded-full ${
                                  matchStatusColors[match.status] ?? matchStatusColors.setup
                                }`}
                              >
                                {match.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
                              {panel.links.filter((l) => l.isActive).length > 0 && (
                                <span className="font-stats text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                  {panel.links.filter((l) => l.isActive).length} active
                                </span>
                              )}
                              {panel.expanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </div>
                          </button>

                          {/* Expanded panel */}
                          {panel.expanded && (
                            <div className="border-t border-gray-800 px-5 py-4 space-y-4">
                              {/* Generate form */}
                              <div className="flex items-end gap-3">
                                <div className="flex-1">
                                  <label className="block text-xs font-stats text-gray-400 mb-1 uppercase tracking-wider">
                                    Mode
                                  </label>
                                  <select
                                    value={panel.selectedMode}
                                    onChange={(e) =>
                                      updatePanel(match.id, {
                                        selectedMode: e.target.value as OverlayMode,
                                      })
                                    }
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-body text-sm focus:outline-none focus:border-primary"
                                  >
                                    {(Object.keys(MODE_LABELS) as OverlayMode[]).map((m) => (
                                      <option key={m} value={m}>
                                        {MODE_LABELS[m]}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex-1">
                                  <label className="block text-xs font-stats text-gray-400 mb-1 uppercase tracking-wider">
                                    Label (optional)
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. OBS Main"
                                    value={panel.label}
                                    onChange={(e) =>
                                      updatePanel(match.id, { label: e.target.value })
                                    }
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-body text-sm focus:outline-none focus:border-primary placeholder-gray-600"
                                  />
                                </div>
                                <button
                                  onClick={() => generateUrl(match.id)}
                                  disabled={panel.generating || insufficientBalance}
                                  title={
                                    insufficientBalance
                                      ? `Insufficient credits (need ${pricing.overlay_per_match} LKR)`
                                      : undefined
                                  }
                                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white font-stats text-sm rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                  {panel.generating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Link2 className="w-4 h-4" />
                                  )}
                                  {isAdmin
                                    ? 'Generate URL'
                                    : `Generate · ${pricing.overlay_per_match} LKR`}
                                </button>
                              </div>

                              {/* Existing links */}
                              {panel.loading ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                                </div>
                              ) : panel.links.length > 0 ? (
                                <div className="space-y-2">
                                  <p className="text-xs font-stats text-gray-500 uppercase tracking-wider">
                                    Generated URLs
                                  </p>
                                  {panel.links.map((link) => (
                                    <div
                                      key={link.id}
                                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                                        link.isActive
                                          ? 'bg-gray-800 border-gray-700'
                                          : 'bg-gray-900 border-gray-800 opacity-50'
                                      }`}
                                    >
                                      <span
                                        className={`font-stats text-xs px-2 py-0.5 rounded-full border ${
                                          link.isActive
                                            ? 'bg-primary/10 text-primary border-primary/20'
                                            : 'bg-gray-800 text-gray-500 border-gray-700'
                                        }`}
                                      >
                                        {MODE_LABELS[link.mode] ?? link.mode}
                                      </span>
                                      {link.label && (
                                        <span className="font-stats text-xs text-gray-400">
                                          {link.label}
                                        </span>
                                      )}
                                      <span className="font-mono text-xs text-gray-500 flex-1 truncate">
                                        /overlay/t/{link.token.slice(0, 12)}…
                                      </span>
                                      {isAdmin && link.user && (
                                        <span className="font-stats text-xs text-gray-600">
                                          {link.user.username}
                                        </span>
                                      )}
                                      {link.isActive && (
                                        <>
                                          <button
                                            onClick={() => copyUrl(link.token)}
                                            className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                                            title="Copy URL"
                                          >
                                            {copiedToken === link.token ? (
                                              <Check className="w-3.5 h-3.5 text-secondary" />
                                            ) : (
                                              <Copy className="w-3.5 h-3.5" />
                                            )}
                                          </button>
                                          <button
                                            onClick={() => revokeLink(match.id, link.id)}
                                            className="p-1.5 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                                            title="Revoke link"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      )}
                                      {!link.isActive && (
                                        <span className="font-stats text-xs text-gray-600">
                                          Revoked
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs font-stats text-gray-600 text-center py-2">
                                  No overlay URLs generated yet for this match.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))
            ) : tournamentDetail ? (
              <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
                <p className="font-stats text-gray-500">No matches in this tournament yet.</p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}
