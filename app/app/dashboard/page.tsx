
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { DashboardContent } from './dashboard-content'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  return <DashboardContent session={session} />
}
