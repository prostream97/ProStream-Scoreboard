'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { TournamentNav } from '@/components/shared/TournamentNav'
import type { TournamentWithDetails, StandingRow, TournamentMatch, MatchStage } from '@/types/tournament'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

const statusColors: Record<string, string> = {
  upcoming: 'bg-gray-700 text-gray-300',
  group_stage: 'bg-blue-500/20 text-blue-400 border border-blue-500/50',
  knockout: 'bg-orange-500/20 text-orange-400 border border-orange-500/50',
  complete: 'bg-gray-700 text-gray-400',
}

const matchStageBadge: Record<string, string> = {
  group: 'bg-gray-700 text-gray-400',
  quarter_final: 'bg-purple-500/20 text-purple-400',
  semi_final: 'bg-blue-500/20 text-blue-400',
  final: 'bg-yellow-500/20 text-yellow-400',
  third_place: 'bg-gray-600 text-gray-300',
}

const matchStatusColors: Record<string, string> = {
  setup: 'bg-gray-700 text-gray-300',
  active: 'bg-secondary/20 text-secondary border border-secondary/50',
  paused: 'bg-yellow-500/20 text-yellow-400',
  complete: 'bg-gray-700 text-gray-400',
  break: 'bg-orange-500/20 text-orange-400',
}

const MATCH_STAGES: { value: MatchStage; label: string }[] = [
  { value: 'group', label: 'Group Stage' },
  { value: 'quarter_final', label: 'Quarter Final' },
  { value: 'semi_final', label: 'Semi Final' },
  { value: 'final', label: 'Final' },
  { value: 'third_place', label: 'Third Place' },
]


const emptyMatchForm = {
  homeTeamId: '',
  awayTeamId: '',
  venue: '',
  date: '',
  matchStage: 'group' as MatchStage,
  matchLabel: '',
  tossWinnerId: '',
  tossDecision: '' as 'bat' | 'field' | '',
}

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const tournamentId = parseInt(id, 10)
  const { status } = useSession()
  const isAuthed = status === 'authenticated'

  const [tournament, setTournament] = useState<TournamentWithDetails | null>(null)
  const [standings, setStandings] = useState<StandingRow[]>([])
  const [loading, setLoading] = useState(true)

  // Add match form
  const [showMatchForm, setShowMatchForm] = useState(false)
  const [matchForm, setMatchForm] = useState(emptyMatchForm)
  const [addingMatch, setAddingMatch] = useState(false)
  const [matchError, setMatchError] = useState('')

  async function load() {
    const [tRes, sRes] = await Promise.all([
      fetch(`/api/tournaments/${tournamentId}`),
      fetch(`/api/tournaments/${tournamentId}/standings`),
    ])
    if (tRes.ok) setTournament(await tRes.json())
    if (sRes.ok) setStandings(await sRes.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [tournamentId])

  async function handleStatusChange(newStatus: string) {
    const res = await fetch(`/api/tournaments/${tournamentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) setTournament((t) => t ? { ...t, status: newStatus as TournamentWithDetails['status'] } : t)
  }

  function handleMatchFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setMatchForm((f) => ({ ...f, [name]: value }))
  }

  async function handleAddMatch(e: React.FormEvent) {
    e.preventDefault()
    setMatchError('')
    setAddingMatch(true)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeamId: parseInt(matchForm.homeTeamId, 10),
          awayTeamId: parseInt(matchForm.awayTeamId, 10),
          venue: matchForm.venue || null,
          date: matchForm.date || null,
          matchStage: matchForm.matchStage,
          matchLabel: matchForm.matchLabel || null,
          tossWinnerId: matchForm.tossWinnerId ? parseInt(matchForm.tossWinnerId, 10) : null,
          tossDecision: matchForm.tossDecision || null,
        }),
      })
      if (res.ok) {
        setMatchForm(emptyMatchForm)
        setShowMatchForm(false)
        await load()
      } else {
        const data = await res.json()
        setMatchError(data.error ?? 'Failed to create match')
      }
    } finally {
      setAddingMatch(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 p-8 flex items-center justify-center">
        <p className="font-stats text-gray-500">Loading...</p>
      </main>
    )
  }

  if (!tournament) {
    return (
      <main className="min-h-screen bg-gray-950 p-8">
        <p className="font-stats text-gray-400">Tournament not found.</p>
        <Link href="/admin/tournaments" className="text-primary hover:underline font-stats text-sm mt-2 inline-block">← Back</Link>
      </main>
    )
  }

  const tossTeams = [
    ...(matchForm.homeTeamId ? tournament.teams.filter((t) => t.id === parseInt(matchForm.homeTeamId, 10)) : []),
    ...(matchForm.awayTeamId ? tournament.teams.filter((t) => t.id === parseInt(matchForm.awayTeamId, 10)) : []),
  ]

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-body focus:outline-none focus:border-primary text-sm'
  const labelCls = 'block text-xs font-stats text-gray-400 mb-1 uppercase tracking-wider'

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 font-stats text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-300 transition-colors">Dashboard</Link>
          <span>/</span>
          <Link href="/admin/tournaments" className="hover:text-gray-300 transition-colors">Tournaments</Link>
          <span>/</span>
          <span className="text-gray-300">{tournament.name}</span>
        </div>

        {/* ── Tab nav ── */}
        <TournamentNav tournamentId={tournamentId} />

        {/* ── Header ── */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-display text-4xl text-primary tracking-wider">{tournament.name}</h1>
                <span className="font-display text-sm tracking-wider text-gray-500 bg-gray-800 px-2 py-1 rounded">
                  {tournament.shortName}
                </span>
                <span className="font-stats text-xs text-gray-600 bg-gray-800/60 px-2 py-1 rounded font-mono">
                  TRN-{tournament.id.toString().padStart(3, '0')}
                </span>
              </div>
              <p className="font-stats text-sm text-gray-400 mt-1">
                {tournament.format} · {tournament.totalOvers} overs
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={`font-stats text-xs px-2.5 py-1 rounded-full uppercase tracking-wider ${statusColors[tournament.status] ?? statusColors.upcoming}`}>
                {tournament.status.replace('_', ' ')}
              </span>
              {isAuthed && (
                <select
                  value={tournament.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-300 font-stats text-xs focus:outline-none focus:border-primary"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="group_stage">Group Stage</option>
                  <option value="knockout">Knockout</option>
                  <option value="complete">Complete</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {/* ── Teams ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-stats font-semibold text-gray-300 text-sm uppercase tracking-wider">
              Teams ({tournament.teams.length})
            </h2>
            <Link
              href={`/admin/tournaments/${tournamentId}/teams`}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 font-stats text-sm rounded-lg hover:bg-gray-700 transition-colors"
            >
              Manage Teams →
            </Link>
          </div>

          {tournament.teams.length === 0 ? (
            <p className="font-stats text-xs text-gray-600">
              No teams yet.{' '}
              <Link href={`/admin/tournaments/${tournamentId}/teams`} className="text-primary hover:underline">
                Add teams
              </Link>{' '}
              to get started.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tournament.teams.map((team) => (
                <div key={team.id} className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
                  {team.logoCloudinaryId ? (
                    <img
                      src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_24,h_24,f_webp/${team.logoCloudinaryId}`}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: team.primaryColor }} />
                  )}
                  <span className="font-display text-sm tracking-wider" style={{ color: team.primaryColor }}>{team.shortCode}</span>
                  <span className="font-stats text-xs text-gray-300">{team.name}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Standings ── */}
        {tournament.status !== 'upcoming' && (
          <section>
            <h2 className="font-stats font-semibold text-gray-300 text-sm uppercase tracking-wider mb-3">
              Standings
            </h2>
            {standings.length === 0 ? (
              <p className="font-stats text-xs text-gray-600">No group matches completed yet.</p>
            ) : (
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left px-4 py-3 font-stats text-xs text-gray-400 uppercase tracking-wider w-6">#</th>
                      <th className="text-left px-4 py-3 font-stats text-xs text-gray-400 uppercase tracking-wider">Team</th>
                      <th className="text-center px-3 py-3 font-stats text-xs text-gray-400 uppercase tracking-wider">P</th>
                      <th className="text-center px-3 py-3 font-stats text-xs text-gray-400 uppercase tracking-wider">W</th>
                      <th className="text-center px-3 py-3 font-stats text-xs text-gray-400 uppercase tracking-wider">L</th>
                      <th className="text-center px-3 py-3 font-stats text-xs text-gray-400 uppercase tracking-wider">T</th>
                      <th className="text-center px-3 py-3 font-stats text-xs text-gray-400 uppercase tracking-wider">Pts</th>
                      <th className="text-right px-4 py-3 font-stats text-xs text-gray-400 uppercase tracking-wider">NRR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row, i) => (
                      <tr key={row.teamId} className="border-t border-gray-800">
                        <td className="px-4 py-3 font-stats text-xs text-gray-500">{i + 1}</td>
                        <td className="px-4 py-3">
                          <span className="font-stats font-semibold text-sm" style={{ color: row.primaryColor }}>
                            {row.teamShortCode}
                          </span>
                          <span className="font-stats text-xs text-gray-400 ml-2">{row.teamName}</span>
                        </td>
                        <td className="px-3 py-3 text-center font-stats text-sm text-gray-300">{row.played}</td>
                        <td className="px-3 py-3 text-center font-stats text-sm text-secondary">{row.won}</td>
                        <td className="px-3 py-3 text-center font-stats text-sm text-gray-400">{row.lost}</td>
                        <td className="px-3 py-3 text-center font-stats text-sm text-gray-400">{row.tied}</td>
                        <td className="px-3 py-3 text-center font-stats font-semibold text-sm text-white">{row.points}</td>
                        <td className={`px-4 py-3 text-right font-stats text-sm ${row.nrr >= 0 ? 'text-secondary' : 'text-red-400'}`}>
                          {row.nrr >= 0 ? '+' : ''}{row.nrr.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── Matches ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-stats font-semibold text-gray-300 text-sm uppercase tracking-wider">
              Matches ({tournament.matches.length})
            </h2>
            {isAuthed && tournament.teams.length >= 2 && (
              <button
                onClick={() => { setShowMatchForm((v) => !v); setMatchError('') }}
                className="px-3 py-1.5 bg-primary text-white font-stats text-sm rounded-lg hover:bg-indigo-600 transition-colors"
              >
                {showMatchForm ? 'Cancel' : '+ Add Match'}
              </button>
            )}
          </div>

          {/* Add match form */}
          {showMatchForm && isAuthed && (
            <form
              onSubmit={handleAddMatch}
              className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-4 space-y-4"
            >
              <div className="text-xs font-stats text-gray-500 bg-gray-800 rounded-lg px-3 py-2">
                Inheriting <span className="text-gray-300">{tournament.format} · {tournament.totalOvers} overs</span> from tournament
              </div>

              {matchError && <p className="text-red-400 font-stats text-sm">{matchError}</p>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Home Team</label>
                  <select name="homeTeamId" value={matchForm.homeTeamId} onChange={handleMatchFormChange} className={inputCls} required>
                    <option value="">Select team</option>
                    {tournament.teams
                      .filter((t) => t.id !== parseInt(matchForm.awayTeamId, 10))
                      .map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.shortCode})</option>
                      ))
                    }
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Away Team</label>
                  <select name="awayTeamId" value={matchForm.awayTeamId} onChange={handleMatchFormChange} className={inputCls} required>
                    <option value="">Select team</option>
                    {tournament.teams
                      .filter((t) => t.id !== parseInt(matchForm.homeTeamId, 10))
                      .map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.shortCode})</option>
                      ))
                    }
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Match Stage</label>
                  <select name="matchStage" value={matchForm.matchStage} onChange={handleMatchFormChange} className={inputCls}>
                    {MATCH_STAGES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Match Label (optional)</label>
                  <input name="matchLabel" value={matchForm.matchLabel} onChange={handleMatchFormChange} className={inputCls} placeholder="e.g. M1, QF1, Final" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Venue (optional)</label>
                  <input name="venue" value={matchForm.venue} onChange={handleMatchFormChange} className={inputCls} placeholder="Stadium name" />
                </div>
                <div>
                  <label className={labelCls}>Date & Time</label>
                  <input type="datetime-local" name="date" value={matchForm.date} onChange={handleMatchFormChange} className={inputCls} />
                </div>
              </div>

              {(matchForm.homeTeamId || matchForm.awayTeamId) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Toss Winner (optional)</label>
                    <select name="tossWinnerId" value={matchForm.tossWinnerId} onChange={handleMatchFormChange} className={inputCls}>
                      <option value="">— TBD</option>
                      {tossTeams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Elected To</label>
                    <select name="tossDecision" value={matchForm.tossDecision} onChange={handleMatchFormChange} className={inputCls}>
                      <option value="">— TBD</option>
                      <option value="bat">Bat</option>
                      <option value="field">Field</option>
                    </select>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={addingMatch}
                className="w-full py-2.5 bg-primary text-white font-stats font-semibold rounded-lg hover:bg-indigo-600 disabled:opacity-40 transition-colors text-sm"
              >
                {addingMatch ? 'Creating...' : 'Create Match'}
              </button>
            </form>
          )}

          {tournament.matches.length === 0 ? (
            <p className="font-stats text-xs text-gray-600">No matches scheduled yet.</p>
          ) : (
            <div className="space-y-2">
              {tournament.matches.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}


function MatchCard({ match }: { match: TournamentMatch }) {
  const stageLabel = match.matchStage
    ? MATCH_STAGES.find((s) => s.value === match.matchStage)?.label ?? match.matchStage
    : null

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          {match.matchStage && (
            <span className={`font-stats text-xs px-2 py-0.5 rounded-full uppercase tracking-wider ${matchStageBadge[match.matchStage] ?? matchStageBadge.group}`}>
              {stageLabel}
            </span>
          )}
          {match.matchLabel && (
            <span className="font-stats text-xs text-gray-500">{match.matchLabel}</span>
          )}
          <span className={`font-stats text-xs px-2 py-0.5 rounded-full uppercase tracking-wider ${matchStatusColors[match.status] ?? matchStatusColors.setup}`}>
            {match.status}
          </span>
        </div>
        <p className="font-stats font-semibold text-white">
          <span style={{ color: match.homeTeam.primaryColor }}>{match.homeTeam.shortCode}</span>
          {' '}<span className="text-gray-500">vs</span>{' '}
          <span style={{ color: match.awayTeam.primaryColor }}>{match.awayTeam.shortCode}</span>
        </p>
        <p className="font-stats text-xs text-gray-500 mt-0.5">
          {match.venue ?? 'Venue TBD'} · {new Date(match.date).toLocaleDateString()}
        </p>
      </div>
      <div className="flex gap-2">
        <Link
          href={`/viewer/${match.id}`}
          className="px-3 py-1.5 bg-gray-800 text-gray-300 font-stats text-xs rounded-lg hover:bg-gray-700 transition-colors"
        >
          View
        </Link>
        <Link
          href={`/match/${match.id}/operator`}
          className="px-3 py-1.5 bg-primary text-white font-stats text-xs rounded-lg hover:bg-indigo-600 transition-colors"
        >
          Score
        </Link>
      </div>
    </div>
  )
}
