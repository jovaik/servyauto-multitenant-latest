
'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Car, User, Plus, Calendar, Wrench, Edit, Trash2, X, Download, ExternalLink } from 'lucide-react'
import { exportarVehiculosExcel } from '@/lib/excel-generator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'react-hot-toast'
import { LOCAL_CHANGE_EVENT } from '@/lib/local-store'
import { VehicleBrandModelSelector } from '@/components/vehicle-brand-model-selector'

interface Cliente {
  id: string
  nombre: string
  apellido: string
  email?: string
  telefono: string
}

interface Vehiculo {
  id: string
  marca: string
  modelo: string
  anio: number
  color?: string
  matricula: string
  kilometraje?: number
  motor?: string
  combustible?: string
  observaciones?: string
  clienteId?: string
  cliente?: {
    id: string
    nombre: string
    apellido: string
    telefono: string
  }
  // Trazabilidad
  creadoPorId?: string
  creadoPorNombre?: string
  createdAt: Date
}

export function VehiculosView() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const userRole = (session?.user as any)?.role || ''
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingVehiculo, setEditingVehiculo] = useState<Vehiculo | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Filtro inicial desde la URL (?buscar=...) para cross-link desde Clientes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const buscar = params.get('buscar')
    if (buscar) setSearchTerm(buscar)
  }, [])
  const [formData, setFormData] = useState({
    marca: '',
    modelo: '',
    matricula: '',
    anio: new Date().getFullYear(),
    color: '',
    kilometraje: '',
    motor: '',
    combustible: '',
    observaciones: '',
    clienteId: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadVehiculos()
    loadClientes()
  }, [])

  // Escuchar cambios de local para recargar datos
  useEffect(() => {
    const handleLocalChange = () => {
      console.log('🔄 Vehículos: Local cambiado, recargando datos...')
      loadVehiculos()
      loadClientes()
    }
    
    window.addEventListener(LOCAL_CHANGE_EVENT, handleLocalChange)
    return () => window.removeEventListener(LOCAL_CHANGE_EVENT, handleLocalChange)
  }, [])

  const loadVehiculos = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/vehiculos')
      
      if (response.ok) {
        const data = await response.json()
        setVehiculos(data || [])
      }
    } catch (error) {
      console.error('Error loading vehicles:', error)
      toast.error('Error al cargar vehículos')
    } finally {
      setLoading(false)
    }
  }

  const loadClientes = async () => {
    try {
      const response = await fetch('/api/clientes')
      
      if (response.ok) {
        const data = await response.json()
        setClientes(data || [])
      }
    } catch (error) {
      console.error('Error loading clients:', error)
    }
  }

  const handleOpenModal = (vehiculo?: Vehiculo) => {
    if (vehiculo) {
      setEditingVehiculo(vehiculo)
      setFormData({
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        matricula: vehiculo.matricula,
        anio: vehiculo.anio,
        color: vehiculo.color || '',
        kilometraje: vehiculo.kilometraje?.toString() || '',
        motor: vehiculo.motor || '',
        combustible: vehiculo.combustible || '',
        observaciones: vehiculo.observaciones || '',
        clienteId: vehiculo.clienteId || vehiculo.cliente?.id || ''
      })
    } else {
      setEditingVehiculo(null)
      setFormData({
        marca: '',
        modelo: '',
        matricula: '',
        anio: new Date().getFullYear(),
        color: '',
        kilometraje: '',
        motor: '',
        combustible: '',
        observaciones: '',
        clienteId: ''
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingVehiculo(null)
    setFormData({
      marca: '',
      modelo: '',
      matricula: '',
      anio: new Date().getFullYear(),
      color: '',
      kilometraje: '',
      motor: '',
      combustible: '',
      observaciones: '',
      clienteId: ''
    })
  }

  const handleSubmit = async () => {
    if (!formData.marca || !formData.modelo || !formData.matricula || !formData.clienteId) {
      toast.error('Marca, modelo, matrícula y cliente son obligatorios')
      return
    }

    setSubmitting(true)
    try {
      const url = '/api/vehiculos'
      const method = editingVehiculo ? 'PUT' : 'POST'
      const body = {
        ...formData,
        kilometraje: formData.kilometraje ? parseInt(formData.kilometraje) : null,
        id: editingVehiculo?.id
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        toast.success(editingVehiculo ? 'Vehículo actualizado correctamente' : 'Vehículo creado correctamente')
        handleCloseModal()
        await loadVehiculos()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al guardar vehículo')
      }
    } catch (error) {
      console.error('Error saving vehicle:', error)
      toast.error('Error al guardar vehículo')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (vehiculo: Vehiculo) => {
    if (!confirm(`¿Estás seguro de eliminar el vehículo ${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.matricula})?`)) {
      return
    }

    try {
      const response = await fetch(`/api/vehiculos?id=${vehiculo.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Vehículo eliminado correctamente')
        await loadVehiculos()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al eliminar vehículo')
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error)
      toast.error('Error al eliminar vehículo')
    }
  }

  const getVehiculosByMarca = () => {
    const marcas = vehiculos?.reduce((acc, vehiculo) => {
      acc[vehiculo.marca] = (acc[vehiculo.marca] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}
    
    return Object.entries(marcas).sort(([,a], [,b]) => b - a)
  }

  // Filtrar vehículos por búsqueda
  const vehiculosFiltrados = vehiculos.filter(vehiculo => {
    if (!searchTerm) return true
    
    const search = searchTerm.toLowerCase()
    const marca = vehiculo.marca.toLowerCase()
    const modelo = vehiculo.modelo.toLowerCase()
    const matricula = vehiculo.matricula.toLowerCase()
    
    return marca.includes(search) || modelo.includes(search) || matricula.includes(search)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vehículos</h1>
          <p className="text-gray-600">
            Gestiona la información de todos los vehículos registrados
          </p>
        </div>
        <div className="flex gap-2">
          {userRole === 'SUPER_ADMIN' && (
            <Button 
              variant="outline"
              onClick={() => exportarVehiculosExcel(vehiculos)}
              className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
            >
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
          )}
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => handleOpenModal()}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Vehículo
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Vehículos</p>
                <p className="text-3xl font-bold">{vehiculos?.length || 0}</p>
              </div>
              <Car className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Marcas Diferentes</p>
                <p className="text-3xl font-bold">
                  {new Set(vehiculos?.map(v => v.marca)).size || 0}
                </p>
              </div>
              <Wrench className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Año Promedio</p>
                <p className="text-3xl font-bold">
                  {vehiculos?.length > 0 
                    ? Math.round(vehiculos.reduce((sum, v) => sum + v.anio, 0) / vehiculos.length)
                    : 0
                  }
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Km Promedio</p>
                <p className="text-3xl font-bold">
                  {vehiculos?.length > 0 
                    ? Math.round(vehiculos.reduce((sum, v) => sum + (v.kilometraje || 0), 0) / vehiculos.length).toLocaleString()
                    : '0'
                  }
                </p>
              </div>
              <Car className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Brands */}
      {vehiculos?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Marcas Más Comunes</CardTitle>
            <CardDescription>
              Distribución por marcas de vehículos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {getVehiculosByMarca().map(([marca, count]) => (
                <Badge key={marca} variant="secondary" className="text-sm">
                  {marca}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vehicles List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Car className="mr-2 h-5 w-5" />
            Lista de Vehículos
          </CardTitle>
          <CardDescription>
            {vehiculosFiltrados?.length || 0} de {vehiculos?.length || 0} vehículos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Buscador */}
          <div className="mb-6">
            <div className="relative">
              <Input
                type="text"
                placeholder="Buscar por marca, modelo o matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Cargando vehículos...</p>
            </div>
          ) : vehiculosFiltrados?.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vehiculosFiltrados.map((vehiculo) => (
                <div 
                  key={vehiculo.id} 
                  className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Car className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {vehiculo.marca} {vehiculo.modelo}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {vehiculo.matricula}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {vehiculo.anio}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenModal(vehiculo)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(vehiculo)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Indicador de Local */}
                  {(vehiculo as any).local?.nombre && (
                    <div className="mb-3">
                      <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
                        📍 {(vehiculo as any).local.nombre.replace('SERVYAUTO ', '')}
                      </Badge>
                    </div>
                  )}

                  <div className="space-y-2 text-sm text-gray-600">
                    {vehiculo.color && (
                      <div>
                        <strong>Color:</strong> {vehiculo.color}
                      </div>
                    )}
                    {vehiculo.kilometraje && (
                      <div>
                        <strong>Kilometraje:</strong> {vehiculo.kilometraje.toLocaleString()} km
                      </div>
                    )}
                    {vehiculo.motor && (
                      <div>
                        <strong>Motor:</strong> {vehiculo.motor}
                      </div>
                    )}
                    {vehiculo.combustible && (
                      <div>
                        <strong>Combustible:</strong> {vehiculo.combustible}
                      </div>
                    )}
                    {vehiculo.cliente && (
                      <div className="pt-2 border-t border-gray-100">
                        <button
                          onClick={() => router.push(`/dashboard/clientes?buscar=${encodeURIComponent(vehiculo.cliente!.telefono || vehiculo.cliente!.nombre)}`)}
                          className="flex items-center text-blue-600 hover:text-blue-800 hover:underline group"
                          title="Ver ficha del cliente"
                        >
                          <User className="mr-1 h-3 w-3" />
                          <strong>Propietario:</strong>&nbsp;{vehiculo.cliente.nombre} {vehiculo.cliente.apellido}
                          <ExternalLink className="ml-1 h-3 w-3 opacity-0 group-hover:opacity-100" />
                        </button>
                      </div>
                    )}
                    {vehiculo.observaciones && (
                      <div className="pt-2">
                        <strong>Observaciones:</strong> {vehiculo.observaciones}
                      </div>
                    )}
                    {vehiculo.creadoPorNombre && (
                      <div className="pt-2 text-xs text-gray-400">
                        👤 Registrado por: {vehiculo.creadoPorNombre}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : searchTerm ? (
            <div className="text-center py-8 text-gray-500">
              <Car className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>No se encontraron vehículos con "{searchTerm}"</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setSearchTerm('')}
              >
                Limpiar búsqueda
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Car className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>No hay vehículos registrados aún</p>
              <p className="text-sm mt-2">
                Los vehículos se registran junto con los clientes al programar citas
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para crear/editar vehículo */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVehiculo ? 'Editar Vehículo' : 'Nuevo Vehículo'}
            </DialogTitle>
            <DialogDescription>
              {editingVehiculo 
                ? 'Modifica los datos del vehículo' 
                : 'Completa los datos para registrar un nuevo vehículo'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente *</Label>
              <Select value={formData.clienteId} onValueChange={(value) => setFormData({ ...formData, clienteId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nombre} {cliente.apellido} - {cliente.telefono}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <VehicleBrandModelSelector
              marca={formData.marca}
              modelo={formData.modelo}
              onMarcaChange={(marca) => setFormData(prev => ({ ...prev, marca, modelo: marca !== prev.marca ? '' : prev.modelo }))}
              onModeloChange={(modelo) => setFormData(prev => ({ ...prev, modelo }))}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="matricula">Matrícula *</Label>
                <Input
                  id="matricula"
                  value={formData.matricula}
                  onChange={(e) => setFormData({ ...formData, matricula: e.target.value.toUpperCase() })}
                  placeholder="1234ABC"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="anio">Año</Label>
                <Input
                  id="anio"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={formData.anio}
                  onChange={(e) => setFormData({ ...formData, anio: parseInt(e.target.value) || new Date().getFullYear() })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="Azul"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kilometraje">Kilometraje</Label>
                <Input
                  id="kilometraje"
                  type="number"
                  min="0"
                  value={formData.kilometraje}
                  onChange={(e) => setFormData({ ...formData, kilometraje: e.target.value })}
                  placeholder="50000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="motor">Motor</Label>
                <Input
                  id="motor"
                  value={formData.motor}
                  onChange={(e) => setFormData({ ...formData, motor: e.target.value })}
                  placeholder="1.6 16V"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="combustible">Combustible</Label>
                <Select value={formData.combustible} onValueChange={(value) => setFormData({ ...formData, combustible: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de combustible" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GASOLINA">Gasolina</SelectItem>
                    <SelectItem value="DIESEL">Diésel</SelectItem>
                    <SelectItem value="HIBRIDO">Híbrido</SelectItem>
                    <SelectItem value="ELECTRICO">Eléctrico</SelectItem>
                    <SelectItem value="GLP">GLP</SelectItem>
                    <SelectItem value="GNC">GNC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Notas adicionales sobre el vehículo..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? 'Guardando...' : editingVehiculo ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
