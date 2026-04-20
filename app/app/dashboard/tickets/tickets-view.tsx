'use client'

import React, { useState, useEffect } from 'react'
import { Ticket, Plus, TrendingDown, AlertTriangle, History, Store } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface MovimientoTicket {
  id: string
  fecha: Date
  tipo: 'COMPRA' | 'CONSUMO' | 'AJUSTE'
  cantidad: number
  saldoAnterior: number
  saldoActual: number
  concepto: string | null
  usuarioId: string | null
  citaId: string | null
  localId: string | null
  local: { id: string; nombre: string } | null
  createdAt: Date
}

interface LocalStats {
  localId: string | null
  localNombre: string
  saldoActual: number
  ticketsComprados: number
  ticketsUsados: number
  alertaBajo: boolean
}

interface StatsTickets {
  saldoActual: number
  ticketsUsados: number
  ticketsComprados: number
  alertaBajo: boolean
  porLocal: LocalStats[]
}

export function TicketsView() {
  const [stats, setStats] = useState<StatsTickets>({
    saldoActual: 0,
    ticketsUsados: 0,
    ticketsComprados: 0,
    alertaBajo: false,
    porLocal: []
  })
  const [movimientos, setMovimientos] = useState<MovimientoTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompraDialog, setShowCompraDialog] = useState(false)
  const [cantidadCompra, setCantidadCompra] = useState('')
  const [conceptoCompra, setConceptoCompra] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const statsResponse = await fetch('/api/tickets/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }
      
      const historialResponse = await fetch('/api/tickets')
      if (historialResponse.ok) {
        const historialData = await historialResponse.json()
        setMovimientos(historialData)
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompra = async () => {
    if (!cantidadCompra || parseInt(cantidadCompra) <= 0) {
      alert('Por favor ingresa una cantidad v\u00e1lida')
      return
    }

    try {
      setProcesando(true)
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'COMPRA',
          cantidad: parseInt(cantidadCompra),
          concepto: conceptoCompra || `Compra de ${cantidadCompra} tickets`
        })
      })

      if (response.ok) {
        setShowCompraDialog(false)
        setCantidadCompra('')
        setConceptoCompra('')
        loadData()
      } else {
        const err = await response.json().catch(() => ({}))
        alert(err.error || 'Error al registrar la compra')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al registrar la compra')
    } finally {
      setProcesando(false)
    }
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'COMPRA': return 'bg-green-100 text-green-800'
      case 'CONSUMO': return 'bg-red-100 text-red-800'
      case 'AJUSTE': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'COMPRA': return 'Compra'
      case 'CONSUMO': return 'Consumo'
      case 'AJUSTE': return 'Ajuste'
      default: return tipo
    }
  }

  const getLocalShortName = (nombre: string) => {
    return nombre.replace(/^SERVYAUTO\s+/i, '')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Ticket className="mr-3 h-8 w-8" />
            Gesti\u00f3n de Tickets de Parking
          </h1>
          <p className="text-gray-600">
            Control de inventario de tickets de descuento del parking por local
          </p>
        </div>
        
        <Dialog open={showCompraDialog} onOpenChange={setShowCompraDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Registrar Compra
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Compra de Tickets</DialogTitle>
              <DialogDescription>
                A\u00f1ade tickets nuevos al inventario del local seleccionado
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="cantidad">Cantidad de tickets *</Label>
                <Input
                  id="cantidad"
                  type="number"
                  min="1"
                  value={cantidadCompra}
                  onChange={(e) => setCantidadCompra(e.target.value)}
                  placeholder="50"
                />
              </div>
              <div>
                <Label htmlFor="concepto">Concepto (opcional)</Label>
                <Input
                  id="concepto"
                  value={conceptoCompra}
                  onChange={(e) => setConceptoCompra(e.target.value)}
                  placeholder="Compra mensual parking"
                />
              </div>
              <p className="text-sm text-gray-500">
                \u2139\ufe0f Los tickets se registrar\u00e1n en el local que tengas seleccionado arriba.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCompraDialog(false)}
                disabled={procesando}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCompra}
                disabled={procesando}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {procesando ? 'Registrando...' : 'Registrar Compra'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alerta de Stock Bajo */}
      {stats.alertaBajo && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>\u00a1Alerta de Stock Bajo!</AlertTitle>
          <AlertDescription>
            Quedan {stats.saldoActual} tickets en total. Es recomendable realizar una nueva compra.
          </AlertDescription>
        </Alert>
      )}

      {/* Estad\u00edsticas globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Saldo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Ticket className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-3xl font-bold">{stats.saldoActual}</p>
                <p className="text-sm text-gray-500">tickets disponibles</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Comprados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Plus className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-3xl font-bold">{stats.ticketsComprados}</p>
                <p className="text-sm text-gray-500">tickets comprados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Usados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-3xl font-bold">{stats.ticketsUsados}</p>
                <p className="text-sm text-gray-500">tickets consumidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desglose por local (solo si hay datos porLocal) */}
      {stats.porLocal && stats.porLocal.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Store className="mr-2 h-5 w-5" />
              Inventario por Local
            </CardTitle>
            <CardDescription>
              Saldo de tickets desglosado por cada local
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.porLocal.map((loc, idx) => (
                <div key={idx} className="border rounded-lg p-4 relative">
                  {loc.alertaBajo && (
                    <div className="absolute top-2 right-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                  <h4 className="font-semibold text-sm text-gray-700 mb-3 truncate" title={loc.localNombre}>
                    \ud83d\udccd {getLocalShortName(loc.localNombre)}
                  </h4>
                  <div className="text-3xl font-bold text-blue-600 mb-1">{loc.saldoActual}</div>
                  <p className="text-xs text-gray-500 mb-2">tickets disponibles</p>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span className="text-green-600">+{loc.ticketsComprados} comprados</span>
                    <span className="text-red-600">-{loc.ticketsUsados} usados</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de Movimientos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="mr-2 h-5 w-5" />
            Historial de Movimientos
          </CardTitle>
          <CardDescription>
            Registro de todas las compras y consumos de tickets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {movimientos.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay movimientos registrados</p>
              <p className="text-sm text-gray-500">
                Los movimientos aparecer\u00e1n aqu\u00ed cuando se registren compras o se usen tickets
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Fecha</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Local</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Tipo</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Cantidad</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Saldo Anterior</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Saldo Actual</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Concepto</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((mov) => (
                    <tr key={mov.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">
                        {format(new Date(mov.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {mov.local ? (
                          <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
                            \ud83d\udccd {getLocalShortName(mov.local.nombre)}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getTipoColor(mov.tipo)}>
                          {getTipoLabel(mov.tipo)}
                        </Badge>
                      </td>
                      <td className={`py-3 px-4 text-right font-medium ${
                        mov.tipo === 'COMPRA' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {mov.tipo === 'COMPRA' ? '+' : '-'}{Math.abs(mov.cantidad)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {mov.saldoAnterior}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {mov.saldoActual}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {mov.concepto || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
