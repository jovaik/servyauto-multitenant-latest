
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ReservasView } from './reservas-view'

export const dynamic = 'force-dynamic'

export default async function ReservasPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return <div>No autorizado</div>
  }

  return <ReservasView />
}
