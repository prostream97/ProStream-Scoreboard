import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { matches, innings, deliveries, players, teams } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { recomputeInningsAggregates } from '@/lib/db/queries/match'

export const runtime = 'nodejs'

export type DeliveryDetail = {
  id: number
  overNumber: number
  ballNumber: number
  batsmanId: number
  bowlerId: number
  runs: number
  extraRuns: number
  isLegal: boolean
  extraType: string | null
  isWicket: boolean
  dismissalType: string | null
  dismissedBatterId: number | null
  fielder1Id: number | null
  fielder2Id: number | null
}

export type OverDetail = {
  overNumber: number
  overLabel: string
  deliveries: DeliveryDetail[]
  overRuns: number
  overWickets: number
}

export type InningsDetail = {
  id: number
  inningsNumber: number
  battingTeamId: number
  bowlingTeamId: number
  totalRuns: number
  wickets: number
  overs: number
  balls: number
  oversDetail: OverDetail[]
}

export type ScoreDataResponse = {
  match: { id: number; status: string; ballsPerOver: number }
  innings: InningsDetail[]
  players: { id: number; displayName: string; teamId: number }[]
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId } = await params
  const id = parseInt(matchId, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid matchId' }, { status: 400 })

  try {
    const matchRow = await db.query.matches.findFirst({
      where: eq(matches.id, id),
      with: {
        homeTeam: true,
        awayTeam: true,
        innings: { orderBy: (i, { asc }) => [asc(i.inningsNumber)] },
      },
    })

    if (!matchRow) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

    // Fetch all deliveries for all innings, sorted by over then ball
    const allDeliveries = await db
      .select()
      .from(deliveries)
      .innerJoin(innings, eq(deliveries.inningsId, innings.id))
      .where(eq(innings.matchId, id))
      .orderBy(asc(innings.inningsNumber), asc(deliveries.overNumber), asc(deliveries.ballNumber))

    // Fetch players from both teams
    const teamIds = [matchRow.homeTeamId, matchRow.awayTeamId]
    const playerRows = await db
      .select({ id: players.id, displayName: players.displayName, teamId: players.teamId })
      .from(players)
      .innerJoin(teams, eq(players.teamId, teams.id))
      .where(eq(teams.id, teamIds[0]))
    const playerRows2 = await db
      .select({ id: players.id, displayName: players.displayName, teamId: players.teamId })
      .from(players)
      .where(eq(players.teamId, teamIds[1]))
    const allPlayers = [...playerRows, ...playerRows2]

    // Group deliveries by innings then over
    const inningsMap = new Map<number, Map<number, DeliveryDetail[]>>()
    for (const row of allDeliveries) {
      const d = row.deliveries
      const inn = row.innings
      if (!inningsMap.has(inn.id)) inningsMap.set(inn.id, new Map())
      const oversMap = inningsMap.get(inn.id)!
      if (!oversMap.has(d.overNumber)) oversMap.set(d.overNumber, [])
      oversMap.get(d.overNumber)!.push({
        id: d.id,
        overNumber: d.overNumber,
        ballNumber: d.ballNumber,
        batsmanId: d.batsmanId,
        bowlerId: d.bowlerId,
        runs: d.runs,
        extraRuns: d.extraRuns,
        isLegal: d.isLegal,
        extraType: d.extraType ?? null,
        isWicket: d.isWicket,
        dismissalType: d.dismissalType ?? null,
        dismissedBatterId: d.dismissedBatterId ?? null,
        fielder1Id: d.fielder1Id ?? null,
        fielder2Id: d.fielder2Id ?? null,
      })
    }

    const inningsDetail: InningsDetail[] = matchRow.innings.map((inn) => {
      const oversMap = inningsMap.get(inn.id) ?? new Map<number, DeliveryDetail[]>()
      const oversDetail: OverDetail[] = [...oversMap.entries()]
        .sort(([a], [b]) => a - b)
        .map(([overNumber, dels]) => ({
          overNumber,
          overLabel: `Over ${overNumber + 1}`,
          deliveries: dels,
          overRuns: dels.reduce((sum, d) => sum + d.runs + d.extraRuns, 0),
          overWickets: dels.filter((d) => d.isWicket).length,
        }))

      return {
        id: inn.id,
        inningsNumber: inn.inningsNumber,
        battingTeamId: inn.battingTeamId,
        bowlingTeamId: inn.bowlingTeamId,
        totalRuns: inn.totalRuns,
        wickets: inn.wickets,
        overs: inn.overs,
        balls: inn.balls,
        oversDetail,
      }
    })

    const response: ScoreDataResponse = {
      match: { id: matchRow.id, status: matchRow.status, ballsPerOver: matchRow.ballsPerOver ?? 6 },
      innings: inningsDetail,
      players: allPlayers,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('Score data fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch score data' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId } = await params
  const id = parseInt(matchId, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid matchId' }, { status: 400 })

  const body = await req.json() as {
    deliveryId: number
    patch: Record<string, unknown>
  }

  // Reject structural fields
  const forbidden = ['overNumber', 'ballNumber', 'inningsId', 'id']
  for (const key of forbidden) {
    if (key in (body.patch ?? {})) {
      return NextResponse.json({ error: `Cannot edit field: ${key}` }, { status: 400 })
    }
  }

  try {
    const matchRow = await db.query.matches.findFirst({
      where: eq(matches.id, id),
      columns: { id: true, status: true, ballsPerOver: true, homeTeamId: true, awayTeamId: true },
    })
    if (!matchRow) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    if (matchRow.status !== 'complete') {
      return NextResponse.json({ error: 'Score editor only works on completed matches' }, { status: 400 })
    }

    // Fetch delivery + verify it belongs to this match
    const deliveryRow = await db.query.deliveries.findFirst({
      where: eq(deliveries.id, body.deliveryId),
      with: { innings: true },
    })
    if (!deliveryRow || deliveryRow.innings.matchId !== id) {
      return NextResponse.json({ error: 'Delivery not found or does not belong to this match' }, { status: 404 })
    }

    const p = body.patch
    const updatePayload: Partial<typeof deliveries.$inferInsert> = {}
    if ('runs' in p && typeof p.runs === 'number') updatePayload.runs = p.runs
    if ('extraRuns' in p && typeof p.extraRuns === 'number') updatePayload.extraRuns = p.extraRuns
    if ('extraType' in p) updatePayload.extraType = (p.extraType as typeof deliveries.$inferInsert['extraType']) ?? null
    if ('isLegal' in p && typeof p.isLegal === 'boolean') updatePayload.isLegal = p.isLegal
    if ('isWicket' in p && typeof p.isWicket === 'boolean') updatePayload.isWicket = p.isWicket
    if ('dismissalType' in p) updatePayload.dismissalType = (p.dismissalType as typeof deliveries.$inferInsert['dismissalType']) ?? null
    if ('dismissedBatterId' in p) updatePayload.dismissedBatterId = (p.dismissedBatterId as number | null) ?? null
    if ('fielder1Id' in p) updatePayload.fielder1Id = (p.fielder1Id as number | null) ?? null
    if ('fielder2Id' in p) updatePayload.fielder2Id = (p.fielder2Id as number | null) ?? null
    if ('batsmanId' in p && typeof p.batsmanId === 'number') updatePayload.batsmanId = p.batsmanId
    if ('bowlerId' in p && typeof p.bowlerId === 'number') updatePayload.bowlerId = p.bowlerId

    await db.update(deliveries).set(updatePayload).where(eq(deliveries.id, body.deliveryId))

    const bpo = matchRow.ballsPerOver ?? 6
    const updatedInnings = await recomputeInningsAggregates(deliveryRow.inningsId, bpo)

    // Re-evaluate match result using latest innings data from DB
    const allInnings = await db.query.innings.findMany({
      where: eq(innings.matchId, id),
      orderBy: (i, { asc }) => [asc(i.inningsNumber)],
    })

    const inn1 = allInnings.find((i) => i.inningsNumber === 1)
    const inn2 = allInnings.find((i) => i.inningsNumber === 2)

    if (inn1 && inn2) {
      let resultWinnerId: number | null = null
      let resultMargin = 0
      let resultType: 'wickets' | 'runs' | 'tie' | null = null

      const target = inn1.totalRuns + 1
      if (inn2.totalRuns >= target) {
        resultWinnerId = inn2.battingTeamId
        resultMargin = 10 - inn2.wickets
        resultType = 'wickets'
      } else if (inn1.totalRuns > inn2.totalRuns) {
        resultWinnerId = inn1.battingTeamId
        resultMargin = inn1.totalRuns - inn2.totalRuns
        resultType = 'runs'
      } else {
        resultType = 'tie'
      }

      await db
        .update(matches)
        .set({ resultWinnerId, resultMargin, resultType })
        .where(eq(matches.id, id))
    }

    return NextResponse.json({ ok: true, updatedInnings })
  } catch (err) {
    console.error('Score data patch error:', err)
    return NextResponse.json({ error: 'Failed to update delivery' }, { status: 500 })
  }
}
