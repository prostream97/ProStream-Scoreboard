import type { PartnershipStats } from '@/types/match'

type PartnershipDeliveryLike = {
  runs: number
  extraRuns: number
  isLegal: boolean
  extraType: string | null
}

function toContributionMap(partnership: PartnershipStats | null): Map<number, { runs: number; balls: number }> {
  const map = new Map<number, { runs: number; balls: number }>()
  if (!partnership) return map

  map.set(partnership.batter1Id, {
    runs: partnership.batter1ContributionRuns,
    balls: partnership.batter1ContributionBalls,
  })
  map.set(partnership.batter2Id, {
    runs: partnership.batter2ContributionRuns,
    balls: partnership.batter2ContributionBalls,
  })
  return map
}

function offBatRuns(extraType: string | null, runs: number): number {
  if (extraType === 'wide' || extraType === 'bye' || extraType === 'legbye') return 0
  return runs
}

export function getBatterContributionForDelivery(delivery: PartnershipDeliveryLike): { runs: number; balls: number } {
  return {
    runs: offBatRuns(delivery.extraType, delivery.runs),
    balls: delivery.isLegal ? 1 : 0,
  }
}

export function createPartnershipStats(batter1Id: number, batter2Id: number): PartnershipStats {
  return {
    runs: 0,
    balls: 0,
    batter1Id,
    batter2Id,
    batter1ContributionRuns: 0,
    batter1ContributionBalls: 0,
    batter2ContributionRuns: 0,
    batter2ContributionBalls: 0,
  }
}

export function reorderPartnershipStats(
  partnership: PartnershipStats | null,
  batter1Id: number,
  batter2Id: number,
): PartnershipStats | null {
  if (!partnership) return null

  const contributions = toContributionMap(partnership)
  const batter1 = contributions.get(batter1Id) ?? { runs: 0, balls: 0 }
  const batter2 = contributions.get(batter2Id) ?? { runs: 0, balls: 0 }

  return {
    ...partnership,
    batter1Id,
    batter2Id,
    batter1ContributionRuns: batter1.runs,
    batter1ContributionBalls: batter1.balls,
    batter2ContributionRuns: batter2.runs,
    batter2ContributionBalls: batter2.balls,
  }
}

export function applyDeliveryToPartnershipStats(
  partnership: PartnershipStats | null,
  facingBatterId: number | null,
  batter1Id: number,
  batter2Id: number,
  delivery: PartnershipDeliveryLike,
): PartnershipStats {
  const base = partnership ?? createPartnershipStats(batter1Id, batter2Id)
  const contributions = toContributionMap(base)

  if (facingBatterId != null) {
    const current = contributions.get(facingBatterId) ?? { runs: 0, balls: 0 }
    const delta = getBatterContributionForDelivery(delivery)
    contributions.set(facingBatterId, {
      runs: current.runs + delta.runs,
      balls: current.balls + delta.balls,
    })
  }

  const batter1 = contributions.get(batter1Id) ?? { runs: 0, balls: 0 }
  const batter2 = contributions.get(batter2Id) ?? { runs: 0, balls: 0 }

  return {
    runs: base.runs + delivery.runs + delivery.extraRuns,
    balls: base.balls + (delivery.isLegal ? 1 : 0),
    batter1Id,
    batter2Id,
    batter1ContributionRuns: batter1.runs,
    batter1ContributionBalls: batter1.balls,
    batter2ContributionRuns: batter2.runs,
    batter2ContributionBalls: batter2.balls,
  }
}
