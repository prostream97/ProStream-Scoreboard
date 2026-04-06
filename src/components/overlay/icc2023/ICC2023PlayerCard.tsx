'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import type { BatterStats, BowlerStats, PlayerSummary, TeamSummary } from '@/types/match'
import { ICC } from './tokens'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

const CARD_W = 340
const CARD_H = 560
const IMG_H  = 300

const cardAnimation = {
  initial:    { opacity: 0, scale: 0.95 },
  animate:    { opacity: 1, scale: 1 },
  exit:       { opacity: 0, scale: 0.95 },
  transition: { type: 'spring' as const, stiffness: 140, damping: 20 },
}

function TeamLogo({ team, size = 32 }: { team: TeamSummary; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 9999,
      overflow: 'hidden', background: ICC.white, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: ICC.imgShadow, border: `2px solid ${ICC.white}`,
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

function PlayerImage({ cloudinaryId, name }: { cloudinaryId: string | null | undefined; name: string }) {
  if (cloudinaryId) {
    return (
      <Image
        src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,g_face,w_${CARD_W},h_${IMG_H},f_webp/${cloudinaryId}`}
        alt={name} fill
        style={{ objectFit: 'cover', objectPosition: 'top center' }}
      />
    )
  }
  return (
    <div style={{
      width: '100%', height: '100%',
      background: `linear-gradient(160deg, ${ICC.purple} 0%, ${ICC.pink}99 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ color: `${ICC.white}40`, fontFamily: ICC.font, fontWeight: 700, fontSize: '8rem', lineHeight: 1 }}>
        {name.charAt(0)}
      </span>
    </div>
  )
}

function StatCell({ label, value, first }: { label: string; value: string | number; first?: boolean }) {
  return (
    <div style={{
      flex: 1, padding: '8px 10px', textAlign: 'center',
      borderLeft: first ? 'none' : `2px solid ${ICC.pink}`,
    }}>
      <span style={{ color: `${ICC.white}99`, fontWeight: 700, fontSize: '0.68rem', letterSpacing: '0.08em', display: 'block', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ color: ICC.white, fontWeight: 900, fontSize: '1.15rem', lineHeight: 1.2 }}>
        {value}
      </span>
    </div>
  )
}

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

export function ICC2023BatterCard({ batter, player, isStriker, team }: BatterCardProps) {
  const isArriving = batter.balls === 0

  return (
    <motion.div
      {...cardAnimation}
      style={{
        position: 'relative', width: CARD_W, height: CARD_H,
        borderRadius: 0, overflow: 'hidden',
        background: ICC.purple,
        boxShadow: ICC.imgShadow,
        display: 'flex', flexDirection: 'column',
        fontFamily: ICC.font,
      }}
    >
      {/* Header */}
      <div style={{
        background: ICC.pink,
        height: 48,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px 0 18px', flexShrink: 0, zIndex: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isArriving && isStriker && (
            <span style={{
              color: ICC.pink, fontWeight: 900, fontSize: '0.7rem',
              background: ICC.white, borderRadius: 4, padding: '1px 5px', letterSpacing: '0.05em',
            }}>
              ON STRIKE
            </span>
          )}
          <span style={{ color: ICC.white, fontWeight: 700, fontSize: '1rem', letterSpacing: '0.1em' }}>
            {isArriving ? 'NEW BATTER' : 'BATTING'}
          </span>
        </div>
        <TeamLogo team={team} size={32} />
      </div>

      {/* Player image */}
      <div style={{ position: 'relative', width: CARD_W, height: IMG_H, flexShrink: 0, background: `${ICC.purple}cc` }}>
        <PlayerImage cloudinaryId={player?.headshotCloudinaryId} name={batter.displayName} />
        {/* Name bar overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          paddingTop: 8, paddingBottom: 8, paddingLeft: 10, paddingRight: 10,
          background: ICC.white,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6,
        }}>
          {isStriker && !isArriving && (
            <div style={{ width: 10, height: 20, background: ICC.pinkStrike, borderRadius: 2, flexShrink: 0 }} />
          )}
          <span style={{
            color: ICC.purple, fontSize: 20, fontFamily: ICC.font, fontWeight: 700,
            textTransform: 'uppercase', textAlign: 'center',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260,
          }}>
            {batter.displayName}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{
        flex: 1, background: ICC.purple,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '0 20px', overflow: 'hidden',
      }}>
        {isArriving ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {player?.role && (
              <span style={{
                background: ICC.pink, color: ICC.white,
                borderRadius: 500, padding: '3px 12px',
                fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.08em',
              }}>
                {roleLabel(player.role)}
              </span>
            )}
            {player?.battingStyle && (
              <span style={{ color: `${ICC.white}88`, fontWeight: 400, fontSize: '0.85rem' }}>
                {player.battingStyle}
              </span>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ color: ICC.yellow, fontWeight: 900, fontSize: '3.4rem', lineHeight: 1 }}>
              {batter.runs}
            </span>
            <span style={{ color: `${ICC.white}88`, fontWeight: 400, fontSize: '1rem' }}>
              ({batter.balls}b)
            </span>
          </div>
        )}
      </div>

      {/* Footer stats */}
      {!isArriving && (
        <div style={{ borderTop: `2px solid ${ICC.pink}`, display: 'flex', flexShrink: 0, background: ICC.purple }}>
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

export function ICC2023BowlerCard({ bowler, player, team }: BowlerCardProps) {
  return (
    <motion.div
      {...cardAnimation}
      style={{
        position: 'relative', width: CARD_W, height: CARD_H,
        borderRadius: 0, overflow: 'hidden',
        background: ICC.purple,
        boxShadow: ICC.imgShadow,
        display: 'flex', flexDirection: 'column',
        fontFamily: ICC.font,
      }}
    >
      {/* Header */}
      <div style={{
        background: ICC.pink,
        height: 48,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px 0 18px', flexShrink: 0, zIndex: 2,
      }}>
        <span style={{ color: ICC.white, fontWeight: 700, fontSize: '1rem', letterSpacing: '0.1em' }}>
          BOWLING
        </span>
        <TeamLogo team={team} size={32} />
      </div>

      {/* Player image */}
      <div style={{ position: 'relative', width: CARD_W, height: IMG_H, flexShrink: 0, background: `${ICC.purple}cc` }}>
        <PlayerImage cloudinaryId={player?.headshotCloudinaryId} name={bowler.displayName} />
        {/* Name bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          paddingTop: 8, paddingBottom: 8,
          background: ICC.white,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            color: ICC.purple, fontSize: 20, fontFamily: ICC.font, fontWeight: 700,
            textTransform: 'uppercase', textAlign: 'center',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280,
          }}>
            {bowler.displayName}
          </span>
        </div>
      </div>

      {/* Stats body */}
      <div style={{
        flex: 1, background: ICC.purple,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '0 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ color: ICC.yellow, fontWeight: 900, fontSize: '3.4rem', lineHeight: 1 }}>
            {bowler.overs}.{bowler.balls}
          </span>
          <span style={{ color: `${ICC.white}88`, fontWeight: 400, fontSize: '1rem' }}>
            overs
          </span>
        </div>
      </div>

      {/* Footer stats */}
      <div style={{ borderTop: `2px solid ${ICC.pink}`, display: 'flex', flexShrink: 0, background: ICC.purple }}>
        <StatCell label="Wkts" value={bowler.wickets} first />
        <StatCell label="Runs" value={bowler.runs} />
        <StatCell label="Econ" value={bowler.economy.toFixed(1)} />
      </div>
    </motion.div>
  )
}
