'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Clock, TrendingUp, Timer, Activity } from 'lucide-react'

type Periodo = 'hoy' | 'semanal' | 'mensual' | 'trimestral' | 'anual'

interface HoraData {
  hora: string
  servicios: number
}

interface HorasStats {
  horasData: HoraData[]
  peakHour: string
  peakCount: number
  totalServicios: number
  duracionMedia: number
  horasActivas: number
}

interface Local {
  id: string
  nombre: string
}

const PERIODO_LABELS: Record<Periodo, string> = {
  hoy: 'Hoy',
  semanal: 'Semana',
  mensual: 'Mes',
  trimestral: 'Trimestre',
  anual: 'Año',
}

export function HorasServicioCard() {
  const [periodo, setPeriodo] = useState<Periodo>('hoy')
  const [localId, setLocalId] = useState('todos')
  const [locales, setLocales] = useState<Local[]>([])
  const [stats, setStats] = useState<HorasStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/locales')
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        const mapped = data.map((l: any) => ({ id: l.id, nombre: l.nombre }))
        setLocales(mapped)
      })
      .catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ period: periodo })
      if (localId !== 'todos') params.set('localId', localId)
      const res = await fetch(`/api/dashboard/horas-servicio?${params}`)
      if (res.ok) {
        setStats(await res.json())
      }
    } catch (e) {
      console.error('Error fetching horas servicio:', e)
    } finally {
      setLoading(false)
    }
  }, [periodo, localId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const maxServicios = stats ? Math.max(...stats.horasData.map(d => d.servicios), 1) : 1

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              Horas de Servicio
            </CardTitle>
            <CardDescription>Distribución de servicios por franja horaria</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {locales.length > 1 && (
              <Select value={localId} onValueChange={setLocalId}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="Local" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los locales</SelectItem>
                  {locales.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nombre.replace('SERVYAUTO ', '')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoy">Hoy</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="mensual">Mensual</SelectItem>
                <SelectItem value="trimestral">Trimestral</SelectItem>
                <SelectItem value="anual">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[320px] text-gray-400">
            <div className="animate-pulse">Cargando datos...</div>
          </div>
        ) : stats && stats.totalServicios > 0 ? (
          <div className="space-y-4">
            {/* Mini stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-indigo-50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-indigo-600 mb-1">
                  <Activity className="h-4 w-4" />
                  <span className="text-xs font-medium">Total Servicios</span>
                </div>
                <p className="text-2xl font-bold text-indigo-700">{stats.totalServicios}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">Hora Punta</span>
                </div>
                <p className="text-2xl font-bold text-amber-700">{stats.peakHour || '-'}</p>
                <p className="text-xs text-amber-500">{stats.peakCount} servicios</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                  <Timer className="h-4 w-4" />
                  <span className="text-xs font-medium">Duración Media</span>
                </div>
                <p className="text-2xl font-bold text-green-700">{stats.duracionMedia} min</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-medium">Horas Activas</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{stats.horasActivas}</p>
              </div>
            </div>

            {/* Bar chart */}
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.horasData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="hora" 
                  tick={{ fontSize: 11 }} 
                  tickFormatter={(v: string) => v.replace(':00', 'h')}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any) => [`${value} servicio${value !== 1 ? 's' : ''}`, 'Servicios']}
                  labelFormatter={(label: any) => `Franja: ${label}`}
                />
                <Bar dataKey="servicios" radius={[4, 4, 0, 0]}>
                  {stats.horasData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.servicios === stats.peakCount && entry.servicios > 0
                        ? '#f59e0b'
                        : entry.servicios > 0
                          ? `rgba(99, 102, 241, ${0.3 + (entry.servicios / maxServicios) * 0.7})`
                          : '#e5e7eb'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-indigo-500" />
                <span>Servicios por hora</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-amber-500" />
                <span>Hora punta</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[280px] text-gray-400">
            <Clock className="h-12 w-12 mb-2 text-gray-300" />
            <p className="text-sm">No hay servicios en este período</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
