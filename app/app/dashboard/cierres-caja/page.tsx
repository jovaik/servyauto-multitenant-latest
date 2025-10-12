
import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CierresCajaView from './cierres-caja-view'

export const metadata: Metadata = {
  title: 'Cierres de Caja | ServyAuto',
  description: 'Gestión de cierres de caja semanales',
}

export default async function CierresCajaPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Solo permitir acceso a administradores y super admins
  const userRole = (session.user as any)?.role
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    redirect('/dashboard')
  }

  return <CierresCajaView />
}
