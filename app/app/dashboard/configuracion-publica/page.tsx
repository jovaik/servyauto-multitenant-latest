
'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import Image from 'next/image'
import { 
  Building2, 
  Phone, 
  Mail, 
  Globe, 
  Clock, 
  FileText, 
  Eye,
  Save,
  ExternalLink,
  ImageIcon,
  Upload,
  X,
  Plus,
  Trash2,
  Camera,
  Sparkles,
  Settings,
  Shield,
  Star,
  CheckCircle,
  Palette
} from 'lucide-react'

interface GaleriaItem {
  id: number
  titulo: string
  servicio: string
  vehiculo: string
  imagenAntes: string
  imagenDespues: string
  descripcion?: string
}

interface PortfolioItem {
  id: number
  titulo: string
  servicio: string
  vehiculo?: string
  categoria: string
  imagenes: string[]
  descripcion?: string
}

export default function ConfiguracionPublicaPage() {
  const { data: session, status } = useSession() || {}
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  const [config, setConfig] = useState<Record<string, string>>({
    // Empresa
    'publica.nombre': '',
    'publica.subtitulo': '',
    'publica.telefono': '',
    'publica.email': '',
    'publica.color_fondo': '#f0f7ff',
    // Imágenes
    'publica.logo': '',
    'publica.imagen_banner': '',
    'publica.imagen_pequeno': '',
    'publica.imagen_medio': '',
    'publica.imagen_grande': '',
    'publica.imagen_super_grande': '',
    // Bloques informativos
    'publica.bloque1_titulo': 'Equipos Profesionales',
    'publica.bloque1_texto': 'Utilizamos los mejores productos y herramientas del mercado para garantizar resultados excepcionales.',
    'publica.bloque1_icono': 'settings',
    'publica.bloque2_titulo': 'Garantía de Calidad',
    'publica.bloque2_texto': 'Todos nuestros servicios incluyen garantía y la tranquilidad de un trabajo bien hecho.',
    'publica.bloque2_icono': 'shield',
    'publica.bloque3_titulo': 'Atención Personalizada',
    'publica.bloque3_texto': 'Cada vehículo recibe un tratamiento único según su estado y necesidades específicas.',
    'publica.bloque3_icono': 'star',
    // Textos
    'publica.titulo_servicios': '',
    'publica.descripcion_servicios': '',
    'publica.cta_texto': '',
    'publica.cta_subtexto': '',
    // Horarios
    'publica.sabado_apertura': '',
    'publica.sabado_cierre': '',
    'publica.domingo_apertura': '',
    'publica.domingo_cierre': '',
    'publica.domingo_cerrado': 'true',
  })

  const [galeria, setGaleria] = useState<GaleriaItem[]>([])
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  
  // Formularios para nueva galería/portfolio
  const [newGaleria, setNewGaleria] = useState({
    titulo: '',
    servicio: '',
    vehiculo: '',
    imagenAntes: '',
    imagenDespues: '',
    descripcion: ''
  })
  
  const [newPortfolio, setNewPortfolio] = useState({
    titulo: '',
    servicio: '',
    vehiculo: '',
    categoria: 'MEDIO',
    imagenes: [] as string[],
    descripcion: ''
  })

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    await Promise.all([
      loadConfig(),
      loadGaleria(),
      loadPortfolio()
    ])
    setLoading(false)
  }

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/configuracion/publica')
      if (response.ok) {
        const data = await response.json()
        setConfig(prev => ({ ...prev, ...data }))
      }
    } catch (error) {
      console.error('Error loading config:', error)
    }
  }

  const loadGaleria = async () => {
    try {
      const response = await fetch('/api/galeria-antes-despues')
      if (response.ok) {
        const data = await response.json()
        setGaleria(data)
      }
    } catch (error) {
      console.error('Error loading galeria:', error)
    }
  }

  const loadPortfolio = async () => {
    try {
      const response = await fetch('/api/portfolio')
      if (response.ok) {
        const data = await response.json()
        setPortfolio(data)
      }
    } catch (error) {
      console.error('Error loading portfolio:', error)
    }
  }

  const handleSaveConfig = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/configuracion/publica', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      if (response.ok) {
        toast.success('Configuración guardada correctamente')
      } else {
        throw new Error('Error al guardar')
      }
    } catch (error) {
      console.error('Error saving config:', error)
      toast.error('Error al guardar configuración')
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (file: File, configKey?: string): Promise<string> => {
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'public')

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Error al subir imagen')
      }

      const data = await response.json()
      
      if (configKey) {
        setConfig(prev => ({ ...prev, [configKey]: data.url }))
      }
      
      toast.success('Imagen subida correctamente')
      return data.url
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Error al subir imagen')
      throw error
    } finally {
      setUploadingImage(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, configKey: string) => {
    const file = e.target.files?.[0]
    if (file) {
      await handleImageUpload(file, configKey)
    }
  }

  const handleAddGaleria = async () => {
    if (!newGaleria.titulo || !newGaleria.imagenAntes || !newGaleria.imagenDespues) {
      toast.error('Por favor completa los campos requeridos')
      return
    }

    try {
      const response = await fetch('/api/galeria-antes-despues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGaleria)
      })

      if (response.ok) {
        toast.success('Entrada de galería añadida')
        setNewGaleria({
          titulo: '',
          servicio: '',
          vehiculo: '',
          imagenAntes: '',
          imagenDespues: '',
          descripcion: ''
        })
        await loadGaleria()
      } else {
        throw new Error('Error al añadir')
      }
    } catch (error) {
      console.error('Error adding galeria:', error)
      toast.error('Error al añadir entrada de galería')
    }
  }

  const handleDeleteGaleria = async (id: number) => {
    if (!confirm('¿Eliminar esta entrada de galería?')) return

    try {
      const response = await fetch(`/api/galeria-antes-despues?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Entrada eliminada')
        await loadGaleria()
      } else {
        throw new Error('Error al eliminar')
      }
    } catch (error) {
      console.error('Error deleting galeria:', error)
      toast.error('Error al eliminar entrada')
    }
  }

  const handleAddPortfolio = async () => {
    if (!newPortfolio.titulo || newPortfolio.imagenes.length === 0) {
      toast.error('Por favor completa los campos requeridos y sube al menos una imagen')
      return
    }

    try {
      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPortfolio)
      })

      if (response.ok) {
        toast.success('Trabajo añadido al portfolio')
        setNewPortfolio({
          titulo: '',
          servicio: '',
          vehiculo: '',
          categoria: 'MEDIO',
          imagenes: [],
          descripcion: ''
        })
        await loadPortfolio()
      } else {
        throw new Error('Error al añadir')
      }
    } catch (error) {
      console.error('Error adding portfolio:', error)
      toast.error('Error al añadir trabajo al portfolio')
    }
  }

  const handleDeletePortfolio = async (id: number) => {
    if (!confirm('¿Eliminar este trabajo del portfolio?')) return

    try {
      const response = await fetch(`/api/portfolio?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Trabajo eliminado')
        await loadPortfolio()
      } else {
        throw new Error('Error al eliminar')
      }
    } catch (error) {
      console.error('Error deleting portfolio:', error)
      toast.error('Error al eliminar trabajo')
    }
  }

  const handleAddPortfolioImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const url = await handleImageUpload(file)
        setNewPortfolio(prev => ({
          ...prev,
          imagenes: [...prev.imagenes, url]
        }))
      } catch (error) {
        // Error ya manejado en handleImageUpload
      }
    }
  }

  const handleRemovePortfolioImage = (index: number) => {
    setNewPortfolio(prev => ({
      ...prev,
      imagenes: prev.imagenes.filter((_, i) => i !== index)
    }))
  }

  const getIconComponent = (iconName: string) => {
    switch(iconName) {
      case 'settings': return Settings
      case 'shield': return Shield
      case 'star': return Star
      case 'sparkles': return Sparkles
      case 'camera': return Camera
      default: return Settings
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Configuración Página Pública
          </h1>
          <p className="text-gray-600 mt-2">
            Personaliza completamente la página de reservas visible para tus clientes
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <a href="/reservas" target="_blank" rel="noopener noreferrer">
              <Eye className="mr-2 h-4 w-4" />
              Vista Previa
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button onClick={handleSaveConfig} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="empresa" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="empresa">
            <Building2 className="mr-2 h-4 w-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="imagenes">
            <ImageIcon className="mr-2 h-4 w-4" />
            Imágenes
          </TabsTrigger>
          <TabsTrigger value="bloques">
            <Sparkles className="mr-2 h-4 w-4" />
            Bloques Info
          </TabsTrigger>
          <TabsTrigger value="textos">
            <FileText className="mr-2 h-4 w-4" />
            Textos
          </TabsTrigger>
          <TabsTrigger value="galeria">
            <Camera className="mr-2 h-4 w-4" />
            Galería
          </TabsTrigger>
          <TabsTrigger value="horarios">
            <Clock className="mr-2 h-4 w-4" />
            Horarios
          </TabsTrigger>
        </TabsList>

        {/* TAB: Empresa */}
        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle>Información de la Empresa</CardTitle>
              <CardDescription>
                Datos básicos que aparecen en el encabezado de la página pública
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nombre">
                  <Building2 className="inline mr-2 h-4 w-4" />
                  Nombre del Negocio *
                </Label>
                <Input
                  id="nombre"
                  value={config['publica.nombre']}
                  onChange={(e) => setConfig(prev => ({ ...prev, 'publica.nombre': e.target.value }))}
                  placeholder="Ej: ServyAuto"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitulo">Subtítulo / Eslogan</Label>
                <Input
                  id="subtitulo"
                  value={config['publica.subtitulo']}
                  onChange={(e) => setConfig(prev => ({ ...prev, 'publica.subtitulo': e.target.value }))}
                  placeholder="Ej: Lavado & Detailing"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono">
                  <Phone className="inline mr-2 h-4 w-4" />
                  Teléfono de Contacto *
                </Label>
                <Input
                  id="telefono"
                  value={config['publica.telefono']}
                  onChange={(e) => setConfig(prev => ({ ...prev, 'publica.telefono': e.target.value }))}
                  placeholder="Ej: +34 678 56 90 98"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="inline mr-2 h-4 w-4" />
                  Email de Contacto
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={config['publica.email']}
                  onChange={(e) => setConfig(prev => ({ ...prev, 'publica.email': e.target.value }))}
                  placeholder="Ej: info@servyauto.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color_fondo">
                  <Palette className="inline mr-2 h-4 w-4" />
                  Color de Fondo de la Página
                </Label>
                <div className="flex items-center space-x-3">
                  <Input
                    id="color_fondo"
                    type="color"
                    value={config['publica.color_fondo'] || '#f0f7ff'}
                    onChange={(e) => setConfig(prev => ({ ...prev, 'publica.color_fondo': e.target.value }))}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={config['publica.color_fondo'] || '#f0f7ff'}
                    onChange={(e) => setConfig(prev => ({ ...prev, 'publica.color_fondo': e.target.value }))}
                    placeholder="#f0f7ff"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Elige el color de fondo que mejor represente tu marca. Por defecto: azul claro (#f0f7ff)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Imágenes */}
        <TabsContent value="imagenes">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Logo del Negocio</CardTitle>
                <CardDescription>
                  Logo que aparece en el encabezado (recomendado: 200x200px, PNG con fondo transparente)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  {config['publica.logo'] && (
                    <div className="relative w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={config['publica.logo']}
                        alt="Logo"
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <Label htmlFor="logo-upload" className="cursor-pointer">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-500 transition-colors">
                        <div className="flex flex-col items-center">
                          <Upload className="h-8 w-8 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-600">
                            {config['publica.logo'] ? 'Cambiar logo' : 'Subir logo'}
                          </span>
                        </div>
                      </div>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, 'publica.logo')}
                        disabled={uploadingImage}
                      />
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Imágenes de Categorías de Vehículos</CardTitle>
                <CardDescription>
                  Imágenes que se muestran para cada tamaño de vehículo (recomendado: 800x600px)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { key: 'publica.imagen_pequeno', label: 'Vehículo Pequeño', desc: 'Fiat 500, C1, Up!' },
                  { key: 'publica.imagen_medio', label: 'Vehículo Medio', desc: 'Golf, Corolla, León' },
                  { key: 'publica.imagen_grande', label: 'Vehículo Grande', desc: 'Serie 5, Classe E' },
                  { key: 'publica.imagen_super_grande', label: 'SUV/Furgoneta', desc: 'X5, Sprinter, Transit' }
                ].map(({ key, label, desc }) => (
                  <div key={key} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">{label}</h4>
                    <p className="text-sm text-gray-500 mb-3">{desc}</p>
                    <div className="flex items-center space-x-4">
                      {config[key] && (
                        <div className="relative w-32 h-24 bg-gray-100 rounded-lg overflow-hidden">
                          <Image
                            src={config[key]}
                            alt={label}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <Label htmlFor={`${key}-upload`} className="cursor-pointer">
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-blue-500 transition-colors">
                            <div className="flex items-center justify-center">
                              <Upload className="h-5 w-5 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-600">
                                {config[key] ? 'Cambiar imagen' : 'Subir imagen'}
                              </span>
                            </div>
                          </div>
                          <input
                            id={`${key}-upload`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(e, key)}
                            disabled={uploadingImage}
                          />
                        </Label>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: Bloques Informativos */}
        <TabsContent value="bloques">
          <Card>
            <CardHeader>
              <CardTitle>Bloques Informativos</CardTitle>
              <CardDescription>
                Los 3 bloques que aparecen debajo de los servicios destacando tus ventajas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {[1, 2, 3].map((num) => {
                const IconComponent = getIconComponent(config[`publica.bloque${num}_icono`])
                return (
                  <div key={num} className="border rounded-lg p-6">
                    <h4 className="font-semibold text-lg mb-4">Bloque {num}</h4>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Icono</Label>
                        <select
                          value={config[`publica.bloque${num}_icono`]}
                          onChange={(e) => setConfig(prev => ({ ...prev, [`publica.bloque${num}_icono`]: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="settings">Equipos (Configuración)</option>
                          <option value="shield">Garantía (Escudo)</option>
                          <option value="star">Atención (Estrella)</option>
                          <option value="sparkles">Premium (Brillos)</option>
                          <option value="camera">Galería (Cámara)</option>
                        </select>
                        <div className="flex items-center space-x-2 mt-2 p-3 bg-gray-50 rounded-lg">
                          <div className="bg-blue-100 p-2 rounded-full">
                            <IconComponent className="h-6 w-6 text-blue-600" />
                          </div>
                          <span className="text-sm text-gray-600">Vista previa del icono</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Título</Label>
                        <Input
                          value={config[`publica.bloque${num}_titulo`]}
                          onChange={(e) => setConfig(prev => ({ ...prev, [`publica.bloque${num}_titulo`]: e.target.value }))}
                          placeholder="Ej: Equipos Profesionales"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Texto Descriptivo</Label>
                        <Textarea
                          value={config[`publica.bloque${num}_texto`]}
                          onChange={(e) => setConfig(prev => ({ ...prev, [`publica.bloque${num}_texto`]: e.target.value }))}
                          placeholder="Descripción del bloque..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Textos */}
        <TabsContent value="textos">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sección de Servicios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Título Servicios</Label>
                  <Input
                    value={config['publica.titulo_servicios']}
                    onChange={(e) => setConfig(prev => ({ ...prev, 'publica.titulo_servicios': e.target.value }))}
                    placeholder="Ej: Nuestros Servicios"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descripción Servicios</Label>
                  <Textarea
                    value={config['publica.descripcion_servicios']}
                    onChange={(e) => setConfig(prev => ({ ...prev, 'publica.descripcion_servicios': e.target.value }))}
                    placeholder="Texto que aparece sobre los servicios..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Call to Action (CTA)</CardTitle>
                <CardDescription>
                  Sección motivacional que aparece antes del formulario de reserva
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Texto CTA</Label>
                  <Input
                    value={config['publica.cta_texto']}
                    onChange={(e) => setConfig(prev => ({ ...prev, 'publica.cta_texto': e.target.value }))}
                    placeholder="Ej: ¿Listo para transformar tu vehículo?"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Subtexto CTA</Label>
                  <Textarea
                    value={config['publica.cta_subtexto']}
                    onChange={(e) => setConfig(prev => ({ ...prev, 'publica.cta_subtexto': e.target.value }))}
                    placeholder="Ej: Únete a más de 1.000 clientes satisfechos..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: Galería y Portfolio */}
        <TabsContent value="galeria">
          <div className="space-y-6">
            {/* Galería Antes/Después */}
            <Card>
              <CardHeader>
                <CardTitle>Galería Antes y Después</CardTitle>
                <CardDescription>
                  Muestra transformaciones de vehículos para demostrar la calidad de tu trabajo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Formulario nueva entrada */}
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h4 className="font-semibold mb-4 flex items-center">
                    <Plus className="mr-2 h-5 w-5" />
                    Añadir Nueva Entrada
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Título *</Label>
                      <Input
                        value={newGaleria.titulo}
                        onChange={(e) => setNewGaleria(prev => ({ ...prev, titulo: e.target.value }))}
                        placeholder="Ej: Detailing Completo BMW"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Servicio</Label>
                      <Input
                        value={newGaleria.servicio}
                        onChange={(e) => setNewGaleria(prev => ({ ...prev, servicio: e.target.value }))}
                        placeholder="Ej: Detailing Premium"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Vehículo</Label>
                      <Input
                        value={newGaleria.vehiculo}
                        onChange={(e) => setNewGaleria(prev => ({ ...prev, vehiculo: e.target.value }))}
                        placeholder="Ej: BMW Serie 3"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Input
                        value={newGaleria.descripcion || ''}
                        onChange={(e) => setNewGaleria(prev => ({ ...prev, descripcion: e.target.value }))}
                        placeholder="Descripción breve"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Imagen "Antes" *</Label>
                      <Label htmlFor="galeria-antes-upload" className="cursor-pointer">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-blue-500 transition-colors">
                          {newGaleria.imagenAntes ? (
                            <div className="flex items-center">
                              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                              <span className="text-sm text-green-600">Imagen cargada</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <Upload className="h-5 w-5 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-600">Subir imagen antes</span>
                            </div>
                          )}
                        </div>
                        <input
                          id="galeria-antes-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const url = await handleImageUpload(file)
                              setNewGaleria(prev => ({ ...prev, imagenAntes: url }))
                            }
                          }}
                          disabled={uploadingImage}
                        />
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label>Imagen "Después" *</Label>
                      <Label htmlFor="galeria-despues-upload" className="cursor-pointer">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-blue-500 transition-colors">
                          {newGaleria.imagenDespues ? (
                            <div className="flex items-center">
                              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                              <span className="text-sm text-green-600">Imagen cargada</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <Upload className="h-5 w-5 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-600">Subir imagen después</span>
                            </div>
                          )}
                        </div>
                        <input
                          id="galeria-despues-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const url = await handleImageUpload(file)
                              setNewGaleria(prev => ({ ...prev, imagenDespues: url }))
                            }
                          }}
                          disabled={uploadingImage}
                        />
                      </Label>
                    </div>
                  </div>

                  <Button onClick={handleAddGaleria} className="mt-4" disabled={uploadingImage}>
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir a Galería
                  </Button>
                </div>

                {/* Lista de entradas */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Entradas Actuales ({galeria.length})</h4>
                  {galeria.length === 0 ? (
                    <p className="text-gray-500 text-sm">No hay entradas en la galería todavía.</p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {galeria.map((item) => (
                        <Card key={item.id}>
                          <CardContent className="p-4">
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div className="relative aspect-square bg-gray-100 rounded">
                                {item.imagenAntes ? (
                                  <>
                                    <Image
                                      src={item.imagenAntes}
                                      alt="Antes"
                                      fill
                                      className="object-cover rounded"
                                    />
                                    <div className="absolute bottom-1 left-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                                      Antes
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <ImageIcon className="h-8 w-8" />
                                  </div>
                                )}
                              </div>
                              <div className="relative aspect-square bg-gray-100 rounded">
                                {item.imagenDespues ? (
                                  <>
                                    <Image
                                      src={item.imagenDespues}
                                      alt="Después"
                                      fill
                                      className="object-cover rounded"
                                    />
                                    <div className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded">
                                      Después
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <ImageIcon className="h-8 w-8" />
                                  </div>
                                )}
                              </div>
                            </div>
                            <h5 className="font-semibold text-sm">{item.titulo}</h5>
                            <p className="text-xs text-gray-600">{item.servicio} • {item.vehiculo}</p>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteGaleria(item.id)}
                              className="mt-2 w-full"
                            >
                              <Trash2 className="mr-2 h-3 w-3" />
                              Eliminar
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Portfolio */}
            <Card>
              <CardHeader>
                <CardTitle>Portfolio de Trabajos</CardTitle>
                <CardDescription>
                  Muestra una galería general de tus mejores trabajos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Formulario nuevo trabajo */}
                <div className="border rounded-lg p-4 bg-green-50">
                  <h4 className="font-semibold mb-4 flex items-center">
                    <Plus className="mr-2 h-5 w-5" />
                    Añadir Nuevo Trabajo
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Título *</Label>
                      <Input
                        value={newPortfolio.titulo}
                        onChange={(e) => setNewPortfolio(prev => ({ ...prev, titulo: e.target.value }))}
                        placeholder="Ej: Pulido y Encerado Mercedes"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Servicio</Label>
                      <Input
                        value={newPortfolio.servicio}
                        onChange={(e) => setNewPortfolio(prev => ({ ...prev, servicio: e.target.value }))}
                        placeholder="Ej: Pulido Premium"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Vehículo</Label>
                      <Input
                        value={newPortfolio.vehiculo || ''}
                        onChange={(e) => setNewPortfolio(prev => ({ ...prev, vehiculo: e.target.value }))}
                        placeholder="Ej: Mercedes Clase E"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Categoría</Label>
                      <select
                        value={newPortfolio.categoria}
                        onChange={(e) => setNewPortfolio(prev => ({ ...prev, categoria: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="PEQUENO">Pequeño</option>
                        <option value="MEDIO">Medio</option>
                        <option value="GRANDE">Grande</option>
                        <option value="SUPER_GRANDE">SUV/Furgoneta</option>
                      </select>
                    </div>

                    <div className="col-span-2 space-y-2">
                      <Label>Descripción</Label>
                      <Textarea
                        value={newPortfolio.descripcion || ''}
                        onChange={(e) => setNewPortfolio(prev => ({ ...prev, descripcion: e.target.value }))}
                        placeholder="Descripción del trabajo..."
                        rows={2}
                      />
                    </div>

                    <div className="col-span-2 space-y-2">
                      <Label>Imágenes * (puedes subir varias)</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {newPortfolio.imagenes.map((img, idx) => (
                          img && (
                            <div key={idx} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
                              <Image
                                src={img}
                                alt={`Imagen ${idx + 1}`}
                                fill
                                className="object-cover"
                              />
                              <button
                                onClick={() => handleRemovePortfolioImage(idx)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )
                        ))}
                        <Label htmlFor="portfolio-image-upload" className="cursor-pointer">
                          <div className="aspect-square border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors flex items-center justify-center">
                            <Upload className="h-8 w-8 text-gray-400" />
                          </div>
                          <input
                            id="portfolio-image-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAddPortfolioImage}
                            disabled={uploadingImage}
                          />
                        </Label>
                      </div>
                      <p className="text-xs text-gray-500">
                        Haz clic en el icono + para añadir imágenes. Haz hover sobre una imagen para eliminarla.
                      </p>
                    </div>
                  </div>

                  <Button onClick={handleAddPortfolio} className="mt-4" disabled={uploadingImage}>
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir a Portfolio
                  </Button>
                </div>

                {/* Lista de trabajos */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Trabajos Actuales ({portfolio.length})</h4>
                  {portfolio.length === 0 ? (
                    <p className="text-gray-500 text-sm">No hay trabajos en el portfolio todavía.</p>
                  ) : (
                    <div className="grid md:grid-cols-3 gap-4">
                      {portfolio.map((item) => (
                        <Card key={item.id}>
                          <CardContent className="p-4">
                            <div className="relative aspect-square bg-gray-100 rounded mb-3">
                              {item.imagenes && item.imagenes.length > 0 && item.imagenes[0] ? (
                                <>
                                  <Image
                                    src={item.imagenes[0]}
                                    alt={item.titulo}
                                    fill
                                    className="object-cover rounded"
                                  />
                                  {item.imagenes.length > 1 && (
                                    <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                      +{item.imagenes.length - 1}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <ImageIcon className="h-12 w-12" />
                                </div>
                              )}
                            </div>
                            <h5 className="font-semibold text-sm">{item.titulo}</h5>
                            <p className="text-xs text-gray-600">{item.servicio}</p>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeletePortfolio(item.id)}
                              className="mt-2 w-full"
                            >
                              <Trash2 className="mr-2 h-3 w-3" />
                              Eliminar
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: Horarios */}
        <TabsContent value="horarios">
          <Card>
            <CardHeader>
              <CardTitle>Horarios de Fin de Semana</CardTitle>
              <CardDescription>
                Los horarios de lunes a viernes se configuran en la sección principal de Configuración
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Sábados</h3>
                  <div className="space-y-2">
                    <Label>Hora de Apertura</Label>
                    <Input
                      type="time"
                      value={config['publica.sabado_apertura']}
                      onChange={(e) => setConfig(prev => ({ ...prev, 'publica.sabado_apertura': e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora de Cierre</Label>
                    <Input
                      type="time"
                      value={config['publica.sabado_cierre']}
                      onChange={(e) => setConfig(prev => ({ ...prev, 'publica.sabado_cierre': e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Domingos</h3>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <select
                      value={config['publica.domingo_cerrado']}
                      onChange={(e) => setConfig(prev => ({ ...prev, 'publica.domingo_cerrado': e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="true">Cerrado</option>
                      <option value="false">Abierto</option>
                    </select>
                  </div>
                  {config['publica.domingo_cerrado'] === 'false' && (
                    <>
                      <div className="space-y-2">
                        <Label>Hora de Apertura</Label>
                        <Input
                          type="time"
                          value={config['publica.domingo_apertura']}
                          onChange={(e) => setConfig(prev => ({ ...prev, 'publica.domingo_apertura': e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Hora de Cierre</Label>
                        <Input
                          type="time"
                          value={config['publica.domingo_cierre']}
                          onChange={(e) => setConfig(prev => ({ ...prev, 'publica.domingo_cierre': e.target.value }))}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end mt-8">
        <Button onClick={handleSaveConfig} disabled={saving} size="lg">
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar Todos los Cambios'}
        </Button>
      </div>
    </div>
  )
}