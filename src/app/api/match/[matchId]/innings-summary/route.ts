import { NextRequest, NextResponse } from 'next/server'
import { getInningsSummaries } from '@/lib/db/queries/match'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params
  const id = parseInt(matchId, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid matchId' }, { status: 400 })

  const summaries = await getInningsSummaries(id)
  return NextResponse.json(summaries)
}
