
'use client'

import React, { useState, useEffect } from 'react'
import { Pencil } from 'lucide-react'
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
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

interface Gasto {
  id: string
  concepto: string
  fecha: string
  proveedor: string | null
  tipoGasto: string
  importe: number
  tipo: 'TICKET' | 'FACTURA'
  iva: number
  numeroFactura?: string | null
  proveedorCIF?: string | null
  proveedorDireccion?: string | null
  proveedorCodigoPostal?: string | null
  proveedorCiudad?: string | null
  proveedorProvincia?: string | null
}

interface EditarGastoDialogProps {
  gasto: Gasto
  onGastoActualizado: () => void
}

export function EditarGastoDialog({ gasto, onGastoActualizado }: EditarGastoDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    concepto: gasto.concepto,
    fecha: new Date(gasto.fecha).toISOString().split('T')[0],
    proveedor: gasto.proveedor || '',
    tipoGasto: gasto.tipoGasto,
    importe: gasto.importe.toString(),
    tipo: gasto.tipo,
    iva: gasto.iva.toString(),
    numeroFactura: gasto.numeroFactura || '',
    proveedorCIF: gasto.proveedorCIF || '',
    proveedorDireccion: gasto.proveedorDireccion || '',
    proveedorCodigoPostal: gasto.proveedorCodigoPostal || '',
    proveedorCiudad: gasto.proveedorCiudad || '',
    proveedorProvincia: gasto.proveedorProvincia || ''
  })

  useEffect(() => {
    if (open) {
      setFormData({
        concepto: gasto.concepto,
        fecha: new Date(gasto.fecha).toISOString().split('T')[0],
        proveedor: gasto.proveedor || '',
        tipoGasto: gasto.tipoGasto,
        importe: gasto.importe.toString(),
        tipo: gasto.tipo,
        iva: gasto.iva.toString(),
        numeroFactura: gasto.numeroFactura || '',
        proveedorCIF: gasto.proveedorCIF || '',
        proveedorDireccion: gasto.proveedorDireccion || '',
        proveedorCodigoPostal: gasto.proveedorCodigoPostal || '',
        proveedorCiudad: gasto.proveedorCiudad || '',
        proveedorProvincia: gasto.proveedorProvincia || ''
      })
    }
  }, [open, gasto])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/gastos/${gasto.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        alert('Gasto actualizado correctamente')
        setOpen(false)
        onGastoActualizado()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al actualizar gasto')
      }
    } catch (error) {
      console.error('Error updating gasto:', error)
      alert('Error al actualizar gasto. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => {
          e.preventDefault()
          setOpen(true)
        }}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Gasto</DialogTitle>
          <DialogDescription>
            Modifica los datos del gasto
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="concepto">Concepto *</Label>
            <Input
              id="concepto"
              placeholder="Concepto del gasto"
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
              placeholder="Tipo de gasto"
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
                onValueChange={(value) => setFormData({ ...formData, tipo: value as 'FACTURA' | 'TICKET' })}
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

          {/* Campos adicionales para FACTURA */}
          {formData.tipo === 'FACTURA' && (
            <div className="space-y-4 border-t pt-4">
              <div className="mb-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Datos Fiscales del Proveedor
                </h4>
                <p className="text-xs text-muted-foreground">
                  Requeridos para el libro de IVA
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numeroFactura">Número de Factura *</Label>
                <Input
                  id="numeroFactura"
                  placeholder="Ej: 2025-0001"
                  value={formData.numeroFactura}
                  onChange={(e) => setFormData({ ...formData, numeroFactura: e.target.value })}
                  required={formData.tipo === 'FACTURA'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proveedor-factura">Razón Social *</Label>
                  <Input
                    id="proveedor-factura"
                    placeholder="Nombre del proveedor"
                    value={formData.proveedor}
                    onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                    required={formData.tipo === 'FACTURA'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proveedorCIF">CIF/NIF *</Label>
                  <Input
                    id="proveedorCIF"
                    placeholder="Ej: B12345678"
                    value={formData.proveedorCIF}
                    onChange={(e) => setFormData({ ...formData, proveedorCIF: e.target.value })}
                    required={formData.tipo === 'FACTURA'}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="proveedorDireccion">Dirección *</Label>
                <Input
                  id="proveedorDireccion"
                  placeholder="Calle, número, etc."
                  value={formData.proveedorDireccion}
                  onChange={(e) => setFormData({ ...formData, proveedorDireccion: e.target.value })}
                  required={formData.tipo === 'FACTURA'}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proveedorCodigoPostal">C.P. *</Label>
                  <Input
                    id="proveedorCodigoPostal"
                    placeholder="28001"
                    value={formData.proveedorCodigoPostal}
                    onChange={(e) => setFormData({ ...formData, proveedorCodigoPostal: e.target.value })}
                    required={formData.tipo === 'FACTURA'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proveedorCiudad">Ciudad *</Label>
                  <Input
                    id="proveedorCiudad"
                    placeholder="Madrid"
                    value={formData.proveedorCiudad}
                    onChange={(e) => setFormData({ ...formData, proveedorCiudad: e.target.value })}
                    required={formData.tipo === 'FACTURA'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proveedorProvincia">Provincia *</Label>
                  <Input
                    id="proveedorProvincia"
                    placeholder="Madrid"
                    value={formData.proveedorProvincia}
                    onChange={(e) => setFormData({ ...formData, proveedorProvincia: e.target.value })}
                    required={formData.tipo === 'FACTURA'}
                  />
                </div>
              </div>
            </div>
          )}

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
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
