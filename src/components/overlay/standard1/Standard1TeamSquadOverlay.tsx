'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { PlayerSummary, TeamSummary } from '@/types/match'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

// Exact gradients from Team Squad.html CSS
const GREY_COLOR = 'linear-gradient(to bottom, #e9e4e4 0%, #ffffff 25%, #e7e5e5 50%, #ece8e8 100%)'
const DARK_BEAM_BG = 'linear-gradient(to left, #1c1c1d, #2b2b2d, #3b3b3d, #4c4c4e, #5e5e60)'

type Props = {
  homeTeam: TeamSummary
  awayTeam: TeamSummary
  homePlayers: PlayerSummary[]
  awayPlayers: PlayerSummary[]
}

function logoUrl(id: string | null, size: number) {
  if (!id || !CLOUD_NAME) return null
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_${size},h_${size},f_webp/${id}`
}

function TeamLogo({ id, name }: { id: string | null; name: string }) {
  const src = logoUrl(id, 150)
  return (
    <div
      style={{
        width: 150,
        height: 150,
        borderRadius: 50,
        border: '4px solid white',
        background: 'white',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {src ? (
        <Image src={src} alt={name} width={150} height={150} style={{ objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: 56, fontWeight: 900, color: '#080a6a' }}>
          {name.charAt(0)}
        </span>
      )}
    </div>
  )
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

function normalizeHexColor(hex: string | null | undefined) {
  if (!hex) return null
  const trimmed = hex.trim()
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) return withHash
  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    const [, r, g, b] = withHash
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return null
}

function hexToRgb(hex: string) {
  const normalized = normalizeHexColor(hex)
  if (!normalized) return null
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  }
}

function shiftHex(hex: string, delta: number) {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const r = clamp(rgb.r + delta, 0, 255)
  const g = clamp(rgb.g + delta, 0, 255)
  const b = clamp(rgb.b + delta, 0, 255)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function teamStripBackground(primaryColor: string) {
  const normalized = normalizeHexColor(primaryColor)
  if (!normalized) return primaryColor
  const light = shiftHex(normalized, 28)
  const dark = shiftHex(normalized, -28)
  return `linear-gradient(to bottom, ${light} 2%, ${normalized} 30%, ${normalized} 60%, ${dark} 100%)`
}

function teamStripTextColor(primaryColor: string) {
  const rgb = hexToRgb(primaryColor)
  if (!rgb) return '#fff'
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.62 ? '#000' : '#fff'
}

function TeamColumn({
  team,
  players,
  teamNameBackground,
  teamNameColor,
}: {
  team: TeamSummary
  players: PlayerSummary[]
  teamNameBackground: string
  teamNameColor: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'inline-flex' }}>
        <div
          style={{
            position: 'relative',
            width: 15,
            height: 60,
            backgroundImage: DARK_BEAM_BG,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <div className="s1-squad-beam-vt" />
        </div>
        <div
          style={{
            width: 610,
            height: 60,
            display: 'block',
            lineHeight: '60px',
            fontSize: 30,
            fontWeight: 'bold',
            textAlign: 'center',
            color: teamNameColor,
            background: teamNameBackground,
            overflow: 'hidden',
          }}
        >
          <span>{team.name}</span>
        </div>
        <div
          style={{
            position: 'relative',
            width: 15,
            height: 60,
            backgroundImage: DARK_BEAM_BG,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <div className="s1-squad-beam-vt" />
        </div>
      </div>

      <div
        style={{
          fontSize: 30,
          fontWeight: 'bold',
          lineHeight: '60px',
          width: 550,
          textAlign: 'left',
        }}
      >
        {players.map((player) => (
          <div
            key={player.id}
            style={{
              width: 550,
              height: 60,
              lineHeight: '60px',
              paddingLeft: 20,
              borderRight: '10px solid #080a6a',
              borderLeft: '10px solid #080a6a',
              color: '#000',
              background: GREY_COLOR,
              boxSizing: 'border-box',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {player.displayName}
          </div>
        ))}
      </div>
    </div>
  )
}

export function Standard1TeamSquadOverlay({ homeTeam, awayTeam, homePlayers, awayPlayers }: Props) {
  return (
    <>
      <style jsx>{`
        .s1-squad-beam-hz {
          position: absolute;
          top: 0;
          left: -50%;
          width: 200%;
          height: 100%;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.05) 35%,
            rgba(255, 255, 255, 0.92) 50%,
            rgba(255, 255, 255, 0.05) 65%,
            rgba(255, 255, 255, 0) 100%
          );
          animation: s1-squad-beam-hz 3.4s ease-in-out infinite;
          pointer-events: none;
          will-change: transform;
        }
        @keyframes s1-squad-beam-hz {
          0% { transform: translateX(-35%); }
          100% { transform: translateX(35%); }
        }
        .s1-squad-beam-vt {
          position: absolute;
          top: -120%;
          left: -60%;
          width: 220%;
          height: 220%;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.08) 35%,
            rgba(255, 255, 255, 0.95) 50%,
            rgba(255, 255, 255, 0.08) 65%,
            rgba(255, 255, 255, 0) 100%
          );
          animation: s1-squad-beam-vt 2.8s linear infinite;
          pointer-events: none;
          will-change: transform;
        }
        @keyframes s1-squad-beam-vt {
          0% { transform: translateY(-45%); }
          100% { transform: translateY(45%); }
        }
      `}</style>

      {/* Outer div handles centering — Framer Motion can't own transform when we need translate(-50%,-50%) */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          fontFamily: '"myFont", "Rajdhani", "Arial Narrow", Arial, sans-serif',
        }}
      >
      <motion.div
        initial={{ opacity: 0, y: -60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -60 }}
        transition={{ type: 'spring', stiffness: 100, damping: 18 }}
      >
        {/* Outer wrapper — 1300px matches .teamSquadHeader width */}
        <div style={{ width: 1300 }}>

          {/* Yellow header — teamSquadHeader yellowMainColor */}
          <div
            style={{
              position: 'relative',
              width: 1300,
              height: 70,
              lineHeight: '70px',
              fontSize: 40,
              fontWeight: 1000,
              textAlign: 'center',
              color: '#000',
              background: '#f6ce00',
              border: '5px solid yellow',
              borderRadius: 3,
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: 1300,
                height: 70,
                overflow: 'hidden',
                inset: 0,
              }}
            >
              <div className="s1-squad-beam-hz" />
            </div>
            {/* teamSquadHeadertxt */}
            <div style={{ width: 1300, textAlign: 'center', fontSize: 44, fontWeight: 1000 }}>
              <span>TEAM SQUAD</span>
            </div>

            {/* Team logo left — teamSquadTeamLogo1: margin-top -50px, margin-left -70px */}
            <div
              style={{
                position: 'absolute',
                top: -50,
                left: -70,
                width: 150,
                height: 150,
                zIndex: 1,
              }}
            >
              <TeamLogo id={homeTeam.logoCloudinaryId} name={homeTeam.name} />
            </div>

            {/* Team logo right — teamSquadTeamLogo2: margin-top -50px, margin-left 1220px */}
            <div
              style={{
                position: 'absolute',
                top: -50,
                left: 1220,
                width: 150,
                height: 150,
                zIndex: 1,
              }}
            >
              <TeamLogo id={awayTeam.logoCloudinaryId} name={awayTeam.name} />
            </div>
          </div>

          {/* Content row — two team columns with exact 10px gap */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <div style={{ display: 'inline-flex' }}>
              <TeamColumn
                team={homeTeam}
                players={homePlayers}
                teamNameBackground={teamStripBackground(homeTeam.primaryColor)}
                teamNameColor={teamStripTextColor(homeTeam.primaryColor)}
              />
            </div>
            <div style={{ display: 'inline-flex', marginLeft: 10 }}>
              <TeamColumn
                team={awayTeam}
                players={awayPlayers}
                teamNameBackground={teamStripBackground(awayTeam.primaryColor)}
                teamNameColor={teamStripTextColor(awayTeam.primaryColor)}
              />
            </div>
          </div>

        </div>
      </motion.div>
      </div>
    </>
  )
}
