
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ExportarIVAView } from './exportar-iva-view'

export const dynamic = 'force-dynamic'

export default async function ExportarIVAPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return <div>No autorizado</div>
  }

  return <ExportarIVAView />
}
