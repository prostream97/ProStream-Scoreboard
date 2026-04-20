'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { MatchSnapshot, BatterStats, BowlerStats, TeamSummary, InningsState } from '@/types/match'
import type { InningsSummaryData } from '@/lib/db/queries/match'

const GOLD_GRAD = 'linear-gradient(280deg, rgb(249,204,1) 0%, rgb(0,0,0) 100%)'
const BLUE_GOLD_GRAD = 'linear-gradient(280deg, rgb(0,67,222) 0%, rgba(0,0,0,0.8) 50%, rgb(249,204,1) 100%)'
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

type Props = {
  snapshot: MatchSnapshot
  inningsSummaries: InningsSummaryData[]
}

type InningsSectionProps = {
  team: TeamSummary
  innings: InningsState | null
  topBatters: BatterStats[]
  topBowlers: BowlerStats[]
  isYetToBat: boolean
}

function getFixedRows<T>(items: T[], count = 4): Array<T | null> {
  return Array.from({ length: count }, (_, i) => items[i] ?? null)
}

function InningsSection({ team, innings, topBatters, topBowlers, isYetToBat }: InningsSectionProps) {
  const scoreText = innings ? `${innings.totalRuns}-${innings.wickets}` : '-'
  const oversText = innings ? `${innings.overs}.${innings.balls} ov` : ''
  const batterRows = getFixedRows(topBatters)
  const bowlerRows = getFixedRows(topBowlers)

  return (
    <div style={{ marginTop: 8 }}>
      {/* Score header */}
      <div style={{
        background: GOLD_GRAD,
        color: 'rgb(255,255,255)',
        display: 'flex',
        transform: 'scale(1.05)',
        boxShadow: 'rgba(0,0,0,0.75) 0px 0px 18px 0px',
        fontFamily: '"Source Sans Pro", sans-serif',
        fontWeight: 700,
      }}>
        <div style={{
          flex: 1,
          fontSize: 30,
          padding: '10px 10px 10px 30px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {team.name}
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 30,
          padding: '10px 10px 10px 30px',
          minWidth: 260,
        }}>
          <span>{scoreText}</span>
          <span style={{ fontSize: 22, fontWeight: 500, opacity: 0.85 }}>{oversText}</span>
        </div>
      </div>

      {/* Player rows */}
      {isYetToBat ? (
        <div style={{
          background: 'rgba(0,0,0,0.6)',
          color: 'rgba(255,255,255,0.7)',
          textAlign: 'center',
          fontSize: 26,
          fontWeight: 700,
          padding: '12px 0',
          fontFamily: '"Source Sans Pro", sans-serif',
        }}>
          YET TO BAT
        </div>
      ) : (
        <div style={{ display: 'flex' }}>
          {/* Batting column */}
          <div style={{ flex: 1 }}>
            {batterRows.map((batter, i) => (
              <div key={`bat-${i}`} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '5px 5px 5px 20px',
                fontSize: 25,
                lineHeight: '30px',
                fontWeight: 700,
                fontFamily: '"Source Sans Pro", sans-serif',
                background: i % 2 === 0 ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.35)',
                color: 'rgb(255,255,255)',
              }}>
                <span style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {batter ? `${batter.displayName}${batter.isStriker ? '*' : ''}` : '-'}
                </span>
                <span style={{
                  fontSize: 25,
                  padding: '4px 10px',
                  background: 'rgba(153,180,194,0.5)',
                  color: 'rgb(255,255,255)',
                  minWidth: '30%',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {batter ? `${batter.runs} (${batter.balls})` : '-'}
                </span>
              </div>
            ))}
          </div>

          {/* Bowling column */}
          <div style={{ flex: 1, borderLeft: '2px solid rgba(249,204,1,0.2)' }}>
            {bowlerRows.map((bowler, i) => (
              <div key={`bowl-${i}`} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '5px 5px 5px 20px',
                fontSize: 25,
                lineHeight: '30px',
                fontWeight: 700,
                fontFamily: '"Source Sans Pro", sans-serif',
                background: i % 2 === 0 ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.35)',
                color: 'rgb(255,255,255)',
              }}>
                <span style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {bowler ? bowler.displayName : '-'}
                </span>
                <span style={{
                  fontSize: 25,
                  padding: '4px 10px',
                  background: 'rgba(153,180,194,0.5)',
                  color: 'rgb(255,255,255)',
                  minWidth: '30%',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {bowler ? `${bowler.wickets}-${bowler.runs} (${bowler.overs}.${bowler.balls})` : '-'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function Theme1MatchSummaryOverlay({ snapshot, inningsSummaries }: Props) {
  const inn1State = snapshot.innings.find((i) => i.inningsNumber === 1) ?? null
  const inn2State = snapshot.innings.find((i) => i.inningsNumber === 2) ?? null
  const historicalInn1 = inningsSummaries.find((s) => s.inningsNumber === 1)
  const isInn2 = snapshot.currentInnings === 2

  const inn1BattingTeam: TeamSummary = inn1State?.battingTeamId === snapshot.homeTeam.id
    ? snapshot.homeTeam : snapshot.awayTeam
  const inn2BattingTeam: TeamSummary = inn1State?.bowlingTeamId === snapshot.homeTeam.id
    ? snapshot.homeTeam : snapshot.awayTeam

  const inn1Batters: BatterStats[] = isInn2
    ? (historicalInn1?.topBatters ?? []).slice(0, 4)
    : [...snapshot.batters].sort((a, b) => b.runs - a.runs).slice(0, 4)
  const inn1Bowlers: BowlerStats[] = isInn2
    ? (historicalInn1?.topBowlers ?? []).slice(0, 4)
    : [...snapshot.bowlers].sort((a, b) => b.wickets - a.wickets || a.economy - b.economy).slice(0, 4)

  const inn2Batters: BatterStats[] = isInn2
    ? [...snapshot.batters].sort((a, b) => b.runs - a.runs).slice(0, 4)
    : []
  const inn2Bowlers: BowlerStats[] = isInn2
    ? [...snapshot.bowlers].sort((a, b) => b.wickets - a.wickets || a.economy - b.economy).slice(0, 4)
    : []

  let resultText: string | null = null
  if (snapshot.resultWinnerId !== null && inn1State && inn2State) {
    const winner = snapshot.resultWinnerId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
    if (snapshot.resultType === 'wickets') {
      const wl = 10 - inn2State.wickets
      resultText = `${winner.shortCode} WON BY ${wl} WICKET${wl !== 1 ? 'S' : ''}`
    } else if (snapshot.resultType === 'runs') {
      const margin = inn1State.totalRuns - inn2State.totalRuns
      resultText = `${winner.shortCode} WON BY ${margin} RUN${margin !== 1 ? 'S' : ''}`
    } else if (snapshot.resultType === 'tie') {
      resultText = 'MATCH TIED'
    }
  }

  const matchupText = `${inn1BattingTeam.name} vs ${inn2BattingTeam.name}`

  return (
    <motion.div
      key="theme1-match-summary"
      initial={{ opacity: 0, y: -60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -60 }}
      transition={{ type: 'spring', stiffness: 130, damping: 18 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20000,
        fontFamily: '"Source Sans Pro", sans-serif',
      }}
    >
      <div style={{ width: 1090, position: 'relative' }}>

        {/* Header area */}
        <div style={{ position: 'relative' }}>
          {/* Left logo — innings 1 batting team */}
          {inn1BattingTeam.logoCloudinaryId && CLOUD_NAME && (
            <div style={{
              position: 'absolute',
              top: -7,
              left: -40,
              width: 120,
              height: 120,
              borderRadius: '100%',
              overflow: 'hidden',
              zIndex: 2,
              boxShadow: 'rgba(0,0,0,0.75) 0px 0px 18px 0px',
            }}>
              <Image
                src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_120,h_120,f_webp/${inn1BattingTeam.logoCloudinaryId}`}
                alt={inn1BattingTeam.name}
                width={120}
                height={120}
                style={{ objectFit: 'cover' }}
              />
            </div>
          )}

          {/* Right logo — innings 1 bowling team */}
          {inn2BattingTeam.logoCloudinaryId && CLOUD_NAME && (
            <div style={{
              position: 'absolute',
              top: -7,
              left: 'calc(100% - 80px)',
              width: 120,
              height: 120,
              borderRadius: '100%',
              overflow: 'hidden',
              zIndex: 2,
              boxShadow: 'rgba(0,0,0,0.75) 0px 0px 18px 0px',
            }}>
              <Image
                src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_120,h_120,f_webp/${inn2BattingTeam.logoCloudinaryId}`}
                alt={inn2BattingTeam.name}
                width={120}
                height={120}
                style={{ objectFit: 'cover' }}
              />
            </div>
          )}

          {/* MATCH SUMMARY title */}
          <div style={{
            background: GOLD_GRAD,
            color: 'rgb(255,255,255)',
            fontSize: 35,
            fontWeight: 700,
            textTransform: 'uppercase',
            textAlign: 'center',
            padding: '15px 0',
            lineHeight: '40px',
          }}>
            MATCH SUMMARY
          </div>

          {/* Team matchup subtitle */}
          <div style={{
            background: BLUE_GOLD_GRAD,
            color: 'rgb(255,255,255)',
            fontSize: 30,
            fontWeight: 700,
            textTransform: 'uppercase',
            textAlign: 'center',
            padding: '15px 0',
            lineHeight: '40px',
          }}>
            {matchupText}
          </div>
        </div>

        {/* Innings 1 */}
        <InningsSection
          team={inn1BattingTeam}
          innings={inn1State}
          topBatters={inn1Batters}
          topBowlers={inn1Bowlers}
          isYetToBat={false}
        />

        {/* Innings 2 */}
        <InningsSection
          team={inn2BattingTeam}
          innings={inn2State ?? null}
          topBatters={inn2Batters}
          topBowlers={inn2Bowlers}
          isYetToBat={!isInn2 && inn2State === null}
        />

        {/* Result row */}
        {resultText && (
          <div style={{
            marginTop: 8,
            background: GOLD_GRAD,
            color: 'rgb(255,255,255)',
            textAlign: 'center',
            fontSize: 28,
            fontWeight: 700,
            padding: '12px 0',
            letterSpacing: '0.04em',
          }}>
            {resultText}
          </div>
        )}
      </div>
    </motion.div>
  )
}
