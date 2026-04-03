import type { Session } from 'next-auth'

export type AppRole = 'admin' | 'operator'

export function normalizeUsername(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

export function isAdminSession(session: Session | null) {
  return session?.user?.role === 'admin'
}

export function getBattingFirstTeamId(params: {
  homeTeamId: number
  awayTeamId: number
  tossWinnerId?: number | null
  tossDecision?: 'bat' | 'field' | null
}) {
  const { homeTeamId, awayTeamId, tossWinnerId, tossDecision } = params

  if (!tossWinnerId || !tossDecision) return null
  if (tossWinnerId !== homeTeamId && tossWinnerId !== awayTeamId) return null

  if (tossDecision === 'bat') return tossWinnerId
  return tossWinnerId === homeTeamId ? awayTeamId : homeTeamId
}
