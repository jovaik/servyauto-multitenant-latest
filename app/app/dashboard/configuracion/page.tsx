
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ConfiguracionView } from './configuracion-view'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return <div>No autorizado</div>
  }

  return <ConfiguracionView />
}
