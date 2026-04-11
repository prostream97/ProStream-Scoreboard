'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { MatchSnapshot, BatterStats, BowlerStats, TeamSummary } from '@/types/match'
import type { InningsSummaryData } from '@/lib/db/queries/match'
import { ICC } from './tokens'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

type Props = {
  snapshot: MatchSnapshot
  inningsSummaries: InningsSummaryData[]
}

type SummaryStage = 'innings1-live' | 'innings1-end' | 'innings2-live' | 'innings2-end'

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

function TeamLogo({ team, size = 60 }: { team: TeamSummary; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 9999, overflow: 'hidden',
      background: ICC.white, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: ICC.imgShadow, border: `3px solid ${ICC.white}`,
    }}>
      {team.logoCloudinaryId ? (
        <Image
          src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_${size},h_${size},f_webp/${team.logoCloudinaryId}`}
          alt={team.name} width={size} height={size}
          style={{ objectFit: 'cover' }}
        />
      ) : (
        <span style={{ color: ICC.purple, fontFamily: ICC.font, fontWeight: 700, fontSize: size * 0.35 }}>
          {team.shortCode.slice(0, 2)}
        </span>
      )}
    </div>
  )
}

// Cell styles
const theadThStyle: React.CSSProperties = {
  color: ICC.white,
  fontFamily: ICC.font,
  fontWeight: 700,
  fontSize: '1.3vw',
  padding: '8px 12px',
  textAlign: 'center',
  backgroundColor: 'transparent',
}

function tbodyTdFirstStyle(isOut?: boolean): React.CSSProperties {
  return {
    color: isOut ? `${ICC.purple}88` : ICC.purple,
    fontFamily: ICC.font,
    fontWeight: 700,
    fontSize: '0.95vw',
    padding: '7px 12px',
    backgroundColor: ICC.white,
    textDecoration: isOut ? 'line-through' : 'none',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    maxWidth: 200,
  }
}

const tbodyTdStyle: React.CSSProperties = {
  color: ICC.purple,
  fontFamily: ICC.font,
  fontWeight: 700,
  fontSize: '0.95vw',
  padding: '7px 12px',
  backgroundColor: ICC.white,
  minWidth: 50, maxWidth: 70,
  borderLeft: `2px solid ${ICC.pink}`,
  textAlign: 'center',
}

const tbodyTdLastStyle: React.CSSProperties = { ...tbodyTdStyle, fontWeight: 400 }

const subHeadTdStyle: React.CSSProperties = {
  color: ICC.white,
  fontFamily: ICC.font,
  fontWeight: 700,
  fontSize: '1.1vw',
  padding: '7px 12px',
  textAlign: 'center',
  backgroundColor: 'transparent',
  borderLeft: 'none',
}

type TeamSectionProps = {
  team: TeamSummary
  totalRuns: number; wickets: number; overs: number; balls: number
  batters: BatterStats[]; bowlers: BowlerStats[]
  isFirst: boolean; isYetToBat?: boolean
}

function TeamSection({ team, totalRuns, wickets, overs, balls, batters, bowlers, isFirst, isYetToBat }: TeamSectionProps) {
  const scoreText = isYetToBat ? 'Yet to bat' : `${totalRuns}/${wickets} (${overs}.${balls})`
  const titleStyle: React.CSSProperties = {
    color: ICC.purple, fontFamily: ICC.font, fontWeight: 700,
    backgroundColor: ICC.white, borderRadius: 500,
    marginBottom: 10, boxShadow: ICC.imgShadow,
    display: 'flex', alignItems: 'center', gap: 10,
    width: '105%', padding: '3px 18px 3px 3px',
    fontSize: '1.3vw', marginLeft: isFirst ? -20 : 0,
  }

  return (
    <div style={{ width: '48%' }}>
      <div style={titleStyle}>
        <TeamLogo team={team} size={88} />
        <span>
          {team.name}
          <br />
          <span style={{ fontSize: '1.1vw', fontWeight: 400 }}>{scoreText}</span>
        </span>
      </div>

      <div style={{ borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', backgroundColor: ICC.white, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: ICC.pink }}>
              <th style={theadThStyle}>BATTING</th>
              <th style={theadThStyle}>R</th>
              <th style={theadThStyle}>B</th>
            </tr>
          </thead>
          <tbody>
            {isYetToBat ? (
              <tr>
                <td colSpan={3} style={{
                  color: ICC.purple, fontFamily: ICC.font, fontWeight: 700,
                  fontSize: '0.95vw', padding: '14px 15px', textAlign: 'center',
                  backgroundColor: ICC.white, opacity: 0.4, letterSpacing: '0.1em',
                }}>
                  YET TO BAT
                </td>
              </tr>
            ) : (
              <>
                {batters.map((b) => (
                  <tr key={b.playerId}>
                    <td style={tbodyTdFirstStyle(b.isOut)}>{b.displayName}</td>
                    <td style={tbodyTdStyle}>{b.runs}</td>
                    <td style={tbodyTdLastStyle}>{b.balls}</td>
                  </tr>
                ))}
                <tr style={{ background: ICC.pink }}>
                  <td style={subHeadTdStyle}>BOWLING</td>
                  <td style={subHeadTdStyle}>W-R</td>
                  <td style={subHeadTdStyle}>OV</td>
                </tr>
                {bowlers.map((b) => (
                  <tr key={b.playerId}>
                    <td style={tbodyTdFirstStyle()}>{b.displayName}</td>
                    <td style={tbodyTdStyle}>{b.wickets}-{b.runs}</td>
                    <td style={tbodyTdLastStyle}>{b.overs}.{b.balls}</td>
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

export function ICC2023InningsSummary({ snapshot, inningsSummaries }: Props) {
  const stage = getStage(snapshot)
  const footerText = getFooterText(snapshot, stage)

  const inn1 = snapshot.innings.find((i) => i.inningsNumber === 1)
  const inn2 = snapshot.innings.find((i) => i.inningsNumber === 2)

  const leftTeam = inn1?.battingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
  const rightTeam = inn1?.bowlingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam

  const historicalInn1 = inningsSummaries.find((s) => s.inningsNumber === 1)
  const isInn2Stage = stage === 'innings2-live' || stage === 'innings2-end'

  const leftBatters: BatterStats[] = isInn2Stage
    ? (historicalInn1?.topBatters ?? [])
    : [...snapshot.batters].sort((a, b) => b.runs - a.runs).slice(0, 5)
  const leftBowlers: BowlerStats[] = isInn2Stage
    ? (historicalInn1?.topBowlers ?? [])
    : [...snapshot.bowlers].sort((a, b) => b.wickets - a.wickets || a.economy - b.economy).slice(0, 4)
  const rightBatters: BatterStats[] = isInn2Stage
    ? [...snapshot.batters].sort((a, b) => b.runs - a.runs).slice(0, 5) : []
  const rightBowlers: BowlerStats[] = isInn2Stage
    ? [...snapshot.bowlers].sort((a, b) => b.wickets - a.wickets || a.economy - b.economy).slice(0, 4) : []

  const leftTotalRuns = isInn2Stage ? (historicalInn1?.totalRuns ?? inn1?.totalRuns ?? 0) : (snapshot.currentInningsState?.totalRuns ?? 0)
  const leftWickets = isInn2Stage ? (historicalInn1?.wickets ?? inn1?.wickets ?? 0) : (snapshot.currentInningsState?.wickets ?? 0)
  const leftOvers = isInn2Stage ? (historicalInn1?.overs ?? inn1?.overs ?? 0) : (snapshot.currentInningsState?.overs ?? 0)
  const leftBalls = isInn2Stage ? (historicalInn1?.balls ?? inn1?.balls ?? 0) : (snapshot.currentInningsState?.balls ?? 0)
  const rightTotalRuns = inn2?.totalRuns ?? snapshot.currentInningsState?.totalRuns ?? 0
  const rightWickets = inn2?.wickets ?? snapshot.currentInningsState?.wickets ?? 0
  const rightOvers = inn2?.overs ?? snapshot.currentInningsState?.overs ?? 0
  const rightBalls = inn2?.balls ?? snapshot.currentInningsState?.balls ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 140, damping: 20 }}
      className="absolute inset-x-0 top-0 bottom-[100px] flex items-center justify-center pointer-events-none"
    >
      <div style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        padding: '2% 4%', overflow: 'hidden', width: '74%',
        fontFamily: ICC.font,
      }}>
        {/* Background blob */}
        <div style={{
          position: 'absolute', width: '125%', height: '150%',
          backgroundImage: `linear-gradient(60deg, rgba(50, 0, 117, 0.5) 20%, rgba(253,2,163,1))`,
          borderRadius: '0% 5000px 5000px 0%',
          top: '50%', zIndex: 1,
          transform: 'translate(-15%, -40%) rotate(-45deg)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-around', zIndex: 2, position: 'relative' }}>
          <TeamSection
            team={leftTeam} totalRuns={leftTotalRuns} wickets={leftWickets} overs={leftOvers} balls={leftBalls}
            batters={leftBatters} bowlers={leftBowlers} isFirst={true}
          />
          <TeamSection
            team={rightTeam} totalRuns={rightTotalRuns} wickets={rightWickets} overs={rightOvers} balls={rightBalls}
            batters={rightBatters} bowlers={rightBowlers} isFirst={false} isYetToBat={!isInn2Stage}
          />
        </div>

        <div style={{ zIndex: 2, position: 'relative' }}>
          <div style={{
            color: ICC.purple, fontFamily: ICC.font, fontWeight: 700,
            backgroundColor: ICC.white, borderRadius: 500,
            marginBottom: 15, boxShadow: ICC.imgShadow,
            width: '102%', fontSize: '1.1vw', textAlign: 'center',
            padding: '12px 20px', marginTop: 10, marginLeft: -10,
          }}>
            {footerText}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
