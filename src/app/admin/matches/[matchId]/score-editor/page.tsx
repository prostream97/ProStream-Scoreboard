import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { matches, innings, deliveries, players } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { ScoreEditorClient } from './ScoreEditorClient'
import type { ScoreDataResponse, DeliveryDetail } from '@/app/api/match/[matchId]/score-data/route'

type Props = {
  params: Promise<{ matchId: string }>
}

export default async function ScoreEditorPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect('/login')

  const { matchId } = await params
  const id = parseInt(matchId, 10)
  if (isNaN(id)) notFound()

  const matchRow = await db.query.matches.findFirst({
    where: eq(matches.id, id),
    with: {
      homeTeam: true,
      awayTeam: true,
      innings: { orderBy: (i, { asc }) => [asc(i.inningsNumber)] },
    },
  })

  if (!matchRow) notFound()
  const canEditDeliveries = ['active', 'paused', 'break', 'complete'].includes(matchRow.status)
  if (!canEditDeliveries) {
    redirect(matchRow.tournamentId ? `/admin/tournaments/${matchRow.tournamentId}` : '/')
  }

  // Fetch all deliveries for all innings
  const allDeliveries = await db
    .select()
    .from(deliveries)
    .innerJoin(innings, eq(deliveries.inningsId, innings.id))
    .where(eq(innings.matchId, id))
    .orderBy(asc(innings.inningsNumber), asc(deliveries.overNumber), asc(deliveries.ballNumber))

  // Fetch players from both teams
  const [homeTeamPlayers, awayTeamPlayers] = await Promise.all([
    db
      .select({ id: players.id, displayName: players.displayName, teamId: players.teamId })
      .from(players)
      .where(eq(players.teamId, matchRow.homeTeamId)),
    db
      .select({ id: players.id, displayName: players.displayName, teamId: players.teamId })
      .from(players)
      .where(eq(players.teamId, matchRow.awayTeamId)),
  ])
  const allPlayers = [...homeTeamPlayers, ...awayTeamPlayers]

  // Group deliveries by innings then over
  const inningsMap = new Map<number, Map<number, ScoreDataResponse['innings'][0]['oversDetail'][0]['deliveries']>>()
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

  const inningsDetail: ScoreDataResponse['innings'] = matchRow.innings.map((inn) => {
    const oversMap = inningsMap.get(inn.id) ?? new Map()
    const oversDetail = [...oversMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([overNumber, dels]) => ({
        overNumber,
        overLabel: `Over ${overNumber + 1}`,
        deliveries: dels,
        overRuns: dels.reduce((sum: number, d: DeliveryDetail) => sum + d.runs + d.extraRuns, 0),
        overWickets: dels.filter((d: DeliveryDetail) => d.isWicket).length,
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

  const initialData: ScoreDataResponse = {
    match: { id: matchRow.id, status: matchRow.status, ballsPerOver: matchRow.ballsPerOver ?? 6 },
    innings: inningsDetail,
    players: allPlayers,
  }

  return (
    <ScoreEditorClient
      initialData={initialData}
      homeTeam={{ id: matchRow.homeTeam.id, name: matchRow.homeTeam.name, shortCode: matchRow.homeTeam.shortCode, primaryColor: matchRow.homeTeam.primaryColor }}
      awayTeam={{ id: matchRow.awayTeam.id, name: matchRow.awayTeam.name, shortCode: matchRow.awayTeam.shortCode, primaryColor: matchRow.awayTeam.primaryColor }}
      tournamentId={matchRow.tournamentId ?? null}
      matchStatus={matchRow.status}
      operatorHref={`/match/${matchRow.id}/operator`}
    />
  )
}
