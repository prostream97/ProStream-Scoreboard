'use client'

import type { MatchSnapshot } from '@/types/match'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { ICC } from './tokens'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

type Props = {
  snapshot: MatchSnapshot
  tournamentName?: string
}

export function ICC2023Header({ snapshot, tournamentName }: Props) {
  const inn = snapshot.currentInningsState
  const batting = inn?.battingTeamId === snapshot.homeTeam.id ? snapshot.homeTeam : snapshot.awayTeam
  const bowling = inn?.battingTeamId === snapshot.homeTeam.id ? snapshot.awayTeam : snapshot.homeTeam

  const TeamLogo = ({ team }: { team: typeof batting }) => (
    <div style={{
      width: 56, height: 42,
      overflow: 'hidden', flexShrink: 0,
      border: `2px solid ${ICC.pink}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: ICC.purple,
    }}>
      {team.logoCloudinaryId ? (
        <Image
          src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_56,h_42,f_webp/${team.logoCloudinaryId}`}
          alt={team.name}
          width={56}
          height={42}
          style={{ objectFit: 'cover' }}
        />
      ) : (
        <span style={{ color: ICC.white, fontFamily: ICC.font, fontWeight: 700, fontSize: 16 }}>
          {team.shortCode.charAt(0)}
        </span>
      )}
    </div>
  )

  return (
    <motion.div
      initial={{ y: -150, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -150, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
    >
      {/* Main header bar */}
      <div style={{
        width: '100%',
        background: ICC.purple,
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 64,
        paddingRight: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        borderBottom: `3px solid ${ICC.pink}`,
      }}>
        {/* Left: ICC logo mark + batting team */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* ICC CWC 2023 logo mark (simplified geometric shape) */}
          <div style={{
            width: 48, height: 48,
            background: ICC.white,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          }}>
            <div style={{
              width: 32, height: 32,
              background: ICC.purple,
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: ICC.white, fontSize: 10, fontFamily: ICC.font, fontWeight: 700 }}>ICC</span>
            </div>
          </div>

          <TeamLogo team={batting} />
          <span style={{ color: ICC.white, fontSize: 22, fontFamily: ICC.font, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {batting.shortCode}
          </span>
        </div>

        {/* Center: tournament name + vs */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{ color: ICC.yellow, fontSize: 13, fontFamily: ICC.font, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            {tournamentName ?? 'ICC CRICKET WORLD CUP 2023'}
          </span>
          <span style={{ color: ICC.white, fontSize: 20, fontFamily: ICC.font, fontWeight: 700 }}>
            {batting.shortCode} <span style={{ color: ICC.pink }}>vs</span> {bowling.shortCode}
          </span>
        </div>

        {/* Right: bowling team + LIVE badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: ICC.white, fontSize: 22, fontFamily: ICC.font, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {bowling.shortCode}
          </span>
          <TeamLogo team={bowling} />

          {/* LIVE badge */}
          <div style={{
            paddingLeft: 8, paddingRight: 8, paddingTop: 4, paddingBottom: 4,
            background: ICC.red,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <div style={{ width: 6, height: 6, background: ICC.white, borderRadius: 9999 }} />
            <span style={{ color: ICC.white, fontSize: 16, fontFamily: 'Inter, sans-serif', fontWeight: 800 }}>LIVE</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
