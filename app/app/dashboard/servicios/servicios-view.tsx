

'use client'

import React, { useState, useEffect } from 'react'
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  X,
  Euro,
  Clock,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Servicio {
  id: string
  nombre: string
  descripcion: string | null
  precio: number
  duracion: number
  activo: boolean
  createdAt: string
  updatedAt: string
}

export function ServiciosView() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [editingServicio, setEditingServicio] = useState<Servicio | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: 0,
    duracion: 60,
    activo: true
  })

  useEffect(() => {
    loadServicios()
  }, [])

  const loadServicios = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/servicios?showAll=true')
      if (response.ok) {
        const data = await response.json()
        setServicios(data || [])
      }
    } catch (error) {
      console.error('Error loading servicios:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      precio: 0,
      duracion: 60,
      activo: true
    })
    setEditingServicio(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setShowDialog(true)
  }

  const openEditDialog = (servicio: Servicio) => {
    setFormData({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion || '',
      precio: servicio.precio,
      duracion: servicio.duracion,
      activo: servicio.activo
    })
    setEditingServicio(servicio)
    setShowDialog(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nombre.trim() || formData.precio <= 0) {
      alert('Por favor complete los campos requeridos')
      return
    }

    setSaving(true)
    
    try {
      const url = editingServicio 
        ? `/api/servicios/${editingServicio.id}`
        : '/api/servicios'
      
      const method = editingServicio ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowDialog(false)
        resetForm()
        loadServicios()
        alert(editingServicio ? 'Servicio actualizado correctamente' : 'Servicio creado correctamente')
      } else {
        throw new Error('Error en la respuesta del servidor')
      }
    } catch (error) {
      console.error('Error saving servicio:', error)
      alert('Error al guardar el servicio')
    } finally {
      setSaving(false)
    }
  }

  const toggleServicioActivo = async (servicio: Servicio) => {
    try {
      const response = await fetch(`/api/servicios/${servicio.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...servicio,
          activo: !servicio.activo
        })
      })

      if (response.ok) {
        loadServicios()
      } else {
        throw new Error('Error en la respuesta del servidor')
      }
    } catch (error) {
      console.error('Error toggling servicio:', error)
      alert('Error al cambiar el estado del servicio')
    }
  }

  const eliminarServicio = async (servicio: Servicio) => {
    if (!confirm(`¿Está seguro que desea eliminar el servicio "${servicio.nombre}"? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      const response = await fetch(`/api/servicios/${servicio.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadServicios()
        alert('Servicio eliminado correctamente')
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Error en la respuesta del servidor')
      }
    } catch (error) {
      console.error('Error deleting servicio:', error)
      alert(error instanceof Error ? error.message : 'Error al eliminar el servicio')
    }
  }

  const filteredServicios = servicios.filter(servicio =>
    servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (servicio.descripcion && servicio.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const totalServicios = servicios.length
  const serviciosActivos = servicios.filter(s => s.activo).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Servicios</h1>
          <p className="text-gray-600">
            Configure los servicios disponibles, precios y duración estimada
          </p>
        </div>
        
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Servicio
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                {editingServicio ? 'Editar Servicio' : 'Nuevo Servicio'}
              </DialogTitle>
              <DialogDescription>
                {editingServicio ? 'Modifique los datos del servicio' : 'Complete los datos del nuevo servicio'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre del Servicio *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  placeholder="Cambio de aceite, Revisión general..."
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  placeholder="Detalles adicionales del servicio..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="precio">Precio (€) *</Label>
                  <Input
                    id="precio"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.precio}
                    onChange={(e) => setFormData({...formData, precio: parseFloat(e.target.value) || 0})}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="duracion">Duración (minutos)</Label>
                  <Input
                    id="duracion"
                    type="number"
                    min="5"
                    step="5"
                    value={formData.duracion}
                    onChange={(e) => setFormData({...formData, duracion: parseInt(e.target.value) || 60})}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({...formData, activo: checked})}
                />
                <Label htmlFor="activo">Servicio activo</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Servicios</CardTitle>
            <Settings className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalServicios}</div>
            <p className="text-xs text-muted-foreground">Servicios configurados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Servicios Activos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{serviciosActivos}</div>
            <p className="text-xs text-muted-foreground">Disponibles para citas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precio Promedio</CardTitle>
            <Euro className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{serviciosActivos > 0 ? (servicios.filter(s => s.activo).reduce((sum, s) => sum + s.precio, 0) / serviciosActivos).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">De servicios activos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar servicios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Button variant="outline" size="sm" onClick={loadServicios}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Servicios Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Servicios</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex space-x-4">
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[150px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServicios.map((servicio) => (
                  <TableRow key={servicio.id}>
                    <TableCell className="font-medium">
                      {servicio.nombre}
                    </TableCell>
                    <TableCell>
                      {servicio.descripcion ? (
                        <span className="text-sm text-gray-600">
                          {servicio.descripcion.length > 50 
                            ? `${servicio.descripcion.substring(0, 50)}...`
                            : servicio.descripcion
                          }
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">Sin descripción</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">€{servicio.precio.toFixed(2)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="mr-1 h-3 w-3" />
                        {servicio.duracion} min
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {servicio.activo ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                            <XCircle className="mr-1 h-3 w-3" />
                            Inactivo
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(servicio)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleServicioActivo(servicio)}
                          className={servicio.activo ? 'text-orange-600' : 'text-green-600'}
                        >
                          {servicio.activo ? <XCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => eliminarServicio(servicio)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {!loading && filteredServicios.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No se encontraron servicios que coincidan con la búsqueda.' : 'No hay servicios configurados. Cree el primero usando el botón "Nuevo Servicio".'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

