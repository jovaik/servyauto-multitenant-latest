
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { TicketsView } from './tickets-view'

export const dynamic = 'force-dynamic'

export default async function TicketsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return <div>No autorizado</div>
  }

  return <TicketsView />
}
