
import { Metadata } from 'next'
import { LoginForm } from './login-form'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Car } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Login - ServyAuto Manager',
  description: 'Accede a tu cuenta de ServyAuto Manager',
}

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  
  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="bg-blue-600 p-3 rounded-full">
              <Car className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            ServyAuto Manager
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Inicia sesión en tu cuenta
          </p>
        </div>
        <LoginForm />
        
        {/* Powered by Host4yourweb */}
        <div className="text-center pt-6">
          <a 
            href="https://host4yourweb.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-blue-600 transition-colors inline-flex items-center gap-1.5 group"
          >
            <span className="font-medium">Powered by</span>
            <span className="font-bold text-blue-600 group-hover:text-blue-700">Host4yourweb</span>
          </a>
        </div>
      </div>
    </div>
  )
}
