
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

export function NuevoCierreDialog({ onCierreCreado }: NuevoCierreDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Calcular fechas por defecto (última semana)
  const hoy = new Date()
  const haceSieteDias = new Date()
  haceSieteDias.setDate(hoy.getDate() - 7)
  
  const [formData, setFormData] = useState({
    fechaInicio: haceSieteDias.toISOString().split('T')[0],
    fechaFin: hoy.toISOString().split('T')[0],
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
        setFormData({
          fechaInicio: haceSieteDias.toISOString().split('T')[0],
          fechaFin: hoy.toISOString().split('T')[0],
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nuevo Cierre de Caja</DialogTitle>
          <DialogDescription>
            Realiza el cierre de caja para el período seleccionado. El sistema calculará
            automáticamente los totales de ventas y gastos.
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
              <li>Se calcularán las ventas de facturas pagadas en este período</li>
              <li>Se calcularán los gastos registrados en este período</li>
              <li>El efectivo final será: Efectivo ventas - Gastos efectivo</li>
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
