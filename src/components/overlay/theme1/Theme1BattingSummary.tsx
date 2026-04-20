'use client'

import { motion } from 'framer-motion'
import type { MatchSnapshot } from '@/types/match'

const GOLD      = 'rgb(249,204,1)'
const GOLD_GRAD = 'linear-gradient(280deg, rgb(249,204,1) 0%, rgb(0,0,0) 100%)'
const DARK_BG   = 'rgb(10,10,10)'

type ResolvedBatter = {
  id: number
  name: string
  dismissalLeft: string
  dismissalRight: string
  runs: number | null
  balls: number | null
  fours: number | null
  sixes: number | null
  strikeRate: number | null
  isOut: boolean
  isStriker: boolean
  batted: boolean
}

function parseDismissal(text: string | null | undefined): { left: string; right: string } {
  if (!text) return { left: '', right: '' }
  const m = text.trim().match(/^(.*?)(\s+b\s+.+)$/i)
  return m ? { left: m[1].trim(), right: m[2].trim() } : { left: text.trim(), right: '' }
}

function resolveBatters(snapshot: MatchSnapshot): ResolvedBatter[] {
  return snapshot.battingTeamPlayers.map((p) => {
    const b   = snapshot.batters.find((x) => x.playerId === p.id)
    const dis = parseDismissal(b?.dismissalText)
    return {
      id:             p.id,
      name:           p.displayName,
      dismissalLeft:  b?.isOut ? dis.left  : b ? 'NOT OUT' : '',
      dismissalRight: b?.isOut ? dis.right : '',
      runs:           b?.runs    ?? null,
      balls:          b?.balls   ?? null,
      fours:          b?.fours   ?? null,
      sixes:          b?.sixes   ?? null,
      strikeRate:     b?.strikeRate ?? null,
      isOut:          b?.isOut   ?? false,
      isStriker:      b?.isStriker ?? false,
      batted:         !!b,
    }
  })
}

function ColHeader({ label, width, align }: { label: string; width: number; align: 'left' | 'center' }) {
  return (
    <div style={{
      width,
      flexShrink: 0,
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: '0.1em',
      color: GOLD,
      textAlign: align,
      textTransform: 'uppercase',
    }}>
      {label}
    </div>
  )
}

type Props = { snapshot: MatchSnapshot }

export function Theme1BattingSummary({ snapshot }: Props) {
  const innings = snapshot.currentInningsState
  if (!innings) return null

  const battingTeam = innings.battingTeamId === snapshot.homeTeam.id
    ? snapshot.homeTeam : snapshot.awayTeam
  const batterRuns  = snapshot.batters.reduce((s, b) => s + b.runs, 0)
  const extras      = Math.max(0, innings.totalRuns - batterRuns)
  const oversText   = `${innings.overs}.${innings.balls}`
  const scoreText   = `${innings.totalRuns}/${innings.wickets}`
  const resolvedBatters = resolveBatters(snapshot)

  return (
    <motion.div
      key="theme1-batting-summary"
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
          background: GOLD_GRAD,
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85 }}>
            {snapshot.tournamentName ?? 'BATTING SCORECARD'}
          </span>
          <span style={{ fontSize: 26, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
            {battingTeam.name}
          </span>
          <span style={{ fontSize: 22, fontWeight: 700, fontStyle: 'italic' }}>
            {innings.totalRuns}/{innings.wickets} · {oversText} ov
          </span>
        </div>

        {/* Column header row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: `1px solid rgba(249,204,1,0.4)`,
          padding: '0 28px',
          height: 36,
          background: 'rgba(249,204,1,0.08)',
          boxSizing: 'border-box',
        }}>
          {/* Spacer aligns with the 4px active-row border */}
          <div style={{ width: 18, flexShrink: 0 }} />
          <ColHeader label="BATTER"    width={340} align="left" />
          <ColHeader label="DISMISSAL" width={300} align="left" />
          <ColHeader label="R(B)"      width={140} align="center" />
          <ColHeader label="4s"        width={100} align="center" />
          <ColHeader label="6s"        width={100} align="center" />
          <ColHeader label="SR"        width={130} align="center" />
        </div>

        {/* All player rows */}
        {resolvedBatters.map((row, i) => {
          const isNonStriker = !row.isOut && row.batted && !row.isStriker
          // Striker: bright gold row. Non-striker: subtle gold tint. Others: alternating.
          const rowBg = row.isStriker
            ? 'rgba(249,204,1,0.22)'
            : isNonStriker
              ? 'rgba(249,204,1,0.09)'
              : i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent'
          const nameColor = row.isStriker
            ? GOLD
            : isNonStriker
              ? 'rgb(255,255,255)'
              : row.batted
                ? 'rgba(255,255,255,0.55)'
                : 'rgba(255,255,255,0.28)'

          return (
            <div key={row.id} style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 28px',
              height: 44,
              background: rowBg,
              borderLeft: row.isStriker ? `4px solid ${GOLD}` : isNonStriker ? '4px solid rgba(249,204,1,0.4)' : '4px solid transparent',
              boxSizing: 'border-box',
            }}>
              <div style={{ width: 14, flexShrink: 0 }} />

              {/* Batter name */}
              <div style={{
                width: 340,
                flexShrink: 0,
                fontSize: 22,
                fontWeight: row.isStriker || isNonStriker ? 700 : 500,
                color: nameColor,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {row.name}{row.isStriker ? ' *' : ''}
              </div>

              {/* Dismissal / status */}
              <div style={{
                width: 300,
                flexShrink: 0,
                fontSize: 14,
                fontWeight: 400,
                color: row.isStriker || isNonStriker ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {row.batted ? (
                  <>
                    {row.dismissalLeft}
                    {row.dismissalRight && <span style={{ opacity: 0.8 }}> {row.dismissalRight}</span>}
                  </>
                ) : null}
              </div>

              {/* R(B) */}
              <div style={{
                width: 140,
                flexShrink: 0,
                textAlign: 'center',
                fontSize: 22,
                fontWeight: 700,
                color: row.isStriker ? GOLD : isNonStriker ? 'rgba(249,204,1,0.8)' : 'rgba(255,255,255,0.55)',
              }}>
                {row.runs !== null ? (
                  <>{row.runs}<span style={{ fontSize: 14, opacity: 0.6 }}>({row.balls})</span></>
                ) : null}
              </div>

              {/* 4s */}
              <div style={{ width: 100, flexShrink: 0, textAlign: 'center', fontSize: 20, fontWeight: 600, color: row.batted ? 'inherit' : 'rgba(255,255,255,0.2)' }}>
                {row.fours !== null ? row.fours : null}
              </div>

              {/* 6s */}
              <div style={{ width: 100, flexShrink: 0, textAlign: 'center', fontSize: 20, fontWeight: 600, color: row.batted ? 'inherit' : 'rgba(255,255,255,0.2)' }}>
                {row.sixes !== null ? row.sixes : null}
              </div>

              {/* SR */}
              <div style={{ width: 130, flexShrink: 0, textAlign: 'center', fontSize: 18, fontWeight: 400, opacity: row.batted ? 0.8 : 0.2 }}>
                {row.strikeRate !== null ? row.strikeRate.toFixed(1) : null}
              </div>
            </div>
          )
        })}

        {/* Footer stats row */}
        <div style={{
          display: 'flex',
          alignItems: 'stretch',
          background: 'rgba(249,204,1,0.08)',
          borderTop: `2px solid rgba(249,204,1,0.5)`,
          height: 52,
        }}>
          {([
            { label: 'EXTRAS', value: String(extras) },
            { label: 'OVERS',  value: oversText },
            { label: 'TOTAL',  value: scoreText },
          ] as const).map((stat, i) => (
            <div key={stat.label} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderLeft: i > 0 ? `1px solid rgba(249,204,1,0.25)` : 'none',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: `rgba(249,204,1,0.7)`, textTransform: 'uppercase' }}>
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
