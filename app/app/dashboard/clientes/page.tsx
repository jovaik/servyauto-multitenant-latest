
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ClientesView } from './clientes-view'

export const dynamic = 'force-dynamic'

export default async function ClientesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return <div>No autorizado</div>
  }

  return <ClientesView />
}
