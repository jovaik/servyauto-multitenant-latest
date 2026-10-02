
'use client'

import React, { useState, useEffect } from 'react'
import { UserPlus, Search, Edit, Trash2, Shield, Users as UsersIcon, Store, Check } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'

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
  puedeEliminar: boolean
  localId: string | null
  tpvNombre?: string | null
  local?: Local | null
  localesAsignados?: { localId: string, local: Local }[]
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
    puedeEliminar: false,
    localId: 'ALL', // ALL = todos los locales (superadmin)
    tpvNombre: '', // Nombre del TPV propio del usuario (autónomo)
    localesAsignados: [] as string[] // Para GRUPO_ADMIN: IDs de locales asignados
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
      // Crear el usuario
      const response = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          activo: formData.activo,
          puedeEliminar: formData.puedeEliminar,
          localId: formData.role === 'GRUPO_ADMIN' ? null : (formData.localId === 'ALL' ? null : formData.localId),
          tpvNombre: formData.tpvNombre
        })
      })

      if (response.ok) {
        const newUser = await response.json()
        
        // Si es GRUPO_ADMIN, asignar los locales seleccionados
        if (formData.role === 'GRUPO_ADMIN' && formData.localesAsignados.length > 0) {
          await fetch(`/api/usuarios/${newUser.id}/locales`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ localIds: formData.localesAsignados })
          })
        }
        
        alert('Usuario creado correctamente')
        setOpenNew(false)
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'ADMIN',
          activo: true,
          puedeEliminar: false,
          localId: 'ALL',
          tpvNombre: '',
          localesAsignados: []
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
        puedeEliminar: formData.puedeEliminar,
        localId: formData.role === 'GRUPO_ADMIN' ? null : (formData.localId === 'ALL' ? null : formData.localId),
        tpvNombre: formData.tpvNombre
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
        // Si es GRUPO_ADMIN, actualizar los locales asignados
        if (formData.role === 'GRUPO_ADMIN') {
          await fetch(`/api/usuarios/${selectedUsuario.id}/locales`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ localIds: formData.localesAsignados })
          })
        } else {
          // Si cambió de GRUPO_ADMIN a otro rol, eliminar locales asignados
          await fetch(`/api/usuarios/${selectedUsuario.id}/locales`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ localIds: [] })
          })
        }
        
        alert('Usuario actualizado correctamente')
        setOpenEdit(false)
        setSelectedUsuario(null)
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'ADMIN',
          activo: true,
          puedeEliminar: false,
          localId: 'ALL',
          tpvNombre: '',
          localesAsignados: []
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

  const openEditDialog = async (usuario: Usuario) => {
    setSelectedUsuario(usuario)
    
    // Cargar locales asignados si es GRUPO_ADMIN
    let localesAsignados: string[] = []
    if (usuario.role === 'GRUPO_ADMIN') {
      try {
        const res = await fetch(`/api/usuarios/${usuario.id}/locales`)
        if (res.ok) {
          const data = await res.json()
          localesAsignados = data.map((l: Local) => l.id)
        }
      } catch (err) {
        console.error('Error cargando locales asignados:', err)
      }
    }
    
    setFormData({
      name: usuario.name || '',
      email: usuario.email,
      password: '',
      role: usuario.role,
      activo: usuario.activo,
      puedeEliminar: usuario.puedeEliminar ?? false,
      localId: usuario.localId || 'ALL',
      tpvNombre: usuario.tpvNombre || '',
      localesAsignados
    })
    setOpenEdit(true)
  }

  const getRoleBadge = (role: string) => {
    const roles: { [key: string]: { label: string, variant: 'default' | 'secondary' | 'destructive' | 'outline' } } = {
      SUPER_ADMIN: { label: 'Super Admin', variant: 'destructive' },
      GRUPO_ADMIN: { label: 'Grupo Admin', variant: 'default' },
      ADMIN: { label: 'Admin', variant: 'secondary' },
      MECANICO: { label: 'Mecánico', variant: 'outline' },
      OPERADOR: { label: 'Operador', variant: 'outline' }
    }
    const roleInfo = roles[role] || { label: role, variant: 'outline' as const }
    return <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>
  }

  const getLocalBadge = (usuario: Usuario) => {
    if (usuario.role === 'SUPER_ADMIN' || (!usuario.localId && usuario.role !== 'GRUPO_ADMIN')) {
      return <Badge variant="destructive" className="bg-purple-600">🌐 Todos</Badge>
    }
    if (usuario.role === 'GRUPO_ADMIN') {
      const count = usuario.localesAsignados?.length || 0
      return <Badge variant="default" className="bg-blue-600">🏢 {count} locales</Badge>
    }
    const localName = usuario.local?.nombreComercial || usuario.local?.nombre || 'Desconocido'
    return <Badge variant="outline"><Store className="h-3 w-3 mr-1 inline" />{localName}</Badge>
  }
  
  const toggleLocalAsignado = (localId: string) => {
    setFormData(prev => ({
      ...prev,
      localesAsignados: prev.localesAsignados.includes(localId)
        ? prev.localesAsignados.filter(id => id !== localId)
        : [...prev.localesAsignados, localId]
    }))
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
                  onValueChange={(value) => setFormData({ ...formData, role: value, localesAsignados: [] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GRUPO_ADMIN">👥 Grupo Admin (múltiples locales)</SelectItem>
                    <SelectItem value="ADMIN">Admin (un local)</SelectItem>
                    <SelectItem value="OPERADOR">Operador</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.role === 'GRUPO_ADMIN' 
                    ? 'Ve y gestiona los locales que le asignes' 
                    : 'Asigna a un único local'}
                </p>
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

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="puedeEliminar"
                  checked={formData.puedeEliminar}
                  onChange={(e) => setFormData({ ...formData, puedeEliminar: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="puedeEliminar">Puede eliminar registros</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tpvNombre">TPV propio (opcional)</Label>
                <Input
                  id="tpvNombre"
                  value={formData.tpvNombre}
                  onChange={(e) => setFormData({ ...formData, tpvNombre: e.target.value.toUpperCase() })}
                  placeholder="EJ: TPV JUAN"
                />
                <p className="text-xs text-muted-foreground">
                  Nombre del datáfono propio del autónomo. Aparecerá como opción al cobrar con tarjeta.
                </p>
              </div>
              
              {/* Selector de locales según rol */}
              {formData.role === 'GRUPO_ADMIN' ? (
                <div className="space-y-2">
                  <Label>Locales Asignados</Label>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                    {locales.map((local) => (
                      <div key={local.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`local-new-${local.id}`}
                          checked={formData.localesAsignados.includes(local.id)}
                          onCheckedChange={() => toggleLocalAsignado(local.id)}
                        />
                        <label htmlFor={`local-new-${local.id}`} className="text-sm cursor-pointer">
                          {local.nombreComercial || local.nombre}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formData.localesAsignados.length} local(es) seleccionado(s)
                  </p>
                </div>
              ) : (
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
              )}
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
                onValueChange={(value) => setFormData({ ...formData, role: value, localesAsignados: value !== 'GRUPO_ADMIN' ? [] : formData.localesAsignados })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPER_ADMIN">🌐 Super Admin (todos)</SelectItem>
                  <SelectItem value="GRUPO_ADMIN">👥 Grupo Admin (múltiples locales)</SelectItem>
                  <SelectItem value="ADMIN">Admin (un local)</SelectItem>
                  <SelectItem value="OPERADOR">Operador</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.role === 'SUPER_ADMIN' && 'Ve y gestiona TODOS los locales'}
                {formData.role === 'GRUPO_ADMIN' && 'Ve y gestiona los locales que le asignes'}
                {(formData.role === 'ADMIN' || formData.role === 'OPERADOR') && 'Ve solo su local asignado'}
              </p>
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

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-puedeEliminar"
                checked={formData.puedeEliminar}
                onChange={(e) => setFormData({ ...formData, puedeEliminar: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="edit-puedeEliminar">Puede eliminar registros</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tpvNombre">TPV propio (opcional)</Label>
              <Input
                id="edit-tpvNombre"
                value={formData.tpvNombre}
                onChange={(e) => setFormData({ ...formData, tpvNombre: e.target.value.toUpperCase() })}
                placeholder="EJ: TPV JUAN"
              />
              <p className="text-xs text-muted-foreground">
                Nombre del datáfono propio del autónomo. Aparecerá como opción al cobrar con tarjeta.
              </p>
            </div>
            
            {/* Selector de locales según rol */}
            {formData.role === 'GRUPO_ADMIN' ? (
              <div className="space-y-2">
                <Label>Locales Asignados</Label>
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                  {locales.map((local) => (
                    <div key={local.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`local-edit-${local.id}`}
                        checked={formData.localesAsignados.includes(local.id)}
                        onCheckedChange={() => toggleLocalAsignado(local.id)}
                      />
                      <label htmlFor={`local-edit-${local.id}`} className="text-sm cursor-pointer">
                        {local.nombreComercial || local.nombre}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formData.localesAsignados.length} local(es) seleccionado(s)
                </p>
              </div>
            ) : formData.role !== 'SUPER_ADMIN' ? (
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
                    {locales.map((local) => (
                      <SelectItem key={local.id} value={local.id}>
                        <Store className="h-3 w-3 mr-1 inline" />
                        {local.nombreComercial || local.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
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
