
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { AgendaView } from './agenda-view'

export const dynamic = 'force-dynamic'

export default async function AgendaPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return <div>No autorizado</div>
  }

  return <AgendaView />
}
