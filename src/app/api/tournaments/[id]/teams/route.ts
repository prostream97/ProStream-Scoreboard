import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { teams } from '@/lib/db/schema'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const tournamentId = parseInt(id, 10)

  const body = await req.json()
  const { name, shortCode, primaryColor, secondaryColor, logoCloudinaryId } = body

  if (!name?.trim() || !shortCode?.trim()) {
    return NextResponse.json({ error: 'name and shortCode are required' }, { status: 400 })
  }

  try {
    const [team] = await db
      .insert(teams)
      .values({
        tournamentId,
        name: name.trim(),
        shortCode: shortCode.toUpperCase().trim().slice(0, 3),
        primaryColor: primaryColor ?? '#4F46E5',
        secondaryColor: secondaryColor ?? '#10B981',
        logoCloudinaryId: logoCloudinaryId || null,
      })
      .returning()
    return NextResponse.json(team, { status: 201 })
  } catch (err) {
    console.error('Create team error:', err)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}
