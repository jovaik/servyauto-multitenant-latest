
'use client'

import React from 'react'
import { UserCheck, Users, Shield, Settings, Construction } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function UsuariosView() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-gray-600">
            Administración de usuarios y permisos del sistema
          </p>
        </div>
      </div>

      {/* Coming Soon Card */}
      <Card className="text-center py-12">
        <CardContent>
          <div className="max-w-md mx-auto">
            <div className="bg-purple-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Construction className="h-10 w-10 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Gestión de Usuarios
            </h2>
            <p className="text-gray-600 mb-6">
              Este módulo está en desarrollo. Pronto podrás gestionar usuarios del sistema, asignar roles y configurar permisos de acceso.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 p-4 rounded-lg">
                <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <h3 className="font-semibold mb-1">Usuarios</h3>
                <p className="text-gray-600">Crear y gestionar cuentas de usuario</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <Shield className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <h3 className="font-semibold mb-1">Roles y Permisos</h3>
                <p className="text-gray-600">Control de acceso basado en roles</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <Settings className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <h3 className="font-semibold mb-1">Configuración</h3>
                <p className="text-gray-600">Ajustes de seguridad y preferencias</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
