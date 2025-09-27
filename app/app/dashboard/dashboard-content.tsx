
'use client'

import React, { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import Link from 'next/link'
import { 
  Calendar, 
  Users, 
  CreditCard, 
  TrendingUp,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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

export function DashboardContent({ session }: DashboardContentProps) {
  const [stats, setStats] = useState<DashboardStats>({
    citasHoy: 0,
    facturacionMensual: 0,
    clientesTotal: 0,
    citasPendientes: 0,
  })
  
  const [citasRecientes, setCitasRecientes] = useState<CitaReciente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsResponse, citasResponse] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/dashboard/citas-recientes')
        ])

        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData)
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
  }, [])

  const getEstadoBadge = (estado: string) => {
    const variants = {
      'PENDIENTE': 'default',
      'CONFIRMADA': 'secondary',
      'EN_PROCESO': 'default',
      'COMPLETADA': 'default',
      'CANCELADA': 'destructive',
    } as const

    return (
      <Badge variant={variants[estado as keyof typeof variants] || 'default'}>
        {estado}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          ¡Bienvenido, {session?.user?.name}!
        </h1>
        <p className="text-gray-600">
          Aquí tienes el resumen de tu taller automotriz
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Citas Hoy</p>
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
                <p className="text-green-100 text-sm font-medium">Facturación Mensual</p>
                <p className="text-3xl font-bold">€{stats.facturacionMensual.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Clientes Total</p>
                <p className="text-3xl font-bold">{stats.clientesTotal}</p>
              </div>
              <Users className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Citas Pendientes</p>
                <p className="text-3xl font-bold">{stats.citasPendientes}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

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
