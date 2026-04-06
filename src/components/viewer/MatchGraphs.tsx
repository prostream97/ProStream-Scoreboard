'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { MatchSnapshot } from '@/types/match'

type MatchGraphsProps = {
  snapshot: MatchSnapshot
}

function generateDummyData(overs: number, totalRuns: number) {
  const data = []
  let cumulative = 0
  const avgRunRate = overs > 0 ? (totalRuns / overs) : 6

  for (let i = 1; i <= Math.max(overs, 5); i++) {
    const overRuns = Math.max(0, Math.floor(avgRunRate + (Math.random() * 8 - 4)))
    cumulative += overRuns
    data.push({
      over: i,
      runs: overRuns,
      total: cumulative,
      wickets: Math.random() > 0.8 ? 1 : 0,
    })
  }

  if (data.length >= overs && overs > 0) {
    data[overs - 1].total = totalRuns
  }

  return data
}

export function MatchGraphs({ snapshot }: MatchGraphsProps) {
  const [activeTab, setActiveTab] = useState<'worm' | 'manhattan'>('worm')

  const currentOvers = snapshot.currentInningsState?.overs ?? 0
  const currentRuns = snapshot.currentInningsState?.totalRuns ?? 0
  const [chartData] = useState(() => generateDummyData(currentOvers, currentRuns))

  const primaryColor = snapshot.homeTeam.primaryColor || '#17b45b'

  return (
    <div className="rounded-[1.8rem] border border-[#dfe6df] bg-white p-4 shadow-[0_18px_45px_rgba(26,36,32,0.06)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="app-kicker">Match analytics</p>
          <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">Run progression</h3>
        </div>
        <div className="app-tabbar">
          <button
            onClick={() => setActiveTab('worm')}
            className={`app-tab ${activeTab === 'worm' ? 'app-tab-active' : 'hover:bg-[#f4f7f2] hover:text-slate-900'}`}
          >
            Worm
          </button>
          <button
            onClick={() => setActiveTab('manhattan')}
            className={`app-tab ${activeTab === 'manhattan' ? 'app-tab-active' : 'hover:bg-[#f4f7f2] hover:text-slate-900'}`}
          >
            Manhattan
          </button>
        </div>
      </div>

      <div className="relative h-[250px] w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            <ResponsiveContainer width="100%" height="100%">
              {activeTab === 'worm' ? (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dce4dc" vertical={false} />
                  <XAxis dataKey="over" stroke="#7b8794" tick={{ fontSize: 10, fontFamily: 'var(--font-rajdhani)' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="#7b8794" tick={{ fontSize: 10, fontFamily: 'var(--font-rajdhani)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#dce4dc', borderRadius: '14px' }}
                    itemStyle={{ color: '#172126', fontFamily: 'var(--font-rajdhani)' }}
                    labelStyle={{ color: '#66717b', fontFamily: 'var(--font-rajdhani)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke={primaryColor}
                    strokeWidth={3}
                    dot={{ fill: primaryColor, r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#fff', stroke: primaryColor, strokeWidth: 2 }}
                    animationDuration={1500}
                  />
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dce4dc" vertical={false} />
                  <XAxis dataKey="over" stroke="#7b8794" tick={{ fontSize: 10, fontFamily: 'var(--font-rajdhani)' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="#7b8794" tick={{ fontSize: 10, fontFamily: 'var(--font-rajdhani)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: '#eef4ee', opacity: 1 }}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#dce4dc', borderRadius: '14px' }}
                    itemStyle={{ color: '#172126', fontFamily: 'var(--font-rajdhani)' }}
                    labelStyle={{ color: '#66717b', fontFamily: 'var(--font-rajdhani)' }}
                  />
                  <Bar dataKey="runs" fill={primaryColor} radius={[6, 6, 0, 0]} animationDuration={1000} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
