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
  ResponsiveContainer
} from 'recharts'
import type { MatchSnapshot } from '@/types/match'

type MatchGraphsProps = {
  snapshot: MatchSnapshot
}

// Generate some dummy data for the visual over-by-over progression
function generateDummyData(overs: number, totalRuns: number) {
  const data = []
  let cumulative = 0
  const avgRunRate = overs > 0 ? (totalRuns / overs) : 6
  
  for (let i = 1; i <= Math.max(overs, 5); i++) {
    // some random variation around the run rate
    const overRuns = Math.max(0, Math.floor(avgRunRate + (Math.random() * 8 - 4)))
    cumulative += overRuns
    data.push({
      over: i,
      runs: overRuns,
      total: cumulative,
      wickets: Math.random() > 0.8 ? 1 : 0 // random wickets for visual
    })
  }
  
  // ensure the last data point matches the total exactly if we generated for actual overs
  if (data.length >= overs && overs > 0) {
    data[overs - 1].total = totalRuns
  }
  
  return data
}

export function MatchGraphs({ snapshot }: MatchGraphsProps) {
  const [activeTab, setActiveTab] = useState<'worm' | 'manhattan'>('worm')
  
  const currentOvers = snapshot.currentInningsState?.overs ?? 0
  const currentRuns = snapshot.currentInningsState?.totalRuns ?? 0
  
  // Memoize or just generate on render for now
  const [chartData] = useState(() => generateDummyData(currentOvers, currentRuns))

  const primaryColor = snapshot.homeTeam.primaryColor || '#8b5cf6'

  return (
    <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-stats text-sm text-gray-400 uppercase tracking-wider">Match Analytics</h3>
        <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
          <button
            onClick={() => setActiveTab('worm')}
            className={`px-3 py-1 font-stats text-xs uppercase tracking-wider rounded-md transition-colors ${
              activeTab === 'worm' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Worm
          </button>
          <button
            onClick={() => setActiveTab('manhattan')}
            className={`px-3 py-1 font-stats text-xs uppercase tracking-wider rounded-md transition-colors ${
              activeTab === 'manhattan' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Manhattan
          </button>
        </div>
      </div>

      <div className="h-[250px] w-full relative">
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis 
                    dataKey="over" 
                    stroke="#6b7280" 
                    tick={{ fontSize: 10, fontFamily: 'var(--font-rajdhani)' }} 
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    tick={{ fontSize: 10, fontFamily: 'var(--font-rajdhani)' }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                    itemStyle={{ color: '#e5e7eb', fontFamily: 'var(--font-rajdhani)' }}
                    labelStyle={{ color: '#9ca3af', fontFamily: 'var(--font-rajdhani)' }}
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis 
                    dataKey="over" 
                    stroke="#6b7280" 
                    tick={{ fontSize: 10, fontFamily: 'var(--font-rajdhani)' }} 
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    tick={{ fontSize: 10, fontFamily: 'var(--font-rajdhani)' }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: '#374151', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                    itemStyle={{ color: '#e5e7eb', fontFamily: 'var(--font-rajdhani)' }}
                    labelStyle={{ color: '#9ca3af', fontFamily: 'var(--font-rajdhani)' }}
                  />
                  <Bar 
                    dataKey="runs" 
                    fill={primaryColor} 
                    radius={[4, 4, 0, 0]} 
                    animationDuration={1000}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
