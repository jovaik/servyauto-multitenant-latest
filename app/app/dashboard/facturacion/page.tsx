
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { FacturacionView } from './facturacion-view'

export const dynamic = 'force-dynamic'

export default async function FacturacionPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return <div>No autorizado</div>
  }

  return <FacturacionView />
}
