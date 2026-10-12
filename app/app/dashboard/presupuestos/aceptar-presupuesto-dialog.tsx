'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, Clock, MapPin } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

interface Presupuesto {
  id: string
  numero: string
  clienteNombre: string
  total: number
  items: any[]
}

interface AceptarPresupuestoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  presupuesto: Presupuesto | null
  onSuccess: () => void
}

export function AceptarPresupuestoDialog({
  open,
  onOpenChange,
  presupuesto,
  onSuccess,
}: AceptarPresupuestoDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [boxes, setBoxes] = useState(['Box 1', 'Box 2', 'Box 3'])
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [horaInicio, setHoraInicio] = useState('09:00')
  const [horaFin, setHoraFin] = useState('10:00')
  const [box, setBox] = useState('Box 1')

  useEffect(() => {
    if (open) {
      setFecha(format(new Date(), 'yyyy-MM-dd'))
      setHoraInicio('09:00')
      setHoraFin('10:00')
      setBox('Box 1')
      // Cargar boxes de configuración
      fetch('/api/configuracion')
        .then(r => r.ok ? r.json() : [])
        .then((configs: any[]) => {
          const boxesConfig = configs?.find((c: any) => c.clave === 'boxes.nombres')
          if (boxesConfig) {
            try { setBoxes(JSON.parse(boxesConfig.valor)) } catch {}
          }
        })
        .catch(() => {})
    }
  }, [open])

  // Auto-calcular hora fin al cambiar hora inicio
  useEffect(() => {
    if (horaInicio) {
      const [h, m] = horaInicio.split(':').map(Number)
      const endH = Math.min((h || 9) + 1, 23)
      setHoraFin(`${String(endH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`)
    }
  }, [horaInicio])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!presupuesto) return

    setLoading(true)
    try {
      const res = await fetch(`/api/presupuestos/${presupuesto.id}/aceptar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, horaInicio, horaFin, box }),
      })
      if (res.ok) {
        toast({
          title: 'Presupuesto aceptado',
          description: `Se ha creado la cita para el ${format(new Date(fecha + 'T12:00:00'), "d 'de' MMMM", { locale: es })} a las ${horaInicio}.`,
        })
        onSuccess()
        onOpenChange(false)
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Error al aceptar', description: err.error || 'Inténtalo de nuevo', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error al aceptar', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (!presupuesto) return null

  const lineasCatalogo = presupuesto.items.filter((i: any) => i.servicioId)
  const lineasManuales = presupuesto.items.filter((i: any) => !i.servicioId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Aceptar Presupuesto {presupuesto.numero}
          </DialogTitle>
          <DialogDescription>
            Elige fecha, hora y box para crear la cita de <strong>{presupuesto.clienteNombre}</strong> ({presupuesto.total.toFixed(2)}€)
          </DialogDescription>
        </DialogHeader>

        {/* Resumen de lo que se va a cargar */}
        <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
          <div className="font-semibold text-gray-700">Se cargará en la cita:</div>
          {lineasCatalogo.map((it: any, i: number) => (
            <div key={i} className="flex justify-between">
              <span>✅ {it.descripcion}</span>
              <span className="font-medium">{(it.cantidad * it.precioUnitario).toFixed(2)}€</span>
            </div>
          ))}
          {lineasManuales.map((it: any, i: number) => (
            <div key={`m${i}`} className="flex justify-between text-blue-700">
              <span>📝 {it.descripcion} (x{it.cantidad})</span>
              <span className="font-medium">{(it.cantidad * it.precioUnitario).toFixed(2)}€</span>
            </div>
          ))}
          <div className="flex justify-between font-bold border-t pt-1 mt-1">
            <span>Total</span>
            <span>{presupuesto.total.toFixed(2)}€</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha *</Label>
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="box">Box *</Label>
              <Select value={box} onValueChange={setBox}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona box" />
                </SelectTrigger>
                <SelectContent>
                  {boxes.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="horaInicio">
                Hora inicio *
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="horaInicio"
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="pl-10"
                  required
                  min="06:00"
                  max="23:59"
                  step="60"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="horaFin">
                Hora recogida *
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="horaFin"
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  className="pl-10"
                  required
                  min="06:00"
                  max="23:59"
                  step="60"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? 'Aceptando...' : 'Aceptar y meter en agenda'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
