'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { MatchSnapshot } from '@/types/match'
import type { WicketPayload } from '@/types/pusher'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const GOLD_GRAD = 'linear-gradient(280deg, rgb(249,204,1) 0%, rgb(0,0,0) 100%)'

type Props = {
  wicket: WicketPayload
  snapshot: MatchSnapshot
}

function formatDismissal(
  type: WicketPayload['dismissalType'],
  fielderName: string | null,
  bowlerName: string | null,
): { detail1: string; detail2: string } {
  if (type === 'bowled') return { detail1: 'b', detail2: bowlerName ?? '' }
  if (type === 'caught') {
    if (fielderName && bowlerName && fielderName === bowlerName)
      return { detail1: 'c & b', detail2: bowlerName }
    return {
      detail1: fielderName ? `c ${fielderName}` : 'Caught',
      detail2: bowlerName ? `b ${bowlerName}` : '',
    }
  }
  if (type === 'lbw') return { detail1: 'LBW', detail2: bowlerName ? `b ${bowlerName}` : '' }
  if (type === 'runout') return { detail1: 'Run Out', detail2: fielderName ? `(${fielderName})` : '' }
  if (type === 'stumped')
    return {
      detail1: fielderName ? `st ${fielderName}` : 'Stumped',
      detail2: bowlerName ? `b ${bowlerName}` : '',
    }
  if (type === 'hitwicket') return { detail1: 'Hit Wicket', detail2: bowlerName ? `b ${bowlerName}` : '' }
  return { detail1: type ?? 'Out', detail2: '' }
}

export function Theme1LastOutCard({ wicket, snapshot }: Props) {
  const dismissedId = wicket.dismissedBatterId
  const batterFromSnapshot = snapshot.batters.find((b) => b.playerId === dismissedId)
  const player = [...snapshot.battingTeamPlayers, ...snapshot.bowlingTeamPlayers].find((p) => p.id === dismissedId)

  // Synthesize batter stats when snapshot hasn't yet propagated dismissed player
  const batter = batterFromSnapshot ?? (player ? {
    playerId: dismissedId,
    playerName: player.displayName,
    displayName: player.displayName,
    runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0,
    isOut: true, dismissalType: wicket.dismissalType,
  } : null)

  if (!batter) return null

  const battingTeam =
    snapshot.currentInningsState?.battingTeamId === snapshot.homeTeam.id
      ? snapshot.homeTeam
      : snapshot.awayTeam

  const allPlayers = [...snapshot.battingTeamPlayers, ...snapshot.bowlingTeamPlayers]
  const fielderName = wicket.fielder1Id
    ? (allPlayers.find((p) => p.id === wicket.fielder1Id)?.displayName ?? null)
    : null
  const currentBowler = snapshot.bowlers.find((b) => b.isCurrent)
  const bowlerName =
    currentBowler?.displayName ??
    (snapshot.currentBowlerId
      ? (snapshot.bowlingTeamPlayers.find((p) => p.id === snapshot.currentBowlerId)?.displayName ?? null)
      : null)

  const { detail1, detail2 } = formatDismissal(wicket.dismissalType, fielderName, bowlerName)
  const sr = batter.balls > 0 ? ((batter.runs / batter.balls) * 100).toFixed(1) : '0.0'

  const stats = [
    { label: 'Runs', value: batter.runs },
    { label: 'Balls', value: batter.balls },
    { label: '4s', value: batter.fours },
    { label: '6s', value: batter.sixes },
    { label: 'Strike Rate', value: sr },
  ]

  return (
    <motion.div
      key="theme1-last-out-card"
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      style={{
        position: 'absolute',
        bottom: 120,
        left: 0,
        right: 0,
        margin: 'auto',
        zIndex: 10000,
        width: 1200,
        height: 250,
        background: GOLD_GRAD,
        display: 'flex',
        padding: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: 'rgb(255,255,255)',
        fontFamily: '"Source Sans Pro", sans-serif',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Circular player photo */}
      <div
        style={{
          flexShrink: 0,
          width: 150,
          height: 150,
          borderRadius: '100%',
          overflow: 'hidden',
          boxShadow: 'rgba(0,0,0,0.75) 0px 0px 18px 0px',
          position: 'relative',
          background: 'rgba(0,0,0,0.4)',
        }}
      >
        {player?.headshotCloudinaryId ? (
          <Image
            src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,g_face,w_150,h_150,f_webp/${player.headshotCloudinaryId}`}
            alt={batter.displayName}
            fill
            style={{ objectFit: 'cover', objectPosition: 'top center', borderRadius: '100%' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 64, fontWeight: 900 }}>
              {batter.displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Right content */}
      <div
        style={{
          width: '84%',
          display: 'flex',
          flexDirection: 'column',
          padding: '0 2px',
          marginLeft: 16,
        }}
      >
        {/* Name + OUT row */}
        <div
          style={{
            display: 'inline-flex',
            width: '100%',
            marginBottom: 12,
            alignItems: 'flex-end',
          }}
        >
          <span
            style={{
              fontSize: 30,
              lineHeight: '35px',
              fontWeight: 700,
              textTransform: 'uppercase',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 700,
            }}
          >
            {batter.displayName}
          </span>
          <span
            style={{
              fontSize: 20,
              marginLeft: 10,
              opacity: 0.75,
              lineHeight: '28px',
              flexShrink: 0,
            }}
          >
            {battingTeam.shortCode} · OUT
          </span>
        </div>

        {/* Dismissal row */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 700, opacity: 0.9 }}>{detail1}</span>
          {detail2 && (
            <span style={{ fontSize: 22, fontWeight: 700, opacity: 0.75, marginLeft: 10 }}>
              {detail2}
            </span>
          )}
        </div>

        {/* Stats row — 5 cells */}
        <div style={{ display: 'flex' }}>
          {stats.map((stat, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: 'calc(20% - 12px)',
                marginRight: 12,
                boxShadow: 'rgba(0,0,0,0.3) 0px 0px 18px 0px',
              }}
            >
              <span style={{ display: 'block', fontSize: 40, lineHeight: '44px', fontWeight: 700 }}>
                {stat.value}
              </span>
              <span style={{ fontSize: 22, lineHeight: '25px', fontWeight: 700, opacity: 0.85 }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
