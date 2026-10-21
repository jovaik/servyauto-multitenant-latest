'use client'

import React, { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { Calendar, Clock, User, Car, Zap, Phone, Search, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { getSelectedLocalId } from '@/lib/local-store'

interface ReservaRapidaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  selectedDate: Date
  preselectedSlot?: { time: string; box: string } | null
}

interface Sugerencia {
  id: string
  marca: string
  modelo: string
  matricula: string
  cliente: { id: string; nombre: string; apellido: string; telefono: string }
}

export function ReservaRapidaDialog({
  open,
  onOpenChange,
  onSuccess,
  selectedDate,
  preselectedSlot,
}: ReservaRapidaDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [boxes, setBoxes] = useState(['Box 1', 'Box 2', 'Box 3'])

  const emptyForm = {
    fecha: format(selectedDate, 'yyyy-MM-dd'),
    horaInicio: preselectedSlot?.time || '',
    box: preselectedSlot?.box || '',
    nombre: '',
    telefono: '',
    marca: '',
    modelo: '',
    matricula: '',
    observaciones: '',
    clienteId: '' as string,
    vehiculoId: '' as string,
  }

  const [formData, setFormData] = useState(emptyForm)

  // Autocompletar
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([])
  const [buscando, setBuscando] = useState(false)
  const [campoActivo, setCampoActivo] = useState<'nombre' | 'matricula' | null>(null)
  const debounceRef = useRef<any>(null)

  // Sync date/slot when props change
  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        fecha: format(selectedDate, 'yyyy-MM-dd'),
        horaInicio: preselectedSlot?.time || prev.horaInicio,
        box: preselectedSlot?.box || prev.box,
      }))
    }
  }, [open, selectedDate, preselectedSlot])

  // Load boxes config
  useEffect(() => {
    if (!open) return
    fetch('/api/configuracion')
      .then(r => r.ok ? r.json() : [])
      .then(configs => {
        const boxesConfig = configs?.find((c: any) => c.clave === 'boxes.nombres')
        if (boxesConfig) {
          try {
            setBoxes(JSON.parse(boxesConfig.valor))
          } catch { /* keep defaults */ }
        }
      })
      .catch(() => {})
  }, [open])

  const resetForm = () => {
    setFormData({
      ...emptyForm,
      fecha: format(selectedDate, 'yyyy-MM-dd'),
      horaInicio: preselectedSlot?.time || '',
      box: preselectedSlot?.box || '',
    })
    setSugerencias([])
    setCampoActivo(null)
  }

  // Búsqueda con debounce para autocompletar (nombre, teléfono o matrícula)
  const buscarCoincidencias = (query: string, campo: 'nombre' | 'matricula') => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 2) {
      setSugerencias([])
      setCampoActivo(null)
      return
    }
    setCampoActivo(campo)
    setBuscando(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/vehiculos/buscar?q=${encodeURIComponent(q)}`)
        if (res.ok) {
          const data = await res.json()
          // Ocultar vehículos placeholder (matrícula PEND-) salvo que busquen por nombre
          const lista: Sugerencia[] = (data.vehiculos || [])
          setSugerencias(lista)
        } else {
          setSugerencias([])
        }
      } catch {
        setSugerencias([])
      } finally {
        setBuscando(false)
      }
    }, 300)
  }

  // Al elegir una sugerencia, rellenar todo y guardar los ids para reutilizar las fichas
  const elegirSugerencia = (s: Sugerencia) => {
    const esPlaceholder = (s.matricula || '').toUpperCase().startsWith('PEND-')
    const esMarcaPendiente = (s.marca || '').toUpperCase() === 'PENDIENTE'
    setFormData(prev => ({
      ...prev,
      nombre: `${s.cliente.nombre}${s.cliente.apellido ? ' ' + s.cliente.apellido : ''}`.toUpperCase(),
      telefono: s.cliente.telefono || '',
      marca: esMarcaPendiente ? '' : (s.marca || ''),
      modelo: esMarcaPendiente ? '' : (s.modelo || ''),
      matricula: esPlaceholder ? '' : (s.matricula || ''),
      clienteId: s.cliente.id,
      vehiculoId: s.id,
    }))
    setSugerencias([])
    setCampoActivo(null)
  }

  const handleSubmit = async () => {
    if (!formData.fecha || !formData.horaInicio || !formData.nombre.trim() || !formData.telefono.trim()) {
      toast({ title: 'Faltan datos', description: 'Fecha, hora, nombre y teléfono son obligatorios.', variant: 'destructive' })
      return
    }

    const localId = getSelectedLocalId()
    if (!localId) {
      toast({ title: 'Selecciona un local', description: 'Debes seleccionar un local concreto antes de crear una reserva rápida.', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/citas/reserva-rapida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear reserva')
      }

      toast({ title: '⚡ Reserva rápida creada', description: `${formData.nombre} — ${formData.horaInicio}` })
      resetForm()
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // Dropdown de sugerencias reutilizable
  const ListaSugerencias = ({ campo }: { campo: 'nombre' | 'matricula' }) => {
    if (campoActivo !== campo) return null
    if (!buscando && sugerencias.length === 0) return null
    return (
      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-y-auto">
        {buscando && (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando...
          </div>
        )}
        {!buscando && sugerencias.map((s) => {
          const nombreCompleto = `${s.cliente.nombre}${s.cliente.apellido ? ' ' + s.cliente.apellido : ''}`
          const esPlaceholder = (s.matricula || '').toUpperCase().startsWith('PEND-')
          const esMarcaPendiente = (s.marca || '').toUpperCase() === 'PENDIENTE'
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => elegirSugerencia(s)}
              className="flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-left text-sm hover:bg-accent last:border-b-0"
            >
              <span className="font-semibold">{nombreCompleto.toUpperCase()}</span>
              <span className="text-xs text-muted-foreground">
                {s.cliente.telefono || 'Sin teléfono'}
                {!esMarcaPendiente && ` · ${s.marca} ${s.modelo}`}
                {!esPlaceholder && ` · ${s.matricula}`}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Zap className="h-6 w-6 text-orange-500" />
            Reserva Rápida
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Escribe el nombre o la matrícula y, si el cliente ya existe, se rellenan sus datos solos (sin duplicar fichas).
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Fecha y Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 font-medium">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Fecha <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 font-medium">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Hora <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.horaInicio}
                onValueChange={(v) => setFormData(prev => ({ ...prev, horaInicio: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona hora" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 36 }, (_, i) => {
                    const hour = Math.floor(i / 2) + 6
                    const min = i % 2 === 0 ? '00' : '30'
                    if (hour > 23) return null
                    const t = `${String(hour).padStart(2, '0')}:${min}`
                    return <SelectItem key={t} value={t}>{t}</SelectItem>
                  }).filter(Boolean)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Box */}
          <div className="space-y-2">
            <Label className="font-medium">Box</Label>
            <Select
              value={formData.box}
              onValueChange={(v) => setFormData(prev => ({ ...prev, box: v === '__none__' ? '' : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona box (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin asignar</SelectItem>
                {boxes.map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <hr className="border-muted" />

          {/* Datos del Cliente */}
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-base mb-3">
              <User className="h-4 w-4" />
              Datos del Cliente
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 relative">
                <Label className="flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Escribe para buscar..."
                  value={formData.nombre}
                  autoComplete="off"
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase()
                    setFormData(prev => ({ ...prev, nombre: val, clienteId: '', vehiculoId: '' }))
                    buscarCoincidencias(val, 'nombre')
                  }}
                  onBlur={() => setTimeout(() => setCampoActivo(c => c === 'nombre' ? null : c), 150)}
                />
                <ListaSugerencias campo="nombre" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Teléfono <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Teléfono del cliente"
                  value={formData.telefono}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value, clienteId: '', vehiculoId: '' }))}
                />
              </div>
            </div>
          </div>

          <hr className="border-muted" />

          {/* Datos del Coche */}
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-base mb-1">
              <Car className="h-4 w-4" />
              Datos del Coche
              <span className="text-sm font-normal text-muted-foreground">(opcionales)</span>
            </h3>
            <div className="space-y-2 relative mt-3">
              <Label className="flex items-center gap-1.5 font-medium">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                Matrícula
              </Label>
              <Input
                placeholder="Escribe la matrícula para buscar..."
                value={formData.matricula}
                autoComplete="off"
                onChange={(e) => {
                  const val = e.target.value.toUpperCase()
                  setFormData(prev => ({ ...prev, matricula: val, clienteId: '', vehiculoId: '' }))
                  buscarCoincidencias(val, 'matricula')
                }}
                onBlur={() => setTimeout(() => setCampoActivo(c => c === 'matricula' ? null : c), 150)}
              />
              <ListaSugerencias campo="matricula" />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="space-y-2">
                <Label className="font-medium">Marca</Label>
                <Input
                  placeholder="Ej: Toyota"
                  value={formData.marca}
                  onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value, vehiculoId: '' }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Modelo</Label>
                <Input
                  placeholder="Ej: Corolla"
                  value={formData.modelo}
                  onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value, vehiculoId: '' }))}
                />
              </div>
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label className="font-medium">Observaciones</Label>
            <Textarea
              placeholder="Notas adicionales..."
              value={formData.observaciones}
              onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false) }} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !formData.nombre.trim() || !formData.telefono.trim() || !formData.horaInicio}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {loading ? 'Creando...' : '⚡ Crear Reserva Rápida'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
