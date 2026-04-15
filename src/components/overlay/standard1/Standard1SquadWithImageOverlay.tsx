'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { PlayerSummary, TeamSummary } from '@/types/match'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

// Exact CSS from Squad with Image.html
const YELLOW_MAIN = '#f6ce00'
const BLACK_GRAD = 'linear-gradient(to left, #1c1c1d, #2b2b2d, #3b3b3d, #4c4c4e, #5e5e60)'

type Props = {
  team: TeamSummary
  players: PlayerSummary[]
}

export function Standard1SquadWithImageOverlay({ team, players }: Props) {
  const displayed = players.slice(0, 15)

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: 'spring', stiffness: 110, damping: 18 }}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#ffffff4a',
        borderRadius: 10,
        border: '4px solid white',
        zIndex: 20,
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Black header */}
      <div style={{
        backgroundImage: BLACK_GRAD,
        color: 'white',
        display: 'inline-flex',
        alignItems: 'center',
        width: '100%',
        padding: '12px 20px',
        gap: 14,
        boxSizing: 'border-box',
      }}>
        {/* Team logo */}
        {team.logoCloudinaryId ? (
          <div style={{
            width: 60, height: 60,
            borderRadius: 9999,
            overflow: 'hidden',
            background: 'white',
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Image
              src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_60,h_60,f_webp/${team.logoCloudinaryId}`}
              alt={team.name}
              width={60}
              height={60}
              style={{ objectFit: 'cover' }}
            />
          </div>
        ) : (
          <div style={{ width: 60, height: 60, borderRadius: 9999, background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: YELLOW_MAIN, fontWeight: 900, fontSize: 22 }}>{team.shortCode.charAt(0)}</span>
          </div>
        )}

        <div>
          <div style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2 }}>
            {team.name}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: YELLOW_MAIN, textTransform: 'uppercase', letterSpacing: 2 }}>
            PLAYING SQUAD
          </div>
        </div>
      </div>

      {/* Player grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 160px)',
        gap: 10,
        padding: '16px 20px 20px',
      }}>
        {displayed.map((player) => (
          <div key={player.id} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0,
          }}>
            {/* Player image */}
            <div style={{
              width: 160,
              height: 180,
              background: '#222',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {player.headshotCloudinaryId ? (
                <Image
                  src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,g_face,w_160,h_180,f_webp/${player.headshotCloudinaryId}`}
                  alt={player.displayName}
                  fill
                  style={{ objectFit: 'cover', objectPosition: 'top center' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(to bottom, #1a1a1a, #2a2a2a)',
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 56, fontWeight: 900 }}>
                    {player.displayName.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            {/* Player name — yellow label */}
            <div style={{
              width: '100%',
              background: YELLOW_MAIN,
              color: '#000',
              textAlign: 'center',
              padding: '5px 4px',
              fontSize: 13,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {player.displayName}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
