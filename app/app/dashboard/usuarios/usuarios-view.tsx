
'use client'

import React, { useState, useEffect } from 'react'
import { UserPlus, Search, Edit, Trash2, Shield, Users as UsersIcon, Store } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface Local {
  id: string
  nombre: string
  nombreComercial?: string
}

interface Usuario {
  id: string
  name: string | null
  email: string
  role: string
  activo: boolean
  localId: string | null
  local?: Local | null
  createdAt: string
  updatedAt: string
}

export function UsuariosView() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [locales, setLocales] = useState<Local[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null)
  const [openNew, setOpenNew] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ADMIN',
    activo: true,
    localId: 'ALL' // ALL = todos los locales (superadmin)
  })

  useEffect(() => {
    fetchUsuarios()
    fetchLocales()
  }, [])

  const fetchUsuarios = async () => {
    try {
      const response = await fetch('/api/usuarios')
      if (response.ok) {
        const data = await response.json()
        setUsuarios(data)
      }
    } catch (error) {
      console.error('Error fetching usuarios:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLocales = async () => {
    try {
      const response = await fetch('/api/locales')
      if (response.ok) {
        const data = await response.json()
        setLocales(data)
      }
    } catch (error) {
      console.error('Error fetching locales:', error)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          localId: formData.localId === 'ALL' ? null : formData.localId // null = superadmin
        })
      })

      if (response.ok) {
        alert('Usuario creado correctamente')
        setOpenNew(false)
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'ADMIN',
          activo: true,
          localId: 'ALL'
        })
        fetchUsuarios()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al crear usuario')
      }
    } catch (error) {
      console.error('Error creating usuario:', error)
      alert('Error al crear usuario')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUsuario) return

    try {
      const updatePayload: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        activo: formData.activo,
        localId: formData.localId === 'ALL' ? null : formData.localId // null = superadmin
      }

      // Solo incluir password si se proporcionó uno nuevo
      if (formData.password && formData.password.trim() !== '') {
        updatePayload.password = formData.password
      }

      const response = await fetch(`/api/usuarios/${selectedUsuario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      })

      if (response.ok) {
        alert('Usuario actualizado correctamente')
        setOpenEdit(false)
        setSelectedUsuario(null)
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'ADMIN',
          activo: true,
          localId: 'ALL'
        })
        fetchUsuarios()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al actualizar usuario')
      }
    } catch (error) {
      console.error('Error updating usuario:', error)
      alert('Error al actualizar usuario')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) return

    try {
      const response = await fetch(`/api/usuarios/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Usuario eliminado correctamente')
        fetchUsuarios()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al eliminar usuario')
      }
    } catch (error) {
      console.error('Error deleting usuario:', error)
      alert('Error al eliminar usuario')
    }
  }

  const openEditDialog = (usuario: Usuario) => {
    setSelectedUsuario(usuario)
    setFormData({
      name: usuario.name || '',
      email: usuario.email,
      password: '',
      role: usuario.role,
      activo: usuario.activo,
      localId: usuario.localId || 'ALL'
    })
    setOpenEdit(true)
  }

  const getRoleBadge = (role: string) => {
    const roles: { [key: string]: { label: string, variant: 'default' | 'secondary' | 'destructive' | 'outline' } } = {
      SUPER_ADMIN: { label: 'Super Admin', variant: 'destructive' },
      ADMIN: { label: 'Admin', variant: 'default' },
      MECANICO: { label: 'Mecánico', variant: 'secondary' },
      OPERADOR: { label: 'Operador', variant: 'outline' }
    }
    const roleInfo = roles[role] || { label: role, variant: 'outline' as const }
    return <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>
  }

  const getLocalBadge = (usuario: Usuario) => {
    if (!usuario.localId) {
      return <Badge variant="destructive" className="bg-purple-600">🌐 Todos (SuperAdmin)</Badge>
    }
    const localName = usuario.local?.nombreComercial || usuario.local?.nombre || 'Desconocido'
    return <Badge variant="outline"><Store className="h-3 w-3 mr-1 inline" />{localName}</Badge>
  }

  const filteredUsuarios = usuarios.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-gray-600">
            Administra los usuarios y sus permisos de acceso al sistema
          </p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              <DialogDescription>
                Completa los datos para crear un nuevo usuario en el sistema
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MECANICO">Mecánico</SelectItem>
                    <SelectItem value="OPERADOR">Operador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="activo">Estado</Label>
                <Select
                  value={formData.activo ? 'true' : 'false'}
                  onValueChange={(value) => setFormData({ ...formData, activo: value === 'true' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Activo</SelectItem>
                    <SelectItem value="false">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="local">Local Asignado</Label>
                <Select
                  value={formData.localId}
                  onValueChange={(value) => setFormData({ ...formData, localId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar local..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">🌐 Todos los locales (SuperAdmin)</SelectItem>
                    {locales.map((local) => (
                      <SelectItem key={local.id} value={local.id}>
                        <Store className="h-3 w-3 mr-1 inline" />
                        {local.nombreComercial || local.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Sin local asignado = ve todos los datos (SuperAdmin)
                </p>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpenNew(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Crear Usuario</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Usuarios</p>
                <p className="text-2xl font-bold">{usuarios.length}</p>
              </div>
              <UsersIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Usuarios Activos</p>
                <p className="text-2xl font-bold text-green-600">
                  {usuarios.filter(u => u.activo).length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-gray-600">Cargando usuarios...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-600">
                      No se encontraron usuarios
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsuarios.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium">{usuario.name || 'Sin nombre'}</TableCell>
                      <TableCell>{usuario.email}</TableCell>
                      <TableCell>{getRoleBadge(usuario.role)}</TableCell>
                      <TableCell>{getLocalBadge(usuario)}</TableCell>
                      <TableCell>
                        <Badge variant={usuario.activo ? 'default' : 'secondary'}>
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(usuario.createdAt).toLocaleDateString('es-ES')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(usuario)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(usuario.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Actualiza los datos del usuario seleccionado
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Nueva Contraseña (opcional)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Dejar en blanco para mantener la actual"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Rol</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MECANICO">Mecánico</SelectItem>
                  <SelectItem value="OPERADOR">Operador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-activo">Estado</Label>
              <Select
                value={formData.activo ? 'true' : 'false'}
                onValueChange={(value) => setFormData({ ...formData, activo: value === 'true' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Activo</SelectItem>
                  <SelectItem value="false">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-local">Local Asignado</Label>
              <Select
                value={formData.localId}
                onValueChange={(value) => setFormData({ ...formData, localId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar local..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">🌐 Todos los locales (SuperAdmin)</SelectItem>
                  {locales.map((local) => (
                    <SelectItem key={local.id} value={local.id}>
                      <Store className="h-3 w-3 mr-1 inline" />
                      {local.nombreComercial || local.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Sin local asignado = ve todos los datos (SuperAdmin)
              </p>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpenEdit(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar Cambios</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
