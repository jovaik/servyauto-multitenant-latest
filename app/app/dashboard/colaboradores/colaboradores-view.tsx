'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Handshake, Plus, Pencil, Trash2, Phone, Mail, Percent, UserCircle } from 'lucide-react'
import { useLocalStore } from '@/lib/local-store'

interface UserOption {
  id: string
  name: string | null
  email: string
}

interface Colaborador {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  rol: 'RESPONSABLE' | 'PRESCRIPTOR' | 'OPERARIO'
  comisionPct: number
  activo: boolean
  localId: string
  local?: { id: string; nombre: string }
  userId?: string | null
  user?: { id: string; name: string | null; email: string } | null
}

const ROL_LABELS: Record<string, string> = {
  RESPONSABLE: 'Responsable',
  PRESCRIPTOR: 'Prescriptor',
  OPERARIO: 'Operario',
}

const ROL_COLORS: Record<string, string> = {
  RESPONSABLE: 'bg-blue-100 text-blue-800',
  PRESCRIPTOR: 'bg-purple-100 text-purple-800',
  OPERARIO: 'bg-gray-100 text-gray-800',
}

export default function ColaboradoresView() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', rol: 'PRESCRIPTOR', comisionPct: '25', userId: '' })
  const [saving, setSaving] = useState(false)
  const [usuarios, setUsuarios] = useState<UserOption[]>([])
  const { selectedLocalId } = useLocalStore()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedLocalId) params.set('localId', selectedLocalId)
      const res = await fetch(`/api/colaboradores?${params}`)
      if (res.ok) {
        const data = await res.json()
        setColaboradores(data)
      }
    } catch (e) {
      console.error('Error cargando colaboradores:', e)
    } finally {
      setLoading(false)
    }
  }, [selectedLocalId])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    // Cargar usuarios disponibles para el selector
    fetch('/api/usuarios')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : (data.usuarios || [])
        setUsuarios(list.map((u: { id: string; name?: string | null; email: string }) => ({ id: u.id, name: u.name, email: u.email })))
      })
      .catch(() => {})
  }, [])

  const openNew = () => {
    setEditingId(null)
    setForm({ nombre: '', telefono: '', email: '', rol: 'PRESCRIPTOR', comisionPct: '25', userId: '' })
    setDialogOpen(true)
  }

  const openEdit = (c: Colaborador) => {
    setEditingId(c.id)
    setForm({
      nombre: c.nombre,
      telefono: c.telefono || '',
      email: c.email || '',
      rol: c.rol,
      comisionPct: String(c.comisionPct),
      userId: c.userId || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.nombre.trim()) return
    if (!selectedLocalId) { alert('Selecciona un local primero'); return }
    setSaving(true)
    try {
      const payload = {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        rol: form.rol,
        comisionPct: parseFloat(form.comisionPct) || 0,
        localId: selectedLocalId,
        userId: form.userId || null,
      }
      const url = editingId ? `/api/colaboradores/${editingId}` : '/api/colaboradores'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.ok) {
        setDialogOpen(false)
        fetchData()
      } else {
        const err = await res.json()
        alert(err.error || 'Error al guardar')
      }
    } catch (e) {
      console.error(e)
      alert('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActivo = async (c: Colaborador) => {
    try {
      await fetch(`/api/colaboradores/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !c.activo }),
      })
      fetchData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (c: Colaborador) => {
    if (!confirm(`¿Eliminar a ${c.nombre}?`)) return
    try {
      const res = await fetch(`/api/colaboradores/${c.id}`, { method: 'DELETE' })
      if (res.ok) fetchData()
    } catch (e) {
      console.error(e)
    }
  }

  const activos = colaboradores.filter(c => c.activo)
  const inactivos = colaboradores.filter(c => !c.activo)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Handshake className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">Colaboradores</h1>
          <Badge variant="secondary">{activos.length} activos</Badge>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo Colaborador
        </Button>
      </div>

      {!selectedLocalId && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Selecciona un local para ver sus colaboradores
          </CardContent>
        </Card>
      )}

      {selectedLocalId && loading && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Cargando...</CardContent></Card>
      )}

      {selectedLocalId && !loading && activos.length === 0 && inactivos.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Handshake className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay colaboradores en este local</p>
            <Button className="mt-4" onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" /> Añadir primer colaborador
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedLocalId && !loading && activos.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activos.map(c => (
            <Card key={c.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{c.nombre}</CardTitle>
                    <Badge className={`mt-1 ${ROL_COLORS[c.rol]}`}>{ROL_LABELS[c.rol]}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-2xl font-bold text-primary">
                  <Percent className="h-5 w-5" />
                  {c.comisionPct}% comisión
                </div>
                {c.telefono && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> {c.telefono}
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> <span suppressHydrationWarning>{c.email}</span>
                  </div>
                )}
                {c.user && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UserCircle className="h-3.5 w-3.5" /> {c.user.name || c.user.email}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">Activo</span>
                  <Switch checked={c.activo} onCheckedChange={() => handleToggleActivo(c)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedLocalId && !loading && inactivos.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Inactivos</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inactivos.map(c => (
              <Card key={c.id} className="opacity-60">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{c.nombre}</CardTitle>
                      <Badge variant="outline" className="mt-1">{ROL_LABELS[c.rol]}</Badge>
                    </div>
                    <Switch checked={c.activo} onCheckedChange={() => handleToggleActivo(c)} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">{c.comisionPct}% comisión</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Colaborador' : 'Nuevo Colaborador'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nombre *</Label>
              <Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre completo" />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="+34 ..." />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@ejemplo.com" type="email" />
            </div>
            <div>
              <Label>Rol *</Label>
              <Select value={form.rol} onValueChange={v => setForm({ ...form, rol: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESPONSABLE">Responsable (encargado del local)</SelectItem>
                  <SelectItem value="PRESCRIPTOR">Prescriptor (trae clientes)</SelectItem>
                  <SelectItem value="OPERARIO">Operario (realiza lavados)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>% Comisión</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.comisionPct}
                  onChange={e => setForm({ ...form, comisionPct: e.target.value })}
                  className="w-24"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {form.rol === 'RESPONSABLE' ? 'Sobre el neto (ingresos − gastos del local)' :
                 form.rol === 'PRESCRIPTOR' ? 'Sobre el bruto de las citas que prescribe' :
                 'Porcentaje asignado'}
              </p>
            </div>
            <div>
              <Label>Usuario vinculado</Label>
              <Select value={form.userId || '_none'} onValueChange={v => setForm({ ...form, userId: v === '_none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Sin vincular" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sin vincular</SelectItem>
                  {usuarios.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name || u.email} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Permite que este usuario acceda a su propia liquidación
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.nombre.trim()}>
              {saving ? 'Guardando...' : editingId ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
