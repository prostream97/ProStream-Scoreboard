import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { isAdminSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { PricingClient } from '@/components/admin/PricingClient'

export default async function PricingPage() {
  const session = await auth()
  if (!session) redirect('/login?callbackUrl=/admin/pricing')
  if (!isAdminSession(session)) redirect('/')

  const rows = await db.query.pricingConfig.findMany()
  const pricing: Record<string, number> = {
    overlay_per_match: 100,
    overlay_per_tournament: 500,
  }
  for (const row of rows) pricing[row.key] = row.value

  return <PricingClient initialPricing={pricing} />
}
