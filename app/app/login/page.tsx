
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
    <div className="min-h-screen flex">
      {/* Left side - Login form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
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
        </div>
      </div>

      {/* Right side - Hero image/content */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800">
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="relative h-full flex items-center justify-center p-12">
            <div className="text-white text-center">
              <h1 className="text-4xl font-bold mb-4">
                Gestión Automotriz Profesional
              </h1>
              <p className="text-xl opacity-90 mb-8">
                Sistema completo de citas, clientes y facturación
              </p>
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="font-semibold mb-2">📅 Agenda Digital</h3>
                  <p className="opacity-80">Control total de citas y horarios</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="font-semibold mb-2">🚗 Gestión de Vehículos</h3>
                  <p className="opacity-80">Historial completo por cliente</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="font-semibold mb-2">💰 Facturación</h3>
                  <p className="opacity-80">Tickets y reportes automáticos</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="font-semibold mb-2">📊 Reportes</h3>
                  <p className="opacity-80">Métricas y análisis de negocio</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
