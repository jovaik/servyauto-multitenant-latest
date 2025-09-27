
'use client'

import React, { useState } from 'react'
import { format } from 'date-fns'
import { 
  Car, 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  MessageSquare,
  CheckCircle,
  ArrowLeft,
  Settings,
  Shield,
  Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export function ReservasPublicPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    fecha: '',
    hora: '',
    vehiculo: '',
    servicio: '',
    mensaje: ''
  })

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30'
  ]

  const servicios = [
    'Cambio de aceite',
    'Revisión general', 
    'Cambio de frenos',
    'Alineación',
    'Cambio de neumáticos',
    'Revisión de motor',
    'Mantenimiento preventivo',
    'Diagnóstico computarizado',
    'Reparación de transmisión',
    'Servicio de aire acondicionado',
    'Otro (especificar en mensaje)'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setLoading(true)
    try {
      const response = await fetch('/api/reservas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSuccess(true)
        setFormData({
          nombre: '',
          apellido: '',
          email: '',
          telefono: '',
          fecha: '',
          hora: '',
          vehiculo: '',
          servicio: '',
          mensaje: ''
        })
      } else {
        throw new Error('Error al enviar reserva')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al enviar la reserva. Por favor intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const resetSuccess = () => {
    setSuccess(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="bg-green-100 p-4 rounded-full inline-block mb-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Reserva Enviada!
              </h2>
              <p className="text-gray-600">
                Tu solicitud de cita ha sido recibida correctamente. Nos pondremos en contacto contigo pronto para confirmar los detalles.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button onClick={resetSuccess} className="w-full">
                Hacer otra reserva
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al inicio
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Car className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ServyAuto</h1>
                <p className="text-sm text-gray-500">Taller Automotriz</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                📞 600-123-456
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left Column - Info */}
          <div>
            <div className="mb-8">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Reserva tu Cita
              </h2>
              <p className="text-xl text-gray-600">
                Solicita una cita para el mantenimiento y reparación de tu vehículo. Te contactaremos para confirmar la disponibilidad.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Settings className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Servicios Profesionales</h3>
                  <p className="text-gray-600">
                    Mantenimiento preventivo, reparaciones, diagnóstico computarizado y más servicios especializados.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Confianza y Calidad</h3>
                  <p className="text-gray-600">
                    Más de 10 años de experiencia en el sector automotriz con técnicos certificados.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-yellow-100 p-3 rounded-full">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Atención Personalizada</h3>
                  <p className="text-gray-600">
                    Cada vehículo es único. Ofrecemos soluciones personalizadas para tus necesidades.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-white rounded-xl shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Horarios de Atención</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Lunes - Viernes:</span>
                  <span className="font-medium">8:00 - 19:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sábados:</span>
                  <span className="font-medium">8:00 - 14:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Domingos:</span>
                  <span className="font-medium">Cerrado</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Formulario de Reserva
                </CardTitle>
                <CardDescription>
                  Completa tus datos y te contactaremos para confirmar tu cita
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Datos personales */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">
                        <User className="inline mr-1 h-4 w-4" />
                        Nombre *
                      </Label>
                      <Input
                        id="nombre"
                        required
                        value={formData.nombre}
                        onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                        placeholder="Tu nombre"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apellido">Apellido *</Label>
                      <Input
                        id="apellido"
                        required
                        value={formData.apellido}
                        onChange={(e) => setFormData(prev => ({ ...prev, apellido: e.target.value }))}
                        placeholder="Tu apellido"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">
                      <Mail className="inline mr-1 h-4 w-4" />
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="tu@email.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono">
                      <Phone className="inline mr-1 h-4 w-4" />
                      Teléfono *
                    </Label>
                    <Input
                      id="telefono"
                      type="tel"
                      required
                      value={formData.telefono}
                      onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                      placeholder="600-123-456"
                    />
                  </div>

                  {/* Fecha y hora */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fecha">
                        <Calendar className="inline mr-1 h-4 w-4" />
                        Fecha preferida *
                      </Label>
                      <Input
                        id="fecha"
                        type="date"
                        required
                        min={format(new Date(), 'yyyy-MM-dd')}
                        value={formData.fecha}
                        onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        <Clock className="inline mr-1 h-4 w-4" />
                        Hora preferida *
                      </Label>
                      <Select value={formData.hora || "hora-placeholder"} onValueChange={(value) => 
                        setFormData(prev => ({ ...prev, hora: value === "hora-placeholder" ? "" : value }))
                      }>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona hora" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hora-placeholder" disabled>Selecciona hora</SelectItem>
                          {timeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Vehículo */}
                  <div className="space-y-2">
                    <Label htmlFor="vehiculo">
                      <Car className="inline mr-1 h-4 w-4" />
                      Vehículo *
                    </Label>
                    <Input
                      id="vehiculo"
                      required
                      value={formData.vehiculo}
                      onChange={(e) => setFormData(prev => ({ ...prev, vehiculo: e.target.value }))}
                      placeholder="Ej: Toyota Corolla 2018 - ABC123"
                    />
                  </div>

                  {/* Servicio */}
                  <div className="space-y-2">
                    <Label>Servicio requerido *</Label>
                    <Select value={formData.servicio || "servicio-placeholder"} onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, servicio: value === "servicio-placeholder" ? "" : value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el servicio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="servicio-placeholder" disabled>Selecciona servicio</SelectItem>
                        {servicios.map((servicio) => (
                          <SelectItem key={servicio} value={servicio}>
                            {servicio}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Mensaje */}
                  <div className="space-y-2">
                    <Label htmlFor="mensaje">
                      <MessageSquare className="inline mr-1 h-4 w-4" />
                      Mensaje adicional
                    </Label>
                    <Textarea
                      id="mensaje"
                      value={formData.mensaje}
                      onChange={(e) => setFormData(prev => ({ ...prev, mensaje: e.target.value }))}
                      placeholder="Describe cualquier detalle específico sobre tu vehículo o el servicio requerido..."
                      rows={3}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                    size="lg"
                  >
                    {loading ? 'Enviando...' : 'Enviar Solicitud de Reserva'}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    * Campos requeridos. Te contactaremos en las próximas horas para confirmar tu cita.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
