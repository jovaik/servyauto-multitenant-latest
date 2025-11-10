
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
  MessageSquare,
  CheckCircle,
  ArrowLeft,
  Settings,
  Shield,
  Star,
  Sparkles,
  Camera,
  Award
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
  const [selectedCategory, setSelectedCategory] = useState<string>('MEDIO')
  const [galeriaAntesDespues, setGaleriaAntesDespues] = useState<any[]>([])
  const [portfolioTrabajos, setPortfolioTrabajos] = useState<any[]>([])
  const [publicConfig, setPublicConfig] = useState<Record<string, string>>({
    'publica.nombre': 'ServyAuto',
    'publica.subtitulo': 'Lavado & Detailing',
    'publica.telefono': '600-123-456',
    'publica.email': '',
    'publica.titulo_servicios': 'Nuestros Servicios',
    'publica.descripcion_servicios': 'Desde lavados básicos hasta tratamientos premium de protección. Elige el tamaño de tu vehículo y descubre nuestros servicios especializados.',
    'publica.cta_texto': '¿Listo para transformar tu vehículo?',
    'publica.cta_subtexto': 'Únete a más de 1.000 clientes satisfechos que han confiado en nosotros para el cuidado de sus vehículos.',
    'publica.sabado_apertura': '10:00',
    'publica.sabado_cierre': '19:00',
    'publica.domingo_cerrado': 'true',
    'publica.domingo_apertura': '10:00',
    'publica.domingo_cierre': '14:00',
  })
  
  // Imágenes por categoría de vehículo (con fallback a las por defecto)
  const imagenesCategoria = {
    PEQUENO: publicConfig['publica.imagen_pequeno'] || 'https://cdn.abacus.ai/images/e3c871fe-3d41-4c52-bea8-632d322c97cd.png',
    MEDIO: publicConfig['publica.imagen_medio'] || 'https://cdn.abacus.ai/images/3d506b73-86f0-4c4b-8d00-558f22976f10.png', 
    GRANDE: publicConfig['publica.imagen_grande'] || 'https://cdn.abacus.ai/images/bda60174-594f-4da3-aebd-dab09f66fd2f.png',
    SUPER_GRANDE: publicConfig['publica.imagen_super_grande'] || 'https://cdn.abacus.ai/images/56ae8007-9c89-4133-8ccf-5de0034e918b.png'
  }
  
  const categoriasLabels = {
    PEQUENO: 'Pequeño',
    MEDIO: 'Medio',
    GRANDE: 'Grande', 
    SUPER_GRANDE: 'SUV/Furgoneta'
  }
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
    loadPublicConfiguration()
    loadConfiguration()
    loadServicios()
    loadGaleriaAntesDespues()
    loadPortfolioTrabajos()
  }, [])

  const loadPublicConfiguration = async () => {
    try {
      const response = await fetch('/api/configuracion/publica')
      if (response.ok) {
        const data = await response.json()
        setPublicConfig(prev => ({ ...prev, ...data }))
      }
    } catch (error) {
      console.error('Error loading public configuration:', error)
      // Usar valores por defecto ya establecidos en el estado
    }
  }

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
      // Fallback a servicios por defecto con categorías de vehículos
      setServicios([
        { 
          id: 1, 
          nombre: 'Lavado Exterior Básico', 
          precios: { PEQUENO: 12, MEDIO: 15, GRANDE: 18, SUPER_GRANDE: 22 },
          descripcion: 'Lavado exterior completo con jabón y aclarado. Incluye llantas y cristales.',
          duracion: '30 min',
          categoria: 'MEDIO'
        },
        { 
          id: 2, 
          nombre: 'Lavado Completo + Interior', 
          precios: { PEQUENO: 20, MEDIO: 25, GRANDE: 30, SUPER_GRANDE: 38 },
          descripcion: 'Lavado exterior completo más aspirado interior, limpieza de salpicadero y cristales interiores.',
          duracion: '45 min',
          categoria: 'MEDIO'
        },
        { 
          id: 3, 
          nombre: 'Detailing Completo', 
          precios: { PEQUENO: 55, MEDIO: 65, GRANDE: 75, SUPER_GRANDE: 95 },
          descripcion: 'Servicio premium: lavado, descontaminación, pulido suave, cera protectora y acondicionador de interiores.',
          duracion: '2 horas',
          categoria: 'MEDIO'
        },
        { 
          id: 4, 
          nombre: 'Pulido y Encerado', 
          precios: { PEQUENO: 38, MEDIO: 45, GRANDE: 52, SUPER_GRANDE: 65 },
          descripcion: 'Corrección de arañazos menores, pulido para devolver el brillo original y aplicación de cera protectora.',
          duracion: '90 min',
          categoria: 'MEDIO'
        },
        { 
          id: 5, 
          nombre: 'Tratamiento Nanocerámico', 
          precios: { PEQUENO: 150, MEDIO: 180, GRANDE: 220, SUPER_GRANDE: 280 },
          descripcion: 'Protección avanzada con recubrimiento cerámico. Durabilidad de 12-24 meses. Incluye preparación completa.',
          duracion: '4 horas',
          categoria: 'GRANDE'
        },
        { 
          id: 6, 
          nombre: 'Vinilado Personalizado', 
          precios: { PEQUENO: 250, MEDIO: 299, GRANDE: 380, SUPER_GRANDE: 480 },
          descripcion: 'Vinilado completo o parcial del vehículo. Amplia gama de colores y acabados. Consulta diseños personalizados.',
          duracion: '6-8 horas',
          categoria: 'SUPER_GRANDE'
        },
        { 
          id: 7, 
          nombre: 'Instalación PPF', 
          precios: { PEQUENO: 380, MEDIO: 450, GRANDE: 550, SUPER_GRANDE: 680 },
          descripcion: 'Paint Protection Film de alta calidad. Protección invisible contra impactos. Zonas de alta exposición.',
          duracion: '1-2 días',
          categoria: 'SUPER_GRANDE'
        },
        { 
          id: 8, 
          nombre: 'Servicio Personalizado', 
          precios: { PEQUENO: 0, MEDIO: 0, GRANDE: 0, SUPER_GRANDE: 0 },
          descripcion: 'Consulta para servicios específicos o combinaciones. Presupuesto personalizado según necesidades.',
          duracion: 'Variable',
          categoria: 'MEDIO'
        }
      ])
    }
  }

  const loadGaleriaAntesDespues = async () => {
    try {
      const response = await fetch('/api/galeria-antes-despues')
      if (response.ok) {
        const data = await response.json()
        setGaleriaAntesDespues(data?.slice(0, 6) || []) // Máximo 6 para la landing page
      }
    } catch (error) {
      console.error('Error loading galeria antes despues:', error)
    }
  }

  const loadPortfolioTrabajos = async () => {
    try {
      const response = await fetch('/api/portfolio')
      if (response.ok) {
        const data = await response.json()
        setPortfolioTrabajos(data?.slice(0, 8) || []) // Máximo 8 para la landing page
      }
    } catch (error) {
      console.error('Error loading portfolio trabajos:', error)
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
                <h1 className="text-xl font-bold text-gray-900">
                  {publicConfig['publica.nombre'] || 'ServyAuto'}
                </h1>
                <p className="text-sm text-gray-500">
                  {publicConfig['publica.subtitulo'] || 'Lavado & Detailing'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                📞 {publicConfig['publica.telefono'] || '600-123-456'}
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
                {publicConfig['publica.titulo_servicios'] || 'Nuestros Servicios'}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {publicConfig['publica.descripcion_servicios'] || 'Desde lavados básicos hasta tratamientos premium de protección. Elige el tamaño de tu vehículo y descubre nuestros servicios especializados.'}
              </p>
            </div>

            {/* Selector de categoría de vehículo */}
            <div className="mb-12">
              <h3 className="text-2xl font-semibold text-center text-gray-800 mb-8">
                Selecciona el tamaño de tu vehículo
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {Object.entries(categoriasLabels).map(([categoria, label]) => (
                  <Card 
                    key={categoria}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
                      selectedCategory === categoria 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedCategory(categoria)}
                  >
                    <CardContent className="p-4">
                      <div className="aspect-video relative rounded-lg overflow-hidden mb-3 bg-gray-100">
                        <Image
                          src={imagenesCategoria[categoria as keyof typeof imagenesCategoria]}
                          alt={`Vehículo ${label}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      </div>
                      <h4 className="font-semibold text-center text-gray-800">{label}</h4>
                      <p className="text-xs text-center text-gray-500 mt-1">
                        {categoria === 'PEQUENO' && 'Fiat 500, C1, Up!'}
                        {categoria === 'MEDIO' && 'Golf, Corolla, León'}
                        {categoria === 'GRANDE' && 'Serie 5, Classe E'}
                        {categoria === 'SUPER_GRANDE' && 'X5, Sprinter, Transit'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {servicios.map((servicio) => (
                <Card 
                  key={servicio.id} 
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                  onClick={() => handleServiceSelect(servicio)}
                >
                  <div className="aspect-video relative rounded-t-lg overflow-hidden bg-gray-100">
                    <Image
                      src={imagenesCategoria[selectedCategory as keyof typeof imagenesCategoria]}
                      alt={`${servicio.nombre} para vehículo ${categoriasLabels[selectedCategory as keyof typeof categoriasLabels]}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                      <div className="bg-white bg-opacity-90 px-3 py-1 rounded-full">
                        <Sparkles className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{servicio.nombre}</CardTitle>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {servicio.precios?.[selectedCategory as keyof typeof servicio.precios] > 0 
                            ? `${servicio.precios[selectedCategory as keyof typeof servicio.precios]}€` 
                            : 'Consultar'
                          }
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

            {/* Info adicional - Bloques personalizables */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {[1, 2, 3].map((num) => {
                const icono = publicConfig[`publica.bloque${num}_icono`] || 'settings'
                const colores = {
                  1: { bg: 'bg-blue-100', text: 'text-blue-600' },
                  2: { bg: 'bg-green-100', text: 'text-green-600' },
                  3: { bg: 'bg-yellow-100', text: 'text-yellow-600' }
                }
                const IconComponent = 
                  icono === 'shield' ? Shield :
                  icono === 'star' ? Star :
                  icono === 'sparkles' ? Sparkles :
                  icono === 'camera' ? Camera :
                  Settings
                
                return (
                  <div key={num} className="text-center">
                    <div className={`${colores[num as keyof typeof colores].bg} p-4 rounded-full inline-block mb-4`}>
                      <IconComponent className={`h-8 w-8 ${colores[num as keyof typeof colores].text}`} />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {publicConfig[`publica.bloque${num}_titulo`] || `Bloque ${num}`}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {publicConfig[`publica.bloque${num}_texto`] || ''}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Galería Antes/Después */}
            {galeriaAntesDespues.length > 0 && (
              <div className="mb-16">
                <div className="text-center mb-12">
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">
                    Antes y Después
                  </h3>
                  <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    Descubre la transformación que experimentan nuestros clientes. Cada vehículo recibe el cuidado y la atención que merece.
                  </p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {galeriaAntesDespues.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <div className="grid grid-cols-2 gap-0">
                        <div className="aspect-square relative bg-gray-100">
                          <Image
                            src={item.imagenAntes}
                            alt={`Antes - ${item.titulo}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 33vw"
                          />
                          <div className="absolute bottom-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                            Antes
                          </div>
                        </div>
                        <div className="aspect-square relative bg-gray-100">
                          <Image
                            src={item.imagenDespues}
                            alt={`Después - ${item.titulo}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 33vw"
                          />
                          <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                            Después
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-gray-800 mb-1">{item.titulo}</h4>
                        <p className="text-sm text-gray-600 mb-2">{item.servicio}</p>
                        <p className="text-xs text-gray-500">{item.vehiculo}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Portfolio de Trabajos */}
            {portfolioTrabajos.length > 0 && (
              <div className="mb-16">
                <div className="text-center mb-12">
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">
                    Nuestros Trabajos
                  </h3>
                  <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    Una muestra de nuestros trabajos más recientes. La perfección en cada detalle es nuestra pasión.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                  {portfolioTrabajos.map((trabajo) => (
                    <Card key={trabajo.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-square relative bg-gray-100">
                        <Image
                          src={trabajo.imagenes[0] || imagenesCategoria[trabajo.categoria as keyof typeof imagenesCategoria]}
                          alt={trabajo.titulo}
                          fill
                          className="object-cover hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                        {trabajo.imagenes.length > 1 && (
                          <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                            +{trabajo.imagenes.length - 1}
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <h4 className="font-semibold text-sm text-gray-800 mb-1 line-clamp-2">{trabajo.titulo}</h4>
                        <p className="text-xs text-blue-600 font-medium">{trabajo.servicio}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* CTA Section */}
            <div className="text-center mb-16">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
                <Camera className="h-12 w-12 mx-auto mb-4 text-blue-200" />
                <h3 className="text-2xl font-bold mb-4">
                  {publicConfig['publica.cta_texto'] || '¿Listo para transformar tu vehículo?'}
                </h3>
                <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                  {publicConfig['publica.cta_subtexto'] || 'Únete a más de 1.000 clientes satisfechos que han confiado en nosotros para el cuidado de sus vehículos.'}
                </p>
                <div className="flex justify-center space-x-6 text-sm">
                  <div className="flex items-center">
                    <Award className="h-5 w-5 mr-2 text-yellow-300" />
                    <span>Garantía de Calidad</span>
                  </div>
                  <div className="flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-blue-200" />
                    <span>Productos Premium</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="h-5 w-5 mr-2 text-yellow-300" />
                    <span>+1000 Clientes</span>
                  </div>
                </div>
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
                    <span className="font-medium">
                      {publicConfig['publica.sabado_apertura'] || '10:00'} - {publicConfig['publica.sabado_cierre'] || '19:00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Domingos:</span>
                    <span className="font-medium">
                      {publicConfig['publica.domingo_cerrado'] === 'true' || !publicConfig['publica.domingo_cerrado']
                        ? 'Cerrado'
                        : `${publicConfig['publica.domingo_apertura'] || '10:00'} - ${publicConfig['publica.domingo_cierre'] || '14:00'}`
                      }
                    </span>
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
