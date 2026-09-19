import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LiquidacionesView from './liquidaciones-view'

export default async function LiquidacionesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  return <LiquidacionesView />
}
