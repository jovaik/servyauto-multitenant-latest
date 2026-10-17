import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { OperacionesPendientesView } from './operaciones-pendientes-view'

export const dynamic = 'force-dynamic'

export default async function OperacionesPendientesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return <div>No autorizado</div>
  }

  return <OperacionesPendientesView />
}
