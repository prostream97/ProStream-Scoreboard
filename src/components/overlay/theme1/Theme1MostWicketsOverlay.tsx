'use client'

import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import type { TournamentMostWicketsData } from '@/lib/db/queries/match'

const GOLD = 'rgb(249,204,1)'
const BLUE = 'rgb(0,67,222)'
const HEADER_GRAD = 'linear-gradient(280deg, rgb(0,67,222) 0%, rgba(0,0,0,0.8) 50%, rgb(249,204,1) 100%)'

type Props = { data: TournamentMostWicketsData }

function headerCell(align: 'left' | 'center' = 'center'): CSSProperties {
  return {
    color: 'rgb(255,255,255)',
    fontSize: 14,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    textAlign: align,
    padding: '10px 12px',
  }
}

function bodyCell(align: 'left' | 'center' = 'center'): CSSProperties {
  return {
    color: 'rgb(255,255,255)',
    fontSize: 18,
    fontWeight: 600,
    textAlign: align,
    padding: '10px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  }
}

export function Theme1MostWicketsOverlay({ data }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.98 }}
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
      <div style={{ width: 1090, background: 'rgba(0,0,0,0.92)', boxShadow: 'rgba(0,0,0,0.75) 0px 24px 60px 0px' }}>
        <div style={{ background: HEADER_GRAD, color: 'rgb(255,255,255)', padding: '14px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 33, fontWeight: 700, textTransform: 'uppercase' }}>Most Wickets (Top 10)</div>
          <div style={{ marginTop: 4, fontSize: 15, opacity: 0.82, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {data.tournament.name}
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'rgba(0,67,222,0.25)' }}>
            <tr>
              <th style={headerCell('left')}>Bowler</th>
              <th style={headerCell()}>Team</th>
              <th style={headerCell()}>Inng</th>
              <th style={headerCell()}>Balls</th>
              <th style={headerCell()}>Wkts</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length > 0 ? (
              data.rows.map((row, index) => (
                <tr key={row.bowlerId} style={{ background: index % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                  <td style={{ ...bodyCell('left'), fontWeight: 700 }}>{row.rank}. {row.bowlerName}</td>
                  <td style={bodyCell()}>{row.teamName}</td>
                  <td style={bodyCell()}>{row.innings}</td>
                  <td style={bodyCell()}>{row.balls}</td>
                  <td style={{ ...bodyCell(), color: GOLD, fontSize: 22, fontWeight: 700 }}>{row.wickets}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ ...bodyCell(), textAlign: 'center', opacity: 0.7, padding: '24px 0' }}>
                  No wicket data yet
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div
          style={{
            height: 10,
            background: `linear-gradient(90deg, ${BLUE} 0%, ${GOLD} 100%)`,
          }}
        />
      </div>
    </motion.div>
  )
}
