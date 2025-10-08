
import { Metadata } from 'next'
import { SignupForm } from './signup-form'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Car } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Registro - ServyAuto Manager',
  description: 'Crea tu cuenta de ServyAuto Manager',
}

export default async function SignupPage() {
  const session = await getServerSession(authOptions)
  
  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/login" className="flex justify-center">
            <div className="bg-blue-600 p-3 rounded-full">
              <Car className="h-8 w-8 text-white" />
            </div>
          </Link>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            ServyAuto Manager
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Crea tu cuenta de administrador
          </p>
        </div>
        <SignupForm />
        <div className="text-center">
          <p className="text-sm text-gray-600">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
