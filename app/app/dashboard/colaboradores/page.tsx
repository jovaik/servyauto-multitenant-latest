import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ColaboradoresView from './colaboradores-view'

export default async function ColaboradoresPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  return <ColaboradoresView />
}
