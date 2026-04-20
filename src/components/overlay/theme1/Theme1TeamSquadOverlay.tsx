'use client'

import { motion } from 'framer-motion'
import type { MatchSnapshot, PlayerSummary } from '@/types/match'

const GOLD_HEADER_GRAD = 'linear-gradient(280deg, rgba(249,204,1,0.8) 0%, rgba(0,0,0,0.7) 50%, rgba(249,204,1,0.8) 100%)'
const BLUE_HEADER_GRAD = 'linear-gradient(280deg, rgba(0,67,222,0.8) 0%, rgba(0,0,0,0.7) 50%, rgba(0,67,222,0.8) 100%)'
const GOLD_ROW_GRAD    = 'linear-gradient(280deg, rgb(249,204,1) 0%, rgb(0,0,0) 100%)'
const BLUE_ROW_GRAD    = 'linear-gradient(280deg, rgb(0,67,222) 0%, rgb(0,0,0) 100%)'

function TeamColumn({
  teamName,
  players,
  headerGrad,
  rowGrad,
}: {
  teamName: string
  players: PlayerSummary[]
  headerGrad: string
  rowGrad: string
}) {
  return (
    <div style={{ width: 525 }}>
      {/* Team name header */}
      <div style={{
        background: headerGrad,
        fontSize: 35,
        lineHeight: '40px',
        fontWeight: 700,
        padding: '15px 0',
        textAlign: 'center',
        color: 'rgb(255,255,255)',
        marginBottom: 5,
        boxShadow: 'rgba(0,0,0,0.75) 0px 0px 18px 0px',
      }}>
        {teamName}
      </div>

      {/* Player list */}
      <div style={{ width: '90%', margin: '0 auto' }}>
        {players.map((player) => (
          <div key={player.id} style={{
            background: rowGrad,
            padding: '8px 10px 8px 20px',
            marginBottom: 5,
            fontSize: 30,
            lineHeight: '35px',
            color: 'rgb(255,255,255)',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {player.displayName}
          </div>
        ))}
      </div>
    </div>
  )
}

type Props = { snapshot: MatchSnapshot }

export function Theme1TeamSquadOverlay({ snapshot }: Props) {
  const inn = snapshot.currentInningsState
  const battingTeamId = inn?.battingTeamId

  const homePlayers: PlayerSummary[] = battingTeamId === snapshot.homeTeam.id
    ? snapshot.battingTeamPlayers
    : snapshot.bowlingTeamPlayers

  const awayPlayers: PlayerSummary[] = battingTeamId === snapshot.homeTeam.id
    ? snapshot.bowlingTeamPlayers
    : snapshot.battingTeamPlayers

  return (
    <motion.div
      key="theme1-team-squad"
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
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
      <div style={{ display: 'flex', gap: 40 }}>
        <TeamColumn
          teamName={snapshot.homeTeam.name}
          players={homePlayers}
          headerGrad={GOLD_HEADER_GRAD}
          rowGrad={GOLD_ROW_GRAD}
        />
        <TeamColumn
          teamName={snapshot.awayTeam.name}
          players={awayPlayers}
          headerGrad={BLUE_HEADER_GRAD}
          rowGrad={BLUE_ROW_GRAD}
        />
      </div>
    </motion.div>
  )
}
