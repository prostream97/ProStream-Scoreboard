'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Trophy } from 'lucide-react'
import { TournamentNav } from '@/components/shared/TournamentNav'
import { TournamentAccessSection } from '@/components/tournament/TournamentAccessSection'
import type {
  MatchStage,
  StandingRow,
  TournamentMatch,
  TournamentStageStructure,
  TournamentWithDetails,
} from '@/types/tournament'
import { getBattingFirstTeamId } from '@/lib/auth/utils'
import { MATCH_STAGE_LABELS, MATCH_STAGE_ORDER } from '@/lib/tournament/stageRules'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

const statusColors: Record<string, string> = {
  upcoming: 'bg-gray-700 text-gray-300',
  group_stage: 'bg-blue-500/20 text-blue-400 border border-blue-500/50',
  knockout: 'bg-orange-500/20 text-orange-400 border border-orange-500/50',
  complete: 'bg-gray-700 text-gray-400',
}

const matchStageBadge: Record<MatchStage, string> = {
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

function createEmptyMatchForm(stageStructure?: TournamentStageStructure | null) {
  return {
    ...emptyMatchForm,
    matchStage: stageStructure?.allowedStages[0] ?? emptyMatchForm.matchStage,
  }
}

function getStagePathLabel(stageStructure: TournamentStageStructure) {
  if (stageStructure.path === 'with_quarters') return 'Quarter-finals path'
  if (stageStructure.path === 'semis_only') return 'Semi-finals path'
  return 'Open bracket'
}

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const tournamentId = parseInt(id, 10)
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated'
  const isAdmin = isAuthenticated && session?.user?.role === 'admin'

  const [tournament, setTournament] = useState<TournamentWithDetails | null>(null)
  const [standings, setStandings] = useState<StandingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showMatchForm, setShowMatchForm] = useState(false)
  const [matchForm, setMatchForm] = useState(() => createEmptyMatchForm())
  const [addingMatch, setAddingMatch] = useState(false)
  const [matchError, setMatchError] = useState('')

  async function load() {
    const [tRes, sRes] = await Promise.all([
      fetch(`/api/tournaments/${tournamentId}`),
      fetch(`/api/tournaments/${tournamentId}/standings`),
    ])

    if (tRes.ok) {
      const tournamentData = await tRes.json() as TournamentWithDetails
      setTournament(tournamentData)
    }

    if (sRes.ok) {
      setStandings(await sRes.json())
    }

    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [tournamentId])

  useEffect(() => {
    if (!tournament) return

    if (tournament.stageStructure.allowedStages.length === 0) {
      setShowMatchForm(false)
      return
    }

    if (!tournament.stageStructure.allowedStages.includes(matchForm.matchStage)) {
      setMatchForm((form) => ({
        ...form,
        matchStage: tournament.stageStructure.allowedStages[0],
      }))
    }
  }, [tournament, matchForm.matchStage])

  async function handleStatusChange(newStatus: string) {
    const res = await fetch(`/api/tournaments/${tournamentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })

    if (res.ok) {
      setTournament((current) => (
        current ? { ...current, status: newStatus as TournamentWithDetails['status'] } : current
      ))
    }
  }

  function handleMatchFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setMatchForm((form) => ({ ...form, [name]: value }))
  }

  function handleToggleMatchForm() {
    setMatchError('')
    setShowMatchForm((visible) => {
      const nextVisible = !visible
      if (nextVisible && tournament) {
        setMatchForm(createEmptyMatchForm(tournament.stageStructure))
      }
      return nextVisible
    })
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
          battingFirstTeamId: getBattingFirstTeamId({
            homeTeamId: parseInt(matchForm.homeTeamId, 10),
            awayTeamId: parseInt(matchForm.awayTeamId, 10),
            tossWinnerId: matchForm.tossWinnerId ? parseInt(matchForm.tossWinnerId, 10) : null,
            tossDecision: matchForm.tossDecision || null,
          }),
        }),
      })

      if (res.ok) {
        setMatchForm(createEmptyMatchForm(tournament?.stageStructure))
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
        <Link href="/admin/tournaments" className="text-primary hover:underline font-stats text-sm mt-2 inline-block">
          Back
        </Link>
      </main>
    )
  }

  const tossTeams = [
    ...(matchForm.homeTeamId ? tournament.teams.filter((team) => team.id === parseInt(matchForm.homeTeamId, 10)) : []),
    ...(matchForm.awayTeamId ? tournament.teams.filter((team) => team.id === parseInt(matchForm.awayTeamId, 10)) : []),
  ]

  const sessionUserId = isAuthenticated ? parseInt(session.user.id, 10) : null
  const canManageTournament = isAuthenticated && (
    isAdmin ||
    tournament.owner?.id === sessionUserId ||
    tournament.operators.some((operator) => operator.id === sessionUserId)
  )

  const stageStructure = tournament.stageStructure
  const canAddMoreMatches = stageStructure.allowedStages.length > 0
  const groupedMatches = MATCH_STAGE_ORDER
    .map((stage) => ({
      stage,
      label: MATCH_STAGE_LABELS[stage],
      matches: tournament.matches.filter((match) => (match.matchStage ?? 'group') === stage),
    }))
    .filter((group) => group.matches.length > 0)

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-body focus:outline-none focus:border-primary text-sm'
  const labelCls = 'block text-xs font-stats text-gray-400 mb-1 uppercase tracking-wider'

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-2 font-stats text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-300 transition-colors">Dashboard</Link>
          <span>/</span>
          <Link href="/admin/tournaments" className="hover:text-gray-300 transition-colors">Tournaments</Link>
          <span>/</span>
          <span className="text-gray-300">{tournament.name}</span>
        </div>

        <TournamentNav tournamentId={tournamentId} />

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-800 flex items-center justify-center border border-gray-700">
                {tournament.logoCloudinaryId && CLOUD_NAME ? (
                  <img
                    src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_64,h_64,f_webp/${tournament.logoCloudinaryId}`}
                    alt={tournament.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Trophy className="w-8 h-8 text-primary opacity-60" />
                )}
              </div>
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
                  {tournament.format} - {tournament.totalOvers} overs
                  {tournament.ballsPerOver !== 6 && (
                    <span className="ml-1 text-orange-400">({tournament.ballsPerOver} balls/over)</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={`font-stats text-xs px-2.5 py-1 rounded-full uppercase tracking-wider ${statusColors[tournament.status] ?? statusColors.upcoming}`}>
                {tournament.status.replace('_', ' ')}
              </span>
              {canManageTournament && (
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

        <TournamentAccessSection
          tournamentId={tournamentId}
          initialOwner={tournament.owner}
          initialOperators={tournament.operators}
          canManage={canManageTournament}
        />

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-stats font-semibold text-gray-300 text-sm uppercase tracking-wider">
              Teams ({tournament.teams.length})
            </h2>
            {canManageTournament && (
              <Link
                href={`/admin/tournaments/${tournamentId}/teams`}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 font-stats text-sm rounded-lg hover:bg-gray-700 transition-colors"
              >
                Manage Teams
              </Link>
            )}
          </div>

          {tournament.teams.length === 0 ? (
            <p className="font-stats text-xs text-gray-600">
              No teams yet.{' '}
              {canManageTournament ? (
                <>
                  <Link href={`/admin/tournaments/${tournamentId}/teams`} className="text-primary hover:underline">
                    Add teams
                  </Link>{' '}
                  to get started.
                </>
              ) : (
                'Teams can be added by the owner or tournament operators.'
              )}
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
                  <span className="font-display text-sm tracking-wider" style={{ color: team.primaryColor }}>
                    {team.shortCode}
                  </span>
                  <span className="font-stats text-xs text-gray-300">{team.name}</span>
                </div>
              ))}
            </div>
          )}
        </section>

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
                    {standings.map((row, index) => (
                      <tr key={row.teamId} className="border-t border-gray-800">
                        <td className="px-4 py-3 font-stats text-xs text-gray-500">{index + 1}</td>
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
                          {row.nrr >= 0 ? '+' : ''}
                          {row.nrr.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-stats font-semibold text-gray-300 text-sm uppercase tracking-wider">
              Matches ({tournament.matches.length})
            </h2>
            {canManageTournament && tournament.teams.length >= 2 && (
              <button
                onClick={handleToggleMatchForm}
                disabled={!canAddMoreMatches}
                className="px-3 py-1.5 bg-primary text-white font-stats text-sm rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {showMatchForm ? 'Cancel' : '+ Add Match'}
              </button>
            )}
          </div>

          {canManageTournament && tournament.teams.length >= 2 && !canAddMoreMatches && (
            <p className="mb-3 font-stats text-xs text-gray-500">
              No further match stages are available. The current tournament structure is complete.
            </p>
          )}

          {showMatchForm && canManageTournament && (
            <form
              onSubmit={handleAddMatch}
              className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-4 space-y-4"
            >
              <div className="text-xs font-stats text-gray-500 bg-gray-800 rounded-lg px-3 py-2">
                Inheriting <span className="text-gray-300">{tournament.format} - {tournament.totalOvers} overs</span> from tournament
              </div>

              <div className="bg-gray-950/50 border border-gray-800 rounded-lg px-4 py-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-stats text-[11px] uppercase tracking-wider text-gray-500">Bracket Path</span>
                  <span className="font-stats text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-300">
                    {getStagePathLabel(stageStructure)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {MATCH_STAGE_ORDER.map((stage) => (
                    <span
                      key={stage}
                      className="font-stats text-[11px] px-2 py-1 rounded-full bg-gray-800 text-gray-400 uppercase tracking-wider"
                    >
                      {MATCH_STAGE_LABELS[stage]}: {stageStructure.counts[stage]}
                    </span>
                  ))}
                </div>
                {MATCH_STAGE_ORDER.some((stage) => Boolean(stageStructure.reasonsByStage[stage])) && (
                  <div className="space-y-1">
                    {MATCH_STAGE_ORDER
                      .filter((stage) => stageStructure.reasonsByStage[stage])
                      .map((stage) => (
                        <p key={stage} className="font-stats text-[11px] text-gray-500">
                          {MATCH_STAGE_LABELS[stage]}: {stageStructure.reasonsByStage[stage]}
                        </p>
                      ))}
                  </div>
                )}
              </div>

              {matchError && <p className="text-red-400 font-stats text-sm">{matchError}</p>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Home Team</label>
                  <select name="homeTeamId" value={matchForm.homeTeamId} onChange={handleMatchFormChange} className={inputCls} required>
                    <option value="">Select team</option>
                    {tournament.teams
                      .filter((team) => team.id !== parseInt(matchForm.awayTeamId, 10))
                      .map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name} ({team.shortCode})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Away Team</label>
                  <select name="awayTeamId" value={matchForm.awayTeamId} onChange={handleMatchFormChange} className={inputCls} required>
                    <option value="">Select team</option>
                    {tournament.teams
                      .filter((team) => team.id !== parseInt(matchForm.homeTeamId, 10))
                      .map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name} ({team.shortCode})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Match Stage</label>
                  <select name="matchStage" value={matchForm.matchStage} onChange={handleMatchFormChange} className={inputCls}>
                    {MATCH_STAGE_ORDER.map((stage) => (
                      <option key={stage} value={stage} disabled={!stageStructure.allowedStages.includes(stage)}>
                        {MATCH_STAGE_LABELS[stage]}
                      </option>
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
                      <option value="">- TBD</option>
                      {tossTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Elected To</label>
                    <select name="tossDecision" value={matchForm.tossDecision} onChange={handleMatchFormChange} className={inputCls}>
                      <option value="">- TBD</option>
                      <option value="bat">Bat</option>
                      <option value="field">Field</option>
                    </select>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={addingMatch || !canAddMoreMatches}
                className="w-full py-2.5 bg-primary text-white font-stats font-semibold rounded-lg hover:bg-indigo-600 disabled:opacity-40 transition-colors text-sm"
              >
                {addingMatch ? 'Creating...' : 'Create Match'}
              </button>
            </form>
          )}

          {tournament.matches.length === 0 ? (
            <p className="font-stats text-xs text-gray-600">No matches scheduled yet.</p>
          ) : (
            <div className="space-y-4">
              {groupedMatches.map((group) => (
                <div key={group.stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-stats text-xs uppercase tracking-wider text-gray-400">
                      {group.label}
                    </h3>
                    <span className="font-stats text-[11px] text-gray-600">
                      {group.matches.length} match{group.matches.length === 1 ? '' : 'es'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.matches.map((match) => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function MatchCard({ match }: { match: TournamentMatch }) {
  const stage = match.matchStage ?? 'group'
  const stageLabel = MATCH_STAGE_LABELS[stage]

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className={`font-stats text-xs px-2 py-0.5 rounded-full uppercase tracking-wider ${matchStageBadge[stage]}`}>
            {stageLabel}
          </span>
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
          {match.venue ?? 'Venue TBD'} - {new Date(match.date).toLocaleDateString()}
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
