'use client'

import { useEffect, useState } from 'react'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

type InningsSummary = {
  inningsNumber: number
  battingTeamId: number
  totalRuns: number
  wickets: number
  overs: number
  balls: number
}

type LiveMatch = {
  id: number
  status: string
  format: string
  totalOvers: number
  ballsPerOver: number
  matchLabel: string | null
  tournament: { name: string; shortName: string } | null
  homeTeam: {
    id: number
    name: string
    shortCode: string
    primaryColor: string
    logoCloudinaryId: string | null
  }
  awayTeam: {
    id: number
    name: string
    shortCode: string
    primaryColor: string
    logoCloudinaryId: string | null
  }
  innings: InningsSummary[]
}

function teamScore(innings: InningsSummary[], teamId: number) {
  const inn = innings.find((i) => i.battingTeamId === teamId)
  if (!inn) return null
  const oversLabel = inn.balls > 0 ? `${inn.overs}.${inn.balls}` : `${inn.overs}`
  return {
    score: `${inn.totalRuns}/${inn.wickets}`,
    overs: `(${oversLabel} ov)`,
  }
}

function TeamLogo({
  team,
  size = 'md',
}: {
  team: LiveMatch['homeTeam']
  size?: 'md'
}) {
  if (team.logoCloudinaryId) {
    return (
      <img
        src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_103,h_103,f_webp/${team.logoCloudinaryId}`}
        alt={team.name}
        className="h-[76px] w-[76px] rounded-full object-cover sm:h-[90px] sm:w-[90px]"
      />
    )
  }
  return (
    <div
      className="flex h-[76px] w-[76px] items-center justify-center rounded-full text-base font-semibold tracking-widest sm:h-[90px] sm:w-[90px]"
      style={{ backgroundColor: `${team.primaryColor}22`, color: team.primaryColor }}
    >
      {team.shortCode}
    </div>
  )
}

function MatchCard({ match }: { match: LiveMatch }) {
  const homeScore = teamScore(match.innings, match.homeTeam.id)
  const awayScore = teamScore(match.innings, match.awayTeam.id)

  return (
    <div
      className="w-full max-w-[388px] rounded-lg bg-white/[0.92] px-4 pb-5 pt-4"
      style={{ boxShadow: '0px 5px 5px rgba(0,0,0,0.25)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[18px] font-semibold capitalize leading-tight">Live Match</span>
        <span className="flex items-center gap-1.5 rounded bg-[#d9d9d9]/[0.38] px-2 py-[3px]">
          <span className="h-[5px] w-[5px] rounded-full bg-[#FF0B0B]" />
          <span className="text-[8px] font-normal uppercase text-black/[0.71]">LIVE</span>
        </span>
      </div>

      {match.tournament ? (
        <p className="mt-1 truncate text-xs text-black/40">{match.tournament.name}</p>
      ) : null}

      {/* Teams */}
      <div className="mt-5 flex items-start justify-between gap-2">
        {/* Home team */}
        <div className="flex w-[103px] flex-col items-center gap-2">
          <TeamLogo team={match.homeTeam} />
          <p className="text-center text-[15px] font-medium uppercase leading-tight">
            {match.homeTeam.name}
          </p>
        </div>

        {/* VS badge */}
        <div
          className="mt-7 rounded px-3 py-[5px]"
          style={{ backgroundColor: 'rgba(217,217,217,0.42)' }}
        >
          <span className="text-xs uppercase text-black/[0.52]">Vs</span>
        </div>

        {/* Away team */}
        <div className="flex w-[103px] flex-col items-center gap-2">
          <TeamLogo team={match.awayTeam} />
          <p className="text-center text-[15px] font-medium uppercase leading-tight">
            {match.awayTeam.name}
          </p>
        </div>
      </div>

      {/* Scores */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[15px] uppercase">
          {homeScore ? (
            <>
              <span className="font-semibold">{homeScore.score}</span>
              <span className="font-medium text-black/[0.44]"> {homeScore.overs}</span>
            </>
          ) : (
            <span className="font-medium text-black/[0.30]">Yet to bat</span>
          )}
        </p>
        <p className="text-right text-[15px] uppercase">
          {awayScore ? (
            <>
              <span className="font-semibold">{awayScore.score}</span>
              <span className="font-medium text-black/[0.44]"> {awayScore.overs}</span>
            </>
          ) : (
            <span className="font-medium text-black/[0.30]">Yet to bat</span>
          )}
        </p>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div
      className="w-full max-w-[388px] animate-pulse rounded-lg bg-white/[0.92] px-4 pb-5 pt-4"
      style={{ boxShadow: '0px 5px 5px rgba(0,0,0,0.25)' }}
    >
      <div className="flex items-center justify-between">
        <div className="h-5 w-24 rounded-md bg-slate-200" />
        <div className="h-4 w-10 rounded-md bg-slate-200" />
      </div>
      <div className="mt-5 flex items-start justify-between gap-2">
        <div className="flex w-[103px] flex-col items-center gap-2">
          <div className="h-[76px] w-[76px] rounded-full bg-slate-200" />
          <div className="h-4 w-16 rounded-md bg-slate-200" />
        </div>
        <div className="mt-7 h-6 w-8 rounded bg-slate-200" />
        <div className="flex w-[103px] flex-col items-center gap-2">
          <div className="h-[76px] w-[76px] rounded-full bg-slate-200" />
          <div className="h-4 w-16 rounded-md bg-slate-200" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="h-4 w-28 rounded-md bg-slate-200" />
        <div className="h-4 w-28 rounded-md bg-slate-200" />
      </div>
    </div>
  )
}

export default function HomePage() {
  const [matches, setMatches] = useState<LiveMatch[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchMatches() {
    try {
      const res = await fetch('/api/matches/live')
      if (res.ok) setMatches(await res.json())
    } catch {
      // silently fail — keep showing previous data
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMatches()
    const interval = setInterval(fetchMatches, 30_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-[#f4f7f2] px-4 py-10 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-4xl">
          Live Matches
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Ongoing cricket matches across all tournaments
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-wrap justify-center gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : matches.length === 0 ? (
        <div className="mx-auto mt-16 max-w-sm text-center">
          <p className="text-2xl">🏏</p>
          <p className="mt-3 text-lg font-semibold text-slate-800">No live matches right now</p>
          <p className="mt-1 text-sm text-slate-500">Check back soon — matches will appear here automatically.</p>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-6">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  )
}
