'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { FileText, Plus, Trash2, Search, User, Car, X } from 'lucide-react'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

interface ItemLine {
  descripcion: string
  cantidad: number
  precioUnitario: number
  servicioId?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editing: any | null
}

export default function NuevoPresupuestoDialog({ open, onOpenChange, onSuccess, editing }: Props) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // Client mode: 'existing' (del listado) or 'new'
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing')
  const [clientes, setClientes] = useState<any[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [showClientResults, setShowClientResults] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<any | null>(null)

  // Vehicle mode: 'existing' (de la ficha del cliente) or 'new'
  const [vehiculoMode, setVehiculoMode] = useState<'existing' | 'new'>('new')
  const [clienteVehiculos, setClienteVehiculos] = useState<any[]>([])
  const [selectedVehiculoId, setSelectedVehiculoId] = useState<string>('')
  const [nuevoVehMarca, setNuevoVehMarca] = useState('')
  const [nuevoVehModelo, setNuevoVehModelo] = useState('')
  const [nuevoVehMatricula, setNuevoVehMatricula] = useState('')

  // Services catalogue
  const [servicios, setServicios] = useState<any[]>([])

  // Form
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [clienteEmail, setClienteEmail] = useState('')
  const [validoHasta, setValidoHasta] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [items, setItems] = useState<ItemLine[]>([{ descripcion: '', cantidad: 1, precioUnitario: 0 }])

  // Load clients and services
  useEffect(() => {
    if (!open) return
    fetch('/api/clientes').then(r => r.ok ? r.json() : []).then(data => {
      const arr = Array.isArray(data) ? data : (data.clientes || [])
      setClientes(arr)
    }).catch(() => {})
    fetch('/api/servicios?activo=true').then(r => r.ok ? r.json() : []).then(setServicios).catch(() => {})
  }, [open])

  // Populate form when editing
  useEffect(() => {
    if (!open) return
    if (editing) {
      setClienteNombre(editing.clienteNombre || '')
      setClienteTelefono(editing.clienteTelefono || '')
      setClienteEmail(editing.clienteEmail || '')
      setValidoHasta(editing.validoHasta ? format(new Date(editing.validoHasta), 'yyyy-MM-dd') : '')
      setObservaciones(editing.observaciones || '')
      setItems(editing.items?.length > 0
        ? editing.items.map((i: any) => ({ descripcion: i.descripcion, cantidad: i.cantidad, precioUnitario: i.precioUnitario, servicioId: i.servicioId }))
        : [{ descripcion: '', cantidad: 1, precioUnitario: 0 }]
      )
      setClientMode(editing.clienteId ? 'existing' : 'new')
      setSelectedCliente(editing.clienteId ? { id: editing.clienteId, nombre: editing.clienteNombre, vehiculos: [] } : null)
      // Vehicle: if linked, keep it; otherwise new/manual
      if (editing.vehiculoId) {
        setVehiculoMode('existing')
        setSelectedVehiculoId(editing.vehiculoId)
        setClienteVehiculos(editing.vehiculo ? [editing.vehiculo] : [])
      } else {
        setVehiculoMode('new')
        setSelectedVehiculoId('')
        // Try to pre-fill new-vehicle fields from vehiculoInfo text "MARCA MODELO - MATRICULA"
        const info = editing.vehiculoInfo || ''
        if (info) {
          const [left, mat] = info.split(' - ')
          const parts = (left || '').trim().split(' ')
          setNuevoVehMarca(parts[0] || '')
          setNuevoVehModelo(parts.slice(1).join(' ') || '')
          setNuevoVehMatricula((mat || '').trim())
        }
      }
      // Load the client's vehicles if we have the client in list
      if (editing.clienteId) {
        fetch('/api/clientes').then(r => r.ok ? r.json() : []).then(data => {
          const arr = Array.isArray(data) ? data : (data.clientes || [])
          const c = arr.find((x: any) => x.id === editing.clienteId)
          if (c) { setSelectedCliente(c); setClienteVehiculos(c.vehiculos || []) }
        }).catch(() => {})
      }
    } else {
      resetForm()
    }
  }, [open, editing])

  const resetForm = () => {
    setClienteNombre('')
    setClienteTelefono('')
    setClienteEmail('')
    setValidoHasta('')
    setObservaciones('')
    setItems([{ descripcion: '', cantidad: 1, precioUnitario: 0 }])
    setClientMode('existing')
    setSelectedCliente(null)
    setClientSearch('')
    setVehiculoMode('new')
    setClienteVehiculos([])
    setSelectedVehiculoId('')
    setNuevoVehMarca('')
    setNuevoVehModelo('')
    setNuevoVehMatricula('')
  }

  const selectCliente = (c: any) => {
    setSelectedCliente(c)
    setClienteNombre(`${c.nombre} ${c.apellido || ''}`.trim())
    setClienteTelefono(c.telefono || '')
    setClienteEmail(c.email || '')
    setShowClientResults(false)
    setClientSearch('')
    const vehs = c.vehiculos || []
    setClienteVehiculos(vehs)
    if (vehs.length > 0) {
      setVehiculoMode('existing')
      // Auto-select if only one
      setSelectedVehiculoId(vehs.length === 1 ? vehs[0].id : '')
    } else {
      setVehiculoMode('new')
      setSelectedVehiculoId('')
    }
  }

  const clearCliente = () => {
    setSelectedCliente(null)
    setClienteNombre('')
    setClienteTelefono('')
    setClienteEmail('')
    setClienteVehiculos([])
    setSelectedVehiculoId('')
    setVehiculoMode('new')
  }

  const filteredClients = clientes.filter(c => {
    if (!clientSearch) return false
    const q = clientSearch.toLowerCase()
    return c.nombre?.toLowerCase().includes(q) ||
      (c.apellido || '').toLowerCase().includes(q) ||
      (c.telefono || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q)
  }).slice(0, 10)

  // Item management
  const addItem = () => setItems([...items, { descripcion: '', cantidad: 1, precioUnitario: 0 }])
  const removeItem = (idx: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== idx))
  }
  const updateItem = (idx: number, field: keyof ItemLine, value: any) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const selectServicio = (idx: number, servicioId: string) => {
    const svc = servicios.find((s: any) => s.id === servicioId)
    if (svc) {
      setItems(items.map((item, i) => i === idx ? {
        ...item,
        descripcion: svc.nombre,
        precioUnitario: svc.precio,
        servicioId: svc.id,
      } : item))
    }
  }

  const subtotal = items.reduce((sum, i) => sum + (i.cantidad * i.precioUnitario), 0)
  const iva = Math.round(subtotal * 0.21 * 100) / 100
  const total = Math.round((subtotal + iva) * 100) / 100

  const handleSubmit = async () => {
    if (!clienteNombre.trim()) {
      toast({ title: 'Falta el nombre del cliente', variant: 'destructive' })
      return
    }
    if (clientMode === 'existing' && !selectedCliente) {
      toast({ title: 'Elige un cliente del listado', description: 'O cambia a "Nuevo" para darlo de alta.', variant: 'destructive' })
      return
    }
    // Vehicle validation
    if (vehiculoMode === 'existing' && clienteVehiculos.length > 0 && !selectedVehiculoId) {
      toast({ title: 'Elige un vehículo', description: 'Este cliente tiene varios vehículos, selecciona uno.', variant: 'destructive' })
      return
    }
    const validItems = items.filter(i => i.descripcion.trim() && i.precioUnitario > 0)
    if (validItems.length === 0) {
      toast({ title: 'Añade al menos un concepto con descripción y precio', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      // Build vehicle payload
      let vehiculoId: string | null = null
      let nuevoVehiculo: any = null
      let vehiculoInfo: string | null = null

      if (vehiculoMode === 'existing' && selectedVehiculoId) {
        vehiculoId = selectedVehiculoId
        const v = clienteVehiculos.find((x: any) => x.id === selectedVehiculoId)
        if (v) vehiculoInfo = `${v.marca} ${v.modelo}${v.matricula && !v.matricula.startsWith('PEND-') ? ' - ' + v.matricula : ''}`.trim()
      } else if (nuevoVehMarca.trim()) {
        nuevoVehiculo = {
          marca: nuevoVehMarca.trim().toUpperCase(),
          modelo: nuevoVehModelo.trim().toUpperCase() || 'SIN MODELO',
          matricula: nuevoVehMatricula.trim().toUpperCase() || null,
        }
        vehiculoInfo = `${nuevoVehiculo.marca} ${nuevoVehiculo.modelo}${nuevoVehiculo.matricula ? ' - ' + nuevoVehiculo.matricula : ''}`.trim()
      }

      const body = {
        clienteNombre: clienteNombre.trim(),
        clienteTelefono: clienteTelefono.trim() || null,
        clienteEmail: clienteEmail.trim() || null,
        clienteId: selectedCliente?.id || null,
        vehiculoId,
        nuevoVehiculo,
        vehiculoInfo,
        validoHasta: validoHasta || null,
        observaciones: observaciones.trim() || null,
        items: validItems,
      }

      const url = editing ? `/api/presupuestos/${editing.id}` : '/api/presupuestos'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error')
      }

      toast({ title: editing ? 'Presupuesto actualizado' : 'Presupuesto creado' })
      onOpenChange(false)
      resetForm()
      onSuccess()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const matriculaLimpia = (m: string) => (m && !m.startsWith('PEND-')) ? m : 'SIN MATRÍCULA'

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-blue-600" />
            {editing ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Factura proforma para el cliente</p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* CLIENTE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="flex items-center gap-2 font-semibold text-base">
                <User className="h-4 w-4" /> Datos del Cliente
              </h3>
              <div className="flex gap-1">
                <Button size="sm" variant={clientMode === 'existing' ? 'default' : 'outline'} onClick={() => setClientMode('existing')} className="text-xs h-7">
                  Del listado
                </Button>
                <Button size="sm" variant={clientMode === 'new' ? 'default' : 'outline'} onClick={() => { setClientMode('new'); clearCliente() }} className="text-xs h-7">
                  Nuevo
                </Button>
              </div>
            </div>

            {clientMode === 'existing' && !selectedCliente && (
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente por nombre, teléfono o email..."
                  value={clientSearch}
                  onChange={(e) => { setClientSearch(e.target.value); setShowClientResults(true) }}
                  onFocus={() => setShowClientResults(true)}
                  className="pl-10"
                />
                {showClientResults && filteredClients.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredClients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => selectCliente(c)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-0"
                      >
                        <span className="font-medium">{c.nombre} {c.apellido || ''}</span>
                        {c.telefono && <span className="text-muted-foreground ml-2">· {c.telefono}</span>}
                        {c.vehiculos?.length > 0 && <span className="text-muted-foreground ml-2">· {c.vehiculos.length} 🚗</span>}
                      </button>
                    ))}
                  </div>
                )}
                {clientSearch && filteredClients.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Sin resultados. Usa "Nuevo" para dar de alta al cliente.</p>
                )}
              </div>
            )}

            {clientMode === 'existing' && selectedCliente && (
              <div className="mb-3 flex items-center gap-2 text-sm bg-blue-50 p-2 rounded">
                <User className="h-3.5 w-3.5" />
                <span className="font-medium">{selectedCliente.nombre} {selectedCliente.apellido || ''}</span>
                {selectedCliente.telefono && <span className="text-muted-foreground">· {selectedCliente.telefono}</span>}
                <button onClick={clearCliente} className="ml-auto">
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            )}

            {/* Editable client fields: only in 'new' mode (existing is read-only from ficha) */}
            {clientMode === 'new' && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nombre <span className="text-red-500">*</span></Label>
                  <Input value={clienteNombre} onChange={e => setClienteNombre(e.target.value.toUpperCase())} placeholder="Nombre completo" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Teléfono</Label>
                  <Input value={clienteTelefono} onChange={e => setClienteTelefono(e.target.value)} placeholder="Teléfono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} placeholder="email@ejemplo.com" type="email" />
                </div>
              </div>
            )}
          </div>

          {/* VEHICULO */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="flex items-center gap-2 font-semibold text-base">
                <Car className="h-4 w-4" /> Vehículo
              </h3>
              {(clientMode === 'new' || selectedCliente) && (
                <div className="flex gap-1">
                  {clienteVehiculos.length > 0 && (
                    <Button size="sm" variant={vehiculoMode === 'existing' ? 'default' : 'outline'} onClick={() => setVehiculoMode('existing')} className="text-xs h-7">
                      De la ficha
                    </Button>
                  )}
                  <Button size="sm" variant={vehiculoMode === 'new' ? 'default' : 'outline'} onClick={() => { setVehiculoMode('new'); setSelectedVehiculoId('') }} className="text-xs h-7">
                    Nuevo
                  </Button>
                </div>
              )}
            </div>

            {vehiculoMode === 'existing' && clienteVehiculos.length > 0 ? (
              <Select value={selectedVehiculoId} onValueChange={setSelectedVehiculoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige un vehículo del cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clienteVehiculos.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.marca} {v.modelo} · {matriculaLimpia(v.matricula)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Marca</Label>
                  <Input value={nuevoVehMarca} onChange={e => setNuevoVehMarca(e.target.value.toUpperCase())} placeholder="Ej: TOYOTA" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Modelo</Label>
                  <Input value={nuevoVehModelo} onChange={e => setNuevoVehModelo(e.target.value.toUpperCase())} placeholder="Ej: COROLLA" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Matrícula</Label>
                  <Input value={nuevoVehMatricula} onChange={e => setNuevoVehMatricula(e.target.value.toUpperCase())} placeholder="1234ABC" />
                </div>
              </div>
            )}
            {clientMode === 'existing' && !selectedCliente && (
              <p className="text-xs text-muted-foreground">Elige primero un cliente para ver sus vehículos.</p>
            )}
          </div>

          <hr />

          {/* CONCEPTOS / ITEMS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-base">Conceptos</h3>
              <Button size="sm" variant="outline" onClick={addItem} className="text-xs h-7">
                <Plus className="h-3 w-3 mr-1" /> Añadir línea
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    {idx === 0 && <Label className="text-xs text-muted-foreground">Descripción</Label>}
                    <div className="flex gap-1">
                      <Input
                        value={item.descripcion}
                        onChange={e => updateItem(idx, 'descripcion', e.target.value)}
                        placeholder="Descripción del concepto"
                        className="flex-1"
                      />
                      {servicios.length > 0 && (
                        <Select onValueChange={(v) => selectServicio(idx, v)}>
                          <SelectTrigger className="w-[140px] text-xs">
                            <SelectValue placeholder="Catálogo" />
                          </SelectTrigger>
                          <SelectContent>
                            {servicios.map((s: any) => (
                              <SelectItem key={s.id} value={s.id} className="text-xs">
                                {s.nombre} ({s.precio}€)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                  <div className="w-16 space-y-1">
                    {idx === 0 && <Label className="text-xs text-muted-foreground">Cant.</Label>}
                    <Input
                      type="number"
                      min={1}
                      value={item.cantidad}
                      onChange={e => updateItem(idx, 'cantidad', parseInt(e.target.value) || 1)}
                      className="text-center"
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    {idx === 0 && <Label className="text-xs text-muted-foreground">Precio</Label>}
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={item.precioUnitario || ''}
                      onChange={e => updateItem(idx, 'precioUnitario', parseFloat(e.target.value) || 0)}
                      className="text-right"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="w-20 text-right font-medium text-sm pb-2">
                    {(item.cantidad * item.precioUnitario).toFixed(2)}€
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeItem(idx)} disabled={items.length <= 1} className="text-red-400 pb-2">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 border-t pt-3 space-y-1">
              <div className="flex justify-end text-sm">
                <span className="w-32 text-right text-muted-foreground">Base imponible:</span>
                <span className="w-24 text-right font-medium">{subtotal.toFixed(2)}€</span>
              </div>
              <div className="flex justify-end text-sm">
                <span className="w-32 text-right text-muted-foreground">IVA (21%):</span>
                <span className="w-24 text-right font-medium">{iva.toFixed(2)}€</span>
              </div>
              <div className="flex justify-end text-lg font-bold">
                <span className="w-32 text-right">Total:</span>
                <span className="w-24 text-right">{total.toFixed(2)}€</span>
              </div>
            </div>
          </div>

          <hr />

          {/* Válido hasta + Observaciones */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Válido hasta (opcional)</Label>
              <Input type="date" value={validoHasta} onChange={e => setValidoHasta(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Observaciones</Label>
            <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Notas adicionales..." rows={3} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false) }} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? 'Guardando...' : (editing ? 'Actualizar Presupuesto' : 'Crear Presupuesto')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
