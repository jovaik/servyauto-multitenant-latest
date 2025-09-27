
'use client'

import React from 'react'
import { Settings, Cog, Database, Palette, Construction } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function ConfiguracionView() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
          <p className="text-gray-600">
            Ajustes generales del sistema y personalización
          </p>
        </div>
      </div>

      {/* Coming Soon Card */}
      <Card className="text-center py-12">
        <CardContent>
          <div className="max-w-md mx-auto">
            <div className="bg-gray-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Construction className="h-10 w-10 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Panel de Configuración
            </h2>
            <p className="text-gray-600 mb-6">
              Este módulo está en desarrollo. Pronto podrás personalizar la aplicación, configurar ajustes del taller y gestionar las preferencias del sistema.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 p-4 rounded-lg">
                <Cog className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <h3 className="font-semibold mb-1">General</h3>
                <p className="text-gray-600">Configuraciones básicas del sistema</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <Database className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <h3 className="font-semibold mb-1">Datos</h3>
                <p className="text-gray-600">Backup, restauración y mantenimiento</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <Palette className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <h3 className="font-semibold mb-1">Personalización</h3>
                <p className="text-gray-600">Temas, logos y apariencia</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
