
'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Calendar, DollarSign, TrendingUp, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { NuevoCierreDialog } from '@/components/nuevo-cierre-dialog'

interface Cierre {
  id: string
  fechaInicio: string
  fechaFin: string
  totalEfectivo: number
  totalTPVSumup: number
  totalTPVUnicaja: number
  gastosEfectivo: number
  gastosTarjeta: number
  efectivoFinal: number
  observaciones: string | null
  createdAt: string
}

export default function CierresCajaView() {
  const [cierres, setCierres] = useState<Cierre[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCierres = async () => {
    try {
      const response = await fetch('/api/cierres-caja')
      if (response.ok) {
        const data = await response.json()
        setCierres(data)
      }
    } catch (error) {
      console.error('Error fetching cierres:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCierres()
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(value)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cierres de Caja</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los cierres de caja semanales del taller
          </p>
        </div>
        <NuevoCierreDialog onCierreCreado={fetchCierres} />
      </div>

      {loading ? (
        <div className="text-center py-8">Cargando cierres...</div>
      ) : cierres.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay cierres de caja registrados</p>
              <p className="text-sm mt-2">Comienza creando tu primer cierre de caja</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {cierres.map((cierre) => (
            <Card key={cierre.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Cierre del{' '}
                  {format(new Date(cierre.fechaInicio), 'dd/MM/yyyy', { locale: es })}
                  {' al '}
                  {format(new Date(cierre.fechaFin), 'dd/MM/yyyy', { locale: es })}
                </CardTitle>
                <CardDescription>
                  Registrado el{' '}
                  {format(new Date(cierre.createdAt), "dd/MM/yyyy 'a las' HH:mm", {
                    locale: es,
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Ventas */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase">
                      Ventas
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Efectivo:</span>
                        <span className="font-semibold">
                          {formatCurrency(cierre.totalEfectivo)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">TPV SUMUP:</span>
                        <span className="font-semibold">
                          {formatCurrency(cierre.totalTPVSumup)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">TPV UNICAJA:</span>
                        <span className="font-semibold">
                          {formatCurrency(cierre.totalTPVUnicaja)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-semibold">Total Ventas:</span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(
                            cierre.totalEfectivo +
                              cierre.totalTPVSumup +
                              cierre.totalTPVUnicaja
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Gastos */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase">
                      Gastos
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Efectivo:</span>
                        <span className="font-semibold text-red-600">
                          {formatCurrency(cierre.gastosEfectivo)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Tarjeta:</span>
                        <span className="font-semibold text-red-600">
                          {formatCurrency(cierre.gastosTarjeta)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-semibold">Total Gastos:</span>
                        <span className="font-bold text-red-600">
                          {formatCurrency(cierre.gastosEfectivo + cierre.gastosTarjeta)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Efectivo Final */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase">
                      Resumen
                    </h4>
                    <div className="space-y-2">
                      <div className="bg-primary/10 p-4 rounded-lg">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-1">
                            Efectivo en Caja
                          </p>
                          <p className="text-2xl font-bold text-primary">
                            {formatCurrency(cierre.efectivoFinal)}
                          </p>
                        </div>
                      </div>
                      {cierre.observaciones && (
                        <div className="pt-2">
                          <p className="text-xs text-muted-foreground mb-1">Observaciones:</p>
                          <p className="text-sm">{cierre.observaciones}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
