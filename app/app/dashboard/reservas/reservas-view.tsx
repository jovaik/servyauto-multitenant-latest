
'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  Clock, 
  Calendar,
  User,
  Phone,
  Mail,
  Car,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Share2
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

interface Reserva {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono: string
  fecha: Date
  hora: string
  vehiculo: string
  servicio: string
  mensaje?: string
  estado: 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA'
  createdAt: Date
}

export function ReservasView() {
  const { toast } = useToast()
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'TODAS' | 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA'>('TODAS')

  useEffect(() => {
    loadReservas()
  }, [])

  const loadReservas = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/reservas')
      
      if (response.ok) {
        const data = await response.json()
        setReservas(data || [])
      }
    } catch (error) {
      console.error('Error loading reservations:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateReservaStatus = async (reservaId: string, newStatus: 'CONFIRMADA' | 'CANCELADA') => {
    try {
      const response = await fetch(`/api/reservas/${reservaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estado: newStatus }),
      })

      if (response.ok) {
        setReservas(prev => prev?.map(r => 
          r.id === reservaId ? { ...r, estado: newStatus } : r
        ))
        toast({
          title: "¡Éxito!",
          description: `Reserva ${newStatus.toLowerCase()} correctamente`,
        })
      } else {
        throw new Error('Error al actualizar estado')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al actualizar la reserva",
        variant: "destructive",
      })
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Pendiente</Badge>
      case 'CONFIRMADA':
        return <Badge variant="default" className="bg-green-100 text-green-800">Confirmada</Badge>
      case 'CANCELADA':
        return <Badge variant="destructive">Cancelada</Badge>
      default:
        return <Badge variant="secondary">{estado}</Badge>
    }
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'CONFIRMADA':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'CANCELADA':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const filteredReservas = reservas?.filter(reserva => 
    filter === 'TODAS' || reserva.estado === filter
  ) || []

  const shareReservasPage = async () => {
    const url = `${window.location.origin}/reservas`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ServyAuto - Reserva tu cita',
          text: 'Reserva tu cita en nuestro taller automotriz',
          url: url,
        })
      } catch (error) {
        // Fallback to clipboard
        copyToClipboard(url)
      }
    } else {
      copyToClipboard(url)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "¡Copiado!",
        description: "Enlace copiado al portapapeles",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reservas</h1>
          <p className="text-gray-600">
            Gestiona las solicitudes de reserva de los clientes
          </p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={shareReservasPage}
            className="flex items-center"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Compartir página
          </Button>
          <Button 
            onClick={() => window.open('/reservas', '_blank')}
            className="flex items-center"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Ver página pública
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Reservas</p>
                <p className="text-3xl font-bold">{reservas?.length || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Pendientes</p>
                <p className="text-3xl font-bold">
                  {reservas?.filter(r => r.estado === 'PENDIENTE').length || 0}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Confirmadas</p>
                <p className="text-3xl font-bold">
                  {reservas?.filter(r => r.estado === 'CONFIRMADA').length || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Canceladas</p>
                <p className="text-3xl font-bold">
                  {reservas?.filter(r => r.estado === 'CANCELADA').length || 0}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex space-x-2">
            {['TODAS', 'PENDIENTE', 'CONFIRMADA', 'CANCELADA'].map((status) => (
              <Button
                key={status}
                variant={filter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(status as any)}
              >
                {status === 'TODAS' ? 'Todas' : status.charAt(0) + status.slice(1).toLowerCase()}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reservations List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Lista de Reservas
          </CardTitle>
          <CardDescription>
            {filteredReservas.length} reservas {filter !== 'TODAS' && `en estado ${filter.toLowerCase()}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Cargando reservas...</p>
            </div>
          ) : filteredReservas.length > 0 ? (
            <div className="space-y-4">
              {filteredReservas.map((reserva) => (
                <div 
                  key={reserva.id} 
                  className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getEstadoIcon(reserva.estado)}
                        <h3 className="font-medium text-gray-900">
                          {reserva.nombre} {reserva.apellido}
                        </h3>
                        {getEstadoBadge(reserva.estado)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center">
                          <Mail className="mr-2 h-4 w-4" />
                          {reserva.email}
                        </div>
                        <div className="flex items-center">
                          <Phone className="mr-2 h-4 w-4" />
                          {reserva.telefono}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4" />
                          {format(new Date(reserva.fecha), "d 'de' MMMM", { locale: es })} - {reserva.hora}
                        </div>
                        <div className="flex items-center">
                          <Car className="mr-2 h-4 w-4" />
                          {reserva.vehiculo}
                        </div>
                        <div className="col-span-2">
                          <strong>Servicio:</strong> {reserva.servicio}
                        </div>
                      </div>

                      {reserva.mensaje && (
                        <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 mb-3">
                          <strong>Mensaje:</strong> {reserva.mensaje}
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        Solicitada el {format(new Date(reserva.createdAt), "d/MM/yyyy 'a las' HH:mm", { locale: es })}
                      </div>
                    </div>

                    {reserva.estado === 'PENDIENTE' && (
                      <div className="flex space-x-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => updateReservaStatus(reserva.id, 'CONFIRMADA')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Confirmar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateReservaStatus(reserva.id, 'CANCELADA')}
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>
                {filter === 'TODAS' 
                  ? 'No hay reservas registradas aún'
                  : `No hay reservas en estado ${filter.toLowerCase()}`
                }
              </p>
              <p className="text-sm mt-2">
                Los clientes pueden hacer reservas a través de la página pública
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
