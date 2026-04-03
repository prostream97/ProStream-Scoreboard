import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { UsersPageClient } from '@/components/admin/UsersPageClient'

export default async function UsersPage() {
  const session = await auth()

  if (!session) {
    redirect('/login?callbackUrl=/admin/users')
  }

  if (session.user.role !== 'admin') {
    redirect('/')
  }

  return <UsersPageClient />
}
