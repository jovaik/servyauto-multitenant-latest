
'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
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
  const [currentStep, setCurrentStep] = useState(1) // 1: servicios, 2: fecha/hora, 3: datos personales
  const [timeSlots, setTimeSlots] = useState<string[]>([])
  const [servicios, setServicios] = useState<any[]>([])
  const [horarios, setHorarios] = useState({ apertura: '09:00', cierre: '19:00' })
  const [selectedService, setSelectedService] = useState<any>(null)
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
      
      // Si llegamos exactamente a la hora de cierre, parar
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
        
        // Cargar horarios
        const aperturaConfig = configs?.find((c: any) => c.clave === 'horarios.apertura')
        const cierreConfig = configs?.find((c: any) => c.clave === 'horarios.cierre')
        
        const apertura = aperturaConfig?.valor || '09:00'
        const cierre = cierreConfig?.valor || '19:00'
        
        setHorarios({ apertura, cierre })
        
        const slots = generateTimeSlots(apertura, cierre)
        setTimeSlots(slots)
      }
    } catch (error) {
      console.error('Error loading configuration:', error)
      // Fallback a horarios por defecto
      setTimeSlots(generateTimeSlots('09:00', '19:00'))
      setHorarios({ apertura: '09:00', cierre: '19:00' })
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
      // Fallback a servicios por defecto con precios
      setServicios([
        { 
          id: 1, 
          nombre: 'Lavado Exterior Básico', 
          precio: 15, 
          descripcion: 'Lavado exterior completo con jabón y aclarado. Incluye llantas y cristales.',
          duracion: '30 min',
          imagen: '/api/placeholder/300/200'
        },
        { 
          id: 2, 
          nombre: 'Lavado Completo + Interior', 
          precio: 25, 
          descripcion: 'Lavado exterior completo más aspirado interior, limpieza de salpicadero y cristales interiores.',
          duracion: '45 min',
          imagen: '/api/placeholder/300/200'
        },
        { 
          id: 3, 
          nombre: 'Detailing Completo', 
          precio: 65, 
          descripcion: 'Servicio premium: lavado, descontaminación, pulido suave, cera protectora y acondicionador de interiores.',
          duracion: '2 horas',
          imagen: '/api/placeholder/300/200'
        },
        { 
          id: 4, 
          nombre: 'Pulido y Encerado', 
          precio: 45, 
          descripcion: 'Corrección de arañazos menores, pulido para devolver el brillo original y aplicación de cera protectora.',
          duracion: '90 min',
          imagen: '/api/placeholder/300/200'
        },
        { 
          id: 5, 
          nombre: 'Tratamiento Nanocerámico', 
          precio: 180, 
          descripcion: 'Protección avanzada con recubrimiento cerámico. Durabilidad de 12-24 meses. Incluye preparación completa.',
          duracion: '4 horas',
          imagen: '/api/placeholder/300/200'
        },
        { 
          id: 6, 
          nombre: 'Vinilado Personalizado', 
          precio: 299, 
          descripcion: 'Vinilado completo o parcial del vehículo. Amplia gama de colores y acabados. Consulta diseños personalizados.',
          duracion: '6-8 horas',
          imagen: '/api/placeholder/300/200'
        },
        { 
          id: 7, 
          nombre: 'Instalación PPF', 
          precio: 450, 
          descripcion: 'Paint Protection Film de alta calidad. Protección invisible contra impactos. Zonas de alta exposición.',
          duracion: '1-2 días',
          imagen: '/api/placeholder/300/200'
        },
        { 
          id: 8, 
          nombre: 'Servicio Personalizado', 
          precio: 0, 
          descripcion: 'Consulta para servicios específicos o combinaciones. Presupuesto personalizado según necesidades.',
          duracion: 'Variable',
          imagen: '/api/placeholder/300/200'
        }
      ])
    }
  }

  const handleServiceSelect = (servicio: any) => {
    setSelectedService(servicio)
    setFormData(prev => ({ ...prev, servicio: servicio.nombre }))
    setCurrentStep(2)
  }

  const handleDateTimeSelect = () => {
    setCurrentStep(3)
  }

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div 
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold
                    ${currentStep >= step 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}
                >
                  {step}
                </div>
                <span 
                  className={`ml-2 font-medium ${
                    currentStep >= step ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  {step === 1 && 'Elige tu servicio'}
                  {step === 2 && 'Fecha y hora'}
                  {step === 3 && 'Tus datos'}
                </span>
                {step < 3 && (
                  <div 
                    className={`w-12 h-0.5 ml-4 ${
                      currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* STEP 1: Servicios */}
        {currentStep === 1 && (
          <div>
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Nuestros Servicios
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Desde lavados básicos hasta tratamientos premium de protección. Elige el servicio que mejor se adapte a las necesidades de tu vehículo.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {servicios.map((servicio) => (
                <Card 
                  key={servicio.id} 
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                  onClick={() => handleServiceSelect(servicio)}
                >
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 rounded-t-lg flex items-center justify-center">
                    <Car className="h-16 w-16 text-blue-600" />
                  </div>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{servicio.nombre}</CardTitle>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {servicio.precio > 0 ? `${servicio.precio}€` : 'Consultar'}
                        </div>
                        <div className="text-sm text-gray-500">{servicio.duracion}</div>
                      </div>
                    </div>
                    <CardDescription className="text-sm leading-relaxed">
                      {servicio.descripcion}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button className="w-full">
                      Seleccionar este servicio
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Info adicional */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="text-center">
                <div className="bg-blue-100 p-4 rounded-full inline-block mb-4">
                  <Settings className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Equipos Profesionales</h3>
                <p className="text-gray-600 text-sm">
                  Utilizamos los mejores productos y herramientas del mercado para garantizar resultados excepcionales.
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-green-100 p-4 rounded-full inline-block mb-4">
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Garantía de Calidad</h3>
                <p className="text-gray-600 text-sm">
                  Todos nuestros servicios incluyen garantía y la tranquilidad de un trabajo bien hecho.
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-yellow-100 p-4 rounded-full inline-block mb-4">
                  <Star className="h-8 w-8 text-yellow-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Atención Personalizada</h3>
                <p className="text-gray-600 text-sm">
                  Cada vehículo recibe un tratamiento único según su estado y necesidades específicas.
                </p>
              </div>
            </div>

            {/* Horarios */}
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="text-center">Horarios de Atención</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lunes - Viernes:</span>
                    <span className="font-medium">{horarios.apertura} - {horarios.cierre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sábados:</span>
                    <span className="font-medium">10:00 - 19:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Domingos:</span>
                    <span className="font-medium">Cerrado</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 2: Fecha y Hora */}
        {currentStep === 2 && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Selecciona Fecha y Hora
              </h2>
              <p className="text-lg text-gray-600">
                Has seleccionado: <span className="font-semibold text-blue-600">{selectedService?.nombre}</span>
                {selectedService?.precio > 0 && (
                  <span> - {selectedService.precio}€</span>
                )}
              </p>
            </div>

            <Card>
              <CardContent className="p-8">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Fecha */}
                  <div className="space-y-4">
                    <Label className="text-lg font-semibold flex items-center">
                      <Calendar className="mr-2 h-5 w-5" />
                      Elige la fecha
                    </Label>
                    <Input
                      type="date"
                      required
                      min={format(new Date(), 'yyyy-MM-dd')}
                      value={formData.fecha}
                      onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
                      className="text-lg p-4"
                    />
                  </div>

                  {/* Hora */}
                  <div className="space-y-4">
                    <Label className="text-lg font-semibold flex items-center">
                      <Clock className="mr-2 h-5 w-5" />
                      Elige la hora
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlots.map((time) => (
                        <Button
                          key={time}
                          variant={formData.hora === time ? "default" : "outline"}
                          onClick={() => setFormData(prev => ({ ...prev, hora: time }))}
                          className="p-3"
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <Button variant="outline" onClick={goBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Cambiar servicio
                  </Button>
                  <Button 
                    onClick={handleDateTimeSelect}
                    disabled={!formData.fecha || !formData.hora}
                    size="lg"
                  >
                    Continuar con mis datos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 3: Datos Personales */}
        {currentStep === 3 && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Completa tu Reserva
              </h2>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-lg text-gray-700">
                  <span className="font-semibold">{selectedService?.nombre}</span>
                  {selectedService?.precio > 0 && <span> - {selectedService.precio}€</span>}
                </p>
                <p className="text-gray-600">
                  {format(new Date(formData.fecha + 'T00:00:00'), "EEEE, d 'de' MMMM", { locale: es })} a las {formData.hora}
                </p>
              </div>
            </div>

            <Card>
              <CardContent className="p-8">
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

                  {/* Mensaje */}
                  <div className="space-y-2">
                    <Label htmlFor="mensaje">
                      <MessageSquare className="inline mr-1 h-4 w-4" />
                      Mensaje adicional (opcional)
                    </Label>
                    <Textarea
                      id="mensaje"
                      value={formData.mensaje}
                      onChange={(e) => setFormData(prev => ({ ...prev, mensaje: e.target.value }))}
                      placeholder="Describe el estado del vehículo, tipo de acabado, o detalles específicos del servicio requerido..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={goBack}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Cambiar fecha/hora
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loading}
                      size="lg"
                      className="px-8"
                    >
                      {loading ? 'Enviando...' : 'Confirmar Reserva'}
                    </Button>
                  </div>

                  <p className="text-xs text-gray-500 text-center">
                    * Campos requeridos. Te contactaremos en las próximas horas para confirmar tu cita.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
