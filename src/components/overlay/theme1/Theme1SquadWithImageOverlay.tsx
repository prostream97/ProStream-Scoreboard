'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import type { PlayerSummary, TeamSummary } from '@/types/match'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const GOLD = 'rgb(249,204,1)'
const GOLD_HEADER_GRAD = 'linear-gradient(280deg, rgb(249,204,1) 0%, rgb(0,0,0) 50%, rgb(249,204,1) 100%)'
const CARD_GRAD = 'linear-gradient(280deg, rgb(0,0,0) 0%, rgb(249,204,1) 100%)'
const PANEL_WIDTH = 1090

type Props = {
  team: TeamSummary
  players: PlayerSummary[]
}

export function Theme1SquadWithImageOverlay({ team, players }: Props) {
  const displayed = players.slice(0, 15)
  const [viewport, setViewport] = useState({ width: 1920, height: 1080 })

  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth || 1920, height: window.innerHeight || 1080 })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const scale = useMemo(() => {
    const baseHeight = 760
    const ws = (viewport.width - 40) / PANEL_WIDTH
    const hs = (viewport.height - 40) / baseHeight
    return Math.max(0.6, Math.min(1, ws, hs))
  }, [viewport.width, viewport.height])

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20000,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 110, damping: 18 }}
        style={{
          transformOrigin: 'center center',
          transform: `scale(${scale})`,
          width: PANEL_WIDTH,
          borderRadius: 10,
          overflow: 'hidden',
          fontFamily: '"Source Sans Pro", sans-serif',
          boxShadow: 'rgba(0,0,0,0.75) 0px 0px 24px 0px',
        }}
      >
        {/* Header */}
        <div style={{
          background: GOLD_HEADER_GRAD,
          display: 'inline-flex',
          alignItems: 'center',
          width: '100%',
          padding: '14px 28px',
          gap: 16,
          boxSizing: 'border-box',
        }}>
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
            <div style={{
              width: 60, height: 60,
              borderRadius: 9999,
              background: 'rgba(0,0,0,0.5)',
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `2px solid ${GOLD}`,
            }}>
              <span style={{ color: GOLD, fontWeight: 900, fontSize: 24 }}>
                {team.shortCode.charAt(0)}
              </span>
            </div>
          )}

          <div>
            <div style={{
              fontSize: 28,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: 2,
              color: 'rgb(255,255,255)',
              lineHeight: '32px',
            }}>
              {team.name}
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 2,
              color: GOLD,
            }}>
              FULL SQUAD
            </div>
          </div>
        </div>

        {/* Player grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 140px)',
          gap: '1rem',
          padding: '16px 40px 24px',
          width: PANEL_WIDTH,
          boxSizing: 'border-box',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.55)',
        }}>
          {displayed.map((player) => (
            <div key={player.id} style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Image */}
              <div style={{
                width: 140,
                height: 170,
                background: CARD_GRAD,
                position: 'relative',
                overflow: 'hidden',
              }}>
                {player.headshotCloudinaryId ? (
                  <Image
                    src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,g_face,w_140,h_170,f_webp/${player.headshotCloudinaryId}`}
                    alt={player.displayName}
                    fill
                    style={{ objectFit: 'cover', objectPosition: 'top center' }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: CARD_GRAD,
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 56, fontWeight: 900 }}>
                      {player.displayName.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Name strip */}
              <div style={{
                width: '100%',
                height: 42,
                background: GOLD,
                color: '#000',
                textAlign: 'center',
                padding: '0 4px',
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
                boxSizing: 'border-box',
              }}>
                {player.displayName}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
