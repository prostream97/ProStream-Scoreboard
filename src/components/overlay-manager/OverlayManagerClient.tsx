'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Monitor, Copy, Check, X, Loader2, Link2, Maximize2 } from 'lucide-react'
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

// Overlays are always transparent — no background colors.
// The checkered pattern represents transparency (like Figma/Photoshop).
const TRANSPARENT_PREVIEW_STYLE = {
  background: 'repeating-conic-gradient(#cbd5c0 0% 25%, #e8eee6 0% 50%) 0 0 / 20px 20px',
}

const OVERLAY_THEMES = [
  {
    mode: 'standard',
    name: 'Standard',
    description: 'Clean, minimal scorebug for general broadcast use.',
    accentColor: '#10994c',
    accentBg: '#eef8f1',
  },
  {
    mode: 'standard1',
    name: 'Standard 1',
    description: 'Modern broadcast theme with enhanced player cards, squad displays, and team vs team intro.',
    accentColor: '#0066cc',
    accentBg: '#e8f2ff',
  },
  {
    mode: 'icc2023',
    name: 'ICC World Cup 2023',
    description: 'Official ICC Cricket World Cup 2023 branded theme with purple and pink accents.',
    accentColor: '#FD02A3',
    accentBg: '#f9eeff',
  },
]

export function OverlayManagerClient({ initialTournaments, isAdmin }: Props) {
  const [tournaments] = useState(initialTournaments)
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(
    initialTournaments[0]?.id ?? null,
  )
  const [tournamentDetail, setTournamentDetail] = useState<TournamentWithDetails | null>(null)
  const [loadingTournament, setLoadingTournament] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const [libraryLinks, setLibraryLinks] = useState<Record<string, TournamentOverlayLink>>({})
  const [loadingLinks, setLoadingLinks] = useState(false)
  const [generatingMode, setGeneratingMode] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [selectedMode, setSelectedMode] = useState<string>(OVERLAY_THEMES[0].mode)
  const [lightboxMode, setLightboxMode] = useState<string | null>(null)

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
    setLibraryLinks({})

    fetch(`/api/tournaments/${selectedTournamentId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setTournamentDetail(d))
      .catch(() => toast.error('Failed to load tournament'))
      .finally(() => setLoadingTournament(false))

    setLoadingLinks(true)
    fetch(`/api/overlay-links?tournamentId=${selectedTournamentId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((links: TournamentOverlayLink[]) => {
        const map: Record<string, TournamentOverlayLink> = {}
        links.filter((l) => l.matchId === null && l.isActive).forEach((l) => {
          map[l.mode] = l
        })
        setLibraryLinks(map)
      })
      .catch(() => {})
      .finally(() => setLoadingLinks(false))
  }, [selectedTournamentId])

  function copyUrl(token: string) {
    const url = `${window.location.origin}/overlay/t/${token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token)
      toast.success('URL copied to clipboard')
      setTimeout(() => setCopiedToken(null), 2000)
    })
  }

  async function generateLibraryLink(mode: string) {
    if (!selectedTournamentId) return
    setGeneratingMode(mode)
    try {
      const res = await fetch('/api/overlay-links/tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: selectedTournamentId, mode }),
      })
      const data = await res.json()
      if (res.ok) {
        setLibraryLinks((prev) => ({ ...prev, [mode]: data.link }))
        toast.success('Overlay URL generated')
      } else {
        toast.error(data.error ?? 'Failed to generate overlay URL')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setGeneratingMode(null)
    }
  }

  async function revokeLink(linkId: number, mode: string) {
    try {
      const res = await fetch(`/api/overlay-links/${linkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      })
      if (res.ok) {
        setLibraryLinks((prev) => {
          const next = { ...prev }
          delete next[mode]
          return next
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

  const selectedTournament = tournaments.find((t) => t.id === selectedTournamentId)
  const planType = (selectedTournament as any)?.planType as string | undefined
  const matchLimit = (selectedTournament as any)?.matchLimit as number | undefined
  const matchCount = tournamentDetail?.matches?.length ?? 0
  const activeTheme = OVERLAY_THEMES.find((t) => t.mode === selectedMode)!
  const activeLink = libraryLinks[selectedMode]
  const lightboxTheme = OVERLAY_THEMES.find((t) => t.mode === lightboxMode)

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

        {/* Match list */}
        {selectedTournamentId && !loadingTournament && tournamentDetail?.matches && tournamentDetail.matches.length > 0 && (
          <SurfaceCard className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef6f0] text-[#10994c]">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <p className="app-kicker">Matches</p>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">In this tournament</h2>
              </div>
            </div>
            <div className="space-y-2">
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
          </SurfaceCard>
        )}
      </div>

      {/* Overlay Library */}
      {selectedTournamentId && !loadingTournament && (
        <section className="space-y-6">
          <div>
            <p className="app-kicker">Overlay library</p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Choose a theme</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select a theme to preview it and generate its broadcast URL. Add the URL to OBS as a browser source at 1920×1080.
            </p>
          </div>

          {loadingLinks ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#10994c]" />
            </div>
          ) : (
            <>
              {/* Theme cards */}
              <div className="grid gap-4 sm:grid-cols-2">
                {OVERLAY_THEMES.map((theme) => {
                  const isSelected = selectedMode === theme.mode
                  const hasLink = !!libraryLinks[theme.mode]
                  return (
                    <div
                      key={theme.mode}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedMode(theme.mode)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedMode(theme.mode) }}
                      className={`group relative overflow-hidden rounded-[1.8rem] border-2 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'shadow-[0_0_0_3px_rgba(0,0,0,0.08)]'
                          : 'border-[#e1e7df] hover:border-[#c8d4c6]'
                      }`}
                      style={isSelected ? { borderColor: theme.accentColor } : {}}
                    >
                      {/* Preview image area — 16:9 */}
                      <div
                        className="relative w-full"
                        style={{ aspectRatio: '16/9', ...TRANSPARENT_PREVIEW_STYLE }}
                      >
                        {/* Placeholder overlay graphic */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
                          <div
                            className="rounded-lg px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/80"
                            style={{ backgroundColor: `${theme.accentColor}33`, border: `1px solid ${theme.accentColor}55` }}
                          >
                            {theme.name}
                          </div>
                          <p className="text-[0.65rem] font-mono text-white/30 mt-1">1920 × 1080</p>
                          {/* Mock scorebug bar at bottom */}
                          <div
                            className="absolute bottom-4 left-4 right-4 h-10 rounded-lg opacity-60"
                            style={{ backgroundColor: theme.accentColor, opacity: 0.15, border: `1px solid ${theme.accentColor}` }}
                          />
                        </div>

                        {/* Maximize button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setLightboxMode(theme.mode) }}
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/60"
                          title="Preview full size"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Active link badge */}
                        {hasLink && (
                          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#10994c]" />
                            <span className="text-[0.6rem] font-semibold text-white">Active</span>
                          </div>
                        )}
                      </div>

                      {/* Card footer */}
                      <div className="flex items-center gap-3 bg-white p-4">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                          style={{ backgroundColor: theme.accentBg }}
                        >
                          <Monitor className="h-4 w-4" style={{ color: theme.accentColor }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-950">{theme.name}</p>
                          <p className="truncate text-xs text-slate-500">{theme.description}</p>
                        </div>
                        {isSelected && (
                          <div
                            className="ml-auto shrink-0 flex h-5 w-5 items-center justify-center rounded-full"
                            style={{ backgroundColor: theme.accentColor }}
                          >
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Generate URL — common panel for selected theme */}
              <SurfaceCard className="space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: activeTheme.accentBg }}
                  >
                    <Link2 className="h-5 w-5" style={{ color: activeTheme.accentColor }} />
                  </div>
                  <div>
                    <p className="app-kicker">Overlay URL</p>
                    <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                      {activeTheme.name}
                    </h3>
                  </div>
                </div>

                <p className="text-sm text-slate-500">
                  This URL auto-switches to the active match in the selected tournament. Add it to OBS as a browser source (1920×1080).
                </p>

                {activeLink ? (
                  <div className="rounded-2xl border border-[#d8e8dc] bg-white p-4 space-y-3">
                    <p className="font-mono text-xs text-slate-500 break-all">
                      {typeof window !== 'undefined' ? window.location.origin : ''}/overlay/t/{activeLink.token}
                    </p>
                    <div className="flex items-center justify-between">
                      <AppBadge tone="green">Active</AppBadge>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyUrl(activeLink.token)}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef6f0] text-[#10994c] transition hover:bg-[#dff0e4]"
                          title="Copy URL"
                        >
                          {copiedToken === activeLink.token ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => revokeLink(activeLink.id, selectedMode)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff1f0] text-[#c54e4c] transition hover:bg-[#ffe5e3]"
                            title="Revoke link"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <AppButton
                    type="button"
                    onClick={() => generateLibraryLink(selectedMode)}
                    disabled={generatingMode === selectedMode}
                  >
                    {generatingMode === selectedMode ? 'Generating...' : `Generate ${activeTheme.name} URL`}
                  </AppButton>
                )}
              </SurfaceCard>
            </>
          )}
        </section>
      )}

      {/* Lightbox */}
      {lightboxMode && lightboxTheme && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setLightboxMode(null)}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-2xl shadow-2xl"
            style={{ aspectRatio: '16/9' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Full-size preview placeholder */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-4"
              style={TRANSPARENT_PREVIEW_STYLE}
            >
              <div
                className="rounded-xl px-6 py-2 text-sm font-semibold uppercase tracking-widest text-white/80"
                style={{ backgroundColor: `${lightboxTheme.accentColor}33`, border: `1px solid ${lightboxTheme.accentColor}66` }}
              >
                {lightboxTheme.name}
              </div>
              <p className="text-xs font-mono text-white/30">1920 × 1080 — Preview placeholder</p>
              <p className="text-xs text-white/20">Actual overlay preview will appear here</p>
              {/* Mock scorebug */}
              <div className="absolute bottom-8 left-8 right-8 flex items-center gap-4">
                <div
                  className="h-14 flex-1 rounded-xl opacity-20"
                  style={{ backgroundColor: lightboxTheme.accentColor, border: `1px solid ${lightboxTheme.accentColor}` }}
                />
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => setLightboxMode(null)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Theme label */}
            <div className="absolute left-3 top-3 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white">
              {lightboxTheme.name}
            </div>
          </div>
        </div>
      )}
    </AppPage>
  )
}
