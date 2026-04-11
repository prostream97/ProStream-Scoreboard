'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { MatchSnapshot } from '@/types/match'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const BLUE  = '#232882'
const RED   = '#FF1E50'
const WHITE = '#FFFFFF'

type Props = { snapshot: MatchSnapshot; teamId: number; view: 'batting' | 'bowling' }

type TeamInfo = MatchSnapshot['homeTeam']

// ─── helpers ──────────────────────────────────────────────────────────────────

function cloudUrl(id: string, w: number, h: number) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_${w},h_${h},f_webp/${id}`
}

function parseDismissal(text: string | null | undefined) {
  if (!text) return { left: '', right: '' }
  const m = text.trim().match(/^(.*?)(\s+b\s+.+)$/i)
  return m ? { left: m[1].trim(), right: m[2].trim() } : { left: text.trim(), right: '' }
}

function resolveBatters(snapshot: MatchSnapshot) {
  return snapshot.battingTeamPlayers.map((p) => {
    const b   = snapshot.batters.find((x) => x.playerId === p.id)
    const dis = parseDismissal(b?.dismissalText)
    return {
      id:    p.id,
      name:  p.displayName,
      left:  b?.isOut ? dis.left  : b ? 'NOT OUT' : '',
      right: b?.isOut ? dis.right : '',
      runs:  b?.runs  ?? null,
      balls: b?.balls ?? null,
      isOut: b?.isOut  ?? false,
      batted: !!b,
    }
  })
}

// ─── Logo circle ──────────────────────────────────────────────────────────────

function Logo({ id, alt, fallback, size }: {
  id: string | null; alt: string; fallback: string; size: number
}) {
  return (
    <div style={{ width: size, height: size, borderRadius: 9999, overflow: 'hidden', background: WHITE, flexShrink: 0 }}>
      {id
        ? <Image src={cloudUrl(id, size, size)} alt={alt} width={size} height={size} style={{ objectFit: 'cover' }} />
        : <span style={{ color: BLUE, fontFamily: 'Lato, sans-serif', fontWeight: 700, fontSize: size * 0.3, display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>{fallback}</span>}
    </div>
  )
}

// ─── Team pill ────────────────────────────────────────────────────────────────

function TeamPill({ team, side }: { team: TeamInfo; side: 'left' | 'right' }) {
  const isLeft = side === 'left'
  return (
    <div style={{
      width: 670, height: 80,
      left: isLeft ? -2 : 678, top: 5,
      position: 'absolute',
      background: isLeft
        ? `linear-gradient(90deg, ${RED} 0%, ${WHITE} 14%)`
        : `linear-gradient(270deg, ${RED} 0%, ${WHITE} 14%)`,
      borderRadius: 80,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: isLeft ? 'row' : 'row-reverse',
      alignItems: 'center',
    }}>
      <div style={{ flexShrink: 0, width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Logo id={team.logoCloudinaryId} alt={team.name} fallback={team.shortCode.slice(0, 2)} size={72} />
      </div>
      <div style={{
        flex: 1,
        paddingLeft: isLeft ? 10 : 20,
        paddingRight: isLeft ? 20 : 10,
        color: BLUE,
        fontFamily: 'Lato, sans-serif',
        fontWeight: 700,
        fontSize: 36,
        lineHeight: 1.1,
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        textAlign: isLeft ? 'left' : 'right',
        maxHeight: 80,
        overflow: 'hidden',
      }}>
        {team.name.toUpperCase()}
      </div>
    </div>
  )
}

// ─── Shared frame shell (diagonal bg + Frame 2 container) ────────────────────

function OverlayShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 130, damping: 22 }}
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
    >
      <div style={{ width: 1920, height: 1080, position: 'relative', overflow: 'hidden' }}>
        {/* Diagonal gradient sweep */}
        <div style={{
          width: 1863.39, height: 1100.37,
          left: -240.97, top: 598.95,
          position: 'absolute',
          transform: 'rotate(-27deg)', transformOrigin: 'top left',
          borderRadius: '100%',
          background: 'linear-gradient(80deg, rgba(35,40,130,0.60) 24%, rgba(255,30,80,0.60) 100%)',
        }} />
        {/* Frame 2 */}
        <div style={{ width: 1346, height: 930, left: 261, top: 46, position: 'absolute', overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Shared bottom bar ────────────────────────────────────────────────────────

function BottomBar({
  streamerLabel, extras, oversText, scoreText, top,
}: {
  streamerLabel: string; extras: number; oversText: string; scoreText: string; top: number
}) {
  return (
    <div style={{ width: 1346, height: 90, left: 0, top, position: 'absolute' }}>
      {/* Left — tournament / streamer name */}
      <div style={{
        width: 310, height: 80, left: 0, top: 5, position: 'absolute',
        background: `linear-gradient(180deg, ${BLUE} 43%, #08091C 100%)`,
        borderRadius: 80, display: 'flex', justifyContent: 'center', alignItems: 'center',
        overflow: 'hidden', padding: '0 16px',
      }}>
        <span style={{ color: WHITE, fontSize: 26, fontFamily: 'Lato, sans-serif', fontWeight: 700, textAlign: 'center', lineHeight: 1.15, wordBreak: 'break-word' }}>
          {streamerLabel}
        </span>
      </div>

      {/* Middle — Extras | Overs */}
      <div style={{
        width: 706, height: 80, left: 320, top: 5, position: 'absolute',
        background: WHITE, borderRadius: 80, overflow: 'hidden', display: 'flex',
      }}>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: BLUE, fontSize: 34, fontFamily: 'Lato, sans-serif', fontWeight: 700 }}>
          EXTRAS {extras}
        </div>
        <div style={{ width: 2, background: RED, margin: '16px 0' }} />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: BLUE, fontSize: 34, fontFamily: 'Lato, sans-serif', fontWeight: 700 }}>
          OVERS {oversText}
        </div>
      </div>

      {/* Right — Score */}
      <div style={{
        width: 310, height: 80, left: 1036, top: 5, position: 'absolute',
        background: `linear-gradient(180deg, ${RED} 43%, #8B0020 100%)`,
        borderRadius: 80, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
      }}>
        <span style={{ color: WHITE, fontSize: 48, fontFamily: 'Lato, sans-serif', fontWeight: 700, letterSpacing: 2 }}>
          {scoreText}
        </span>
      </div>
    </div>
  )
}

// ─── Shared cell helpers ──────────────────────────────────────────────────────

const TABLE_TOP    = 260
const ROW_HEIGHT   = 57
const BOTTOM_BAR_H = 90
const BOTTOM_GAP   = 20
const FRAME_H      = 930
const MAX_TABLE_H  = FRAME_H - TABLE_TOP - BOTTOM_GAP - BOTTOM_BAR_H  // 560

function cellBase(isActive: boolean): React.CSSProperties {
  return {
    position: 'absolute',
    height: ROW_HEIGHT,
    overflow: 'hidden',
    background: isActive ? 'transparent' : WHITE,
    boxShadow: isActive ? undefined : '0px 20px 35px -15px rgba(35,40,130,0.15) inset',
  }
}

function numCell(isActive: boolean): React.CSSProperties {
  return {
    ...cellBase(isActive),
    boxShadow: isActive ? undefined : '20px 20px 35px -15px rgba(35,40,130,0.15) inset',
  }
}

function textStyle(color: string, weight = 700, extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    color,
    fontSize: 30.70,
    fontFamily: 'Lato, sans-serif',
    fontWeight: weight,
    wordWrap: 'break-word',
    ...extra,
  }
}

// ─── Batting scorecard ────────────────────────────────────────────────────────

function BattingScorecard({ snapshot }: { snapshot: MatchSnapshot }) {
  const innings       = snapshot.currentInningsState!
  const battingTeam   = innings.battingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
  const bowlingTeam   = innings.bowlingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
  const rows          = resolveBatters(snapshot)
  const batterRuns    = snapshot.batters.reduce((s, b) => s + b.runs, 0)
  const extras        = Math.max(0, innings.totalRuns - batterRuns)
  const oversText     = `${innings.overs}.${innings.balls}`
  const scoreText     = `${innings.totalRuns}/${innings.wickets}`
  const streamerLabel = (snapshot.tournamentName ?? 'ProStream').toUpperCase()
  const logoId        = snapshot.tournamentLogoCloudinaryId ?? null
  const logoFb        = snapshot.tournamentName ? snapshot.tournamentName.slice(0, 2).toUpperCase() : battingTeam.shortCode.slice(0, 2)
  const effectiveRowH   = rows.length > 0 ? Math.min(ROW_HEIGHT, Math.floor(MAX_TABLE_H / rows.length)) : ROW_HEIGHT
  const effectiveFontSz = Math.round(30.70 * effectiveRowH / ROW_HEIGHT)
  const tableHeight     = rows.length * effectiveRowH
  const bottomBarTop    = TABLE_TOP + tableHeight + BOTTOM_GAP

  return (
    <OverlayShell>
      {/* Tournament logo */}
      <div style={{ width: 150, height: 150, left: 598, top: 0, position: 'absolute', borderRadius: 100 }}>
        <Logo id={logoId} alt={snapshot.tournamentName ?? battingTeam.name} fallback={logoFb} size={150} />
      </div>

      {/* Team pills */}
      <div style={{ width: 1346, height: 90, left: 0, top: 160, position: 'absolute' }}>
        <TeamPill team={battingTeam} side="left" />
        <TeamPill team={bowlingTeam} side="right" />
      </div>

      {/* Batting table */}
      <div style={{ width: 1300, height: tableHeight, left: 23, top: TABLE_TOP, position: 'absolute', overflow: 'hidden', borderRadius: 10 }}>
        <div style={{ position: 'absolute', width: 1300, height: tableHeight }}>
          {rows.map((row, i) => {
            const hi    = row.batted && !row.isOut
            const color = hi ? WHITE : BLUE
            return (
              <div key={row.id} style={{
                width: 1300, height: effectiveRowH,
                left: 0, top: i * effectiveRowH,
                position: 'absolute',
                ...(hi ? { background: `linear-gradient(90deg, ${RED} 0%, ${BLUE} 100%)`, borderRadius: 37 } : {}),
              }}>
                <div style={{ ...cellBase(hi), left: 19.5, width: 481, height: effectiveRowH }}>
                  <div style={{ ...textStyle(color, 700, { fontSize: effectiveFontSz, left: 15, top: 10 }) }}>{row.name}</div>
                </div>
                <div style={{ ...cellBase(hi), left: 500.5, width: 300, borderLeft: `2px solid ${RED}`, height: effectiveRowH }}>
                  <div style={{ ...textStyle(color, 700, { fontSize: effectiveFontSz, left: 15, top: 10 }) }}>{row.left}</div>
                </div>
                <div style={{ ...cellBase(hi), left: 800.5, width: 300, height: effectiveRowH }}>
                  <div style={{ ...textStyle(color, 700, { fontSize: effectiveFontSz, left: 15, top: 10 }) }}>{row.right}</div>
                </div>
                <div style={{ ...numCell(hi), left: 1100.5, width: 90, borderLeft: `2px solid ${RED}`, height: effectiveRowH }}>
                  <div style={{ ...textStyle(color, 700, { fontSize: effectiveFontSz, left: 26.98, top: 10, textAlign: 'center' }) }}>{row.runs !== null ? row.runs : ''}</div>
                </div>
                <div style={{ ...numCell(hi), left: 1190.5, width: 90, borderLeft: `2px solid ${RED}`, height: effectiveRowH }}>
                  <div style={{ ...textStyle(color, 400, { fontSize: effectiveFontSz, left: 27.51, top: 10, textAlign: 'center' }) }}>{row.balls !== null ? row.balls : ''}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <BottomBar streamerLabel={streamerLabel} extras={extras} oversText={oversText} scoreText={scoreText} top={bottomBarTop} />
    </OverlayShell>
  )
}

// ─── Bowling scorecard ────────────────────────────────────────────────────────

function BowlingScorecard({ snapshot }: { snapshot: MatchSnapshot }) {
  const innings       = snapshot.currentInningsState!
  const battingTeam   = innings.battingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
  const bowlingTeam   = innings.bowlingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
  const rows          = snapshot.bowlers
  const batterRuns    = snapshot.batters.reduce((s, b) => s + b.runs, 0)
  const extras        = Math.max(0, innings.totalRuns - batterRuns)
  const oversText     = `${innings.overs}.${innings.balls}`
  const scoreText     = `${innings.totalRuns}/${innings.wickets}`
  const streamerLabel = (snapshot.tournamentName ?? 'ProStream').toUpperCase()
  const logoId        = snapshot.tournamentLogoCloudinaryId ?? null
  const logoFb        = snapshot.tournamentName ? snapshot.tournamentName.slice(0, 2).toUpperCase() : bowlingTeam.shortCode.slice(0, 2)
  const effectiveRowH   = rows.length > 0 ? Math.min(ROW_HEIGHT, Math.floor(MAX_TABLE_H / rows.length)) : ROW_HEIGHT
  const effectiveFontSz = Math.round(30.70 * effectiveRowH / ROW_HEIGHT)
  const tableHeight     = rows.length * effectiveRowH
  const bottomBarTop    = TABLE_TOP + tableHeight + BOTTOM_GAP

  // Column x-positions for bowling (5 cols within 1300px)
  const COL = {
    name:    { left: 19.5,   width: 481 },
    overs:   { left: 500.5,  width: 195 },
    runs:    { left: 695.5,  width: 195 },
    wickets: { left: 890.5,  width: 195 },
    economy: { left: 1085.5, width: 195 },
  }

  return (
    <OverlayShell>
      {/* Tournament logo */}
      <div style={{ width: 150, height: 150, left: 598, top: 0, position: 'absolute', borderRadius: 100 }}>
        <Logo id={logoId} alt={snapshot.tournamentName ?? bowlingTeam.name} fallback={logoFb} size={150} />
      </div>

      {/* Team pills — batting left, bowling right */}
      <div style={{ width: 1346, height: 90, left: 0, top: 160, position: 'absolute' }}>
        <TeamPill team={battingTeam} side="left" />
        <TeamPill team={bowlingTeam} side="right" />
      </div>

      {/* Bowling table */}
      <div style={{ width: 1300, height: tableHeight, left: 23, top: TABLE_TOP, position: 'absolute', overflow: 'hidden', borderRadius: 10 }}>
        <div style={{ position: 'absolute', width: 1300, height: tableHeight }}>
          {rows.map((row, i) => {
            const hi    = row.isCurrent
            const color = hi ? WHITE : BLUE
            return (
              <div key={row.playerId} style={{
                width: 1300, height: effectiveRowH,
                left: 0, top: i * effectiveRowH,
                position: 'absolute',
                ...(hi ? { background: `linear-gradient(90deg, ${RED} 0%, ${BLUE} 100%)`, borderRadius: 37 } : {}),
              }}>
                {/* name */}
                <div style={{ ...cellBase(hi), ...COL.name, height: effectiveRowH }}>
                  <div style={{ ...textStyle(color, 700, { fontSize: effectiveFontSz, left: 15, top: 10 }) }}>{row.displayName}</div>
                </div>
                {/* overs */}
                <div style={{ ...numCell(hi), ...COL.overs, borderLeft: `2px solid ${RED}`, height: effectiveRowH }}>
                  <div style={{ ...textStyle(color, 700, { fontSize: effectiveFontSz, left: 0, top: 10, width: '100%', textAlign: 'center' }) }}>{row.overs}.{row.balls}</div>
                </div>
                {/* runs */}
                <div style={{ ...numCell(hi), ...COL.runs, borderLeft: `2px solid ${RED}`, height: effectiveRowH }}>
                  <div style={{ ...textStyle(color, 700, { fontSize: effectiveFontSz, left: 0, top: 10, width: '100%', textAlign: 'center' }) }}>{row.runs}</div>
                </div>
                {/* wickets */}
                <div style={{ ...numCell(hi), ...COL.wickets, borderLeft: `2px solid ${RED}`, height: effectiveRowH }}>
                  <div style={{ ...textStyle(color, 700, { fontSize: effectiveFontSz, left: 0, top: 10, width: '100%', textAlign: 'center' }) }}>{row.wickets}</div>
                </div>
                {/* economy */}
                <div style={{ ...numCell(hi), ...COL.economy, borderLeft: `2px solid ${RED}`, height: effectiveRowH }}>
                  <div style={{ ...textStyle(color, 400, { fontSize: effectiveFontSz, left: 0, top: 10, width: '100%', textAlign: 'center' }) }}>{row.economy.toFixed(1)}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <BottomBar streamerLabel={streamerLabel} extras={extras} oversText={oversText} scoreText={scoreText} top={bottomBarTop} />
    </OverlayShell>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function StandardTeamSummaryOverlay({ snapshot, view }: Props) {
  const innings = snapshot.currentInningsState
  if (!innings) return null

  if (view === 'bowling') return <BowlingScorecard snapshot={snapshot} />
  return <BattingScorecard snapshot={snapshot} />
}
