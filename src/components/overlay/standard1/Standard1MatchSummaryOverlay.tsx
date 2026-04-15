'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { MatchSnapshot, BatterStats, BowlerStats, TeamSummary, InningsState } from '@/types/match'
import type { InningsSummaryData } from '@/lib/db/queries/match'

const BLACK_GRAD = 'linear-gradient(to left, #1c1c1d, #2b2b2d, #3b3b3d, #4c4c4e, #5e5e60)'
const BLUE_GRAD = 'linear-gradient(to right, #0307e3, #1416ea, #1e21f1, #272af8, #2e32ff)'
const YELLOW_GRAD = 'linear-gradient(to right, #ffe400, #ffd921, #ffe435, #fcec38, #fff91e)'
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

// ─── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  snapshot: MatchSnapshot
  inningsSummaries: InningsSummaryData[]
}

type InningsSectionProps = {
  label: string
  team: TeamSummary
  innings: InningsState | null
  topBatters: BatterStats[]
  topBowlers: BowlerStats[]
  isYetToBat: boolean
}

function getFixedRows<T>(items: T[], rowCount = 4): Array<T | null> {
  return Array.from({ length: rowCount }, (_, i) => items[i] ?? null)
}

// ─── InningsSection ────────────────────────────────────────────────────────────

function InningsSection({ label, team, innings, topBatters, topBowlers, isYetToBat }: InningsSectionProps) {
  const scoreRuns = innings ? String(innings.totalRuns) : '-'
  const scoreWickets = innings ? String(innings.wickets) : '-'
  const oversText = innings
    ? `${innings.overs}.${innings.balls} ov`
    : ''
  const battingRows = getFixedRows(topBatters, 4)
  const bowlingRows = getFixedRows(topBowlers, 4)

  return (
    <div style={{ marginTop: 20 }}>
      <div
        style={{
          width: 1500,
          height: 70,
          border: '5px solid black',
          borderWidth: 5,
          borderStyle: 'solid',
          borderColor: 'black',
          background: BLACK_GRAD,
          backgroundImage: BLACK_GRAD,
          boxShadow: 'none',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div style={{ width: 1200, height: 70, display: 'inline-flex', alignItems: 'center' }}>
          <div
            style={{
              width: 920,
              height: 70,
              lineHeight: '70px',
              fontSize: 45,
              fontWeight: 700,
              marginLeft: 50,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {team.name}
          </div>
          <div style={{ width: 220, height: 70, lineHeight: '70px', fontSize: 35, fontWeight: 700, textAlign: 'left' }}>
            OVER : {oversText ? oversText.replace(' ov', '') : '--.-'}
          </div>
        </div>
        <div style={{ width: 300, fontSize: 70, fontWeight: 900, height: 70, lineHeight: '70px', display: 'inline-flex' }}>
          <div style={{ width: 170, textAlign: 'right' }}>{scoreRuns}</div>
          <div style={{ width: 30, textAlign: 'center' }}>-</div>
          <div style={{ width: 100 }}>{scoreWickets}</div>
        </div>
      </div>

      {isYetToBat ? (
        <div style={{ marginTop: 10, width: 1500, height: 60, lineHeight: '60px', backgroundImage: BLACK_GRAD, color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontSize: 34, fontWeight: 700 }}>
          {label.toUpperCase()} - YET TO BAT
        </div>
      ) : (
        battingRows.map((batter, i) => {
          const bowler = bowlingRows[i]
          return (
            <div key={`${label}-${i}`} style={{ marginTop: 10, width: 1500, height: 60, lineHeight: '60px', fontWeight: 700, display: 'inline-flex' }}>
              <div style={{ color: 'white', backgroundImage: BLUE_GRAD, display: 'inline-flex' }}>
                <div style={{ marginLeft: 30, width: 470, height: 60, fontSize: 37, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {batter ? `${batter.displayName}${batter.isStriker ? '*' : ''}` : '-'}
                </div>
                <div style={{ width: 220, fontSize: 36, textAlign: 'right', color: 'black', backgroundImage: YELLOW_GRAD }}>
                  <div style={{ display: 'inline-flex' }}>
                    <div style={{ width: 120, paddingRight: 10, fontSize: 50 }}>{batter ? batter.runs : '-'}</div>
                    <div style={{ width: 80, textAlign: 'center', fontSize: 35 }}>({batter ? batter.balls : '-'})</div>
                  </div>
                </div>
              </div>

              <div style={{ marginLeft: 20, color: 'white', backgroundImage: BLUE_GRAD, display: 'inline-flex' }}>
                <div style={{ marginLeft: 30, width: 470, height: 60, fontSize: 37, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {bowler ? bowler.displayName : '-'}
                </div>
                <div style={{ width: 270, fontSize: 50, textAlign: 'center', color: 'black', backgroundImage: YELLOW_GRAD }}>
                  <div style={{ display: 'inline-flex' }}>
                    <div style={{ width: 150, fontSize: 50, display: 'inline-flex' }}>
                      <div>{bowler ? bowler.wickets : '-'}</div>
                      <div style={{ padding: '0 10px' }}>-</div>
                      <div style={{ paddingRight: 10 }}>{bowler ? bowler.runs : '-'}</div>
                    </div>
                    <div style={{ width: 120, textAlign: 'center', fontSize: 35 }}>({bowler ? `${bowler.overs}.${bowler.balls}` : '-'})</div>
                  </div>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ─── Main Export ───────────────────────────────────────────────────────────────

export function Standard1MatchSummaryOverlay({ snapshot, inningsSummaries }: Props) {
  const inn1State = snapshot.innings.find((i) => i.inningsNumber === 1) ?? null
  const inn2State = snapshot.innings.find((i) => i.inningsNumber === 2) ?? null
  const historicalInn1 = inningsSummaries.find((s) => s.inningsNumber === 1)
  const isInn2 = snapshot.currentInnings === 2

  // Determine which team batted in each innings
  const inn1BattingTeam: TeamSummary = inn1State?.battingTeamId === snapshot.homeTeam.id
    ? snapshot.homeTeam : snapshot.awayTeam
  const inn2BattingTeam: TeamSummary = inn1State?.bowlingTeamId === snapshot.homeTeam.id
    ? snapshot.homeTeam : snapshot.awayTeam

  // Innings 1 player data
  const inn1Batters: BatterStats[] = isInn2
    ? (historicalInn1?.topBatters ?? []).slice(0, 4)
    : [...snapshot.batters].sort((a, b) => b.runs - a.runs).slice(0, 4)
  const inn1Bowlers: BowlerStats[] = isInn2
    ? (historicalInn1?.topBowlers ?? []).slice(0, 4)
    : [...snapshot.bowlers].sort((a, b) => b.wickets - a.wickets || a.economy - b.economy).slice(0, 4)

  // Innings 2 player data
  const inn2Batters: BatterStats[] = isInn2
    ? [...snapshot.batters].sort((a, b) => b.runs - a.runs).slice(0, 4)
    : []
  const inn2Bowlers: BowlerStats[] = isInn2
    ? [...snapshot.bowlers].sort((a, b) => b.wickets - a.wickets || a.economy - b.economy).slice(0, 4)
    : []

  // Result text
  let resultText: string | null = null
  if (snapshot.resultWinnerId !== null && inn1State && inn2State) {
    const winner = snapshot.resultWinnerId === snapshot.homeTeam.id
      ? snapshot.homeTeam : snapshot.awayTeam
    if (snapshot.resultType === 'wickets') {
      const wl = 10 - inn2State.wickets
      resultText = `'${winner.shortCode}' won by ${wl} wicket${wl !== 1 ? 's' : ''}`
    } else if (snapshot.resultType === 'runs') {
      const margin = inn1State.totalRuns - inn2State.totalRuns
      resultText = `'${winner.shortCode}' won by ${margin} run${margin !== 1 ? 's' : ''}`
    } else if (snapshot.resultType === 'tie') {
      resultText = 'Match Tied'
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }}
    >
      <motion.div
        key="match-summary"
        initial={{ opacity: 0, y: -60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -60 }}
        transition={{ type: 'spring', stiffness: 130, damping: 18 }}
        style={{
          width: 1500,
          padding: '30px 70px',
          background: '#b0b0b06e',
          backgroundColor: '#b0b0b06e',
          borderRadius: 5,
          border: '2px solid #b5b5b5',
          borderColor: '#b5b5b5',
          borderStyle: 'solid',
          borderImage: 'none',
          fontFamily: 'Lato, sans-serif',
          fontSize: 26,
          boxSizing: 'content-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
      <div style={{ width: 1500, textAlign: 'center', height: 150, position: 'relative', border: '5px solid black', backgroundImage: 'linear-gradient(to bottom, #000000, #191919, #434242, #525252)', color: 'white', display: 'inline-flex', alignItems: 'center' }}>
        {snapshot.tournamentLogoCloudinaryId && CLOUD_NAME && (
          <div style={{ width: 150, height: 150, left: 20, top: 0, position: 'absolute' }}>
            <Image
              src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_150,h_150,f_webp/${snapshot.tournamentLogoCloudinaryId}`}
              alt={snapshot.tournamentName ?? ''}
              width={150}
              height={150}
              style={{ objectFit: 'cover' }}
            />
          </div>
        )}
        {snapshot.tournamentLogoCloudinaryId && CLOUD_NAME && (
          <div style={{ width: 150, height: 150, right: 20, top: 0, position: 'absolute' }}>
            <Image
              src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_150,h_150,f_webp/${snapshot.tournamentLogoCloudinaryId}`}
              alt={snapshot.tournamentName ?? ''}
              width={150}
              height={150}
              style={{ objectFit: 'cover' }}
            />
          </div>
        )}
        <div style={{ width: 1500, height: 150, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ height: 80, lineHeight: '80px', fontSize: 50, fontWeight: 900 }}>MATCH SUMMARY</div>
          <div style={{ height: 50, lineHeight: '50px', fontSize: 30, fontWeight: 900 }}>
            {snapshot.tournamentName ?? ''}
          </div>
        </div>
      </div>

      <div>
        <InningsSection
          label="First Innings"
          team={inn1BattingTeam}
          innings={inn1State}
          topBatters={inn1Batters}
          topBowlers={inn1Bowlers}
          isYetToBat={false}
        />
        <InningsSection
          label="Second Innings"
          team={inn2BattingTeam}
          innings={inn2State ?? null}
          topBatters={inn2Batters}
          topBowlers={inn2Bowlers}
          isYetToBat={!isInn2 && inn2State === null}
        />
      </div>

      {resultText && (
        <div style={{ marginTop: 20, width: 1500, lineHeight: '60px', height: 60, textAlign: 'center', border: '3px solid #b5b5b5' }}>
          <span style={{ fontSize: 40, fontWeight: 700, width: 1500, height: 60, lineHeight: '60px' }}>{resultText}</span>
        </div>
      )}
      </motion.div>
    </div>
  )
}
