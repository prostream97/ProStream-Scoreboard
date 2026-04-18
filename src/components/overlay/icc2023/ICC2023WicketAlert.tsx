'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { WicketPayload } from '@/types/pusher'
import type { MatchSnapshot } from '@/types/match'
import { ICC } from './tokens'

type Props = {
  wicket: WicketPayload | null
  snapshot: MatchSnapshot
}

const DISMISSAL_LABEL: Record<string, string> = {
  bowled: 'BOWLED',
  caught: 'CAUGHT',
  lbw: 'LBW',
  runout: 'RUN OUT',
  stumped: 'STUMPED',
  hitwicket: 'HIT WICKET',
  obstructingfield: 'OBSTRUCTING THE FIELD',
  handledball: 'HANDLED THE BALL',
  timedout: 'TIMED OUT',
}

export function ICC2023WicketAlert({ wicket, snapshot }: Props) {
  const [visible, setVisible] = useState(false)
  const [shown, setShown] = useState<WicketPayload | null>(null)
  const shownRef = useRef<WicketPayload | null>(null)

  useEffect(() => {
    if (!wicket) {
      shownRef.current = null
      setShown(null)
      setVisible(false)
      return
    }
    const key = `${wicket.dismissedBatterId}-${wicket.inningsWickets}`
    const prevKey = shownRef.current
      ? `${shownRef.current.dismissedBatterId}-${shownRef.current.inningsWickets}`
      : null
    if (key === prevKey) return
    shownRef.current = wicket
    setShown(wicket)
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 4000)
    return () => clearTimeout(t)
  }, [wicket])

  const outBatter = shown
    ? snapshot.battingTeamPlayers.find((p) => p.id === shown.dismissedBatterId) ?? snapshot.bowlingTeamPlayers.find((p) => p.id === shown.dismissedBatterId)
    : null

  return (
    <AnimatePresence>
      {visible && shown && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(20px)', transition: { duration: 0.5 } }}
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {/* Purple backdrop */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(50, 0, 117, 0.85)',
          }} />

          {/* Card */}
          <motion.div
            initial={{ scale: 0.3, rotate: -10, filter: 'blur(10px)' }}
            animate={{ scale: 1, rotate: 0, filter: 'blur(0px)' }}
            transition={{ type: 'spring', stiffness: 180, damping: 12 }}
            style={{
              position: 'relative', zIndex: 10,
              textAlign: 'center',
              paddingLeft: 80, paddingRight: 80,
              paddingTop: 48, paddingBottom: 48,
              borderRadius: 24,
              background: ICC.purple,
              boxShadow: `${ICC.scorebox}, 0 0 80px rgba(253,2,163,0.5)`,
              borderTop: `8px solid ${ICC.pink}`,
              overflow: 'hidden',
            }}
          >
            {/* WICKET! heading */}
            <p style={{
              fontFamily: ICC.font,
              fontSize: '9rem',
              fontWeight: 700,
              color: ICC.white,
              letterSpacing: '0.1em',
              lineHeight: 1,
              marginBottom: 8,
              textShadow: '0 4px 20px rgba(0,0,0,0.8)',
            }}>
              WICKET!
            </p>

            {/* Batter name */}
            {outBatter && (
              <p style={{
                fontFamily: ICC.font,
                fontSize: '2.5rem',
                fontWeight: 700,
                color: ICC.white,
                letterSpacing: '0.05em',
                marginBottom: 12,
                maxWidth: 480,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {outBatter.displayName.toUpperCase()}
              </p>
            )}

            {/* Dismissal type */}
            <p style={{
              fontFamily: ICC.font,
              fontSize: '1.5rem',
              fontWeight: 600,
              color: ICC.pink,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}>
              {DISMISSAL_LABEL[shown.dismissalType] ?? shown.dismissalType}
            </p>

            {/* Wickets count */}
            <div style={{ marginTop: 16, fontFamily: ICC.font, color: `${ICC.white}99`, fontSize: '1.1rem', fontWeight: 500 }}>
              {shown.inningsWickets} wicket{shown.inningsWickets !== 1 ? 's' : ''} down
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
