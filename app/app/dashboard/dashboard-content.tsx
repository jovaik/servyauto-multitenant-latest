
'use client'

import React, { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import Link from 'next/link'
import { 
  Calendar, 
  Users, 
  CreditCard, 
  TrendingUp,
  TrendingDown,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Wallet,
  FileText
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { HorasServicioCard } from '@/components/horas-servicio-card'
import { useLocalStore } from '@/lib/local-store'

interface DashboardContentProps {
  session: Session | null
}

interface DashboardStats {
  citasHoy: number
  facturacionMensual: number
  clientesTotal: number
  citasPendientes: number
}

interface CitaReciente {
  id: string
  cliente: string
  vehiculo: string
  hora: string
  estado: string
}

type PeriodType = 'hoy' | 'semanal' | 'semana_pasada' | 'mensual' | 'anual' | 'personalizado'

export function DashboardContent({ session }: DashboardContentProps) {
  const [period, setPeriod] = useState<PeriodType>('hoy')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [errorDatos, setErrorDatos] = useState('')
  const rangoValido = period !== 'personalizado' || (!!fechaDesde && !!fechaHasta && fechaDesde <= fechaHasta)
  
  const [stats, setStats] = useState<DashboardStats>({
    citasHoy: 0,
    facturacionMensual: 0,
    clientesTotal: 0,
    citasPendientes: 0,
  })

  const [gastosMensual, setGastosMensual] = useState(0)
  const [balanceMensual, setBalanceMensual] = useState(0)
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [topConceptos, setTopConceptos] = useState<any[]>([])
  const [desglosePagos, setDesglosePagos] = useState<any[]>([])
  
  const [citasRecientes, setCitasRecientes] = useState<CitaReciente[]>([])
  const [loading, setLoading] = useState(true)
  const selectedLocalId = useLocalStore((s) => s.selectedLocalId)

  useEffect(() => {
    if (!rangoValido) return
    const controller = new AbortController()
    const fetchDashboardData = async () => {
      setLoading(true)
      setErrorDatos('')
      try {
        const query = new URLSearchParams({ period })
        if (period === 'personalizado') { query.set('fechaDesde', fechaDesde); query.set('fechaHasta', fechaHasta) }
        const [statsResponse, citasResponse] = await Promise.all([
          fetch(`/api/dashboard/stats?${query}`, { signal: controller.signal }),
          fetch('/api/dashboard/citas-recientes', { signal: controller.signal })
        ])

        if (!statsResponse.ok) throw new Error('No se han podido cargar las cifras del período')
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats({
            citasHoy: statsData.citasHoy,
            facturacionMensual: statsData.facturacionMensual,
            clientesTotal: statsData.clientesTotal,
            citasPendientes: statsData.citasPendientes,
          })
          setGastosMensual(statsData.gastosMensual || 0)
          setBalanceMensual(statsData.balanceMensual || 0)
          setMonthlyData(statsData.monthlyData || [])
          setTopConceptos(statsData.topConceptos || [])
          setDesglosePagos(statsData.desglosePagos || [])
        }

        if (citasResponse.ok) {
          const citasData = await citasResponse.json()
          setCitasRecientes(citasData)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Error fetching dashboard data:', error)
          setErrorDatos('No se han podido cargar las cifras del período. Vuelve a seleccionar las fechas.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    fetchDashboardData()
    return () => controller.abort()
  }, [period, selectedLocalId, fechaDesde, fechaHasta, rangoValido])

  const getEstadoBadge = (estado: string) => {
    const variants = {
      'PENDIENTE': 'default',
      'CONFIRMADA': 'secondary',
      'EN_PROCESO': 'default',
      'LISTO_PARA_RECOGER': 'default',
      'COMPLETADA': 'default',
      'PAGO_POSTERIOR': 'secondary',
      'CANCELADA': 'destructive',
    } as const

    return (
      <Badge variant={variants[estado as keyof typeof variants] || 'default'}>
        {estado === 'PAGO_POSTERIOR' ? 'PAGO POSTERIOR' : estado.replace(/_/g, ' ')}
      </Badge>
    )
  }

  const getPeriodLabel = () => {
    switch (period) {
      case 'hoy':
        return 'Hoy'
      case 'semanal':
        return 'Semana'
      case 'semana_pasada':
        return 'Semana pasada'
      case 'personalizado':
        return 'Periodo personalizado'
      case 'mensual':
        return 'Mes'
      case 'anual':
        return 'Año'
      default:
        return 'Período'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            ¡Bienvenido, {session?.user?.name}!
          </h1>
          <p className="text-gray-600">
            Aquí tienes el resumen de tu centro
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Período:</span>
          <Select value={period} onValueChange={(value) => setPeriod(value as PeriodType)}>
            <SelectTrigger className="w-[210px]">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoy">Hoy</SelectItem>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="semana_pasada">Semana pasada</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
              <SelectItem value="personalizado">Periodo personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {period === 'personalizado' && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1"><Label htmlFor="dashboard-desde">Desde</Label><Input id="dashboard-desde" type="date" value={fechaDesde} max={fechaHasta || undefined} onChange={e => setFechaDesde(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="dashboard-hasta">Hasta</Label><Input id="dashboard-hasta" type="date" value={fechaHasta} min={fechaDesde || undefined} onChange={e => setFechaHasta(e.target.value)} /></div>
          {!rangoValido && <p role="status" className="text-sm text-amber-800">{fechaDesde && fechaHasta ? 'La fecha inicial no puede ser posterior a la final.' : 'Selecciona las fechas de inicio y fin.'}</p>}
        </div>
      )}
      {errorDatos && <p role="alert" className="text-sm text-red-700">{errorDatos}</p>}
      {loading && rangoValido && <p role="status" className="text-sm text-gray-600">Cargando cifras del período…</p>}
      {/* Stats Grid: no mostrar cifras de otro período mientras se eligen las fechas. */}
      <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-5 ${!rangoValido || loading || errorDatos ? 'hidden' : ''}`}>
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Citas ({getPeriodLabel()})</p>
                <p className="text-3xl font-bold">{stats.citasHoy}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Ingresos ({getPeriodLabel()})</p>
                <p className="text-3xl font-bold">€{stats.facturacionMensual.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Gastos ({getPeriodLabel()})</p>
                <p className="text-3xl font-bold">€{gastosMensual.toFixed(2)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-r ${balanceMensual >= 0 ? 'from-teal-500 to-teal-600' : 'from-orange-500 to-orange-600'} text-white`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`${balanceMensual >= 0 ? 'text-teal-100' : 'text-orange-100'} text-sm font-medium`}>Balance ({getPeriodLabel()})</p>
                <p className="text-3xl font-bold">€{balanceMensual.toFixed(2)}</p>
              </div>
              <Wallet className={`h-8 w-8 ${balanceMensual >= 0 ? 'text-teal-200' : 'text-orange-200'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Clientes Nuevos ({getPeriodLabel()})</p>
                <p className="text-3xl font-bold">{stats.clientesTotal}</p>
              </div>
              <Users className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Ingresos vs Gastos Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos vs Gastos (Año Actual)</CardTitle>
            <CardDescription>Comparativa mensual de ingresos y gastos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" />
                <Bar dataKey="gastos" fill="#ef4444" name="Gastos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Conceptos Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Servicios Facturados</CardTitle>
            <CardDescription>
              Servicios más vendidos (basado en facturas del año actual)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topConceptos.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={topConceptos}
                    dataKey="total"
                    nameKey="concepto"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry: any) => `${entry.concepto.length > 15 ? entry.concepto.substring(0, 15) + '...' : entry.concepto}: €${Number(entry.total).toFixed(0)}`}
                  >
                    {topConceptos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `€${typeof value === 'number' ? value.toFixed(2) : value}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
                <FileText className="h-12 w-12 mb-2 text-gray-300" />
                <p className="text-sm">No hay datos de facturación aún</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Desglose por método de pago */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            Pagos por método ({getPeriodLabel()})
          </CardTitle>
          <CardDescription>
            Relación de ingresos cobrados por cada método de pago
          </CardDescription>
        </CardHeader>
        <CardContent>
          {desglosePagos.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {desglosePagos.map((p: any) => {
                const labels: Record<string, string> = {
                  EFECTIVO: 'Efectivo',
                  TARJETA: 'Tarjeta',
                  SUMUP: 'SumUp',
                  TPV_SUMUP: 'SumUp',
                  UNICAJA: 'Unicaja',
                  TPV_UNICAJA: 'Unicaja',
                  REVOLUT: 'TPV REVOLUT',
                  TRANSFERENCIA: 'Transferencia',
                  BIZUM: 'Bizum',
                  'SIN ESPECIFICAR': 'Sin especificar',
                }
                const colors: Record<string, string> = {
                  EFECTIVO: 'text-green-600',
                  SUMUP: 'text-blue-600',
                  TPV_SUMUP: 'text-blue-600',
                  UNICAJA: 'text-red-600',
                  TPV_UNICAJA: 'text-red-600',
                  REVOLUT: 'text-slate-700',
                }
                return (
                  <div key={p.metodo} className="rounded-lg border bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-600">{labels[p.metodo] || p.metodo}</p>
                    <p className={`text-2xl font-bold ${colors[p.metodo] || 'text-gray-900'}`}>€{Number(p.total).toFixed(2)}</p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="mx-auto h-12 w-12 text-gray-300 mb-2" />
              <p className="text-sm">No hay pagos registrados en este período</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Horas de Servicio */}
      <HorasServicioCard />

      {/* Actions Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <Plus className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Nueva Cita</h3>
                <p className="text-sm text-gray-600">Agenda una nueva cita para un cliente</p>
              </div>
            </div>
            <Link href="/dashboard/agenda">
              <Button className="w-full mt-4">
                Crear Cita
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 p-3 rounded-full">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Nuevo Cliente</h3>
                <p className="text-sm text-gray-600">Registra un nuevo cliente y vehículo</p>
              </div>
            </div>
            <Link href="/dashboard/clientes">
              <Button variant="outline" className="w-full mt-4">
                Añadir Cliente
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-purple-100 p-3 rounded-full">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Nueva Factura</h3>
                <p className="text-sm text-gray-600">Genera factura o ticket de servicio</p>
              </div>
            </div>
            <Link href="/dashboard/facturacion">
              <Button variant="outline" className="w-full mt-4">
                Crear Factura
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Citas Recientes
          </CardTitle>
          <CardDescription>
            Últimas citas programadas en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Cargando citas...
            </div>
          ) : citasRecientes.length > 0 ? (
            <div className="space-y-4">
              {citasRecientes.map((cita) => (
                <div key={cita.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{cita.cliente}</h4>
                    <p className="text-sm text-gray-600">{cita.vehiculo}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{cita.hora}</p>
                    {getEstadoBadge(cita.estado)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>No hay citas registradas aún</p>
              <Link href="/dashboard/agenda">
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear primera cita
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
