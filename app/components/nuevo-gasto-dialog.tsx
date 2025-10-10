
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface NuevoGastoDialogProps {
  onGastoCreado: () => void
}

export function NuevoGastoDialog({ onGastoCreado }: NuevoGastoDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    concepto: '',
    fecha: new Date().toISOString().split('T')[0],
    proveedor: '',
    tipoGasto: '',
    importe: '',
    tipo: 'TICKET',
    iva: '21'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/gastos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        alert('Gasto creado correctamente')
        setOpen(false)
        setFormData({
          concepto: '',
          fecha: new Date().toISOString().split('T')[0],
          proveedor: '',
          tipoGasto: '',
          importe: '',
          tipo: 'TICKET',
          iva: '21'
        })
        onGastoCreado()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al crear gasto')
      }
    } catch (error) {
      console.error('Error creating gasto:', error)
      alert('Error al crear gasto. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Gasto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nuevo Gasto</DialogTitle>
          <DialogDescription>
            Registra un nuevo gasto o compra del taller
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="concepto">Concepto *</Label>
            <Input
              id="concepto"
              placeholder="Ej: Aceite motor, Herramientas, etc."
              value={formData.concepto}
              onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha *</Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="importe">Importe (€) *</Label>
              <Input
                id="importe"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.importe}
                onChange={(e) => setFormData({ ...formData, importe: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proveedor">Proveedor</Label>
            <Input
              id="proveedor"
              placeholder="Nombre del proveedor"
              value={formData.proveedor}
              onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipoGasto">Tipo de Gasto *</Label>
            <Input
              id="tipoGasto"
              placeholder="Ej: Materiales, Servicios, Suministros, etc."
              value={formData.tipoGasto}
              onChange={(e) => setFormData({ ...formData, tipoGasto: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo Documento *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TICKET">Ticket</SelectItem>
                  <SelectItem value="FACTURA">Factura</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="iva">IVA (%) *</Label>
              <Select
                value={formData.iva}
                onValueChange={(value) => setFormData({ ...formData, iva: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="% IVA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="4">4%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="21">21%</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              {loading ? 'Guardando...' : 'Crear Gasto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
