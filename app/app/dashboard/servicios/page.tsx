

import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ServiciosView } from './servicios-view'

export const dynamic = 'force-dynamic'

export default async function ServiciosPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return <div>No autorizado</div>
  }

  return <ServiciosView />
}

