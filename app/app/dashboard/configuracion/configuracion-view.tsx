
'use client'

import React, { useState, useEffect } from 'react'
import { 
  Settings, 
  Cog, 
  Building, 
  Clock, 
  Euro, 
  Palette,
  Users,
  Save,
  RotateCcw,
  Car,
  FileText,
  Database
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface ConfigValue {
  clave: string
  valor: string
  tipo: string
  categoria: string
  descripcion: string
}

interface ConfiguracionState {
  empresa: {
    nombre: string
    cif: string
    direccion: string
    telefono: string
    email: string
    web: string
  }
  horarios: {
    apertura: string
    cierre: string
    descansoInicio: string
    descansoFin: string
    diasTrabajo: string[]
  }
  precios: {
    ivaGeneral: string
    descuentoMaximo: string
    tarifaHora: string
  }
  boxes: {
    cantidad: string
    nombres: string[]
  }
  sistema: {
    backupAutomatico: boolean
    notificaciones: boolean
    modoMantenimiento: boolean
  }
}

export function ConfiguracionView() {
  const [config, setConfig] = useState<ConfiguracionState>({
    empresa: {
      nombre: '',
      cif: '',
      direccion: '',
      telefono: '',
      email: '',
      web: ''
    },
    horarios: {
      apertura: '08:00',
      cierre: '19:00',
      descansoInicio: '13:00',
      descansoFin: '14:00',
      diasTrabajo: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
    },
    precios: {
      ivaGeneral: '21',
      descuentoMaximo: '20',
      tarifaHora: '45'
    },
    boxes: {
      cantidad: '3',
      nombres: ['Box 1', 'Box 2', 'Box 3']
    },
    sistema: {
      backupAutomatico: true,
      notificaciones: true,
      modoMantenimiento: false
    }
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadConfiguration()
  }, [])

  const loadConfiguration = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/configuracion')
      
      if (response.ok) {
        const data = await response.json()
        
        // Procesar datos de configuración
        const newConfig = { ...config }
        data.forEach((item: ConfigValue) => {
          const [categoria, subcampo] = item.clave.split('.')
          
          if (newConfig[categoria as keyof ConfiguracionState]) {
            if (categoria === 'sistema') {
              (newConfig.sistema as any)[subcampo] = item.valor === 'true'
            } else if (categoria === 'boxes' && subcampo === 'nombres') {
              newConfig.boxes.nombres = JSON.parse(item.valor || '["Box 1", "Box 2", "Box 3"]')
            } else if (categoria === 'horarios' && subcampo === 'diasTrabajo') {
              newConfig.horarios.diasTrabajo = JSON.parse(item.valor || '[]')
            } else {
              (newConfig[categoria as keyof ConfiguracionState] as any)[subcampo] = item.valor
            }
          }
        })
        
        setConfig(newConfig)
      }
    } catch (error) {
      console.error('Error loading configuration:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveConfiguration = async () => {
    try {
      setSaving(true)
      
      // Convertir configuración a formato API
      const configData = [
        // Empresa
        { clave: 'empresa.nombre', valor: config.empresa.nombre, tipo: 'TEXTO', categoria: 'empresa', descripcion: 'Nombre de la empresa' },
        { clave: 'empresa.cif', valor: config.empresa.cif, tipo: 'TEXTO', categoria: 'empresa', descripcion: 'CIF/NIF de la empresa' },
        { clave: 'empresa.direccion', valor: config.empresa.direccion, tipo: 'DIRECCION', categoria: 'empresa', descripcion: 'Dirección de la empresa' },
        { clave: 'empresa.telefono', valor: config.empresa.telefono, tipo: 'TELEFONO', categoria: 'empresa', descripcion: 'Teléfono de la empresa' },
        { clave: 'empresa.email', valor: config.empresa.email, tipo: 'EMAIL', categoria: 'empresa', descripcion: 'Email de la empresa' },
        { clave: 'empresa.web', valor: config.empresa.web, tipo: 'TEXTO', categoria: 'empresa', descripcion: 'Web de la empresa' },
        
        // Horarios
        { clave: 'horarios.apertura', valor: config.horarios.apertura, tipo: 'TEXTO', categoria: 'horarios', descripcion: 'Hora de apertura' },
        { clave: 'horarios.cierre', valor: config.horarios.cierre, tipo: 'TEXTO', categoria: 'horarios', descripcion: 'Hora de cierre' },
        { clave: 'horarios.descansoInicio', valor: config.horarios.descansoInicio, tipo: 'TEXTO', categoria: 'horarios', descripcion: 'Inicio descanso' },
        { clave: 'horarios.descansoFin', valor: config.horarios.descansoFin, tipo: 'TEXTO', categoria: 'horarios', descripcion: 'Fin descanso' },
        { clave: 'horarios.diasTrabajo', valor: JSON.stringify(config.horarios.diasTrabajo), tipo: 'JSON', categoria: 'horarios', descripcion: 'Días de trabajo' },
        
        // Precios
        { clave: 'precios.ivaGeneral', valor: config.precios.ivaGeneral, tipo: 'NUMERO', categoria: 'precios', descripcion: 'IVA general (%)' },
        { clave: 'precios.descuentoMaximo', valor: config.precios.descuentoMaximo, tipo: 'NUMERO', categoria: 'precios', descripcion: 'Descuento máximo (%)' },
        { clave: 'precios.tarifaHora', valor: config.precios.tarifaHora, tipo: 'NUMERO', categoria: 'precios', descripcion: 'Tarifa por hora (€)' },
        
        // Boxes
        { clave: 'boxes.cantidad', valor: config.boxes.cantidad, tipo: 'NUMERO', categoria: 'boxes', descripcion: 'Cantidad de boxes' },
        { clave: 'boxes.nombres', valor: JSON.stringify(config.boxes.nombres), tipo: 'JSON', categoria: 'boxes', descripcion: 'Nombres de los boxes' },
        
        // Sistema
        { clave: 'sistema.backupAutomatico', valor: config.sistema.backupAutomatico.toString(), tipo: 'BOOLEANO', categoria: 'sistema', descripcion: 'Backup automático' },
        { clave: 'sistema.notificaciones', valor: config.sistema.notificaciones.toString(), tipo: 'BOOLEANO', categoria: 'sistema', descripcion: 'Notificaciones activas' },
        { clave: 'sistema.modoMantenimiento', valor: config.sistema.modoMantenimiento.toString(), tipo: 'BOOLEANO', categoria: 'sistema', descripcion: 'Modo mantenimiento' }
      ]

      const response = await fetch('/api/configuracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData)
      })

      if (response.ok) {
        setHasChanges(false)
        // TODO: Show success notification
      }
    } catch (error) {
      console.error('Error saving configuration:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (categoria: keyof ConfiguracionState, campo: string, valor: any) => {
    setConfig(prev => ({
      ...prev,
      [categoria]: {
        ...prev[categoria],
        [campo]: valor
      }
    }))
    setHasChanges(true)
  }

  const addBox = () => {
    const newBoxNumber = config.boxes.nombres.length + 1
    const newBoxName = `Box ${newBoxNumber}`
    
    setConfig(prev => ({
      ...prev,
      boxes: {
        cantidad: (parseInt(prev.boxes.cantidad) + 1).toString(),
        nombres: [...prev.boxes.nombres, newBoxName]
      }
    }))
    setHasChanges(true)
  }

  const removeBox = (index: number) => {
    if (config.boxes.nombres.length > 1) {
      const newNombres = config.boxes.nombres.filter((_, i) => i !== index)
      setConfig(prev => ({
        ...prev,
        boxes: {
          cantidad: (parseInt(prev.boxes.cantidad) - 1).toString(),
          nombres: newNombres
        }
      }))
      setHasChanges(true)
    }
  }

  const updateBoxName = (index: number, newName: string) => {
    const newNombres = [...config.boxes.nombres]
    newNombres[index] = newName
    setConfig(prev => ({
      ...prev,
      boxes: {
        ...prev.boxes,
        nombres: newNombres
      }
    }))
    setHasChanges(true)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
          <p className="text-gray-600">
            Ajustes generales del sistema y personalización
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasChanges && (
            <Badge variant="secondary" className="mr-2">
              Cambios pendientes
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={loadConfiguration}
            disabled={saving}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Recargar
          </Button>
          <Button
            onClick={saveConfiguration}
            disabled={!hasChanges || saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      {/* Configuration Tabs */}
      <Tabs defaultValue="empresa" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-fit">
          <TabsTrigger value="empresa" className="flex items-center">
            <Building className="mr-2 h-4 w-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="horarios" className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            Horarios
          </TabsTrigger>
          <TabsTrigger value="precios" className="flex items-center">
            <Euro className="mr-2 h-4 w-4" />
            Precios
          </TabsTrigger>
          <TabsTrigger value="boxes" className="flex items-center">
            <Car className="mr-2 h-4 w-4" />
            Boxes
          </TabsTrigger>
          <TabsTrigger value="sistema" className="flex items-center">
            <Cog className="mr-2 h-4 w-4" />
            Sistema
          </TabsTrigger>
        </TabsList>

        {/* Empresa Tab */}
        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="mr-2 h-5 w-5" />
                Datos de la Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre">Nombre de la empresa</Label>
                  <Input
                    id="nombre"
                    value={config.empresa.nombre}
                    onChange={(e) => handleInputChange('empresa', 'nombre', e.target.value)}
                    placeholder="ServyAuto Taller"
                  />
                </div>
                <div>
                  <Label htmlFor="cif">CIF/NIF</Label>
                  <Input
                    id="cif"
                    value={config.empresa.cif}
                    onChange={(e) => handleInputChange('empresa', 'cif', e.target.value)}
                    placeholder="B12345678"
                  />
                </div>
                <div>
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={config.empresa.telefono}
                    onChange={(e) => handleInputChange('empresa', 'telefono', e.target.value)}
                    placeholder="+34 123 456 789"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={config.empresa.email}
                    onChange={(e) => handleInputChange('empresa', 'email', e.target.value)}
                    placeholder="info@servyauto.com"
                  />
                </div>
                <div>
                  <Label htmlFor="web">Sitio web</Label>
                  <Input
                    id="web"
                    value={config.empresa.web}
                    onChange={(e) => handleInputChange('empresa', 'web', e.target.value)}
                    placeholder="www.servyauto.com"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="direccion">Dirección completa</Label>
                <Textarea
                  id="direccion"
                  value={config.empresa.direccion}
                  onChange={(e) => handleInputChange('empresa', 'direccion', e.target.value)}
                  placeholder="Calle Principal, 123, 28001 Madrid"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Horarios Tab */}
        <TabsContent value="horarios">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Horarios de Trabajo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="apertura">Apertura</Label>
                  <Input
                    id="apertura"
                    type="time"
                    value={config.horarios.apertura}
                    onChange={(e) => handleInputChange('horarios', 'apertura', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cierre">Cierre</Label>
                  <Input
                    id="cierre"
                    type="time"
                    value={config.horarios.cierre}
                    onChange={(e) => handleInputChange('horarios', 'cierre', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="descansoInicio">Inicio descanso</Label>
                  <Input
                    id="descansoInicio"
                    type="time"
                    value={config.horarios.descansoInicio}
                    onChange={(e) => handleInputChange('horarios', 'descansoInicio', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="descansoFin">Fin descanso</Label>
                  <Input
                    id="descansoFin"
                    type="time"
                    value={config.horarios.descansoFin}
                    onChange={(e) => handleInputChange('horarios', 'descansoFin', e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <Label>Días de trabajo</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(dia => (
                    <Badge
                      key={dia}
                      variant={config.horarios.diasTrabajo.includes(dia) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        const newDias = config.horarios.diasTrabajo.includes(dia)
                          ? config.horarios.diasTrabajo.filter(d => d !== dia)
                          : [...config.horarios.diasTrabajo, dia]
                        handleInputChange('horarios', 'diasTrabajo', newDias)
                      }}
                    >
                      {dia}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Precios Tab */}
        <TabsContent value="precios">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Euro className="mr-2 h-5 w-5" />
                Configuración de Precios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="ivaGeneral">IVA General (%)</Label>
                  <Input
                    id="ivaGeneral"
                    type="number"
                    min="0"
                    max="100"
                    value={config.precios.ivaGeneral}
                    onChange={(e) => handleInputChange('precios', 'ivaGeneral', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="descuentoMaximo">Descuento Máximo (%)</Label>
                  <Input
                    id="descuentoMaximo"
                    type="number"
                    min="0"
                    max="100"
                    value={config.precios.descuentoMaximo}
                    onChange={(e) => handleInputChange('precios', 'descuentoMaximo', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="tarifaHora">Tarifa por Hora (€)</Label>
                  <Input
                    id="tarifaHora"
                    type="number"
                    min="0"
                    step="0.01"
                    value={config.precios.tarifaHora}
                    onChange={(e) => handleInputChange('precios', 'tarifaHora', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Boxes Tab */}
        <TabsContent value="boxes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Car className="mr-2 h-5 w-5" />
                Configuración de Boxes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label>Boxes del Taller ({config.boxes.nombres.length})</Label>
                  <Button
                    onClick={addBox}
                    size="sm"
                    variant="outline"
                  >
                    Agregar Box
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {config.boxes.nombres.map((nombre, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={nombre}
                        onChange={(e) => updateBoxName(index, e.target.value)}
                        placeholder={`Box ${index + 1}`}
                      />
                      <Button
                        onClick={() => removeBox(index)}
                        size="sm"
                        variant="outline"
                        disabled={config.boxes.nombres.length <= 1}
                        className="text-red-600 hover:text-red-700"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sistema Tab */}
        <TabsContent value="sistema">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Cog className="mr-2 h-5 w-5" />
                Configuración del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Backup Automático</Label>
                    <p className="text-sm text-gray-600">Crear respaldos automáticos de la base de datos</p>
                  </div>
                  <Switch
                    checked={config.sistema.backupAutomatico}
                    onCheckedChange={(checked) => handleInputChange('sistema', 'backupAutomatico', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notificaciones</Label>
                    <p className="text-sm text-gray-600">Enviar notificaciones por email</p>
                  </div>
                  <Switch
                    checked={config.sistema.notificaciones}
                    onCheckedChange={(checked) => handleInputChange('sistema', 'notificaciones', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Modo Mantenimiento</Label>
                    <p className="text-sm text-gray-600">Activar cuando se realice mantenimiento del sistema</p>
                  </div>
                  <Switch
                    checked={config.sistema.modoMantenimiento}
                    onCheckedChange={(checked) => handleInputChange('sistema', 'modoMantenimiento', checked)}
                  />
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="flex items-center justify-center">
                    <Database className="mr-2 h-4 w-4" />
                    Crear Backup Manual
                  </Button>
                  <Button variant="outline" className="flex items-center justify-center">
                    <FileText className="mr-2 h-4 w-4" />
                    Exportar Configuración
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
