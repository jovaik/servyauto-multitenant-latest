
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
import { 
  Building2, 
  Phone, 
  Mail, 
  Globe, 
  Clock, 
  FileText, 
  Eye,
  Save,
  ExternalLink
} from 'lucide-react'

export default function ConfiguracionPublicaPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<Record<string, string>>({
    // Empresa
    'publica.nombre': '',
    'publica.subtitulo': '',
    'publica.telefono': '',
    'publica.email': '',
    'publica.direccion': '',
    // Textos
    'publica.titulo_principal': '',
    'publica.descripcion_principal': '',
    'publica.titulo_servicios': '',
    'publica.descripcion_servicios': '',
    'publica.titulo_galeria': '',
    'publica.descripcion_galeria': '',
    'publica.titulo_portfolio': '',
    'publica.descripcion_portfolio': '',
    'publica.cta_texto': '',
    'publica.cta_subtexto': '',
    // Horarios fin de semana
    'publica.sabado_apertura': '',
    'publica.sabado_cierre': '',
    'publica.domingo_apertura': '',
    'publica.domingo_cierre': '',
    'publica.domingo_cerrado': 'true',
    // Contacto y redes
    'publica.whatsapp': '',
    'publica.instagram': '',
    'publica.facebook': '',
  })

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/configuracion/publica')
      if (response.ok) {
        const data = await response.json()
        
        // Cargar también datos de empresa existentes como fallback
        const empresaResponse = await fetch('/api/configuracion')
        if (empresaResponse.ok) {
          const empresaData = await empresaResponse.json()
          const empresaMap: Record<string, string> = {}
          empresaData.forEach((c: any) => {
            empresaMap[c.clave] = c.valor
          })
          
          // Usar datos existentes como fallback
          const merged = {
            ...config,
            'publica.nombre': data['publica.nombre'] || empresaMap['empresa.nombre'] || '',
            'publica.telefono': data['publica.telefono'] || empresaMap['empresa.telefono'] || '',
            'publica.email': data['publica.email'] || empresaMap['empresa.email'] || '',
            'publica.direccion': data['publica.direccion'] || empresaMap['empresa.direccion'] || '',
            'publica.sabado_apertura': data['publica.sabado_apertura'] || empresaMap['horarios.sabadoApertura'] || '10:00',
            'publica.sabado_cierre': data['publica.sabado_cierre'] || empresaMap['horarios.sabadoCierre'] || '19:00',
            'publica.domingo_apertura': data['publica.domingo_apertura'] || empresaMap['horarios.domingoApertura'] || '10:00',
            'publica.domingo_cierre': data['publica.domingo_cierre'] || empresaMap['horarios.domingoCierre'] || '14:00',
            ...data
          }
          
          setConfig(merged)
        } else {
          setConfig(prev => ({ ...prev, ...data }))
        }
      }
    } catch (error) {
      console.error('Error loading config:', error)
      toast.error('Error al cargar configuración')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
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

  const handleChange = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }))
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
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Configuración Página Pública
          </h1>
          <p className="text-gray-600 mt-2">
            Personaliza la página de reservas visible para tus clientes
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
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="empresa" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="empresa">
            <Building2 className="mr-2 h-4 w-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="textos">
            <FileText className="mr-2 h-4 w-4" />
            Textos
          </TabsTrigger>
          <TabsTrigger value="horarios">
            <Clock className="mr-2 h-4 w-4" />
            Horarios
          </TabsTrigger>
          <TabsTrigger value="contacto">
            <Phone className="mr-2 h-4 w-4" />
            Contacto
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
              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nombre">
                    <Building2 className="inline mr-2 h-4 w-4" />
                    Nombre del Negocio *
                  </Label>
                  <Input
                    id="nombre"
                    value={config['publica.nombre']}
                    onChange={(e) => handleChange('publica.nombre', e.target.value)}
                    placeholder="Ej: ServyAuto"
                  />
                  <p className="text-xs text-gray-500">
                    Se muestra en grande en el encabezado
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subtitulo">Subtítulo / Eslogan</Label>
                  <Input
                    id="subtitulo"
                    value={config['publica.subtitulo']}
                    onChange={(e) => handleChange('publica.subtitulo', e.target.value)}
                    placeholder="Ej: Lavado & Detailing"
                  />
                  <p className="text-xs text-gray-500">
                    Texto pequeño debajo del nombre
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono">
                    <Phone className="inline mr-2 h-4 w-4" />
                    Teléfono de Contacto *
                  </Label>
                  <Input
                    id="telefono"
                    value={config['publica.telefono']}
                    onChange={(e) => handleChange('publica.telefono', e.target.value)}
                    placeholder="Ej: +34 678 56 90 98"
                  />
                  <p className="text-xs text-gray-500">
                    Se muestra en el encabezado (visible en móvil)
                  </p>
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
                    onChange={(e) => handleChange('publica.email', e.target.value)}
                    placeholder="Ej: info@servyauto.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Textarea
                    id="direccion"
                    value={config['publica.direccion']}
                    onChange={(e) => handleChange('publica.direccion', e.target.value)}
                    placeholder="Dirección completa del negocio"
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Textos */}
        <TabsContent value="textos">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sección Principal</CardTitle>
                <CardDescription>
                  Textos del hero de la página (primera impresión)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="titulo_principal">Título Principal</Label>
                  <Input
                    id="titulo_principal"
                    value={config['publica.titulo_principal']}
                    onChange={(e) => handleChange('publica.titulo_principal', e.target.value)}
                    placeholder="Ej: Reserva tu Servicio - El Mejor Lavado para tu Vehículo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion_principal">Descripción Principal</Label>
                  <Textarea
                    id="descripcion_principal"
                    value={config['publica.descripcion_principal']}
                    onChange={(e) => handleChange('publica.descripcion_principal', e.target.value)}
                    placeholder="Descripción breve del negocio..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sección de Servicios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="titulo_servicios">Título Servicios</Label>
                  <Input
                    id="titulo_servicios"
                    value={config['publica.titulo_servicios']}
                    onChange={(e) => handleChange('publica.titulo_servicios', e.target.value)}
                    placeholder="Ej: Nuestros Servicios"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion_servicios">Descripción Servicios</Label>
                  <Textarea
                    id="descripcion_servicios"
                    value={config['publica.descripcion_servicios']}
                    onChange={(e) => handleChange('publica.descripcion_servicios', e.target.value)}
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
                  Sección motivacional antes del formulario
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="cta_texto">Texto CTA</Label>
                  <Input
                    id="cta_texto"
                    value={config['publica.cta_texto']}
                    onChange={(e) => handleChange('publica.cta_texto', e.target.value)}
                    placeholder="Ej: ¿Listo para transformar tu vehículo?"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cta_subtexto">Subtexto CTA</Label>
                  <Textarea
                    id="cta_subtexto"
                    value={config['publica.cta_subtexto']}
                    onChange={(e) => handleChange('publica.cta_subtexto', e.target.value)}
                    placeholder="Ej: Únete a más de 1.000 clientes satisfechos..."
                    rows={2}
                  />
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
                    <Label htmlFor="sabado_apertura">Hora de Apertura</Label>
                    <Input
                      id="sabado_apertura"
                      type="time"
                      value={config['publica.sabado_apertura']}
                      onChange={(e) => handleChange('publica.sabado_apertura', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sabado_cierre">Hora de Cierre</Label>
                    <Input
                      id="sabado_cierre"
                      type="time"
                      value={config['publica.sabado_cierre']}
                      onChange={(e) => handleChange('publica.sabado_cierre', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Domingos</h3>
                  <div className="space-y-2">
                    <Label htmlFor="domingo_cerrado">Estado</Label>
                    <select
                      id="domingo_cerrado"
                      value={config['publica.domingo_cerrado']}
                      onChange={(e) => handleChange('publica.domingo_cerrado', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="true">Cerrado</option>
                      <option value="false">Abierto</option>
                    </select>
                  </div>
                  {config['publica.domingo_cerrado'] === 'false' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="domingo_apertura">Hora de Apertura</Label>
                        <Input
                          id="domingo_apertura"
                          type="time"
                          value={config['publica.domingo_apertura']}
                          onChange={(e) => handleChange('publica.domingo_apertura', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="domingo_cierre">Hora de Cierre</Label>
                        <Input
                          id="domingo_cierre"
                          type="time"
                          value={config['publica.domingo_cierre']}
                          onChange={(e) => handleChange('publica.domingo_cierre', e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> Los horarios de lunes a viernes y los días laborables 
                  se configuran desde la sección "Configuración" del dashboard principal.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Contacto */}
        <TabsContent value="contacto">
          <Card>
            <CardHeader>
              <CardTitle>Información de Contacto y Redes Sociales</CardTitle>
              <CardDescription>
                Enlaces a WhatsApp y redes sociales (opcional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="whatsapp">
                  <Phone className="inline mr-2 h-4 w-4" />
                  WhatsApp (número con código de país)
                </Label>
                <Input
                  id="whatsapp"
                  value={config['publica.whatsapp']}
                  onChange={(e) => handleChange('publica.whatsapp', e.target.value)}
                  placeholder="Ej: 34678569098 (sin + ni espacios)"
                />
                <p className="text-xs text-gray-500">
                  Se creará un enlace directo a WhatsApp. Formato: código país + número (sin +)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">
                  <Globe className="inline mr-2 h-4 w-4" />
                  Instagram (username)
                </Label>
                <Input
                  id="instagram"
                  value={config['publica.instagram']}
                  onChange={(e) => handleChange('publica.instagram', e.target.value)}
                  placeholder="Ej: servyauto_oficial"
                />
                <p className="text-xs text-gray-500">
                  Solo el nombre de usuario, sin @ ni URL completa
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebook">
                  <Globe className="inline mr-2 h-4 w-4" />
                  Facebook (página)
                </Label>
                <Input
                  id="facebook"
                  value={config['publica.facebook']}
                  onChange={(e) => handleChange('publica.facebook', e.target.value)}
                  placeholder="Ej: servyauto o URL completa"
                />
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
                <h4 className="font-semibold mb-2">Vista Previa de Enlaces:</h4>
                <div className="space-y-2 text-sm">
                  {config['publica.whatsapp'] && (
                    <div>
                      <strong>WhatsApp:</strong>{' '}
                      <a 
                        href={`https://wa.me/${config['publica.whatsapp']}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        https://wa.me/{config['publica.whatsapp']}
                      </a>
                    </div>
                  )}
                  {config['publica.instagram'] && (
                    <div>
                      <strong>Instagram:</strong>{' '}
                      <a 
                        href={`https://instagram.com/${config['publica.instagram']}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        @{config['publica.instagram']}
                      </a>
                    </div>
                  )}
                  {config['publica.facebook'] && (
                    <div>
                      <strong>Facebook:</strong>{' '}
                      <a 
                        href={
                          config['publica.facebook'].startsWith('http') 
                            ? config['publica.facebook']
                            : `https://facebook.com/${config['publica.facebook']}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        facebook.com/{config['publica.facebook'].replace('https://facebook.com/', '')}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end mt-8">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar Todos los Cambios'}
        </Button>
      </div>
    </div>
  )
}
