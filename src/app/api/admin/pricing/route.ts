import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/config'
import { isAdminSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { pricingConfig } from '@/lib/db/schema'

export const runtime = 'nodejs'

const PRICING_KEYS = ['overlay_per_match', 'overlay_per_tournament', 'overlay_per_day'] as const

// GET /api/admin/pricing — returns { overlay_per_match: N, overlay_per_tournament: N, overlay_per_day: N }
// Readable by all authenticated users; PATCH is admin-only
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.query.pricingConfig.findMany()
  const result: Record<string, number> = {
    overlay_per_match: 100,
    overlay_per_tournament: 500,
    overlay_per_day: 200,
  }
  if (rows.length === 0) {
    console.warn('[Pricing] No pricing rows found in DB — using in-memory defaults. Run the seed script to persist them.')
  }
  for (const row of rows) {
    result[row.key] = row.value
  }
  return NextResponse.json(result)
}

// PATCH /api/admin/pricing — upsert pricing keys
// body: { overlay_per_match?: number, overlay_per_tournament?: number }
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminSession(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  for (const key of PRICING_KEYS) {
    if (key in body) {
      const value = parseInt(body[key], 10)
      if (isNaN(value) || value < 0) {
        return NextResponse.json({ error: `${key} must be a non-negative integer` }, { status: 400 })
      }
      // Upsert
      const existing = await db.query.pricingConfig.findFirst({
        where: eq(pricingConfig.key, key),
      })
      if (existing) {
        await db
          .update(pricingConfig)
          .set({ value, updatedAt: new Date() })
          .where(eq(pricingConfig.key, key))
      } else {
        await db.insert(pricingConfig).values({ key, value })
      }
    }
  }

  // Return updated state
  const rows = await db.query.pricingConfig.findMany()
  const result: Record<string, number> = {}
  for (const row of rows) result[row.key] = row.value
  return NextResponse.json(result)
}
