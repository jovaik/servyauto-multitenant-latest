
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { HorasServicioCard } from '@/components/horas-servicio-card'

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

type PeriodType = 'hoy' | 'semanal' | 'mensual' | 'anual'

export function DashboardContent({ session }: DashboardContentProps) {
  const [period, setPeriod] = useState<PeriodType>('hoy')
  
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
  
  const [citasRecientes, setCitasRecientes] = useState<CitaReciente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsResponse, citasResponse] = await Promise.all([
          fetch(`/api/dashboard/stats?period=${period}`),
          fetch('/api/dashboard/citas-recientes')
        ])

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
        }

        if (citasResponse.ok) {
          const citasData = await citasResponse.json()
          setCitasRecientes(citasData)
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [period])

  const getEstadoBadge = (estado: string) => {
    const variants = {
      'PENDIENTE': 'default',
      'CONFIRMADA': 'secondary',
      'EN_PROCESO': 'default',
      'LISTO_PARA_RECOGER': 'default',
      'COMPLETADA': 'default',
      'CANCELADA': 'destructive',
    } as const

    return (
      <Badge variant={variants[estado as keyof typeof variants] || 'default'}>
        {estado}
      </Badge>
    )
  }

  const getPeriodLabel = () => {
    switch (period) {
      case 'hoy':
        return 'Hoy'
      case 'semanal':
        return 'Semana'
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
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoy">Hoy</SelectItem>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
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
