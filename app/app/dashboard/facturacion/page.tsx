
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { FacturacionHub } from './facturacion-hub'

export const dynamic = 'force-dynamic'

export default async function FacturacionPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return <div>No autorizado</div>
  }

  return <FacturacionHub />
}
