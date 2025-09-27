
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { UsuariosView } from './usuarios-view'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return <div>No autorizado</div>
  }

  return <UsuariosView />
}
