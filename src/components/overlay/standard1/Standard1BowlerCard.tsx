'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { BowlerStats, PlayerSummary, TeamSummary } from '@/types/match'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

// Exact CSS from Bowler Card.html
const BLUE_GRAD = 'linear-gradient(to right, #0307e3, #1416ea, #1e21f1, #272af8, #2e32ff)'
const YELLOW_GRAD = 'linear-gradient(to right, #ffe400, #ffd921, #ffe435, #fcec38, #fff91e)'
const BLACK_GRAD = 'linear-gradient(to left, #1c1c1d, #2b2b2d, #3b3b3d, #4c4c4e, #5e5e60)'

type Props = {
  bowler: BowlerStats
  player: PlayerSummary | undefined
  team: TeamSummary
}

export function Standard1BowlerCard({ bowler, player, team }: Props) {
  const headshot = player?.headshotCloudinaryId

  const topLabels = ['Overs', 'Runs', 'Wkts', 'Econ', 'Mdns']
  const bottomValues = [
    `${bowler.overs}.${bowler.balls}`,
    bowler.runs,
    bowler.wickets,
    bowler.economy.toFixed(1),
    bowler.maidens,
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: 'spring', stiffness: 130, damping: 18 }}
      style={{
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        margin: 'auto',
        width: 1490,
        height: 208,
        backgroundImage: BLACK_GRAD,
        color: 'white',
        display: 'inline-flex',
        fontFamily: 'Arial, sans-serif',
        zIndex: 20,
        border: '5px solid black',
        boxSizing: 'border-box',
      }}
    >
      {/* Player picture */}
      <div style={{
        width: 160,
        height: '100%',
        flexShrink: 0,
        background: '#1a1a1a',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {headshot ? (
          <Image
            src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,g_face,w_160,h_208,f_webp/${headshot}`}
            alt={bowler.displayName}
            fill
            style={{ objectFit: 'cover', objectPosition: 'top center' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 72, fontWeight: 900 }}>
              {bowler.displayName.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Right content */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {/* Name + team + score row */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          padding: '0 0 0 40px',
        }}>
          {/* Name column */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 45,
              fontWeight: 1000 as number,
              height: 50,
              lineHeight: '50px',
              textTransform: 'uppercase',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 900,
            }}>
              {bowler.displayName}
            </div>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.65)',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}>
              {team.shortCode}
            </div>
          </div>
          {/* Wkts-Runs */}
          <div style={{ marginRight: 20 }}>
            <span style={{
              fontSize: 55,
              fontWeight: 1000 as number,
              width: 240,
              height: 80,
              lineHeight: '80px',
              textAlign: 'center',
              display: 'block',
            }}>
              {bowler.wickets}-{bowler.runs}
            </span>
          </div>
        </div>

        {/* Blue label row */}
        <div style={{
          display: 'flex',
          backgroundImage: BLUE_GRAD,
          color: 'white',
          height: 40,
        }}>
          {topLabels.map((label, i) => (
            <div key={i} style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 18,
              fontWeight: 700,
              lineHeight: '40px',
              borderRight: i < topLabels.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none',
            }}>
              {label}
            </div>
          ))}
        </div>

        {/* Yellow value row */}
        <div style={{
          display: 'flex',
          backgroundImage: YELLOW_GRAD,
          color: 'black',
          height: 40,
        }}>
          {bottomValues.map((val, i) => (
            <div key={i} style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 22,
              fontWeight: 900,
              lineHeight: '40px',
              borderRight: i < bottomValues.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none',
            }}>
              {val}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
