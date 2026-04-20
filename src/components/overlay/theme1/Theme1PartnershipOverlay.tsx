'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { MatchSnapshot, PlayerSummary } from '@/types/match'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const GOLD_GRAD = 'linear-gradient(280deg, rgb(249,204,1) 0%, rgb(0,0,0) 100%)'
const DARK_BG = 'rgba(0,0,0,0.9)'

type Props = { snapshot: MatchSnapshot }

function portraitUrl(player: PlayerSummary | undefined): string | null {
  if (!player?.headshotCloudinaryId || !CLOUD_NAME) return null
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,g_face,w_150,h_150,f_webp/${player.headshotCloudinaryId}`
}

function BatterPane({
  player,
  name,
  runs,
  balls,
  contributionRuns,
  contributionBalls,
  striker,
}: {
  player: PlayerSummary | undefined
  name: string
  runs: number
  balls: number
  contributionRuns: number
  contributionBalls: number
  striker: boolean
}) {
  const src = portraitUrl(player)
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: striker ? 'rgba(249,204,1,0.18)' : 'rgba(255,255,255,0.04)',
        border: striker ? '1px solid rgba(249,204,1,0.45)' : '1px solid rgba(255,255,255,0.08)',
        padding: 16,
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {src ? (
          <Image src={src} alt={name} width={96} height={96} style={{ objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 34, fontWeight: 700, color: 'rgb(255,255,255)' }}>{name.charAt(0)}</span>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: striker ? 'rgb(249,204,1)' : 'rgb(255,255,255)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name}
          {striker ? ' *' : ''}
        </div>
        <div style={{ marginTop: 4, fontSize: 22, color: 'rgb(255,255,255)' }}>
          {runs}
          <span style={{ opacity: 0.75 }}> ({balls})</span>
        </div>
        <div style={{ marginTop: 4, fontSize: 15, opacity: 0.72, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Contribution: {contributionRuns} ({contributionBalls})
        </div>
      </div>
    </div>
  )
}

export function Theme1PartnershipOverlay({ snapshot }: Props) {
  const partnership = snapshot.partnership
  if (!partnership) return null

  const batter1 = snapshot.battingTeamPlayers.find((player) => player.id === partnership.batter1Id)
  const batter2 = snapshot.battingTeamPlayers.find((player) => player.id === partnership.batter2Id)
  const batter1Stats = snapshot.batters.find((batter) => batter.playerId === partnership.batter1Id)
  const batter2Stats = snapshot.batters.find((batter) => batter.playerId === partnership.batter2Id)

  const batter1Name = batter1?.displayName ?? batter1Stats?.displayName ?? 'Batter 1'
  const batter2Name = batter2?.displayName ?? batter2Stats?.displayName ?? 'Batter 2'

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 130, damping: 18 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20000,
        fontFamily: '"Source Sans Pro", sans-serif',
      }}
    >
      <div style={{ width: 1090, background: DARK_BG, boxShadow: 'rgba(0,0,0,0.75) 0px 24px 60px 0px', overflow: 'hidden' }}>
        <div
          style={{
            background: GOLD_GRAD,
            color: 'rgb(255,255,255)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 24px',
          }}
        >
          <span style={{ fontSize: 32, fontWeight: 700, textTransform: 'uppercase' }}>Partnership</span>
          <span style={{ fontSize: 34, fontWeight: 700 }}>
            {partnership.runs}
            <span style={{ fontSize: 22, opacity: 0.85 }}> ({partnership.balls})</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: 14, padding: 16 }}>
          <BatterPane
            player={batter1}
            name={batter1Name}
            runs={batter1Stats?.runs ?? 0}
            balls={batter1Stats?.balls ?? 0}
            contributionRuns={partnership.batter1ContributionRuns}
            contributionBalls={partnership.batter1ContributionBalls}
            striker={snapshot.strikerId === partnership.batter1Id}
          />
          <BatterPane
            player={batter2}
            name={batter2Name}
            runs={batter2Stats?.runs ?? 0}
            balls={batter2Stats?.balls ?? 0}
            contributionRuns={partnership.batter2ContributionRuns}
            contributionBalls={partnership.batter2ContributionBalls}
            striker={snapshot.strikerId === partnership.batter2Id}
          />
        </div>
      </div>
    </motion.div>
  )
}
