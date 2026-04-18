'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { MatchSnapshot } from '@/types/match'
import type { WicketPayload } from '@/types/pusher'

type Props = {
  snapshot: MatchSnapshot
  boundary: { id: number; runs: 4 | 6 } | null
  wicket: WicketPayload | null
}

function getBallCircleStyle(ball: MatchSnapshot['currentOverBalls'][number]): React.CSSProperties {
  if (ball.isWicket) {
    return { background: '#ef4444', color: '#fff' }
  }
  if (ball.isBoundary && ball.runs === 6) {
    return { background: '#a855f7', color: '#fff' }
  }
  if (ball.isBoundary) {
    return { background: '#22c55e', color: '#fff' }
  }
  if (!ball.isLegal) {
    return { background: '#eab308', color: '#000' }
  }
  if (ball.runs > 0) {
    return { background: '#3b82f6', color: '#fff' }
  }
  return { background: '#cccccc', color: '#fff' }
}

function getBallLabel(ball: MatchSnapshot['currentOverBalls'][number]): string {
  if (ball.isWicket) return 'W'
  if (!ball.isLegal && ball.extraType === 'wide') return 'Wd'
  if (!ball.isLegal && ball.extraType === 'noball') return 'Nb'
  if (ball.runs === 0) return '0'
  return String(ball.runs)
}

function BatIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4, flexShrink: 0 }}
    >
      <path d="M17.5 3.5L20.5 6.5L9 18L6 15L17.5 3.5ZM3 20L6.5 16.5L7.5 17.5L4 21L3 20Z" />
    </svg>
  )
}

function BallIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4, flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" />
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
        fill="none"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1"
      />
      <path
        d="M4.93 7.07C6.1 5.03 8.06 3.6 10.36 3.13M19.07 4.93c2.04 1.17 3.47 3.13 3.94 5.43M3.13 13.64C3.6 15.94 5.03 17.9 7.07 19.07M13.64 20.87c2.3-.47 4.26-1.9 5.43-3.94"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}

function formatOvers(overs: number, balls: number): string {
  return `${overs}.${balls}`
}

function formatBowlingFigures(wickets: number, runs: number, overs: number, balls: number): string {
  return `${wickets}-${runs} (${overs}.${balls})`
}

function inningsLabel(n: 1 | 2): string {
  return n === 1 ? '(1)' : '(2)'
}

/** Full HD design frame (1080p); scorebug is laid out to this width; bar height is fixed in the frame. */
const DESIGN_W = 1920
const SCOREBUG_H = 105
/** Slightly wider than ~68% so batter names + scores fit without clipping. */
const LEFT_PANEL_W = Math.round(DESIGN_W * 0.691)
const RIGHT_PANEL_W = DESIGN_W - LEFT_PANEL_W
const LEFT_GRADIENT_OVERLAY_W = Math.round(DESIGN_W * 0.48)
const RIGHT_GRADIENT_OVERLAY_W = Math.round(DESIGN_W * 0.4)
const TEAM_INFO_W = 450
const BATTERS_SECTION_W = 650
const RIGHT_BOWLER_AREA_W = RIGHT_PANEL_W - 160 - 25

export function RetroPulseScorebug({ snapshot, boundary, wicket }: Props) {
  const [boundaryAnimation, setBoundaryAnimation] = useState<4 | 6 | null>(null)
  const shownBoundaryIdRef = useRef<number | null>(null)
  const hideBoundaryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [wicketAnimation, setWicketAnimation] = useState(false)
  const shownWicketKeyRef = useRef<string | null>(null)
  const hideWicketTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const innings = snapshot.currentInningsState
  const isSecondInnings = snapshot.currentInnings === 2

  const battingTeam =
    innings?.battingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
  const bowlingTeam =
    innings?.bowlingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam

  type BatterDisplay = { displayName: string; runs: number; balls: number; isStriker: boolean }
  const activeBatters = snapshot.batters.filter((b) => !b.isOut)
  const isDismissed = (id: number | null) =>
    id !== null && snapshot.batters.some((b) => b.playerId === id && b.isOut)

  let striker: BatterDisplay | undefined = activeBatters.find((b) => b.isStriker)
  if (!striker && snapshot.strikerId && !isDismissed(snapshot.strikerId)) {
    const p = snapshot.battingTeamPlayers.find((pl) => pl.id === snapshot.strikerId)
    if (p) striker = { displayName: p.displayName, runs: 0, balls: 0, isStriker: true }
  }

  const strikerPlayerId = activeBatters.find((b) => b.isStriker)?.playerId ?? snapshot.strikerId
  let nonStriker: BatterDisplay | undefined = activeBatters.find((b) => b.playerId !== strikerPlayerId)
  if (!nonStriker && snapshot.nonStrikerId && snapshot.nonStrikerId !== strikerPlayerId && !isDismissed(snapshot.nonStrikerId)) {
    const p = snapshot.battingTeamPlayers.find((pl) => pl.id === snapshot.nonStrikerId)
    if (p) nonStriker = { displayName: p.displayName, runs: 0, balls: 0, isStriker: false }
  }

  let currentBowler =
    snapshot.bowlers.find((b) => b.isCurrent)
    ?? snapshot.bowlers[snapshot.bowlers.length - 1]
    ?? null
  if (!currentBowler && snapshot.currentBowlerId) {
    const p = snapshot.bowlingTeamPlayers.find((pl) => pl.id === snapshot.currentBowlerId)
    if (p) {
      currentBowler = {
        playerId: p.id,
        playerName: p.name,
        displayName: p.displayName,
        overs: 0,
        balls: 0,
        maidens: 0,
        runs: 0,
        wickets: 0,
        economy: 0,
        isCurrent: true,
      }
    }
  }
  const currentBowlerName = currentBowler
    ? (
      currentBowler.displayName
      || currentBowler.playerName
      || snapshot.bowlingTeamPlayers.find((p) => p.id === currentBowler.playerId)?.displayName
      || snapshot.bowlingTeamPlayers.find((p) => p.id === currentBowler.playerId)?.name
      || 'Bowler'
    )
    : 'Bowler'

  const runs = innings?.totalRuns ?? 0
  const wickets = innings?.wickets ?? 0
  const overs = innings?.overs ?? 0
  const balls = innings?.balls ?? 0
  const target = isSecondInnings ? (innings?.target ?? null) : null

  const crr = snapshot.currentRunRate.toFixed(2)
  const rrr = isSecondInnings && snapshot.requiredRunRate != null
    ? snapshot.requiredRunRate.toFixed(2)
    : null

  const overBalls = snapshot.currentOverBalls ?? []
  const tickerText = rrr ? `CRR: ${crr} RRR: ${rrr}` : `CRR: ${crr}`

  // ── Innings break data ────────────────────────────────────────────────────
  const inn1State = snapshot.innings[0] ?? null
  const inn2State = snapshot.innings[1] ?? null
  const inn1BattingTeam = inn1State?.battingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
  const inn2BattingTeam = inn1State?.bowlingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
  const inn2BowlingTeam = inn1BattingTeam
  const breakTarget = inn2State?.target ?? (inn1State ? inn1State.totalRuns + 1 : null)

  // ── Match result data ─────────────────────────────────────────────────────
  const resultWinner = snapshot.resultWinnerId != null
    ? (snapshot.resultWinnerId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam)
    : null
  const resultLoser = resultWinner != null
    ? (resultWinner.id === snapshot.homeTeam.id ? snapshot.awayTeam : snapshot.homeTeam)
    : null
  let resultText = 'MATCH COMPLETE'
  if (snapshot.resultType === 'wickets') {
    resultText = `WON BY ${snapshot.resultMargin} WICKET${snapshot.resultMargin !== 1 ? 'S' : ''}`
  } else if (snapshot.resultType === 'runs') {
    resultText = `WON BY ${snapshot.resultMargin} RUN${snapshot.resultMargin !== 1 ? 'S' : ''}`
  } else if (snapshot.resultType === 'tie') {
    resultText = 'MATCH TIED'
  }

  // ── Last over indicator ───────────────────────────────────────────────────
  const isLastOver = overs === snapshot.totalOvers - 1 && balls > 0
  const oversColor = isLastOver ? '#f59e0b' : '#fff'

  useEffect(() => {
    if (!boundary) return
    if (boundary.id === shownBoundaryIdRef.current) return
    shownBoundaryIdRef.current = boundary.id

    setBoundaryAnimation(boundary.runs)
    if (hideBoundaryTimeoutRef.current) clearTimeout(hideBoundaryTimeoutRef.current)
    hideBoundaryTimeoutRef.current = setTimeout(() => {
      setBoundaryAnimation(null)
    }, 2000)
  }, [boundary])

  useEffect(() => {
    if (!wicket) return
    const key = `${wicket.dismissedBatterId}-${wicket.inningsWickets}`
    if (key === shownWicketKeyRef.current) return
    shownWicketKeyRef.current = key

    setWicketAnimation(true)
    if (hideWicketTimeoutRef.current) clearTimeout(hideWicketTimeoutRef.current)
    hideWicketTimeoutRef.current = setTimeout(() => {
      setWicketAnimation(false)
    }, 2000)
  }, [wicket])

  useEffect(() => {
    if (boundary != null) return
    shownBoundaryIdRef.current = null
    setBoundaryAnimation(null)
    if (hideBoundaryTimeoutRef.current) {
      clearTimeout(hideBoundaryTimeoutRef.current)
      hideBoundaryTimeoutRef.current = null
    }
  }, [boundary])

  useEffect(() => {
    if (wicket != null) return
    shownWicketKeyRef.current = null
    setWicketAnimation(false)
    if (hideWicketTimeoutRef.current) {
      clearTimeout(hideWicketTimeoutRef.current)
      hideWicketTimeoutRef.current = null
    }
  }, [wicket])

  useEffect(() => {
    return () => {
      if (hideBoundaryTimeoutRef.current) clearTimeout(hideBoundaryTimeoutRef.current)
      if (hideWicketTimeoutRef.current) clearTimeout(hideWicketTimeoutRef.current)
    }
  }, [])

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    width: DESIGN_W,
    maxWidth: 'min(100vw, 1920px)',
    height: SCOREBUG_H,
    marginLeft: 'auto',
    marginRight: 'auto',
    background: 'rgb(0,0,0)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    fontFamily: "'Source Sans Pro', 'Arial', 'Helvetica Neue', sans-serif",
    overflow: 'hidden',
    zIndex: 9999,
  }

  const leftPanelStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    background: 'linear-gradient(90deg, rgba(249,204,1,0) 0%, rgba(249,204,1,0) 40%, rgb(249,204,1) 100%)',
    width: LEFT_PANEL_W,
    flexShrink: 0,
    overflow: 'hidden',
    color: '#fff',
  }

  const batterInfoStyle: React.CSSProperties = {
    display: 'flex',
    flex: '1 1 auto',
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  }

  const scoreAndTeamInfoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
  }

  const teamNameStyle: React.CSSProperties = {
    width: 160,
    height: 107,
    minWidth: 160,
    fontSize: 50,
    fontWeight: 'bold',
    lineHeight: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    letterSpacing: '-1px',
  }

  const teamInfoStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 9,
    display: 'flex',
    justifyContent: 'space-between',
    width: TEAM_INFO_W,
    margin: '0 24px',
  }

  const scoreInfoStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: TEAM_INFO_W,
  }

  const scoreInfoWrapperStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
  }

  const scoreTextStyle: React.CSSProperties = {
    fontSize: 50,
    fontWeight: 'bold',
    fontStyle: 'italic',
    background: 'linear-gradient(90deg, rgba(249, 204, 1, 1) 0%, rgba(0, 0, 0, 1) 100%)',
    WebkitBackgroundClip: 'unset',
    WebkitTextFillColor: 'unset',
    backgroundClip: 'unset',
    color: 'rgba(255, 255, 255, 1)',
    lineHeight: '50px',
    marginRight: 25,
    padding: '5px 10px',
    whiteSpace: 'nowrap',
  }

  const matchOverStyle: React.CSSProperties = {
    fontSize: 30,
    color: '#fff',
    fontStyle: 'italic',
    fontWeight: 700,
    lineHeight: '30px',
    whiteSpace: 'nowrap',
  }

  const battersSectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    boxSizing: 'border-box',
    width: BATTERS_SECTION_W,
    minWidth: 0,
    padding: 10,
    overflow: 'hidden',
  }

  const batterRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minWidth: 0,
    margin: '6px 0',
    whiteSpace: 'nowrap',
  }

  const batterNameStyle: React.CSSProperties = {
    fontSize: 35,
    fontWeight: 700,
    color: '#fff',
    lineHeight: '35px',
    whiteSpace: 'nowrap',
  }

  const batterScoreStyle: React.CSSProperties = {
    fontSize: 35,
    color: '#fff',
    fontWeight: 700,
    lineHeight: '35px',
    whiteSpace: 'nowrap',
  }

  const tickerWrapStyle: React.CSSProperties = {
    display: 'flex',
    padding: '10px 0',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    width: TEAM_INFO_W,
    position: 'relative',
  }

  const leftTargetStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    textAlign: 'center',
    color: '#fff',
    minWidth: target != null ? 140 : 0,
    flexShrink: 0,
    marginLeft: 10,
  }

  // Right panel (bowling team)
  const rightPanelStyle: React.CSSProperties = {
    display: 'flex',
    position: 'relative',
    alignItems: 'center',
    background: 'linear-gradient(280deg, rgb(0,67,222) 0%, rgb(0,0,0) 90%)',
    paddingLeft: 25,
    width: RIGHT_PANEL_W,
    flexShrink: 0,
    color: '#fff',
  }

  const bowlerInformationStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    width: RIGHT_BOWLER_AREA_W,
    flexShrink: 0,
    alignItems: 'center',
  }

  const bowlerWrapperStyle: React.CSSProperties = {
    flex: '1 1 auto',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  }

  const bowlingTeamNameStyle: React.CSSProperties = {
    width: 160,
    height: 107,
    minWidth: 160,
    fontSize: 50,
    fontWeight: 'bold',
    lineHeight: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    letterSpacing: '-1px',
  }

  const bowlerRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    width: RIGHT_BOWLER_AREA_W,
    margin: '6px 0',
    whiteSpace: 'nowrap',
  }

  const bowlerNameStyle: React.CSSProperties = {
    fontSize: 35,
    lineHeight: '35px',
    fontWeight: 700,
    color: '#fff',
    whiteSpace: 'nowrap',
  }

  const bowlerFiguresStyle: React.CSSProperties = {
    fontSize: 35,
    lineHeight: '35px',
    fontWeight: 700,
    color: '#fff',
  }

  const ballCirclesRowStyle: React.CSSProperties = {
    display: 'flex',
    marginTop: 13,
    justifyContent: 'flex-start',
  }

  const ballCircleBaseStyle: React.CSSProperties = {
    borderRadius: '50%',
    width: 32,
    height: 32,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    fontWeight: 'bold',
    lineHeight: '32px',
    margin: '0 3px',
    textTransform: 'lowercase',
  }

  return (
    <motion.div
      key="retropulse-scorebug"
      initial={{ y: SCOREBUG_H, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: SCOREBUG_H, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={containerStyle}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: LEFT_GRADIENT_OVERLAY_W,
          height: SCOREBUG_H,
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: RIGHT_GRADIENT_OVERLAY_W,
          height: SCOREBUG_H,
          opacity: 0.2,
          background: 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,67,222,0.9) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── INNINGS BREAK ─────────────────────────────────────────────────── */}
      {snapshot.status === 'break' && inn1State && (
        <>
          {/* Gold left: inn2 batting team */}
          <div style={{
            width: 160, minWidth: 160, height: SCOREBUG_H,
            background: 'rgb(249,204,1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 46, fontWeight: 'bold', color: '#000', letterSpacing: '-1px', flexShrink: 0,
          }}>
            {inn2BattingTeam.shortCode}
          </div>

          {/* Center: inn1 result + target + chase info */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 48, color: '#fff',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, letterSpacing: 2, opacity: 0.6, textTransform: 'uppercase', marginBottom: 4 }}>
                {inn1BattingTeam.shortCode} INNINGS
              </div>
              <div style={{ fontSize: 44, fontWeight: 'bold', fontStyle: 'italic', lineHeight: 1 }}>
                {inn1State.totalRuns}/{inn1State.wickets}
              </div>
              <div style={{ fontSize: 14, opacity: 0.6, marginTop: 4 }}>
                {inn1State.overs}.{inn1State.balls} ov
              </div>
            </div>

            <div style={{ width: 1, height: 60, background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, letterSpacing: 2, opacity: 0.6, textTransform: 'uppercase', marginBottom: 4 }}>
                TARGET
              </div>
              <div style={{ fontSize: 55, fontWeight: 'bold', color: 'rgb(249,204,1)', lineHeight: 1 }}>
                {breakTarget}
              </div>
            </div>

            <div style={{ width: 1, height: 60, background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, letterSpacing: 3, fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.9 }}>
                INNINGS BREAK
              </div>
              <div style={{ fontSize: 12, opacity: 0.5, marginTop: 6 }}>
                {inn2BattingTeam.shortCode} need {breakTarget} off {snapshot.totalOvers} overs
              </div>
            </div>
          </div>

          {/* Blue right: inn2 bowling team */}
          <div style={{
            width: 160, minWidth: 160, height: SCOREBUG_H,
            background: 'rgb(0,67,222)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 46, fontWeight: 'bold', color: '#fff', letterSpacing: '-1px', flexShrink: 0,
          }}>
            {inn2BowlingTeam.shortCode}
          </div>
        </>
      )}

      {/* ── MATCH RESULT ──────────────────────────────────────────────────── */}
      {snapshot.status === 'complete' && (
        <>
          {/* Gold left: winner team */}
          <div style={{
            width: 160, minWidth: 160, height: SCOREBUG_H,
            background: 'rgb(249,204,1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 46, fontWeight: 'bold', color: '#000', letterSpacing: '-1px', flexShrink: 0,
          }}>
            {resultWinner?.shortCode ?? snapshot.homeTeam.shortCode}
          </div>

          {/* Center: result text + both innings scores */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 40, color: '#fff',
          }}>
            {inn1State && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, opacity: 0.6, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>
                  {inn1State.battingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam.shortCode : snapshot.awayTeam.shortCode}
                </div>
                <div style={{ fontSize: 36, fontWeight: 'bold', fontStyle: 'italic', lineHeight: 1 }}>
                  {inn1State.totalRuns}/{inn1State.wickets}
                </div>
                <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>{inn1State.overs}.{inn1State.balls} ov</div>
              </div>
            )}

            <div style={{ width: 1, height: 60, background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />

            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              {snapshot.resultType !== 'tie' && resultWinner && (
                <div style={{ fontSize: 12, opacity: 0.6, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
                  {resultWinner.shortCode}
                </div>
              )}
              <div style={{
                fontSize: snapshot.resultType === 'tie' ? 32 : 26,
                fontWeight: 'bold',
                color: 'rgb(249,204,1)',
                letterSpacing: 1,
                textTransform: 'uppercase',
                lineHeight: 1.1,
              }}>
                {resultText}
              </div>
            </div>

            {inn2State && (
              <>
                <div style={{ width: 1, height: 60, background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, opacity: 0.6, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>
                    {inn2State.battingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam.shortCode : snapshot.awayTeam.shortCode}
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 'bold', fontStyle: 'italic', lineHeight: 1 }}>
                    {inn2State.totalRuns}/{inn2State.wickets}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>{inn2State.overs}.{inn2State.balls} ov</div>
                </div>
              </>
            )}
          </div>

          {/* Blue right: loser team */}
          <div style={{
            width: 160, minWidth: 160, height: SCOREBUG_H,
            background: 'rgb(0,67,222)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 46, fontWeight: 'bold', color: '#fff', letterSpacing: '-1px', flexShrink: 0,
          }}>
            {resultLoser?.shortCode ?? snapshot.awayTeam.shortCode}
          </div>
        </>
      )}

      {/* ── LIVE SCOREBUG ─────────────────────────────────────────────────── */}
      {snapshot.status !== 'break' && snapshot.status !== 'complete' && <>
      {/* ── LEFT PANEL (batting) ─────────────────────────────────────────── */}
      <div style={leftPanelStyle}>
        <div style={batterInfoStyle}>
          <div style={scoreAndTeamInfoStyle}>
            <div style={teamNameStyle}>{battingTeam.shortCode}</div>
            <div style={teamInfoStyle}>
              <div style={scoreInfoStyle}>
                <div style={scoreInfoWrapperStyle}>
                  <div style={scoreTextStyle}>{runs}-{wickets}</div>
                  <div style={{ ...matchOverStyle, color: oversColor }}>
                    {formatOvers(overs, balls)}
                    <span style={{ marginLeft: 10 }}>{inningsLabel(snapshot.currentInnings)}</span>
                  </div>
                </div>
                <div style={tickerWrapStyle}>
                  <div
                    style={{
                      display: 'inline-block',
                      minWidth: TEAM_INFO_W,
                      animation: 'theme1-marquee 6s linear 2s infinite',
                      fontSize: 20,
                      lineHeight: '25px',
                      color: 'rgba(255, 255, 255, 1)',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                    }}
                  >
                    {tickerText}
                  </div>
                  <div
                    style={{
                      display: 'inline-block',
                      minWidth: TEAM_INFO_W,
                      animation: 'theme1-marquee 6s linear 2s infinite',
                      fontSize: 20,
                      lineHeight: '25px',
                      color: 'rgba(255, 255, 255, 1)',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                    }}
                  >
                    {tickerText}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={battersSectionStyle}>
            <div
              style={{
                position: 'relative',
                width: '100%',
                minWidth: 0,
                minHeight: SCOREBUG_H - 20,
              }}
            >
              <div style={{ visibility: boundaryAnimation ? 'hidden' : 'visible' }}>
                {striker && (
                  <div style={batterRowStyle}>
                    <span style={{ display: 'flex', alignItems: 'center', marginRight: 10, minWidth: 0, flex: 1 }}>
                      <BatIcon />
                      <span style={batterNameStyle}>{striker.displayName}</span>
                    </span>
                    <span style={{ ...batterScoreStyle, flexShrink: 0 }}>{striker.runs} ({striker.balls})</span>
                  </div>
                )}
                {nonStriker && (
                  <div style={{ ...batterRowStyle, opacity: 0.75 }}>
                    <span style={{ display: 'flex', alignItems: 'center', marginRight: 10, minWidth: 0, flex: 1 }}>
                      <span style={{ width: 20 }} />
                      <span style={batterNameStyle}>{nonStriker.displayName}</span>
                    </span>
                    <span style={{ ...batterScoreStyle, flexShrink: 0 }}>{nonStriker.runs} ({nonStriker.balls})</span>
                  </div>
                )}
              </div>

              {boundaryAnimation && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <span
                  style={{
                    textShadow: 'rgb(255,255,255) 1px 1px 1px, rgb(255,255,255) 1px 2px 1px, rgb(255,255,255) 1px 3px 1px, rgb(255,255,255) 1px 4px 1px, rgb(255,255,255) 1px 5px 1px, rgb(255,255,255) 1px 6px 1px, rgb(255,255,255) 1px 7px 1px, rgb(255,255,255) 1px 8px 1px, rgb(255,255,255) 1px 9px 1px, rgb(255,255,255) 1px 10px 1px, rgba(16,16,16,0.4) 1px 18px 6px, rgba(16,16,16,0.2) 1px 22px 10px, rgba(16,16,16,0.2) 1px 25px 35px, rgba(16,16,16,0.4) 1px 30px 60px',
                    fontSize: 78,
                    fontWeight: 'bold',
                    display: 'inline-block',
                    animation: boundaryAnimation === 6 ? 'theme1-six-pulse 2s ease 0s infinite' : 'theme1-four-pulse 2s ease 0s infinite',
                    lineHeight: 1,
                    color: '#fff',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  {boundaryAnimation === 6 ? 'SIX' : 'FOUR'}
                </span>
              </div>
              )}
            </div>
          </div>

          {target != null && (
            <div style={leftTargetStyle}>
              <div style={{ fontSize: 24, fontStyle: 'italic', fontWeight: 600, lineHeight: 1.1, marginBottom: 4 }}>
                TARGET
              </div>
              <div style={{ fontSize: 32, fontStyle: 'italic', fontWeight: 'bold', color: '#fff', lineHeight: 1.1 }}>
                {target}
              </div>
            </div>
          )}
        </div>

        <style>{`
          @keyframes theme1-marquee {
            0%   { transform: translateX(0%); }
            100% { transform: translateX(-100%); }
          }
          @keyframes theme1-four-pulse {
            0% { letter-spacing: 1.2em; opacity: 0.2; transform: scale(1.1); }
            40% { opacity: 0.8; }
            50% { letter-spacing: 0.1em; opacity: 1; transform: scale(1); }
            60% { opacity: 0.8; }
            100% { letter-spacing: 1.2em; opacity: 0.2; transform: scale(1.1); }
          }
          @keyframes theme1-six-pulse {
            0% { letter-spacing: 0.7em; opacity: 0.2; transform: scale(1.1); }
            40% { opacity: 0.8; }
            50% { letter-spacing: 0.1em; opacity: 1; transform: scale(1); }
            60% { opacity: 0.8; }
            100% { letter-spacing: 0.7em; opacity: 0.2; transform: scale(1.1); }
          }
          @keyframes theme1-wicket-pulse {
            0% { letter-spacing: 0.5em; opacity: 0.2; transform: scale(1.08); }
            40% { opacity: 0.85; }
            50% { letter-spacing: 0.08em; opacity: 1; transform: scale(1); }
            60% { opacity: 0.85; }
            100% { letter-spacing: 0.5em; opacity: 0.2; transform: scale(1.08); }
          }
        `}</style>
      </div>

      <div style={rightPanelStyle}>
        <div style={bowlerInformationStyle}>
          <div
            style={{
              ...bowlerWrapperStyle,
              position: 'relative',
              height: SCOREBUG_H,
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                visibility: wicketAnimation ? 'hidden' : 'visible',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                width: '100%',
                minHeight: 0,
                flex: 1,
              }}
            >
              {currentBowler && (
                <div style={bowlerRowStyle}>
                  <span style={{ display: 'flex', alignItems: 'center', marginRight: 10, minWidth: 0, flex: 1 }}>
                    <BallIcon />
                    <span style={bowlerNameStyle}>{currentBowlerName}</span>
                  </span>
                  <span style={{ ...bowlerFiguresStyle, flexShrink: 0 }}>
                    {formatBowlingFigures(
                      currentBowler.wickets,
                      currentBowler.runs,
                      currentBowler.overs,
                      currentBowler.balls,
                    )}
                  </span>
                </div>
              )}

              <div style={ballCirclesRowStyle}>
                {Array.from({ length: snapshot.ballsPerOver }, (_, i) => {
                  const ball = overBalls[i]
                  if (!ball) {
                    return (
                      <div
                        key={i}
                        style={{
                          ...ballCircleBaseStyle,
                          background: '#cccccc',
                        }}
                      />
                    )
                  }
                  return (
                    <div
                      key={i}
                      style={{ ...ballCircleBaseStyle, ...getBallCircleStyle(ball) }}
                    >
                      {getBallLabel(ball)}
                    </div>
                  )
                })}
              </div>
            </div>

            {wicketAnimation && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <span
                  style={{
                    textShadow:
                      'rgb(255,255,255) 1px 1px 1px, rgb(255,255,255) 1px 2px 1px, rgb(255,255,255) 1px 3px 1px, rgb(255,255,255) 1px 4px 1px, rgb(255,255,255) 1px 5px 1px, rgb(255,255,255) 1px 6px 1px, rgb(255,255,255) 1px 7px 1px, rgb(255,255,255) 1px 8px 1px, rgb(255,255,255) 1px 9px 1px, rgb(255,255,255) 1px 10px 1px, rgba(16,16,16,0.4) 1px 18px 6px, rgba(16,16,16,0.2) 1px 22px 10px, rgba(16,16,16,0.2) 1px 25px 35px, rgba(16,16,16,0.4) 1px 30px 60px',
                    fontSize: 78,
                    fontWeight: 'bold',
                    display: 'inline-block',
                    animation: 'theme1-wicket-pulse 2s ease 0s infinite',
                    lineHeight: 1,
                    color: '#fff',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  WICKET
                </span>
              </div>
            )}
          </div>
        </div>
        <div style={bowlingTeamNameStyle}>{bowlingTeam.shortCode}</div>
      </div>
      </>}
    </motion.div>
  )
}
