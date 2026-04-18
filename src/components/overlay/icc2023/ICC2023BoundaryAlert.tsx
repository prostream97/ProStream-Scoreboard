'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { MatchSnapshot } from '@/types/match'
import { ICC } from './tokens'

type BoundaryEvent = { id: number; runs: 4 | 6 } | null

type Props = {
  boundary: BoundaryEvent
  snapshot: MatchSnapshot
}

export function ICC2023BoundaryAlert({ boundary, snapshot: _snapshot }: Props) {
  const [visible, setVisible] = useState(false)
  const [shown, setShown] = useState<BoundaryEvent>(null)
  const shownIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!boundary) {
      shownIdRef.current = null
      setShown(null)
      setVisible(false)
      return
    }
    if (boundary.id === shownIdRef.current) return
    shownIdRef.current = boundary.id
    setShown(boundary)
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 3500)
    return () => clearTimeout(t)
  }, [boundary])

  return (
    <AnimatePresence>
      {visible && shown && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)', transition: { duration: 0.4 } }}
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {/* Purple backdrop */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(50, 0, 117, 0.85)' }} />

          {/* Pink radial burst for SIX */}
          {shown.runs === 6 && (
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.4, mixBlendMode: 'screen',
              background: `radial-gradient(circle at 50% 50%, ${ICC.pink} 0%, transparent 60%)`,
            }} />
          )}

          {/* Text container */}
          <motion.div
            initial={{ scale: 0.8, y: 50, rotateX: 45, filter: `drop-shadow(0px 0px 0px rgba(0,0,0,0)) blur(10px)` }}
            animate={{ scale: 1, y: 0, rotateX: 0, filter: `drop-shadow(0px 10px 30px ${ICC.pink}) blur(0px)` }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, mass: 1.2 }}
            style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}
          >
            <motion.p
              initial={{ scale: 0.1, letterSpacing: '-0.2em' }}
              animate={{ scale: 1, letterSpacing: '0.05em' }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
              style={{
                fontFamily: ICC.font,
                fontSize: '15rem',
                lineHeight: 1,
                color: ICC.yellow,
                textTransform: 'uppercase',
                fontStyle: 'italic',
                fontWeight: 700,
                WebkitTextStroke: `4px ${ICC.purple}`,
                textShadow: `0 10px 40px ${ICC.pink}, 0 20px 80px rgba(0,0,0,0.8)`,
              }}
            >
              {shown.runs === 6 ? 'SIX' : 'FOUR'}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              style={{
                marginTop: 24,
                paddingLeft: 48, paddingRight: 48,
                paddingTop: 12, paddingBottom: 12,
                borderRadius: 9999,
                border: `2px solid ${ICC.pink}`,
                background: `${ICC.purple}cc`,
              }}
            >
              <p style={{
                fontFamily: ICC.font,
                fontSize: '2.5rem',
                fontWeight: 700,
                color: ICC.white,
                letterSpacing: '0.2em',
              }}>
                {shown.runs === 6 ? 'MAXIMUM' : 'BOUNDARY'}
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
