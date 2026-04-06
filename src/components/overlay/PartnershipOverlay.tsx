'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import type { MatchSnapshot, PlayerSummary, TeamSummary } from '@/types/match'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const BLUE = '#232882'
const RED = 'rgb(255, 30, 80)'

const CARD_W = 800
const CARD_H = 450
const HEADER_H = 44
const BODY_H = CARD_H - HEADER_H   // 596
const IMG_W = 280
const IMG_CROP_H = 420                 // portrait ratio ~2:3 (280×420)

// ─── TeamLogo ─────────────────────────────────────────────────────────────────

function TeamLogo({ team, size = 32 }: { team: TeamSummary; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        overflow: 'hidden',
        background: 'white',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0px 2px 8px rgba(0,0,0,0.3)',
        border: '2px solid rgba(255,255,255,0.8)',
      }}
    >
      {team.logoCloudinaryId ? (
        <Image
          src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_${size},h_${size},f_webp/${team.logoCloudinaryId}`}
          alt={team.name}
          width={size}
          height={size}
          style={{ objectFit: 'cover' }}
        />
      ) : (
        <span style={{ color: BLUE, fontFamily: 'Lato, sans-serif', fontWeight: 700, fontSize: size * 0.38 }}>
          {team.shortCode.slice(0, 2)}
        </span>
      )}
    </div>
  )
}

// ─── BatterImage ──────────────────────────────────────────────────────────────

function BatterImage({ player, mirrored }: { player: PlayerSummary | undefined; mirrored: boolean }) {
  const name = player?.displayName ?? '?'
  const cloudinaryId = player?.headshotCloudinaryId

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        transform: mirrored ? 'scaleX(-1)' : 'none',
      }}
    >
      {cloudinaryId ? (
        <Image
          src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,g_face,w_${IMG_W},h_${IMG_CROP_H},f_webp/${cloudinaryId}`}
          alt={name}
          fill
          style={{ objectFit: 'cover', objectPosition: 'center center' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: `linear-gradient(160deg, ${BLUE} 0%, rgba(255,30,80,0.7) 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'Lato, sans-serif', fontWeight: 900, fontSize: '4rem', lineHeight: 1 }}>
            {name.charAt(0)}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── PartnershipOverlay ───────────────────────────────────────────────────────

type Props = { snapshot: MatchSnapshot }

export function PartnershipOverlay({ snapshot }: Props) {
  const { partnership, battingTeamPlayers, strikerId, nonStrikerId, homeTeam, awayTeam, currentInningsState } = snapshot

  if (!partnership || !strikerId || !nonStrikerId) return null

  const battingTeam = currentInningsState?.battingTeamId === homeTeam.id ? homeTeam : awayTeam
  const b1 = battingTeamPlayers.find((p) => p.id === strikerId)    // striker — left
  const b2 = battingTeamPlayers.find((p) => p.id === nonStrikerId) // non-striker — right

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 140, damping: 20 }}
      style={{
        position: 'relative',
        width: CARD_W,
        height: CARD_H,
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        boxShadow: '0px 20px 60px rgba(0,0,0,0.45), 0px 4px 16px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Lato, sans-serif',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          backgroundImage: `linear-gradient(80deg, ${RED} 20%, ${BLUE})`,
          height: HEADER_H,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px 0 18px',
          flexShrink: 0,
        }}
      >
        <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.1em' }}>
          PARTNERSHIP
        </span>
        <TeamLogo team={battingTeam} size={30} />
      </div>

      {/* ── Body: 3-column ── */}
      <div style={{ display: 'flex', flex: 1 }}>

        {/* Left: striker image — bottom-aligned portrait crop */}
        <div style={{ width: IMG_W, height: BODY_H, flexShrink: 0, overflow: 'hidden', background: '#e8e8e8', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', width: IMG_W, height: IMG_CROP_H, flexShrink: 0 }}>
            <BatterImage player={b1} mirrored={false} />
          </div>
        </div>

        {/* Center: partnership stats */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '0 12px',
            overflow: 'hidden',
          }}
        >
          {/* Blob decoration */}
          <div
            style={{
              position: 'absolute',
              width: '200%',
              height: '200%',
              backgroundImage: `linear-gradient(60deg, rgba(35,40,130,0.06) 20%, rgba(255,30,80,0.1))`,
              borderRadius: '0% 5000px 5000px 0%',
              top: '50%',
              left: 0,
              transform: 'translate(-30%, -50%) rotate(-30deg)',
              pointerEvents: 'none',
            }}
          />

          {/* "PARTNERSHIP" label + underline */}
          <div style={{ position: 'relative', width: '100%', textAlign: 'center', marginBottom: 20 }}>
            <span style={{ color: `${BLUE}88`, fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Partnership
            </span>
            <div style={{ width: '60%', height: 2, background: RED, margin: '6px auto 0' }} />
          </div>

          {/* Runs + balls */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, position: 'relative', marginBottom: 8 }}>
            <span style={{ color: BLUE, fontWeight: 900, fontSize: '4.5rem', lineHeight: 1 }}>
              {partnership.runs}
            </span>
          </div>
          <div style={{ position: 'relative', marginBottom: 28 }}>
            <span style={{ color: `${BLUE}66`, fontWeight: 400, fontSize: '1.1rem' }}>
              {partnership.balls} balls
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: '50%', height: 1, background: `${BLUE}22`, marginBottom: 24, position: 'relative' }} />

          {/* Batter names */}
          <div style={{ position: 'relative', width: '100%', textAlign: 'center' }}>
            <p style={{ margin: '0 0 10px', fontSize: '0.95rem', fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.07em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              <span style={{ color: RED }}>★ </span>
              {b1?.displayName ?? '—'}
            </p>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 400, color: `${BLUE}88`, textTransform: 'uppercase', letterSpacing: '0.07em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              {b2?.displayName ?? '—'}
            </p>
          </div>
        </div>

        {/* Right: non-striker image — bottom-aligned portrait crop */}
        <div style={{ width: IMG_W, height: BODY_H, flexShrink: 0, overflow: 'hidden', background: '#e8e8e8', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', width: IMG_W, height: IMG_CROP_H, flexShrink: 0 }}>
            <BatterImage player={b2} mirrored={true} />
          </div>
        </div>

      </div>
    </motion.div>
  )
}
