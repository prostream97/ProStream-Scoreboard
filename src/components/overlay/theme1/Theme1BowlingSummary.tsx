'use client'

import { motion } from 'framer-motion'
import type { MatchSnapshot } from '@/types/match'

const BLUE      = 'rgb(0,67,222)'
const BLUE_GRAD = 'linear-gradient(280deg, rgb(0,67,222) 0%, rgb(0,0,0) 100%)'
const DARK_BG   = 'rgb(10,10,10)'

function ColHeader({ label, width, align }: { label: string; width: number; align: 'left' | 'center' }) {
  return (
    <div style={{
      width,
      flexShrink: 0,
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: '0.1em',
      color: 'rgb(255,255,255)',
      textAlign: align,
      textTransform: 'uppercase',
    }}>
      {label}
    </div>
  )
}

type Props = { snapshot: MatchSnapshot }

export function Theme1BowlingSummary({ snapshot }: Props) {
  const innings = snapshot.currentInningsState
  if (!innings) return null

  const bowlingTeam = innings.bowlingTeamId === snapshot.homeTeam.id
    ? snapshot.homeTeam : snapshot.awayTeam

  const oversText = `${innings.overs}.${innings.balls}`

  return (
    <motion.div
      key="theme1-bowling-summary"
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
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
      <div style={{
        width: 1260,
        background: DARK_BG,
        color: 'rgb(255,255,255)',
        overflow: 'hidden',
        boxShadow: 'rgba(0,0,0,0.8) 0px 24px 60px 0px',
        maxHeight: 900,
      }}>

        {/* Header bar */}
        <div style={{
          background: BLUE_GRAD,
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85 }}>
            {snapshot.tournamentName ?? 'BOWLING SCORECARD'}
          </span>
          <span style={{ fontSize: 26, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
            {bowlingTeam.name}
          </span>
          <span style={{ fontSize: 22, fontWeight: 700, fontStyle: 'italic' }}>
            {innings.wickets}/{innings.totalRuns} · {oversText} ov
          </span>
        </div>

        {/* Column header row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: `1px solid rgba(0,67,222,0.4)`,
          padding: '0 28px',
          height: 36,
          background: 'rgba(0,67,222,0.08)',
          boxSizing: 'border-box',
        }}>
          <div style={{ width: 18, flexShrink: 0 }} />
          <ColHeader label="BOWLER" width={380} align="left" />
          <ColHeader label="O"      width={140} align="center" />
          <ColHeader label="M"      width={120} align="center" />
          <ColHeader label="R"      width={140} align="center" />
          <ColHeader label="W"      width={120} align="center" />
          <ColHeader label="ECON"   width={140} align="center" />
        </div>

        {/* Bowler rows */}
        {snapshot.bowlers.map((bowler, i) => {
          const rowBg = bowler.isCurrent
            ? 'rgba(0,67,222,0.22)'
            : i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent'
          const nameColor = 'rgb(255,255,255)'
          const statColor = 'rgb(255,255,255)'

          return (
            <div key={bowler.playerId} style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 28px',
              height: 44,
              background: rowBg,
              borderLeft: bowler.isCurrent ? `4px solid ${BLUE}` : '4px solid transparent',
              boxSizing: 'border-box',
            }}>
              <div style={{ width: 14, flexShrink: 0 }} />

              {/* Bowler name */}
              <div style={{
                width: 380,
                flexShrink: 0,
                fontSize: 22,
                fontWeight: bowler.isCurrent ? 700 : 500,
                color: nameColor,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {bowler.displayName}{bowler.isCurrent ? ' *' : ''}
              </div>

              {/* O (Overs) */}
              <div style={{ width: 140, flexShrink: 0, textAlign: 'center', fontSize: 22, fontWeight: 700, color: statColor }}>
                {bowler.overs}.{bowler.balls}
              </div>

              {/* M (Maidens) */}
              <div style={{ width: 120, flexShrink: 0, textAlign: 'center', fontSize: 20, fontWeight: 600, color: statColor }}>
                {bowler.maidens}
              </div>

              {/* R (Runs) */}
              <div style={{ width: 140, flexShrink: 0, textAlign: 'center', fontSize: 22, fontWeight: 700, color: statColor }}>
                {bowler.runs}
              </div>

              {/* W (Wickets) */}
              <div style={{ width: 120, flexShrink: 0, textAlign: 'center', fontSize: 22, fontWeight: 700, color: 'rgb(255,255,255)' }}>
                {bowler.wickets}
              </div>

              {/* ECON */}
              <div style={{ width: 140, flexShrink: 0, textAlign: 'center', fontSize: 18, fontWeight: 400, color: statColor }}>
                {bowler.economy.toFixed(2)}
              </div>
            </div>
          )
        })}

        {/* Footer stats row */}
        <div style={{
          display: 'flex',
          alignItems: 'stretch',
          background: 'rgba(0,67,222,0.08)',
          borderTop: `2px solid rgba(0,67,222,0.5)`,
          height: 52,
        }}>
          {([
            { label: 'WICKETS', value: String(innings.wickets) },
            { label: 'OVERS',   value: oversText },
            { label: 'RUNS',    value: String(innings.totalRuns) },
          ] as const).map((stat, i) => (
            <div key={stat.label} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderLeft: i > 0 ? `1px solid rgba(0,67,222,0.25)` : 'none',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>
                {stat.label}
              </span>
              <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>

      </div>
    </motion.div>
  )
}
