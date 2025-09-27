
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { VehiculosView } from './vehiculos-view'

export const dynamic = 'force-dynamic'

export default async function VehiculosPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return <div>No autorizado</div>
  }

  return <VehiculosView />
}
