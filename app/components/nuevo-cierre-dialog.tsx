
'use client'

import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface NuevoCierreDialogProps {
  onCierreCreado: () => void
}

// Función para obtener el lunes de la semana actual o anterior
function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Ajuste cuando es domingo
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

// Función para obtener el domingo de la semana
function getSunday(monday: Date): Date {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return sunday
}

export function NuevoCierreDialog({ onCierreCreado }: NuevoCierreDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Calcular fechas por defecto (semana laboral: lunes a domingo)
  const hoy = new Date()
  const lunesActual = getMonday(hoy)
  
  // Si hoy es lunes, usar la semana anterior completa (lunes a domingo)
  // Si no, usar desde el lunes de esta semana hasta ayer
  let fechaInicioPorDefecto: Date
  let fechaFinPorDefecto: Date
  
  if (hoy.getDay() === 1) {
    // Es lunes, usar la semana anterior completa
    const lunesAnterior = new Date(lunesActual)
    lunesAnterior.setDate(lunesActual.getDate() - 7)
    fechaInicioPorDefecto = lunesAnterior
    fechaFinPorDefecto = getSunday(lunesAnterior)
  } else {
    // No es lunes, usar desde el lunes de esta semana hasta ayer
    fechaInicioPorDefecto = lunesActual
    const ayer = new Date(hoy)
    ayer.setDate(hoy.getDate() - 1)
    ayer.setHours(23, 59, 59, 999)
    fechaFinPorDefecto = ayer
  }
  
  const [formData, setFormData] = useState({
    fechaInicio: fechaInicioPorDefecto.toISOString().split('T')[0],
    fechaFin: fechaFinPorDefecto.toISOString().split('T')[0],
    observaciones: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/cierres-caja', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        alert('Cierre de caja creado correctamente')
        setOpen(false)
        
        // Recalcular fechas para el siguiente cierre
        const nuevaFechaHoy = new Date()
        const nuevoLunesActual = getMonday(nuevaFechaHoy)
        
        let nuevaFechaInicio: Date
        let nuevaFechaFin: Date
        
        if (nuevaFechaHoy.getDay() === 1) {
          const nuevoLunesAnterior = new Date(nuevoLunesActual)
          nuevoLunesAnterior.setDate(nuevoLunesActual.getDate() - 7)
          nuevaFechaInicio = nuevoLunesAnterior
          nuevaFechaFin = getSunday(nuevoLunesAnterior)
        } else {
          nuevaFechaInicio = nuevoLunesActual
          const ayer = new Date(nuevaFechaHoy)
          ayer.setDate(nuevaFechaHoy.getDate() - 1)
          ayer.setHours(23, 59, 59, 999)
          nuevaFechaFin = ayer
        }
        
        setFormData({
          fechaInicio: nuevaFechaInicio.toISOString().split('T')[0],
          fechaFin: nuevaFechaFin.toISOString().split('T')[0],
          observaciones: ''
        })
        onCierreCreado()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al crear cierre de caja')
      }
    } catch (error) {
      console.error('Error creating cierre:', error)
      alert('Error al crear cierre de caja. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cierre de Caja
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Cierre de Caja</DialogTitle>
          <DialogDescription>
            Realiza el cierre de caja semanal (lunes a domingo). El sistema calculará
            automáticamente los totales de ventas (facturas + citas completadas) y gastos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fechaInicio">Fecha Inicio *</Label>
            <Input
              id="fechaInicio"
              type="date"
              value={formData.fechaInicio}
              onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechaFin">Fecha Fin *</Label>
            <Input
              id="fechaFin"
              type="date"
              value={formData.fechaFin}
              onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              placeholder="Notas o comentarios sobre este cierre..."
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              rows={3}
            />
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Información:</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Se calcularán las ventas de facturas pagadas + citas completadas en este período</li>
              <li>Se calcularán los gastos registrados en este período</li>
              <li>El efectivo final será: Efectivo ventas - Gastos efectivo</li>
              <li>La semana laboral va de lunes a domingo</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Cierre'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
