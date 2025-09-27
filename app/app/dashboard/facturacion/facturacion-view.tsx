
'use client'

import React from 'react'
import { CreditCard, FileText, Euro, TrendingUp, Construction } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function FacturacionView() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturación</h1>
          <p className="text-gray-600">
            Gestión de facturas, tickets y reportes financieros
          </p>
        </div>
      </div>

      {/* Coming Soon Card */}
      <Card className="text-center py-12">
        <CardContent>
          <div className="max-w-md mx-auto">
            <div className="bg-blue-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Construction className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Módulo de Facturación
            </h2>
            <p className="text-gray-600 mb-6">
              Este módulo está en desarrollo. Pronto podrás gestionar facturas, generar reportes financieros y administrar los pagos de los servicios.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 p-4 rounded-lg">
                <CreditCard className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <h3 className="font-semibold mb-1">Gestión de Pagos</h3>
                <p className="text-gray-600">Control de métodos de pago y transacciones</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <FileText className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <h3 className="font-semibold mb-1">Facturas y Tickets</h3>
                <p className="text-gray-600">Generación automática de documentos fiscales</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <h3 className="font-semibold mb-1">Reportes</h3>
                <p className="text-gray-600">Análisis financiero y reportes detallados</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
