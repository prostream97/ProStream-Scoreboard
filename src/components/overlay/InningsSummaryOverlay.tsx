'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { MatchSnapshot, BatterStats, BowlerStats, TeamSummary } from '@/types/match'
import type { InningsSummaryData } from '@/lib/db/queries/match'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const BLUE = '#232882'
const RED = 'rgb(255, 30, 80)'

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  snapshot: MatchSnapshot
  inningsSummaries: InningsSummaryData[]
}

type SummaryStage = 'innings1-live' | 'innings1-end' | 'innings2-live' | 'innings2-end'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStage(snapshot: MatchSnapshot): SummaryStage {
  if (snapshot.currentInnings === 1) {
    return snapshot.currentInningsState?.status === 'active' ? 'innings1-live' : 'innings1-end'
  }
  return snapshot.currentInningsState?.status === 'active' ? 'innings2-live' : 'innings2-end'
}

function getFooterText(snapshot: MatchSnapshot, stage: SummaryStage): string {
  const inn1 = snapshot.innings.find((i) => i.inningsNumber === 1)
  const inn2 = snapshot.innings.find((i) => i.inningsNumber === 2)
  const team1 = inn1?.battingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
  const team2 = inn1?.bowlingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam

  if (stage === 'innings1-live') {
    const inn = snapshot.currentInningsState!
    return `${team1.shortCode} batting — ${inn.totalRuns}/${inn.wickets} (${inn.overs}.${inn.balls} ov)`
  }
  if (stage === 'innings1-end') {
    const target = (inn1?.totalRuns ?? 0) + 1
    return `To win, ${team2.shortCode} require ${target} runs`
  }
  if (stage === 'innings2-live') {
    const inn = snapshot.currentInningsState!
    const runsNeeded = (inn.target ?? 0) - inn.totalRuns
    const bpo = snapshot.ballsPerOver
    const ballsRemaining = snapshot.totalOvers * bpo - (inn.overs * bpo + inn.balls)
    const crr = snapshot.currentRunRate.toFixed(2)
    const rrr = snapshot.requiredRunRate?.toFixed(2) ?? '–'
    return `To win, ${team2.shortCode} require ${runsNeeded} runs with ${ballsRemaining} balls remaining   •   CRR ${crr}   •   RRR ${rrr}`
  }
  // innings2-end — result
  const inn1Final = inn1!
  const inn2Final = inn2!
  if (inn2Final.totalRuns > inn1Final.totalRuns) {
    const wicketsLeft = 10 - inn2Final.wickets
    return `${team2.shortCode} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`
  }
  if (inn1Final.totalRuns > inn2Final.totalRuns) {
    const margin = inn1Final.totalRuns - inn2Final.totalRuns
    return `${team1.shortCode} won by ${margin} run${margin !== 1 ? 's' : ''}`
  }
  return 'Match tied'
}

// ─── TeamLogo ─────────────────────────────────────────────────────────────────

function TeamLogo({ team, size = 60 }: { team: TeamSummary; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        overflow: 'hidden',
        background: 'white',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0px 2px 8px rgba(0,0,0,0.25)',
        border: '3px solid white',
      }}
    >
      {team.logoCloudinaryId ? (
        <Image
          src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_${size},h_${size},f_webp/${team.logoCloudinaryId}`}
          alt={team.name}
          width={size}
          height={size}
          style={{ objectFit: 'cover' }}
        />
      ) : (
        <span
          style={{
            color: BLUE,
            fontFamily: 'Lato, sans-serif',
            fontWeight: 700,
            fontSize: size * 0.35,
          }}
        >
          {team.shortCode.slice(0, 2)}
        </span>
      )}
    </div>
  )
}

// ─── TeamSection ──────────────────────────────────────────────────────────────

type TeamSectionProps = {
  team: TeamSummary
  totalRuns: number
  wickets: number
  overs: number
  balls: number
  batters: BatterStats[]
  bowlers: BowlerStats[]
  isFirst: boolean   // true = left column, false = right column
  isYetToBat?: boolean
}

function TeamSection({
  team,
  totalRuns,
  wickets,
  overs,
  balls,
  batters,
  bowlers,
  isFirst,
  isYetToBat,
}: TeamSectionProps) {
  const scoreText = isYetToBat
    ? 'Yet to bat'
    : `${totalRuns}/${wickets} (${overs}.${balls})`

  // Title pill: logo + text grouped together (no space-between)
  const titleStyle: React.CSSProperties = {
    color: BLUE,
    fontFamily: 'Lato, sans-serif',
    fontWeight: 700,
    backgroundColor: '#ffffff',
    borderRadius: 500,
    marginBottom: 10,
    boxShadow: '0px 1px 5px rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '105%',
    padding: '3px 18px 3px 3px',
    fontSize: '1.3vw',
    marginLeft: isFirst ? -20 : 0,
  }

  return (
    <div style={{ width: '48%' }}>
      {/* Table title pill — logo sits flush at the rounded left edge */}
      <div style={titleStyle}>
        <TeamLogo team={team} size={88} />
        <span>
          {team.name}
          <br />
          <span style={{ fontSize: '1.1vw', fontWeight: 400 }}>{scoreText}</span>
        </span>
      </div>

      {/* wc-table — wrapped in div to apply border-radius with overflow:hidden */}
      <div style={{ borderRadius: 10, overflow: 'hidden' }}>
        <table
          style={{
            width: '100%',
            backgroundColor: '#ffffff',
            borderCollapse: 'collapse',
          }}
        >
          {/* Header: BATTING */}
          <thead>
            <tr
              style={{
                backgroundImage: `linear-gradient(80deg, ${RED} 20%, ${BLUE})`,
              }}
            >
              <th style={theadThStyle}>BATTING</th>
              <th style={theadThStyle}>R</th>
              <th style={theadThStyle}>B</th>
            </tr>
          </thead>

          <tbody>
            {isYetToBat ? (
              <tr>
                <td
                  colSpan={3}
                  style={{
                    color: BLUE,
                    fontFamily: 'Lato, sans-serif',
                    fontWeight: 700,
                    fontSize: '0.95vw',
                    padding: '14px 15px',
                    textAlign: 'center',
                    backgroundColor: '#ffffff',
                    opacity: 0.4,
                    letterSpacing: '0.1em',
                  }}
                >
                  YET TO BAT
                </td>
              </tr>
            ) : (
              <>
                {/* Batter rows */}
                {batters.map((b) => (
                  <tr key={b.playerId}>
                    <td style={tbodyTdFirstStyle(b.isOut)}>
                      {b.displayName}
                    </td>
                    <td style={tbodyTdStyle}>{b.runs}</td>
                    <td style={tbodyTdLastStyle}>{b.balls}</td>
                  </tr>
                ))}

                {/* Bowling section sub-header — tr.head inside tbody */}
                <tr
                  style={{
                    backgroundImage: `linear-gradient(80deg, ${RED} 20%, ${BLUE})`,
                  }}
                >
                  <td style={subHeadTdStyle}>BOWLING</td>
                  <td style={subHeadTdStyle}>W-R</td>
                  <td style={subHeadTdStyle}>OV</td>
                </tr>

                {/* Bowler rows */}
                {bowlers.map((b) => (
                  <tr key={b.playerId}>
                    <td style={tbodyTdFirstStyle()}>
                      {b.displayName}
                    </td>
                    <td style={tbodyTdStyle}>
                      {b.wickets}-{b.runs}
                    </td>
                    <td style={tbodyTdLastStyle}>
                      {b.overs}.{b.balls}
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Shared table cell styles ─────────────────────────────────────────────────

const theadThStyle: React.CSSProperties = {
  color: '#ffffff',
  fontFamily: 'Lato, sans-serif',
  fontWeight: 700,
  fontSize: '1.3vw',
  padding: '8px 12px',
  textAlign: 'center',
  backgroundColor: 'transparent',
}

function tbodyTdFirstStyle(isOut?: boolean): React.CSSProperties {
  return {
    color: isOut ? `${BLUE}88` : BLUE,
    fontFamily: 'Lato, sans-serif',
    fontWeight: 700,
    fontSize: '0.95vw',
    padding: '7px 12px',
    backgroundColor: '#ffffff',
    boxShadow: 'inset 0px 20px 35px -15px rgba(35, 40, 130, 0.15)',
    textDecoration: isOut ? 'line-through' : 'none',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    maxWidth: 200,
  }
}

const tbodyTdStyle: React.CSSProperties = {
  color: BLUE,
  fontFamily: 'Lato, sans-serif',
  fontWeight: 700,
  fontSize: '0.95vw',
  padding: '7px 12px',
  backgroundColor: '#ffffff',
  minWidth: 50,
  maxWidth: 70,
  boxShadow: 'inset 20px 20px 35px -15px rgba(35, 40, 130, 0.15)',
  borderLeft: `2px solid ${RED}`,
  textAlign: 'center',
}

const tbodyTdLastStyle: React.CSSProperties = {
  ...tbodyTdStyle,
  fontWeight: 400,
}

const subHeadTdStyle: React.CSSProperties = {
  color: '#ffffff',
  fontFamily: 'Lato, sans-serif',
  fontWeight: 700,
  fontSize: '1.1vw',
  padding: '7px 12px',
  textAlign: 'center',
  backgroundColor: 'transparent',
  borderLeft: 'none',
  boxShadow: 'none',
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function InningsSummaryOverlay({ snapshot, inningsSummaries }: Props) {
  const stage = getStage(snapshot)
  const footerText = getFooterText(snapshot, stage)

  const inn1 = snapshot.innings.find((i) => i.inningsNumber === 1)
  const inn2 = snapshot.innings.find((i) => i.inningsNumber === 2)

  const leftTeam =
    inn1?.battingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
  const rightTeam =
    inn1?.bowlingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam

  const historicalInn1 = inningsSummaries.find((s) => s.inningsNumber === 1)

  const isInn2Stage = stage === 'innings2-live' || stage === 'innings2-end'

  // Left column data (always innings 1 batting team)
  const leftBatters: BatterStats[] = isInn2Stage
    ? (historicalInn1?.topBatters ?? [])
    : [...snapshot.batters].sort((a, b) => b.runs - a.runs).slice(0, 5)

  const leftBowlers: BowlerStats[] = isInn2Stage
    ? (historicalInn1?.topBowlers ?? [])
    : [...snapshot.bowlers]
        .sort((a, b) => b.wickets - a.wickets || a.economy - b.economy)
        .slice(0, 4)

  // Right column data (innings 2 batting team, or "yet to bat")
  const rightBatters: BatterStats[] = isInn2Stage
    ? [...snapshot.batters].sort((a, b) => b.runs - a.runs).slice(0, 5)
    : []

  const rightBowlers: BowlerStats[] = isInn2Stage
    ? [...snapshot.bowlers]
        .sort((a, b) => b.wickets - a.wickets || a.economy - b.economy)
        .slice(0, 4)
    : []

  // Scores for the title pills
  const leftTotalRuns = isInn2Stage
    ? (historicalInn1?.totalRuns ?? inn1?.totalRuns ?? 0)
    : (snapshot.currentInningsState?.totalRuns ?? 0)
  const leftWickets = isInn2Stage
    ? (historicalInn1?.wickets ?? inn1?.wickets ?? 0)
    : (snapshot.currentInningsState?.wickets ?? 0)
  const leftOvers = isInn2Stage
    ? (historicalInn1?.overs ?? inn1?.overs ?? 0)
    : (snapshot.currentInningsState?.overs ?? 0)
  const leftBalls = isInn2Stage
    ? (historicalInn1?.balls ?? inn1?.balls ?? 0)
    : (snapshot.currentInningsState?.balls ?? 0)

  const rightTotalRuns = inn2?.totalRuns ?? snapshot.currentInningsState?.totalRuns ?? 0
  const rightWickets = inn2?.wickets ?? snapshot.currentInningsState?.wickets ?? 0
  const rightOvers = inn2?.overs ?? snapshot.currentInningsState?.overs ?? 0
  const rightBalls = inn2?.balls ?? snapshot.currentInningsState?.balls ?? 0

  const isRightYetToBat = !isInn2Stage

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 140, damping: 20 }}
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      {/*
        .wc-table-wrapper equivalent:
        flex-direction: column, overflow: hidden, position: relative
        The ::after gradient is replicated as an absolutely positioned child div
      */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          padding: '2% 4%',
          overflow: 'hidden',
          width: '74%',
          fontFamily: 'Lato, sans-serif',
        }}
      >
        {/* Replication of ::after diagonal gradient blob */}
        <div
          style={{
            content: '""',
            position: 'absolute',
            width: '125%',
            height: '150%',
            backgroundImage: `linear-gradient(60deg, rgba(35, 40, 130, 0.5) 20%, rgba(255, 30, 80, 1))`,
            borderRadius: '0% 5000px 5000px 0%',
            top: '50%',
            zIndex: 1,
            transform: 'translate(-15%, -40%) rotate(-45deg)',
            pointerEvents: 'none',
          }}
        />

        {/* .table-section */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            zIndex: 2,
            position: 'relative',
          }}
        >
          {/* Left column — innings 1 batting team */}
          <TeamSection
            team={leftTeam}
            totalRuns={leftTotalRuns}
            wickets={leftWickets}
            overs={leftOvers}
            balls={leftBalls}
            batters={leftBatters}
            bowlers={leftBowlers}
            isFirst={true}
          />

          {/* Right column — innings 2 batting team */}
          <TeamSection
            team={rightTeam}
            totalRuns={rightTotalRuns}
            wickets={rightWickets}
            overs={rightOvers}
            balls={rightBalls}
            batters={rightBatters}
            bowlers={rightBowlers}
            isFirst={false}
            isYetToBat={isRightYetToBat}
          />
        </div>

        {/* .footer-section */}
        <div style={{ zIndex: 2, position: 'relative' }}>
          <div
            style={{
              color: BLUE,
              fontFamily: 'Lato, sans-serif',
              fontWeight: 700,
              backgroundColor: '#ffffff',
              borderRadius: 500,
              marginBottom: 15,
              boxShadow: '0px 1px 5px rgba(0,0,0,0.5)',
              width: '102%',
              fontSize: '1.1vw',
              textAlign: 'center',
              padding: '12px 20px',
              marginTop: 10,
              marginLeft: -10,
            }}
          >
            {footerText}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
