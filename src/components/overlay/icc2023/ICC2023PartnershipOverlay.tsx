'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import type { MatchSnapshot, PlayerSummary, TeamSummary } from '@/types/match'
import { ICC } from './tokens'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

const CARD_W = 800
const CARD_H = 450
const HEADER_H = 44
const BODY_H = CARD_H - HEADER_H
const IMG_W = 240
const IMG_CROP_H = 380

function TeamLogo({ team, size = 30 }: { team: TeamSummary; size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: 9999, overflow: 'hidden',
      background: ICC.white, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: ICC.imgShadow,
      border: `2px solid ${ICC.white}`,
    }}>
      {team.logoCloudinaryId ? (
        <Image
          src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_${size},h_${size},f_webp/${team.logoCloudinaryId}`}
          alt={team.name} width={size} height={size}
          style={{ objectFit: 'cover' }}
        />
      ) : (
        <span style={{ color: ICC.purple, fontFamily: ICC.font, fontWeight: 700, fontSize: size * 0.38 }}>
          {team.shortCode.slice(0, 2)}
        </span>
      )}
    </div>
  )
}

function BatterImage({ player, mirrored }: { player: PlayerSummary | undefined; mirrored: boolean }) {
  const name = player?.displayName ?? '?'
  const cloudinaryId = player?.headshotCloudinaryId
  return (
    <div style={{ width: '100%', height: '100%', transform: mirrored ? 'scaleX(-1)' : 'none' }}>
      {cloudinaryId ? (
        <Image
          src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,g_face,w_${IMG_W},h_${IMG_CROP_H},f_webp/${cloudinaryId}`}
          alt={name} fill
          style={{ objectFit: 'cover', objectPosition: 'center center' }}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          background: `linear-gradient(160deg, ${ICC.purple} 0%, ${ICC.pink}99 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: `${ICC.white}40`, fontFamily: ICC.font, fontWeight: 700, fontSize: '4rem' }}>
            {name.charAt(0)}
          </span>
        </div>
      )}
    </div>
  )
}

type Props = { snapshot: MatchSnapshot }

export function ICC2023PartnershipOverlay({ snapshot }: Props) {
  const { partnership, battingTeamPlayers, strikerId, nonStrikerId, homeTeam, awayTeam, currentInningsState } = snapshot
  if (!partnership || !strikerId || !nonStrikerId) return null

  const battingTeam = currentInningsState?.battingTeamId === homeTeam.id ? homeTeam : awayTeam
  const b1 = battingTeamPlayers.find((p) => p.id === strikerId)
  const b2 = battingTeamPlayers.find((p) => p.id === nonStrikerId)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 140, damping: 20 }}
      style={{
        position: 'relative',
        width: CARD_W, height: CARD_H,
        borderRadius: 0,
        overflow: 'hidden',
        background: ICC.purple,
        boxShadow: ICC.imgShadow,
        display: 'flex', flexDirection: 'column',
        fontFamily: ICC.font,
      }}
    >
      {/* Header */}
      <div style={{
        background: ICC.pink,
        height: HEADER_H,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px 0 18px', flexShrink: 0,
      }}>
        <span style={{ color: ICC.white, fontWeight: 700, fontSize: '1rem', letterSpacing: '0.1em' }}>
          PARTNERSHIP
        </span>
        <TeamLogo team={battingTeam} size={30} />
      </div>

      {/* Body: 3-column */}
      <div style={{ display: 'flex', flex: 1 }}>

        {/* Left: striker image */}
        <div style={{
          width: IMG_W, height: BODY_H, flexShrink: 0,
          overflow: 'hidden', background: `${ICC.purple}cc`,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        }}>
          <div style={{ position: 'relative', width: IMG_W, height: IMG_CROP_H, flexShrink: 0 }}>
            <BatterImage player={b1} mirrored={false} />
          </div>
        </div>

        {/* Center stats */}
        <div style={{
          flex: 1, position: 'relative',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          padding: '0 12px', overflow: 'hidden',
        }}>
          {/* Sub-label */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span style={{ color: `${ICC.white}88`, fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Partnership
            </span>
            <div style={{ width: '60%', height: 2, background: ICC.pink, margin: '6px auto 0' }} />
          </div>

          {/* Runs */}
          <div style={{ marginBottom: 8 }}>
            <span style={{ color: ICC.yellow, fontWeight: 700, fontSize: '4.5rem', lineHeight: 1 }}>
              {partnership.runs}
            </span>
          </div>

          {/* Balls */}
          <div style={{ marginBottom: 24 }}>
            <span style={{ color: `${ICC.white}99`, fontWeight: 400, fontSize: '1.1rem' }}>
              {partnership.balls} balls
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: '50%', height: 1, background: `${ICC.white}33`, marginBottom: 20 }} />

          {/* Batter names */}
          <div style={{ width: '100%', textAlign: 'center' }}>
            <p style={{ margin: '0 0 10px', fontSize: '0.95rem', fontWeight: 700, color: ICC.white, textTransform: 'uppercase', letterSpacing: '0.07em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ display: 'inline-block', width: 10, height: 20, background: ICC.pinkStrike, verticalAlign: 'middle', marginRight: 6, borderRadius: 2 }} />
              {b1?.displayName ?? '—'}
            </p>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 400, color: `${ICC.white}88`, textTransform: 'uppercase', letterSpacing: '0.07em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {b2?.displayName ?? '—'}
            </p>
          </div>
        </div>

        {/* Right: non-striker image */}
        <div style={{
          width: IMG_W, height: BODY_H, flexShrink: 0,
          overflow: 'hidden', background: `${ICC.purple}cc`,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        }}>
          <div style={{ position: 'relative', width: IMG_W, height: IMG_CROP_H, flexShrink: 0 }}>
            <BatterImage player={b2} mirrored={true} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
