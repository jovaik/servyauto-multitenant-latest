'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Image from 'next/image'
import { 
  Car, 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Phone,
  CheckCircle
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
import { Card, CardContent } from '@/components/ui/card'

export function ReservasPublicPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [timeSlots, setTimeSlots] = useState<string[]>([])
  const [servicios, setServicios] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  
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

  // Imágenes fijas de los 4 tipos de vehículos
  const imagenesCategoria = {
    PEQUENO: 'https://cdn.abacus.ai/images/e3c871fe-3d41-4c52-bea8-632d322c97cd.png',
    MEDIO: 'https://cdn.abacus.ai/images/3d506b73-86f0-4c4b-8d00-558f22976f10.png', 
    GRANDE: 'https://cdn.abacus.ai/images/bda60174-594f-4da3-aebd-dab09f66fd2f.png',
    SUPER_GRANDE: 'https://cdn.abacus.ai/images/56ae8007-9c89-4133-8ccf-5de0034e918b.png'
  }
  
  const categoriasLabels = {
    PEQUENO: 'Pequeño',
    MEDIO: 'Medio',
    GRANDE: 'Grande', 
    SUPER_GRANDE: 'SUV/Furgoneta'
  }

  useEffect(() => {
    loadConfiguration()
    loadServicios()
  }, [])

  const generateTimeSlots = (apertura: string, cierre: string): string[] => {
    const slots: string[] = []
    const [aperturaHour, aperturaMinute] = apertura.split(':').map(Number)
    const [cierreHour, cierreMinute] = cierre.split(':').map(Number)
    
    let currentHour = aperturaHour
    let currentMinute = aperturaMinute
    
    while (
      currentHour < cierreHour || 
      (currentHour === cierreHour && currentMinute <= cierreMinute)
    ) {
      const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
      slots.push(timeString)
      
      if (currentHour === cierreHour && currentMinute === cierreMinute) {
        break
      }
      
      currentMinute += 30
      if (currentMinute >= 60) {
        currentHour += 1
        currentMinute = 0
      }
    }
    
    return slots
  }

  const loadConfiguration = async () => {
    try {
      const response = await fetch('/api/configuracion')
      if (response.ok) {
        const configs = await response.json()
        const aperturaConfig = configs?.find((c: any) => c.clave === 'horarios.apertura')
        const cierreConfig = configs?.find((c: any) => c.clave === 'horarios.cierre')
        
        const apertura = aperturaConfig?.valor || '09:00'
        const cierre = cierreConfig?.valor || '19:00'
        
        const slots = generateTimeSlots(apertura, cierre)
        setTimeSlots(slots)
      }
    } catch (error) {
      console.error('Error loading configuration:', error)
      setTimeSlots(generateTimeSlots('09:00', '19:00'))
    }
  }

  const loadServicios = async () => {
    try {
      const response = await fetch('/api/servicios')
      if (response.ok) {
        const data = await response.json()
        setServicios(data || [])
      }
    } catch (error) {
      console.error('Error loading servicios:', error)
      setServicios([
        { id: 1, nombre: 'Lavado Exterior Básico', precio: 15, descripcion: 'Lavado exterior completo' },
        { id: 2, nombre: 'Lavado Completo + Interior', precio: 25, descripcion: 'Lavado exterior e interior' },
        { id: 3, nombre: 'Detailing Completo', precio: 65, descripcion: 'Servicio premium completo' },
        { id: 4, nombre: 'Pulido y Encerado', precio: 45, descripcion: 'Corrección de arañazos y encerado' }
      ])
    }
  }

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
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header Simple */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Car className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ServyAuto</h1>
                <p className="text-sm text-gray-500">Lavado & Detailing</p>
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Reserva tu Servicio
          </h2>
          <p className="text-xl text-gray-600">
            Elige tu tipo de vehículo y completa el formulario
          </p>
        </div>

        {/* 4 Fotos Grandes de Vehículos */}
        <div className="mb-12">
          <h3 className="text-2xl font-semibold text-center text-gray-800 mb-8">
            Selecciona tu tipo de vehículo
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Object.entries(categoriasLabels).map(([categoria, label]) => (
              <Card 
                key={categoria}
                className={`cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-2 ${
                  selectedCategory === categoria 
                    ? 'ring-4 ring-blue-500 shadow-xl' 
                    : 'hover:ring-2 hover:ring-blue-300'
                }`}
                onClick={() => setSelectedCategory(categoria)}
              >
                <CardContent className="p-0">
                  <div className="aspect-square relative overflow-hidden bg-gray-100">
                    <Image
                      src={imagenesCategoria[categoria as keyof typeof imagenesCategoria]}
                      alt={`Vehículo ${label}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  </div>
                  <div className="p-4 text-center">
                    <h4 className="font-bold text-lg text-gray-800">{label}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {categoria === 'PEQUENO' && 'Fiat 500, C1, Up!'}
                      {categoria === 'MEDIO' && 'Golf, Corolla, León'}
                      {categoria === 'GRANDE' && 'Serie 5, Classe E'}
                      {categoria === 'SUPER_GRANDE' && 'X5, Sprinter, Transit'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Formulario Simple con Desplegables */}
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Selector de Servicio */}
              <div className="space-y-2">
                <Label htmlFor="servicio">
                  <Car className="inline mr-2 h-4 w-4" />
                  Tipo de Servicio *
                </Label>
                <Select 
                  value={formData.servicio} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, servicio: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicios.map((servicio) => (
                      <SelectItem key={servicio.id} value={servicio.nombre}>
                        {servicio.nombre} - {servicio.precio}€
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fecha */}
              <div className="space-y-2">
                <Label htmlFor="fecha">
                  <Calendar className="inline mr-2 h-4 w-4" />
                  Fecha *
                </Label>
                <Input
                  id="fecha"
                  type="date"
                  required
                  min={format(new Date(), 'yyyy-MM-dd')}
                  value={formData.fecha}
                  onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
                  className="text-lg p-3"
                />
              </div>

              {/* Hora */}
              <div className="space-y-2">
                <Label htmlFor="hora">
                  <Clock className="inline mr-2 h-4 w-4" />
                  Hora *
                </Label>
                <Select 
                  value={formData.hora} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, hora: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona una hora" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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

              <div className="space-y-2">
                <Label htmlFor="mensaje">Mensaje adicional (opcional)</Label>
                <Textarea
                  id="mensaje"
                  value={formData.mensaje}
                  onChange={(e) => setFormData(prev => ({ ...prev, mensaje: e.target.value }))}
                  placeholder="Detalles adicionales sobre el servicio..."
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                size="lg"
                className="w-full text-lg py-6"
              >
                {loading ? 'Enviando...' : 'Confirmar Reserva'}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                * Campos requeridos. Te contactaremos pronto para confirmar tu cita.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
