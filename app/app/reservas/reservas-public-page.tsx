'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
  CheckCircle,
  CreditCard,
  ChevronLeft,
  ChevronRight
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
  const [galeria, setGaleria] = useState<any[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [disponibilidad, setDisponibilidad] = useState<{mensaje: string, disponible: boolean} | null>(null)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [configPublica, setConfigPublica] = useState<Record<string, string>>({
    'publica.nombre': 'ServyAuto',
    'publica.subtitulo': 'Lavado & Detailing',
    'publica.telefono': '600-123-456',
    'publica.color_fondo': '#f0f7ff'
  })
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    fecha: '',
    hora: '',
    marcaModelo: '',
    matricula: '',
    servicio: '',
    mensaje: ''
  })

  // Imágenes y textos de categorías (con fallbacks por defecto) - se recalculan cuando cambia la configuración
  const imagenesCategoria = useMemo(() => ({
    PEQUENO: configPublica['publica.imagen_pequeno'] || 'https://cdn.abacus.ai/images/e3c871fe-3d41-4c52-bea8-632d322c97cd.png',
    MEDIO: configPublica['publica.imagen_medio'] || 'https://cdn.abacus.ai/images/3d506b73-86f0-4c4b-8d00-558f22976f10.png', 
    GRANDE: configPublica['publica.imagen_grande'] || 'https://cdn.abacus.ai/images/bda60174-594f-4da3-aebd-dab09f66fd2f.png',
    SUPER_GRANDE: configPublica['publica.imagen_super_grande'] || 'https://cdn.abacus.ai/images/56ae8007-9c89-4133-8ccf-5de0034e918b.png'
  }), [configPublica])
  
  const categoriasLabels = useMemo(() => ({
    PEQUENO: configPublica['publica.label_pequeno'] || 'Pequeño',
    MEDIO: configPublica['publica.label_medio'] || 'Medio',
    GRANDE: configPublica['publica.label_grande'] || 'Grande', 
    SUPER_GRANDE: configPublica['publica.label_super_grande'] || 'SUV/Furgoneta'
  }), [configPublica])

  useEffect(() => {
    loadConfiguration()
    loadConfiguracionPublica()
    loadServicios()
    loadGaleria()
  }, [])

  // Auto-avanzar el carrusel cada 5 segundos
  useEffect(() => {
    if (galeria.length === 0) return
    
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % galeria.length)
    }, 5000)
    
    return () => clearInterval(timer)
  }, [galeria.length])

  // Verificar disponibilidad cuando cambian fecha y hora
  useEffect(() => {
    const checkAvailability = async () => {
      if (!formData.fecha || !formData.hora) {
        setDisponibilidad(null)
        return
      }

      setCheckingAvailability(true)
      try {
        const response = await fetch(`/api/reservas?fecha=${formData.fecha}&hora=${formData.hora}`)
        if (response.ok) {
          const data = await response.json()
          setDisponibilidad(data)
        }
      } catch (error) {
        console.error('Error checking availability:', error)
      } finally {
        setCheckingAvailability(false)
      }
    }

    // Delay de 500ms para evitar múltiples llamadas mientras el usuario escribe
    const timeoutId = setTimeout(checkAvailability, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.fecha, formData.hora])

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

  const loadConfiguracionPublica = async () => {
    try {
      // Agregar timestamp para evitar cache del navegador
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/configuracion/publica?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      if (response.ok) {
        const config = await response.json()
        console.log('✅ Configuración pública cargada:', config)
        console.log('📞 Teléfono:', config['publica.telefono'])
        console.log('🎨 Color:', config['publica.color_fondo'])
        setConfigPublica(config)
      }
    } catch (error) {
      console.error('Error loading public configuration:', error)
    }
  }

  const loadServicios = async () => {
    try {
      const response = await fetch('/api/servicios')
      if (response.ok) {
        const data = await response.json()
        // Invertir el orden para mostrar los más importantes primero
        setServicios((data || []).reverse())
      }
    } catch (error) {
      console.error('Error loading servicios:', error)
      setServicios([
        { id: 4, nombre: 'Pulido y Encerado', precio: 45, descripcion: 'Corrección de arañazos y encerado' },
        { id: 3, nombre: 'Detailing Completo', precio: 65, descripcion: 'Servicio premium completo' },
        { id: 2, nombre: 'Lavado Completo + Interior', precio: 25, descripcion: 'Lavado exterior e interior' },
        { id: 1, nombre: 'Lavado Exterior Básico', precio: 15, descripcion: 'Lavado exterior completo' }
      ])
    }
  }

  const loadGaleria = async () => {
    try {
      const response = await fetch('/api/galeria-antes-despues')
      if (response.ok) {
        const data = await response.json()
        setGaleria(data || [])
      }
    } catch (error) {
      console.error('Error loading galeria:', error)
    }
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % galeria.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + galeria.length) % galeria.length)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar campos obligatorios
    if (!formData.nombre || !formData.apellido || !formData.telefono || !formData.fecha || 
        !formData.hora || !formData.marcaModelo || !formData.matricula || !formData.servicio) {
      alert('Por favor completa todos los campos obligatorios marcados con *')
      return
    }

    // Validar disponibilidad
    if (disponibilidad && !disponibilidad.disponible) {
      alert('El horario seleccionado no está disponible. Por favor elige otra hora.')
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch('/api/reservas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setFormData({
          nombre: '',
          apellido: '',
          email: '',
          telefono: '',
          fecha: '',
          hora: '',
          marcaModelo: '',
          matricula: '',
          servicio: '',
          mensaje: ''
        })
        setSelectedCategory('')
        setDisponibilidad(null)
      } else {
        // Mostrar error específico (ej: conflicto de horario)
        alert(data.error || 'Error al enviar la reserva. Por favor intenta nuevamente.')
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
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ 
          background: `linear-gradient(to bottom right, ${configPublica['publica.color_fondo'] || '#f0f7ff'}, ${configPublica['publica.color_fondo'] || '#f0f7ff'})` 
        }}
      >
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
    <div 
      className="min-h-screen"
      style={{ 
        background: `linear-gradient(to bottom right, ${configPublica['publica.color_fondo'] || '#f0f7ff'}, ${configPublica['publica.color_fondo'] || '#f0f7ff'})` 
      }}
    >
      {/* Header Simple */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Car className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {configPublica['publica.nombre'] || 'ServyAuto'}
                </h1>
                <p className="text-sm text-gray-500">
                  {configPublica['publica.subtitulo'] || 'Lavado & Detailing'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                📞 {configPublica['publica.telefono'] || '600-123-456'}
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

        {/* Carrusel de Trabajos Realizados (Galería Antes/Después) */}
        {galeria.length > 0 && (
          <div className="mb-12">
            <h3 className="text-2xl font-semibold text-center text-gray-800 mb-8">
              Nuestros Trabajos Realizados
            </h3>
            <Card className="max-w-4xl mx-auto overflow-hidden">
              <CardContent className="p-0 relative">
                {/* Slides */}
                <div className="relative aspect-video bg-gray-100">
                  {galeria.map((item, index) => (
                    <div
                      key={item.id}
                      className={`absolute inset-0 transition-opacity duration-500 ${
                        index === currentSlide ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <div className="grid grid-cols-2 gap-2 h-full p-4">
                        {/* Imagen Antes */}
                        <div className="relative">
                          <div className="absolute top-2 left-2 bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-bold z-10">
                            ANTES
                          </div>
                          <Image
                            src={item.imagenAntes || '/placeholder.png'}
                            alt="Antes"
                            fill
                            className="object-cover rounded-lg"
                            sizes="(max-width: 1024px) 50vw, 40vw"
                          />
                        </div>

                        {/* Imagen Después */}
                        <div className="relative">
                          <div className="absolute top-2 left-2 bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-bold z-10">
                            DESPUÉS
                          </div>
                          <Image
                            src={item.imagenDespues || '/placeholder.png'}
                            alt="Después"
                            fill
                            className="object-cover rounded-lg"
                            sizes="(max-width: 1024px) 50vw, 40vw"
                          />
                        </div>
                      </div>

                      {/* Información del trabajo */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                        <h4 className="text-white text-xl font-bold mb-1">
                          {item.titulo}
                        </h4>
                        <p className="text-white/90 text-sm">
                          {item.servicio} • {item.vehiculo}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Botones de navegación */}
                  <button
                    onClick={prevSlide}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all z-20"
                    aria-label="Anterior"
                  >
                    <ChevronLeft className="h-6 w-6 text-gray-800" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all z-20"
                    aria-label="Siguiente"
                  >
                    <ChevronRight className="h-6 w-6 text-gray-800" />
                  </button>
                </div>

                {/* Indicadores */}
                <div className="flex justify-center gap-2 py-4 bg-white">
                  {galeria.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === currentSlide 
                          ? 'bg-blue-600 w-8' 
                          : 'bg-gray-300 w-2 hover:bg-gray-400'
                      }`}
                      aria-label={`Ir a slide ${index + 1}`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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

              {/* Mensaje de disponibilidad */}
              {checkingAvailability && (
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  Verificando disponibilidad...
                </div>
              )}
              {disponibilidad && !checkingAvailability && (
                <div className={`p-3 rounded-lg text-sm ${
                  disponibilidad.disponible 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {disponibilidad.disponible ? '✓ ' : '⚠ '}
                  {disponibilidad.mensaje}
                </div>
              )}

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
                <Label htmlFor="marcaModelo">
                  <Car className="inline mr-1 h-4 w-4" />
                  Marca y Modelo *
                </Label>
                <Input
                  id="marcaModelo"
                  required
                  value={formData.marcaModelo}
                  onChange={(e) => setFormData(prev => ({ ...prev, marcaModelo: e.target.value }))}
                  placeholder="Ej: Toyota Corolla"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="matricula">
                  <CreditCard className="inline mr-1 h-4 w-4" />
                  Matrícula *
                </Label>
                <Input
                  id="matricula"
                  required
                  value={formData.matricula}
                  onChange={(e) => setFormData(prev => ({ ...prev, matricula: e.target.value.toUpperCase() }))}
                  placeholder="1234ABC"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="inline mr-1 h-4 w-4" />
                  Email (opcional)
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="tu@email.com"
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
