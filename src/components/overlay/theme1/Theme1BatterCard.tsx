'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { BatterStats, PlayerSummary, TeamSummary } from '@/types/match'
import type { TournamentBatterStats } from '@/lib/db/queries/tournamentPlayerStats'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

const GOLD_GRAD = 'linear-gradient(280deg, rgb(249,204,1) 0%, rgb(0,0,0) 100%)'

type StatCell = { label: string; value: string | number }

type Props = {
  batter: BatterStats
  player: PlayerSummary | undefined
  team: TeamSummary
  tournamentStats: TournamentBatterStats | null
}

export function Theme1BatterCard({ batter, player, team, tournamentStats }: Props) {
  const headshot = player?.headshotCloudinaryId

  const highestLabel =
    tournamentStats
      ? `${tournamentStats.highestScore}${tournamentStats.highestNotOut ? '*' : ''}`
      : '—'

  const stats: StatCell[] = [
    { label: 'Matches', value: tournamentStats?.matches ?? '—' },
    { label: 'Innings', value: tournamentStats?.innings ?? '—' },
    { label: 'Runs', value: tournamentStats?.runs ?? '—' },
    { label: 'Highest', value: highestLabel },
    { label: 'Average', value: tournamentStats?.average != null ? tournamentStats.average.toFixed(2) : '—' },
    { label: 'Strike Rate', value: tournamentStats?.strikeRate != null ? tournamentStats.strikeRate.toFixed(2) : '—' },
    { label: 'Fifties', value: tournamentStats?.fifties ?? '—' },
    { label: 'Hundreds', value: tournamentStats?.hundreds ?? '—' },
  ]

  return (
    <motion.div
      key="theme1-batter-card"
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
        height: 243,
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
        {headshot ? (
          <Image
            src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,g_face,w_150,h_150,f_webp/${headshot}`}
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
        {/* Name + team row */}
        <div
          style={{
            display: 'inline-flex',
            width: '100%',
            marginBottom: 20,
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
            {team.shortCode} · BAT
          </span>
        </div>

        {/* Stats grid — 4 per row × 2 rows */}
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {stats.map((stat, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: 'calc(25% - 15px)',
                marginRight: 15,
                marginBottom: i < 4 ? 15 : 0,
                boxShadow: 'rgba(0,0,0,0.3) 0px 0px 18px 0px',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: 40,
                  lineHeight: '44px',
                  fontWeight: 700,
                }}
              >
                {stat.value}
              </span>
              <span
                style={{
                  fontSize: 22,
                  lineHeight: '25px',
                  fontWeight: 700,
                  opacity: 0.85,
                }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
