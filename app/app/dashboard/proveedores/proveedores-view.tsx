'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/use-toast'
import { Plus, MoreHorizontal, Pencil, Trash2, Search, Building2 } from 'lucide-react'

interface Proveedor {
  id: string
  nombre: string
  cif: string | null
  direccion: string | null
  codigoPostal: string | null
  ciudad: string | null
  provincia: string | null
  telefono: string | null
  email: string | null
  createdAt: string
  _count?: { gastos: number }
}

export default function ProveedoresView() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Proveedor | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    cif: '',
    direccion: '',
    codigoPostal: '',
    ciudad: '',
    provincia: '',
    telefono: '',
    email: ''
  })

  const cargarProveedores = async () => {
    try {
      const res = await fetch('/api/proveedores')
      if (res.ok) {
        const data = await res.json()
        setProveedores(data)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarProveedores()
  }, [])

  const resetForm = () => {
    setFormData({
      nombre: '',
      cif: '',
      direccion: '',
      codigoPostal: '',
      ciudad: '',
      provincia: '',
      telefono: '',
      email: ''
    })
    setEditando(null)
  }

  const handleEditar = (proveedor: Proveedor) => {
    setEditando(proveedor)
    setFormData({
      nombre: proveedor.nombre || '',
      cif: proveedor.cif || '',
      direccion: proveedor.direccion || '',
      codigoPostal: proveedor.codigoPostal || '',
      ciudad: proveedor.ciudad || '',
      provincia: proveedor.provincia || '',
      telefono: proveedor.telefono || '',
      email: proveedor.email || ''
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nombre.trim()) {
      toast({ title: 'Error', description: 'El nombre es obligatorio', variant: 'destructive' })
      return
    }

    try {
      const url = editando ? `/api/proveedores/${editando.id}` : '/api/proveedores'
      const method = editando ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        toast({ title: editando ? 'Proveedor actualizado' : 'Proveedor creado' })
        setDialogOpen(false)
        resetForm()
        cargarProveedores()
      } else {
        const error = await res.json()
        toast({ title: 'Error', description: error.error || 'Error al guardar', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    }
  }

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar este proveedor?')) return
    
    try {
      const res = await fetch(`/api/proveedores/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Proveedor eliminado' })
        cargarProveedores()
      } else {
        const error = await res.json()
        toast({ title: 'Error', description: error.error || 'No se puede eliminar', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    }
  }

  const proveedoresFiltrados = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.cif && p.cif.toLowerCase().includes(busqueda.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Proveedores</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nuevo Proveedor</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nombre / Razón Social *</Label>
                <Input
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  placeholder="Recambios García S.L."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>CIF/NIF</Label>
                  <Input
                    value={formData.cif}
                    onChange={e => setFormData({...formData, cif: e.target.value})}
                    placeholder="B12345678"
                  />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={formData.telefono}
                    onChange={e => setFormData({...formData, telefono: e.target.value})}
                    placeholder="666777888"
                  />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="info@proveedor.com"
                />
              </div>
              <div>
                <Label>Dirección</Label>
                <Input
                  value={formData.direccion}
                  onChange={e => setFormData({...formData, direccion: e.target.value})}
                  placeholder="Calle Principal, 123"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>C.P.</Label>
                  <Input
                    value={formData.codigoPostal}
                    onChange={e => setFormData({...formData, codigoPostal: e.target.value})}
                    placeholder="29001"
                  />
                </div>
                <div>
                  <Label>Ciudad</Label>
                  <Input
                    value={formData.ciudad}
                    onChange={e => setFormData({...formData, ciudad: e.target.value})}
                    placeholder="Málaga"
                  />
                </div>
                <div>
                  <Label>Provincia</Label>
                  <Input
                    value={formData.provincia}
                    onChange={e => setFormData({...formData, provincia: e.target.value})}
                    placeholder="Málaga"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>
                  Cancelar
                </Button>
                <Button type="submit">{editando ? 'Guardar' : 'Crear'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o CIF..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
            <span className="text-sm text-muted-foreground">{proveedoresFiltrados.length} proveedores</span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Cargando...</p>
          ) : proveedoresFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay proveedores registrados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>CIF</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proveedoresFiltrados.map(proveedor => (
                  <TableRow key={proveedor.id}>
                    <TableCell className="font-medium">{proveedor.nombre}</TableCell>
                    <TableCell>{proveedor.cif || '-'}</TableCell>
                    <TableCell>{proveedor.telefono || '-'}</TableCell>
                    <TableCell>{proveedor.email || '-'}</TableCell>
                    <TableCell>{proveedor.ciudad || '-'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditar(proveedor)}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEliminar(proveedor.id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
