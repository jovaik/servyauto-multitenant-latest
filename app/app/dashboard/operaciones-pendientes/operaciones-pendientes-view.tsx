'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Calendar, RefreshCw, ExternalLink, ClipboardList } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { LOCAL_CHANGE_EVENT } from '@/lib/local-store'

interface CitaPendiente {
  id: string
  fecha: string
  horaInicio?: string
  estado: string
  total?: number
  observaciones?: string
  cliente?: { nombre?: string; apellido?: string; telefono?: string }
  vehiculo?: { marca?: string; modelo?: string; matricula?: string }
  local?: { nombre?: string }
}

const getEstadoColor = (estado?: string) => {
  switch (estado) {
    case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'CONFIRMADA': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'EN_PROCESO': return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'LISTO_PARA_RECOGER': return 'bg-orange-100 text-orange-800 border-orange-300'
    case 'PAGO_POSTERIOR': return 'bg-indigo-100 text-indigo-800 border-indigo-300'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getEstadoLabel = (estado?: string) => {
  switch (estado) {
    case 'PENDIENTE': return 'PENDIENTE'
    case 'CONFIRMADA': return 'CONFIRMADA'
    case 'EN_PROCESO': return 'EN PROCESO'
    case 'LISTO_PARA_RECOGER': return 'LISTO PARA RECOGER'
    case 'PAGO_POSTERIOR': return 'PAGO POSTERIOR (CRÉDITO)'
    default: return estado || '-'
  }
}

export function OperacionesPendientesView() {
  const router = useRouter()
  // Por defecto, desde el 16 de septiembre del año en curso
  const [desde, setDesde] = useState('2026-09-16')
  const [citas, setCitas] = useState<CitaPendiente[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/citas?pendientes=true&desde=${desde}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const arr: CitaPendiente[] = Array.isArray(data) ? data : []
        arr.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
        setCitas(arr)
      } else {
        setCitas([])
      }
    } catch (e) {
      setCitas([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde])

  useEffect(() => {
    const handler = () => loadData()
    window.addEventListener(LOCAL_CHANGE_EVENT, handler)
    return () => window.removeEventListener(LOCAL_CHANGE_EVENT, handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde])

  const totalImporte = citas.reduce((s, c) => s + (Number(c.total) || 0), 0)
  const conteo: Record<string, number> = {}
  citas.forEach(c => { conteo[c.estado] = (conteo[c.estado] || 0) + 1 })

  const abrirEnAgenda = (c: CitaPendiente) => {
    const f = format(new Date(c.fecha), 'yyyy-MM-dd')
    router.push(`/dashboard/agenda?fecha=${f}&citaId=${c.id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-orange-600" />
            Operaciones sin completar
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Citas de la agenda que aún no se han marcado como completadas (excluye canceladas y no-show).
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Desde la fecha</label>
              <Input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="max-w-[220px]"
              />
            </div>
            <div className="grid grid-cols-2 sm:flex gap-3">
              <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-2 text-center">
                <div className="text-2xl font-bold text-orange-700">{citas.length}</div>
                <div className="text-xs text-orange-600">Sin completar</div>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-2 text-center">
                <div className="text-2xl font-bold text-gray-700">{totalImporte.toFixed(2)}€</div>
                <div className="text-xs text-gray-500">Importe total</div>
              </div>
            </div>
          </div>
          {Object.keys(conteo).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {Object.entries(conteo).map(([estado, n]) => (
                <Badge key={estado} variant="outline" className={getEstadoColor(estado)}>
                  {getEstadoLabel(estado)}: {n}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listado</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-gray-400">Cargando…</div>
          ) : citas.length === 0 ? (
            <div className="py-10 text-center text-gray-500 flex flex-col items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-emerald-500" />
              <span>No hay operaciones sin completar desde esa fecha. ¡Todo al día!</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-3 font-medium">Fecha</th>
                    <th className="py-2 pr-3 font-medium">Estado</th>
                    <th className="py-2 pr-3 font-medium">Cliente</th>
                    <th className="py-2 pr-3 font-medium">Vehículo</th>
                    <th className="py-2 pr-3 font-medium">Local</th>
                    <th className="py-2 pr-3 font-medium text-right">Importe</th>
                    <th className="py-2 pr-3 font-medium text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {citas.map((c) => {
                    const cli = c.cliente ? `${c.cliente.nombre || ''} ${c.cliente.apellido || ''}`.trim() : '—'
                    const veh = c.vehiculo ? `${c.vehiculo.marca || ''} ${c.vehiculo.modelo || ''} ${c.vehiculo.matricula ? '· ' + c.vehiculo.matricula : ''}`.trim() : '—'
                    return (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            {format(new Date(c.fecha), "d MMM yyyy", { locale: es })}
                          </div>
                          {c.horaInicio && <span className="text-xs text-gray-400">{c.horaInicio}</span>}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge variant="outline" className={getEstadoColor(c.estado)}>
                            {getEstadoLabel(c.estado)}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 font-medium">{cli}</td>
                        <td className="py-2 pr-3 text-gray-600">{veh}</td>
                        <td className="py-2 pr-3 text-gray-600">{c.local?.nombre || '—'}</td>
                        <td className="py-2 pr-3 text-right font-semibold">{(Number(c.total) || 0).toFixed(2)}€</td>
                        <td className="py-2 pr-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => abrirEnAgenda(c)}>
                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                            Abrir
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
