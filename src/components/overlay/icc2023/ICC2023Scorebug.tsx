'use client'

import type { MatchSnapshot, BatterStats, BowlerStats } from '@/types/match'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { ICC } from './tokens'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

type Props = { snapshot: MatchSnapshot }

export function ICC2023Scorebug({ snapshot }: Props) {
  const inn = snapshot.currentInningsState
  const batting = inn?.battingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
  const bowling = inn?.battingTeamId === snapshot.homeTeam.id ? snapshot.awayTeam : snapshot.homeTeam

  type BatterDisplay = Pick<BatterStats, 'displayName' | 'runs' | 'balls' | 'isStriker'>

  const isDismissed = (id: number | null) =>
    id !== null && snapshot.batters.some(b => b.playerId === id && b.isOut)

  const activeBatters = snapshot.batters.filter(b => !b.isOut)

  let batter1: BatterDisplay | undefined = activeBatters.find(b => b.isStriker)
  if (!batter1 && snapshot.strikerId && !isDismissed(snapshot.strikerId)) {
    const p = snapshot.battingTeamPlayers.find(pl => pl.id === snapshot.strikerId)
    if (p) batter1 = { displayName: p.displayName, runs: 0, balls: 0, isStriker: true }
  }

  const strikerPlayerId = activeBatters.find(b => b.isStriker)?.playerId ?? snapshot.strikerId
  let batter2: BatterDisplay | undefined = activeBatters.find(b => b.playerId !== strikerPlayerId)
  if (!batter2 && snapshot.nonStrikerId && snapshot.nonStrikerId !== strikerPlayerId && !isDismissed(snapshot.nonStrikerId)) {
    const p = snapshot.battingTeamPlayers.find(pl => pl.id === snapshot.nonStrikerId)
    if (p) batter2 = { displayName: p.displayName, runs: 0, balls: 0, isStriker: false }
  }

  let currentBowler: Pick<BowlerStats, 'displayName' | 'wickets' | 'runs' | 'overs' | 'balls'> | undefined =
    snapshot.bowlers.find(b => b.isCurrent)
  if (!currentBowler && snapshot.currentBowlerId) {
    const p = snapshot.bowlingTeamPlayers.find(pl => pl.id === snapshot.currentBowlerId)
    if (p) currentBowler = { displayName: p.displayName, wickets: 0, runs: 0, overs: 0, balls: 0 }
  }

  const overBalls = snapshot.currentOverBalls ?? []

  const getBallStyle = (ball: typeof overBalls[0]): { bg: string; label: string } => {
    if (ball.isWicket) return { bg: '#FF2222', label: 'W' }
    if (!ball.isLegal && ball.extraType === 'wide') return { bg: ICC.purple, label: ball.extraRuns > 1 ? `Wd${ball.extraRuns}` : 'Wd' }
    if (!ball.isLegal && ball.extraType === 'noball') return { bg: ICC.purple, label: ball.runs > 0 ? `${ball.runs}nb` : 'Nb' }
    if (ball.runs === 6) return { bg: ICC.blue, label: '6' }
    if (ball.runs === 4) return { bg: ICC.pink, label: '4' }
    if (ball.runs > 0) return { bg: ICC.purple, label: String(ball.runs) }
    return { bg: ICC.purple, label: '·' }
  }

  const inningsLabel = snapshot.currentInnings === 1 ? 'P1' : 'P2'

  const TeamFlag = ({ logoCloudinaryId, shortCode }: { logoCloudinaryId?: string | null; shortCode: string }) => (
    <div style={{ width: 53, height: 40, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
      {logoCloudinaryId ? (
        <Image
          src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_53,h_40,f_webp/${logoCloudinaryId}`}
          alt={shortCode}
          width={53}
          height={40}
          style={{ objectFit: 'cover' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', background: ICC.purple, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: ICC.white, fontFamily: ICC.font, fontWeight: 700, fontSize: 14 }}>{shortCode.charAt(0)}</span>
        </div>
      )}
    </div>
  )

  return (
    <motion.div
      initial={{ y: 150, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 150, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      style={{ position: 'absolute', bottom: 5, left: 5, right: 5, zIndex: 20 }}
    >
      <div style={{
        width: '100%',
        background: ICC.cream,
        paddingTop: 4,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 0,
        boxSizing: 'border-box',
      }}>

        {/* LEFT — batting team flag + batters */}
        <div style={{ width: 358, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <TeamFlag logoCloudinaryId={batting.logoCloudinaryId} shortCode={batting.shortCode} />

          {/* ICC vertical divider (decorative stripe) */}
          <div style={{ width: 4, alignSelf: 'stretch', background: ICC.pink, borderRadius: 2, flexShrink: 0 }} />

          {/* Batter rows */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Striker */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {/* Striker indicator */}
                <div style={{ width: 10, height: 20, background: batter1?.isStriker ? ICC.pinkStrike : 'transparent', borderRadius: 2, flexShrink: 0 }} />
                <span style={{ color: ICC.purple, fontSize: 20, fontFamily: ICC.font, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                  {batter1?.displayName ?? '—'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                <span style={{ color: ICC.purple, fontSize: 22, fontFamily: ICC.font, fontWeight: 700 }}>{batter1?.runs ?? ''}</span>
                <span style={{ color: ICC.purple, fontSize: 18, fontFamily: ICC.font, fontWeight: 500 }}>{batter1?.balls != null ? `(${batter1.balls})` : ''}</span>
              </div>
            </div>
            {/* Non-striker */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 20, background: 'transparent', flexShrink: 0 }} />
                <span style={{ color: ICC.purple, fontSize: 20, fontFamily: ICC.font, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                  {batter2?.displayName ?? '—'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                <span style={{ color: ICC.purple, fontSize: 22, fontFamily: ICC.font, fontWeight: 700 }}>{batter2?.runs ?? ''}</span>
                <span style={{ color: ICC.purple, fontSize: 18, fontFamily: ICC.font, fontWeight: 500 }}>{batter2?.balls != null ? `(${batter2.balls})` : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER — score box */}
        <div style={{
          width: 645,
          height: 104,
          background: ICC.purple,
          boxShadow: ICC.scorebox,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}>
          {/* Row 1: teams + score + overs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 8, paddingRight: 8 }}>
              <span style={{ color: ICC.white, fontSize: 24, fontFamily: ICC.font, fontWeight: 500 }}>{batting.shortCode} V</span>
              <span style={{ color: ICC.white, fontSize: 28, fontFamily: ICC.font, fontWeight: 700 }}>{bowling.shortCode}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              {/* Pink accent left block */}
              <div style={{ width: 120, height: 40, background: ICC.pinkAlt }} />
              {/* Score */}
              <div style={{ paddingLeft: 8, paddingRight: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: ICC.white, fontSize: 32, fontFamily: ICC.font, fontWeight: 700 }}>{inn?.totalRuns ?? 0}</span>
                <span style={{ color: ICC.white, fontSize: 28, fontFamily: ICC.font, fontWeight: 700 }}>-</span>
                <span style={{ color: ICC.white, fontSize: 32, fontFamily: ICC.font, fontWeight: 700 }}>{inn?.wickets ?? 0}</span>
              </div>
              {/* Yellow accent right block */}
              <div style={{ width: 64, height: 40, background: ICC.yellow }} />
              {/* Innings label */}
              <div style={{ paddingLeft: 8, paddingRight: 8 }}>
                <span style={{ color: ICC.white, fontSize: 18, fontFamily: ICC.font, fontWeight: 500 }}>{inningsLabel}</span>
              </div>
            </div>

            <div style={{ paddingLeft: 8, paddingRight: 8, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
              <span style={{ color: ICC.white, fontSize: 26, fontFamily: ICC.font, fontWeight: 600 }}>{snapshot.currentOver ?? 0}.{snapshot.currentBalls ?? 0}</span>
              <span style={{ color: ICC.white, fontSize: 20, fontFamily: ICC.font, fontWeight: 500 }}>OVERS</span>
            </div>
          </div>

          {/* Row 2: run rate / target */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingLeft: 8, paddingRight: 8 }}>
            <span style={{ color: ICC.white, fontSize: 16, fontFamily: ICC.font, fontWeight: 600 }}>
              CRR {snapshot.currentRunRate?.toFixed(2) ?? '0.00'}
            </span>
            {snapshot.currentInnings === 2 && snapshot.requiredRunRate != null && (
              <span style={{ color: ICC.white, fontSize: 16, fontFamily: ICC.font, fontWeight: 600 }}>
                RRR {snapshot.requiredRunRate.toFixed(2)}
              </span>
            )}
            {snapshot.currentInnings === 2 && inn?.target != null && (
              <span style={{ color: ICC.yellow, fontSize: 16, fontFamily: ICC.font, fontWeight: 700 }}>
                TARGET {inn.target}
              </span>
            )}
          </div>
        </div>

        {/* RIGHT — bowler + over balls + bowling team flag */}
        <div style={{ width: 261, display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          {/* Bowler name + figures */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ color: ICC.purple, fontSize: 22, fontFamily: ICC.font, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
              {currentBowler?.displayName ?? '—'}
            </span>
            {currentBowler && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ color: ICC.purple, fontSize: 20, fontFamily: ICC.font, fontWeight: 700 }}>
                  {currentBowler.wickets}-{currentBowler.runs}
                </span>
                <span style={{ color: ICC.purple, fontSize: 16, fontFamily: ICC.font, fontWeight: 500 }}>
                  {currentBowler.overs}.{currentBowler.balls}
                </span>
              </div>
            )}
          </div>

          {/* Over-ball dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {overBalls.map((ball, i) => {
              const { bg, label } = getBallStyle(ball)
              return (
                <div key={i} style={{
                  width: 24, height: 24,
                  borderRadius: 42,
                  background: bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: label === 'Wd' || label === 'Nb' ? 8 : 14,
                  fontFamily: ICC.font,
                  fontWeight: 700,
                  color: ICC.white,
                  flexShrink: 0,
                }}>
                  {label}
                </div>
              )
            })}
          </div>
        </div>

        {/* ICC vertical divider (right side) */}
        <div style={{ width: 4, alignSelf: 'stretch', background: ICC.pink, borderRadius: 2, flexShrink: 0 }} />

        {/* Bowling team flag */}
        <TeamFlag logoCloudinaryId={bowling.logoCloudinaryId} shortCode={bowling.shortCode} />
      </div>
    </motion.div>
  )
}
