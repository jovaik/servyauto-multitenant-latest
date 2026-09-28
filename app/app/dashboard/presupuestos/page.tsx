import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PresupuestosView from './presupuestos-view'

export default async function PresupuestosPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  return <PresupuestosView />
}
