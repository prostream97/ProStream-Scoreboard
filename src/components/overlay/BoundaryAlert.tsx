'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { MatchSnapshot } from '@/types/match'

type BoundaryEvent = {
  id: number
  runs: 4 | 6
} | null

type Props = {
  boundary: BoundaryEvent
  snapshot: MatchSnapshot
}

export function BoundaryAlert({ boundary, snapshot }: Props) {
  const [visible, setVisible] = useState(false)
  const [shown, setShown] = useState<BoundaryEvent>(null)
  const shownIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!boundary || boundary.id === shownIdRef.current) return
    shownIdRef.current = boundary.id
    setShown(boundary)
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 3500)
    return () => clearTimeout(t)
  }, [boundary])

  const battingTeam =
    snapshot.currentInningsState?.battingTeamId === snapshot.homeTeam.id
      ? snapshot.homeTeam
      : snapshot.awayTeam

  return (
    <AnimatePresence>
      {visible && shown && (
        // Full-screen overlay — use entire 1920×1080 browser source in OBS
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)", transition: { duration: 0.4 } }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          {/* Background blast effect for Six */}
          {shown.runs === 6 && (
            <div 
              className="absolute inset-0 opacity-40 mix-blend-screen"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${battingTeam.primaryColor} 0%, transparent 60%)`,
                animation: 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}
            />
          )}

          {/* Animated 3D-like text container */}
          <motion.div
            initial={{ scale: 0.8, y: 50, rotateX: 45, filter: "drop-shadow(0px 0px 0px rgba(0,0,0,0)) blur(10px)" }}
            animate={{ scale: 1, y: 0, rotateX: 0, filter: `drop-shadow(0px 10px 30px ${battingTeam.primaryColor}) blur(0px)` }}
            transition={{ type: "spring", stiffness: 200, damping: 15, mass: 1.2 }}
            className="relative z-10 flex flex-col items-center justify-center pt-20"
            style={{ perspective: 1000 }}
          >
            <motion.p
              initial={{ scale: 0.1, letterSpacing: '-0.2em' }}
              animate={{ scale: 1, letterSpacing: '0.05em' }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
              className="font-display text-[15rem] leading-none text-white uppercase italic"
              style={{ 
                WebkitTextStroke: `4px ${battingTeam.primaryColor}`,
                textShadow: `0 10px 40px ${battingTeam.primaryColor}, 0 20px 80px rgba(0,0,0,0.8)`
              }}
            >
              {shown.runs === 6 ? 'SIX' : 'FOUR'}
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-6 px-12 py-3 rounded-full border-2 bg-black/80 backdrop-blur-md"
              style={{ borderColor: battingTeam.primaryColor }}
            >
              <p className="font-stats text-4xl text-white tracking-[0.2em] font-bold">
                {shown.runs === 6 ? 'MAXIMUM' : 'BOUNDARY'}
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
