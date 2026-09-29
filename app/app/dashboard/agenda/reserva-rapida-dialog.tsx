'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Calendar, Clock, User, Car, Zap, Phone, FileText } from 'lucide-react'
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

  const [formData, setFormData] = useState({
    fecha: format(selectedDate, 'yyyy-MM-dd'),
    horaInicio: preselectedSlot?.time || '',
    box: preselectedSlot?.box || '',
    nombre: '',
    telefono: '',
    marca: '',
    modelo: '',
    observaciones: '',
  })

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
      fecha: format(selectedDate, 'yyyy-MM-dd'),
      horaInicio: preselectedSlot?.time || '',
      box: preselectedSlot?.box || '',
      nombre: '',
      telefono: '',
      marca: '',
      modelo: '',
      observaciones: '',
    })
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Zap className="h-6 w-6 text-orange-500" />
            Reserva Rápida
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Crea una pre-reserva con los datos mínimos. Podrás completar el resto cuando llegue el cliente.
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
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Nombre del cliente"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Teléfono <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Teléfono del cliente"
                  value={formData.telefono}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
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
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="space-y-2">
                <Label className="font-medium">Marca</Label>
                <Input
                  placeholder="Ej: Toyota"
                  value={formData.marca}
                  onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Modelo</Label>
                <Input
                  placeholder="Ej: Corolla"
                  value={formData.modelo}
                  onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
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
