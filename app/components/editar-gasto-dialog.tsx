'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Pencil } from 'lucide-react'

interface Proveedor {
  id: string
  nombre: string
  cif?: string
  direccion?: string
  codigoPostal?: string
  ciudad?: string
  provincia?: string
}

interface Gasto {
  id: string
  concepto: string
  fecha: string
  proveedor?: string | null
  proveedorId?: string | null
  tipoGasto: string
  importe: number
  metodoPago?: string | null
  tipo: string
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

const CATEGORIAS = [
  'MATERIAL_LIMPIEZA',
  'HERRAMIENTAS',
  'SUMINISTROS',
  'ALQUILER',
  'SERVICIOS',
  'IMPUESTOS',
  'SEGUROS',
  'VEHICULO',
  'MARKETING',
  'OTROS'
]

const METODOS_PAGO = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'TPV_UNICAJA', label: 'TPV Unicaja' },
]

export function EditarGastoDialog({ gasto, onGastoActualizado }: EditarGastoDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [formData, setFormData] = useState({
    concepto: '',
    fecha: '',
    proveedor: '',
    proveedorId: '',
    tipoGasto: 'OTROS',
    importe: 0,
    metodoPago: 'EFECTIVO',
    tipo: 'TICKET',
    iva: 21,
    numeroFactura: '',
    proveedorCIF: '',
    proveedorDireccion: '',
    proveedorCodigoPostal: '',
    proveedorCiudad: '',
    proveedorProvincia: '',
  })

  // Cargar proveedores
  useEffect(() => {
    const fetchProveedores = async () => {
      try {
        const res = await fetch('/api/proveedores')
        if (res.ok) {
          const data = await res.json()
          setProveedores(data)
        }
      } catch (error) {
        console.error('Error cargando proveedores:', error)
      }
    }
    if (open) {
      fetchProveedores()
    }
  }, [open])

  // Cargar datos del gasto cuando se abre el diálogo
  useEffect(() => {
    if (gasto && open) {
      setFormData({
        concepto: gasto.concepto || '',
        fecha: gasto.fecha ? format(new Date(gasto.fecha), 'yyyy-MM-dd') : '',
        proveedor: gasto.proveedor || '',
        proveedorId: gasto.proveedorId || '',
        tipoGasto: gasto.tipoGasto || 'OTROS',
        importe: gasto.importe || 0,
        metodoPago: gasto.metodoPago || 'EFECTIVO',
        tipo: gasto.tipo || 'TICKET',
        iva: gasto.iva || 21,
        numeroFactura: gasto.numeroFactura || '',
        proveedorCIF: gasto.proveedorCIF || '',
        proveedorDireccion: gasto.proveedorDireccion || '',
        proveedorCodigoPostal: gasto.proveedorCodigoPostal || '',
        proveedorCiudad: gasto.proveedorCiudad || '',
        proveedorProvincia: gasto.proveedorProvincia || '',
      })
    }
  }, [gasto, open])

  // Cuando se selecciona un proveedor existente, rellenar datos fiscales
  const handleProveedorChange = (proveedorId: string) => {
    const proveedor = proveedores.find(p => p.id === proveedorId)
    if (proveedor) {
      setFormData(prev => ({
        ...prev,
        proveedorId: proveedor.id,
        proveedor: proveedor.nombre,
        proveedorCIF: proveedor.cif || prev.proveedorCIF,
        proveedorDireccion: proveedor.direccion || prev.proveedorDireccion,
        proveedorCodigoPostal: proveedor.codigoPostal || prev.proveedorCodigoPostal,
        proveedorCiudad: proveedor.ciudad || prev.proveedorCiudad,
        proveedorProvincia: proveedor.provincia || prev.proveedorProvincia,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gasto) return

    setLoading(true)
    try {
      const res = await fetch(`/api/gastos/${gasto.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fecha: new Date(formData.fecha).toISOString(),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Error al actualizar')
      }

      toast.success('Gasto actualizado correctamente')
      onGastoActualizado()
      setOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el gasto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Gasto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Concepto</Label>
              <Input
                value={formData.concepto}
                onChange={(e) => setFormData(prev => ({ ...prev, concepto: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label>Fecha</Label>
              <Input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label>Importe (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.importe}
                onChange={(e) => setFormData(prev => ({ ...prev, importe: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>

            <div>
              <Label>Categoría</Label>
              <Select
                value={formData.tipoGasto}
                onValueChange={(value) => setFormData(prev => ({ ...prev, tipoGasto: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Método de Pago</Label>
              <Select
                value={formData.metodoPago}
                onValueChange={(value) => setFormData(prev => ({ ...prev, metodoPago: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METODOS_PAGO.map(mp => (
                    <SelectItem key={mp.value} value={mp.value}>
                      {mp.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Documento</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TICKET">Ticket</SelectItem>
                  <SelectItem value="FACTURA">Factura</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>IVA (%)</Label>
              <Input
                type="number"
                value={formData.iva}
                onChange={(e) => setFormData(prev => ({ ...prev, iva: parseFloat(e.target.value) || 21 }))}
              />
            </div>
          </div>

          {/* Datos del proveedor */}
          <div className="border-t pt-4 mt-4">
            <h3 className="font-medium mb-3">Datos del Proveedor</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Proveedor</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.proveedorId}
                    onValueChange={handleProveedorChange}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Seleccionar proveedor existente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {proveedores.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="flex-1"
                    placeholder="O escribir nombre nuevo..."
                    value={formData.proveedor}
                    onChange={(e) => setFormData(prev => ({ ...prev, proveedor: e.target.value, proveedorId: '' }))}
                  />
                </div>
              </div>

              {formData.tipo === 'FACTURA' && (
                <>
                  <div>
                    <Label>Nº Factura</Label>
                    <Input
                      value={formData.numeroFactura}
                      onChange={(e) => setFormData(prev => ({ ...prev, numeroFactura: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>CIF/NIF</Label>
                    <Input
                      value={formData.proveedorCIF}
                      onChange={(e) => setFormData(prev => ({ ...prev, proveedorCIF: e.target.value }))}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Dirección</Label>
                    <Input
                      value={formData.proveedorDireccion}
                      onChange={(e) => setFormData(prev => ({ ...prev, proveedorDireccion: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>Código Postal</Label>
                    <Input
                      value={formData.proveedorCodigoPostal}
                      onChange={(e) => setFormData(prev => ({ ...prev, proveedorCodigoPostal: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>Ciudad</Label>
                    <Input
                      value={formData.proveedorCiudad}
                      onChange={(e) => setFormData(prev => ({ ...prev, proveedorCiudad: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>Provincia</Label>
                    <Input
                      value={formData.proveedorProvincia}
                      onChange={(e) => setFormData(prev => ({ ...prev, proveedorProvincia: e.target.value }))}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
