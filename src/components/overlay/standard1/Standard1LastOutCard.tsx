'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { MatchSnapshot } from '@/types/match'
import type { WicketPayload } from '@/types/pusher'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

// Exact gradients from Last Out Player Card.html CSS
const BLACK_VERT_GRAD = 'linear-gradient(to bottom, #000000, #191919, #434242, #525252)'
const GRAY_VERT_GRAD = 'linear-gradient(to bottom, #e9e4e4 0%, #ffffff 25%, #e7e5e5 50%, #ece8e8 100%)'

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

export function Standard1LastOutCard({ wicket, snapshot }: Props) {
  const dismissedId = wicket.dismissedBatterId
  const batter = snapshot.batters.find(b => b.playerId === dismissedId)
  const player = snapshot.battingTeamPlayers.find(p => p.id === dismissedId)

  if (!batter) return null

  const allPlayers = [...snapshot.battingTeamPlayers, ...snapshot.bowlingTeamPlayers]
  const fielderName = wicket.fielder1Id
    ? (allPlayers.find(p => p.id === wicket.fielder1Id)?.displayName ?? null)
    : null
  const currentBowler = snapshot.bowlers.find(b => b.isCurrent)
  const bowlerName =
    currentBowler?.displayName ??
    (snapshot.currentBowlerId
      ? (snapshot.bowlingTeamPlayers.find(p => p.id === snapshot.currentBowlerId)?.displayName ?? null)
      : null)

  const { detail1, detail2 } = formatDismissal(wicket.dismissalType, fielderName, bowlerName)
  const sr = batter.balls > 0 ? ((batter.runs / batter.balls) * 100).toFixed(1) : '0.0'

  const headshotUrl =
    player?.headshotCloudinaryId && CLOUD_NAME
      ? `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,g_face,w_160,h_160,f_webp/${player.headshotCloudinaryId}`
      : null

  return (
    /* Outer container — outBatsmenDiv positioning wrapper */
    <motion.div
      initial={{ opacity: 0, scale: 0.1, y: -200 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.1, y: -200 }}
      transition={{ type: 'spring', stiffness: 120, damping: 14 }}
      style={{
        position: 'absolute',
        bottom: 25,
        left: 0,
        right: 0,
        margin: 'auto',
        width: 1220,
        borderRadius: 5,
        color: 'wheat',
        fontFamily: '"Rajdhani", "Arial Narrow", Arial, sans-serif',
        letterSpacing: 1,
        zIndex: 20,
      }}
    >
      {/* Inner card — outBatsmenDiv blackBox_vt */}
      <div
        style={{
          width: '100%',
          height: 160,
          display: 'inline-flex',
          border: '5px solid black',
          backgroundImage: BLACK_VERT_GRAD,
          borderRadius: 5,
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Player picture — outbatsmen_playerpic */}
        <div
          style={{
            width: 160,
            height: '100%',
            flexShrink: 0,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {headshotUrl ? (
            <Image
              src={headshotUrl}
              alt={batter.displayName}
              fill
              sizes="160px"
              style={{ objectFit: 'cover', objectPosition: 'top center' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: '#111',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 64, fontWeight: 900 }}>
                {batter.displayName.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Player info — outBatsmenPlayer */}
        <div style={{ width: 820, height: 160, flexShrink: 0 }}>

          {/* Player name — outBatsmenPlayerName */}
          <div
            style={{
              width: '100%',
              fontSize: 50,
              fontWeight: 1000,
              marginLeft: 40,
              height: 50,
              lineHeight: '50px',
              color: 'yellow',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {batter.displayName}
          </div>

          {/* Dismissal details — outBatsmenInfo */}
          <div
            style={{
              marginTop: 2,
              marginLeft: 20,
              width: '100%',
              display: 'inline-flex',
            }}
          >
            <div
              style={{
                fontSize: 30,
                marginLeft: 20,
                height: 60,
                lineHeight: '60px',
                fontWeight: 'bold',
              }}
            >
              {detail1}
            </div>
            {detail2 && (
              <div
                style={{
                  fontSize: 30,
                  marginLeft: 20,
                  height: 60,
                  lineHeight: '60px',
                  fontWeight: 'bold',
                }}
              >
                {detail2}
              </div>
            )}
          </div>

          {/* Stats row — outBatsmenInfo2 */}
          <div
            style={{
              marginTop: 2,
              marginLeft: 40,
              width: '100%',
              display: 'inline-flex',
            }}
          >
            {/* outBats4s */}
            <div
              style={{
                width: 120,
                fontSize: 30,
                fontWeight: 'bold',
                textAlign: 'left',
                display: 'inline-flex',
              }}
            >
              <div style={{ width: 100, textAlign: 'center' }}>4s :</div>
              <div style={{ width: 100, marginLeft: 10 }}>{batter.fours}</div>
            </div>

            {/* outBats6s */}
            <div
              style={{
                marginLeft: 50,
                width: 120,
                fontSize: 30,
                fontWeight: 'bold',
                display: 'inline-flex',
              }}
            >
              <div style={{ width: 100, textAlign: 'right' }}>6s :</div>
              <div style={{ width: 100, marginLeft: 10 }}>{batter.sixes}</div>
            </div>

            {/* outBatsSR */}
            <div
              style={{
                marginLeft: 20,
                width: 500,
                fontSize: 30,
                fontWeight: 'bold',
                display: 'inline-flex',
              }}
            >
              <div style={{ width: 250, textAlign: 'right' }}>STRIKE RATE :</div>
              <div style={{ width: 150, marginLeft: 10 }}>{sr}</div>
            </div>
          </div>
        </div>

        {/* Score box — outBatsmenScore grayColor */}
        <div
          style={{
            fontWeight: 1000,
            width: 200,
            margin: '5px 20px',
            borderRadius: 5,
            flexShrink: 0,
            color: 'black',
            background: GRAY_VERT_GRAD,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* outBatsmenScoreRuns */}
          <div
            style={{
              paddingRight: 10,
              fontSize: 80,
              width: '100%',
              textAlign: 'center',
              lineHeight: 1,
            }}
          >
            {batter.runs}
          </div>
          {/* outBatsmenScoreBalls */}
          <div
            style={{
              fontSize: 38,
              marginLeft: 10,
              width: '100%',
              textAlign: 'center',
            }}
          >
            balls : {batter.balls}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
