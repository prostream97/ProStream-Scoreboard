'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import type { BatterStats, BowlerStats, PlayerSummary, TeamSummary } from '@/types/match'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const BLUE = '#232882'
const RED = 'rgb(255, 30, 80)'

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_W = 340
const CARD_H = 560
const IMG_H  = 300

const cardAnimation = {
  initial:    { opacity: 0, scale: 0.95 },
  animate:    { opacity: 1, scale: 1 },
  exit:       { opacity: 0, scale: 0.95 },
  transition: { type: 'spring' as const, stiffness: 140, damping: 20 },
}

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

// ─── PlayerImage ──────────────────────────────────────────────────────────────

function PlayerImage({ cloudinaryId, name, size }: { cloudinaryId: string | null | undefined; name: string; size: number }) {
  if (cloudinaryId) {
    return (
      <Image
        src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,g_face,w_${CARD_W},h_${size},f_webp/${cloudinaryId}`}
        alt={name}
        fill
        style={{ objectFit: 'cover', objectPosition: 'top center' }}
      />
    )
  }
  // Fallback: initial letter on gradient
  return (
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
      <span style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'Lato, sans-serif', fontWeight: 900, fontSize: '8rem', lineHeight: 1 }}>
        {name.charAt(0)}
      </span>
    </div>
  )
}

// ─── StatCell ─────────────────────────────────────────────────────────────────

function StatCell({ label, value, first }: { label: string; value: string | number; first?: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        padding: '8px 10px',
        textAlign: 'center',
        borderLeft: first ? 'none' : `2px solid ${RED}`,
        boxShadow: 'inset 20px 20px 35px -15px rgba(35, 40, 130, 0.12)',
      }}
    >
      <span style={{ color: `${BLUE}99`, fontWeight: 700, fontSize: '0.68rem', letterSpacing: '0.08em', display: 'block', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ color: BLUE, fontWeight: 900, fontSize: '1.15rem', lineHeight: 1.2 }}>
        {value}
      </span>
    </div>
  )
}

// ─── roleLabel helper ─────────────────────────────────────────────────────────

function roleLabel(role: PlayerSummary['role']): string {
  if (role === 'allrounder') return 'ALL-ROUNDER'
  if (role === 'keeper') return 'WK-BATSMAN'
  return 'BATSMAN'
}

// ─── BatterCard ───────────────────────────────────────────────────────────────

type BatterCardProps = {
  batter: BatterStats
  player: PlayerSummary | undefined
  isStriker: boolean
  team: TeamSummary
}

export function BatterCard({ batter, player, isStriker, team }: BatterCardProps) {
  const isArriving = batter.balls === 0

  return (
    <motion.div
      {...cardAnimation}
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
      {/* ── Header bar ── */}
      <div
        style={{
          backgroundImage: `linear-gradient(80deg, ${RED} 20%, ${BLUE})`,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px 0 18px',
          flexShrink: 0,
          zIndex: 2,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isArriving && isStriker && (
            <span style={{ color: RED, fontWeight: 900, fontSize: '0.7rem', background: 'white', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.05em' }}>
              ON STRIKE
            </span>
          )}
          <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.1em' }}>
            {isArriving ? 'NEW BATTER' : 'BATTING'}
          </span>
        </div>
        <TeamLogo team={team} size={32} />
      </div>

      {/* ── Player image ── */}
      <div style={{ position: 'relative', width: '100%', height: IMG_H, flexShrink: 0, background: '#e8e8e8' }}>
        <PlayerImage cloudinaryId={player?.headshotCloudinaryId} name={batter.displayName} size={IMG_H} />

        {/* Bottom gradient fade from image into white stats section */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.55))',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* ── Body ── */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 20px',
          overflow: 'hidden',
        }}
      >
        {/* Blob decoration */}
        <div
          style={{
            position: 'absolute',
            width: '200%',
            height: '200%',
            backgroundImage: `linear-gradient(60deg, rgba(35,40,130,0.08) 20%, rgba(255,30,80,0.12))`,
            borderRadius: '0% 5000px 5000px 0%',
            top: '50%',
            left: 0,
            transform: 'translate(-30%, -50%) rotate(-30deg)',
            pointerEvents: 'none',
          }}
        />

        {/* Player name */}
        <p
          style={{
            color: BLUE,
            fontWeight: 700,
            fontSize: isArriving ? '1.25rem' : '1.05rem',
            margin: '0 0 6px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            position: 'relative',
          }}
        >
          {batter.displayName}
        </p>

        {isArriving ? (
          /* ── Arrival: role + batting style ── */
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', position: 'relative' }}>
            {player?.role && (
              <span
                style={{
                  backgroundImage: `linear-gradient(80deg, ${RED} 20%, ${BLUE})`,
                  color: '#ffffff',
                  borderRadius: 500,
                  padding: '3px 12px',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  letterSpacing: '0.08em',
                  display: 'inline-block',
                }}
              >
                {roleLabel(player.role)}
              </span>
            )}
            {player?.battingStyle && (
              <span style={{ color: `${BLUE}88`, fontWeight: 400, fontSize: '0.85rem' }}>
                {player.battingStyle}
              </span>
            )}
          </div>
        ) : (
          /* ── Normal: score row ── */
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, position: 'relative' }}>
            <span style={{ color: BLUE, fontWeight: 900, fontSize: '3.4rem', lineHeight: 1 }}>
              {batter.runs}
            </span>
            <span style={{ color: `${BLUE}66`, fontWeight: 400, fontSize: '1rem' }}>
              ({batter.balls}b)
            </span>
          </div>
        )}
      </div>

      {/* ── Footer stat row — hidden while arriving ── */}
      {!isArriving && (
        <div style={{ borderTop: `2px solid ${RED}`, display: 'flex', flexShrink: 0 }}>
          <StatCell label="4s" value={batter.fours} first />
          <StatCell label="6s" value={batter.sixes} />
          <StatCell label="SR" value={batter.strikeRate.toFixed(1)} />
        </div>
      )}
    </motion.div>
  )
}

// ─── BowlerCard ───────────────────────────────────────────────────────────────

type BowlerCardProps = {
  bowler: BowlerStats
  player: PlayerSummary | undefined
  team: TeamSummary
}

export function BowlerCard({ bowler, player, team }: BowlerCardProps) {
  return (
    <motion.div
      {...cardAnimation}
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
      {/* ── Header bar ── */}
      <div
        style={{
          backgroundImage: `linear-gradient(80deg, ${RED} 20%, ${BLUE})`,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px 0 18px',
          flexShrink: 0,
          zIndex: 2,
        }}
      >
        <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.1em' }}>
          BOWLING
        </span>
        <TeamLogo team={team} size={32} />
      </div>

      {/* ── Player image ── */}
      <div style={{ position: 'relative', width: '100%', height: IMG_H, flexShrink: 0, background: '#e8e8e8' }}>
        <PlayerImage cloudinaryId={player?.headshotCloudinaryId} name={bowler.displayName} size={IMG_H} />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.55))',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* ── Stats body ── */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 20px 0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '200%',
            height: '200%',
            backgroundImage: `linear-gradient(60deg, rgba(35,40,130,0.08) 20%, rgba(255,30,80,0.12))`,
            borderRadius: '0% 5000px 5000px 0%',
            top: '50%',
            left: 0,
            transform: 'translate(-30%, -50%) rotate(-30deg)',
            pointerEvents: 'none',
          }}
        />

        <p
          style={{
            color: BLUE,
            fontWeight: 700,
            fontSize: '1.05rem',
            margin: '0 0 4px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            position: 'relative',
          }}
        >
          {bowler.displayName}
        </p>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, position: 'relative' }}>
          <span style={{ color: BLUE, fontWeight: 900, fontSize: '3.4rem', lineHeight: 1 }}>
            {bowler.overs}.{bowler.balls}
          </span>
          <span style={{ color: `${BLUE}66`, fontWeight: 400, fontSize: '1rem' }}>
            overs
          </span>
        </div>
      </div>

      {/* ── Footer stat row ── */}
      <div
        style={{
          borderTop: `2px solid ${RED}`,
          display: 'flex',
          flexShrink: 0,
        }}
      >
        <StatCell label="Wkts" value={bowler.wickets} first />
        <StatCell label="Runs" value={bowler.runs} />
        <StatCell label="Econ" value={bowler.economy.toFixed(1)} />
      </div>
    </motion.div>
  )
}
