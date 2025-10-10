
'use client'

import React, { useState, useEffect } from 'react'
import { Users, User, Car, Phone, Mail, Plus, Edit, Trash2, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'react-hot-toast'

interface Cliente {
  id: string
  nombre: string
  apellido?: string
  email?: string
  telefono: string
  direccion?: string
  documento?: string
  vehiculos?: Vehiculo[]
  createdAt: Date
}

interface Vehiculo {
  id: string
  marca: string
  modelo: string
  anio: number
  color?: string
  matricula: string
  kilometraje?: number
}

export function ClientesView() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    direccion: '',
    documento: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadClientes()
  }, [])

  const loadClientes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/clientes')
      
      if (response.ok) {
        const data = await response.json()
        setClientes(data || [])
      }
    } catch (error) {
      console.error('Error loading clients:', error)
      toast.error('Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (cliente?: Cliente) => {
    if (cliente) {
      setEditingCliente(cliente)
      setFormData({
        nombre: cliente.nombre,
        apellido: cliente.apellido || '',
        email: cliente.email || '',
        telefono: cliente.telefono,
        direccion: cliente.direccion || '',
        documento: cliente.documento || ''
      })
    } else {
      setEditingCliente(null)
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        direccion: '',
        documento: ''
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingCliente(null)
    setFormData({
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      direccion: '',
      documento: ''
    })
  }

  const handleSubmit = async () => {
    if (!formData.nombre || !formData.telefono) {
      toast.error('Nombre y teléfono son obligatorios')
      return
    }

    setSubmitting(true)
    try {
      const url = '/api/clientes'
      const method = editingCliente ? 'PUT' : 'POST'
      const body = editingCliente 
        ? { ...formData, id: editingCliente.id }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        toast.success(editingCliente ? 'Cliente actualizado correctamente' : 'Cliente creado correctamente')
        handleCloseModal()
        await loadClientes()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al guardar cliente')
      }
    } catch (error) {
      console.error('Error saving client:', error)
      toast.error('Error al guardar cliente')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (cliente: Cliente) => {
    if (!confirm(`¿Estás seguro de eliminar el cliente ${cliente.nombre} ${cliente.apellido || ''}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/clientes?id=${cliente.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Cliente eliminado correctamente')
        await loadClientes()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al eliminar cliente')
      }
    } catch (error) {
      console.error('Error deleting client:', error)
      toast.error('Error al eliminar cliente')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes y Vehículos</h1>
          <p className="text-gray-600">
            Gestiona la información de los clientes y sus vehículos
          </p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => handleOpenModal()}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Clientes</p>
                <p className="text-3xl font-bold">{clientes?.length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Vehículos Registrados</p>
                <p className="text-3xl font-bold">
                  {clientes?.reduce((total, cliente) => total + (cliente?.vehiculos?.length || 0), 0) || 0}
                </p>
              </div>
              <Car className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Promedio Vehículos/Cliente</p>
                <p className="text-3xl font-bold">
                  {clientes?.length > 0 
                    ? (clientes.reduce((total, cliente) => total + (cliente?.vehiculos?.length || 0), 0) / clientes.length).toFixed(1)
                    : '0.0'
                  }
                </p>
              </div>
              <User className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Lista de Clientes
          </CardTitle>
          <CardDescription>
            {clientes?.length || 0} clientes registrados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Cargando clientes...</p>
            </div>
          ) : clientes?.length > 0 ? (
            <div className="space-y-4">
              {clientes.map((cliente) => (
                <div 
                  key={cliente.id} 
                  className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {cliente.nombre} {cliente.apellido || ''}
                        </h3>
                        {cliente.documento && (
                          <p className="text-sm text-gray-500">Documento: {cliente.documento}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">
                        {cliente?.vehiculos?.length || 0} vehículo{(cliente?.vehiculos?.length || 0) !== 1 ? 's' : ''}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenModal(cliente)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(cliente)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <Mail className="mr-2 h-4 w-4" />
                      {cliente.email || 'Sin email'}
                    </div>
                    <div className="flex items-center">
                      <Phone className="mr-2 h-4 w-4" />
                      {cliente.telefono}
                    </div>
                    {cliente.direccion && (
                      <div className="col-span-2">
                        <strong>Dirección:</strong> {cliente.direccion}
                      </div>
                    )}
                  </div>

                  {cliente?.vehiculos && cliente.vehiculos.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                        <Car className="mr-2 h-4 w-4" />
                        Vehículos
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {cliente.vehiculos.map((vehiculo) => (
                          <div 
                            key={vehiculo.id}
                            className="bg-gray-50 p-3 rounded text-sm"
                          >
                            <div className="font-medium text-gray-900">
                              {vehiculo.marca} {vehiculo.modelo} ({vehiculo.anio})
                            </div>
                            <div className="text-gray-600">
                              {vehiculo.matricula} {vehiculo.color && `- ${vehiculo.color}`}
                            </div>
                            {vehiculo.kilometraje && (
                              <div className="text-gray-500">
                                {vehiculo.kilometraje.toLocaleString()} km
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>No hay clientes registrados aún</p>
              <p className="text-sm mt-2">
                Los clientes se crean automáticamente al programar citas
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para crear/editar cliente */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
            </DialogTitle>
            <DialogDescription>
              {editingCliente 
                ? 'Modifica los datos del cliente' 
                : 'Completa los datos para crear un nuevo cliente'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Juan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido</Label>
                <Input
                  id="apellido"
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  placeholder="Pérez (opcional)"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="juan@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono *</Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="612345678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="documento">Documento</Label>
              <Input
                id="documento"
                value={formData.documento}
                onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                placeholder="12345678A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                placeholder="Calle Principal 123"
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
              {submitting ? 'Guardando...' : editingCliente ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
