'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { toast } from 'sonner'

interface ServicioTaller {
  id: string
  fecha: string
  concepto: string
  tipoGasto: string
  costeProducto: number
  costeManoObra?: number
  precioProducto: number
  precioManoObra: number
  importe: number
  margen: number
  metodoPago: string
  tipo: string
  iva: number
  cliente: {
    nombre: string
    apellido: string | null
  }
  vehiculo: {
    marca: string
    modelo: string
    matricula: string
  }
  factura: {
    numero: string
    tipo: string
  } | null
}

interface EditarServicioTallerDialogProps {
  servicio: ServicioTaller | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function EditarServicioTallerDialog({
  servicio,
  open,
  onOpenChange,
  onSuccess
}: EditarServicioTallerDialogProps) {
  const [loading, setLoading] = useState(false)
  const [fecha, setFecha] = useState('')
  const [concepto, setConcepto] = useState('')
  const [tipoGasto, setTipoGasto] = useState('')
  const [costeProducto, setCosteProducto] = useState('')
  const [costeManoObra, setCosteManoObra] = useState('')
  const [precioProducto, setPrecioProducto] = useState('')
  const [precioManoObra, setPrecioManoObra] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [tipo, setTipo] = useState('TICKET')
  const [iva, setIva] = useState('21')

  // Calcular totales automáticamente
  const total = (parseFloat(precioProducto) || 0) + (parseFloat(precioManoObra) || 0)
  const margen = (parseFloat(precioProducto) || 0) - (parseFloat(costeProducto) || 0)

  useEffect(() => {
    if (servicio && open) {
      setFecha(servicio.fecha ? new Date(servicio.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
      setConcepto(servicio.concepto || '')
      setTipoGasto(servicio.tipoGasto || '')
      setCosteProducto(servicio.costeProducto?.toString() || '0')
      setCosteManoObra(servicio.costeManoObra?.toString() || '0')
      setPrecioProducto(servicio.precioProducto?.toString() || '0')
      setPrecioManoObra(servicio.precioManoObra?.toString() || '0')
      setMetodoPago(servicio.metodoPago || 'EFECTIVO')
      setTipo(servicio.tipo || 'TICKET')
      setIva(servicio.iva?.toString() || '21')
    }
  }, [servicio, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!servicio) return

    setLoading(true)

    try {
      const response = await fetch(`/api/servicios-taller/${servicio.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha,
          concepto,
          tipoGasto,
          costeProducto: parseFloat(costeProducto) || 0,
          costeManoObra: parseFloat(costeManoObra) || 0,
          precioProducto: parseFloat(precioProducto) || 0,
          precioManoObra: parseFloat(precioManoObra) || 0,
          metodoPago,
          tipo,
          iva: parseFloat(iva) || 21
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar el servicio')
      }

      toast.success('Servicio actualizado correctamente')
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Error al actualizar el servicio')
    } finally {
      setLoading(false)
    }
  }

  if (!servicio) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Servicio de Taller</DialogTitle>
          <DialogDescription>
            Cliente: {servicio.cliente.nombre} {servicio.cliente.apellido || ''} | 
            Vehículo: {servicio.vehiculo.marca} {servicio.vehiculo.modelo} ({servicio.vehiculo.matricula})
            {servicio.factura && (
              <span className="block mt-1 text-sm">
                📄 {servicio.factura.tipo}: {servicio.factura.numero}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fecha y Tipo */}
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
              <Label htmlFor="tipoGasto">Tipo de Servicio *</Label>
              <Select value={tipoGasto} onValueChange={setTipoGasto} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Batería">Batería</SelectItem>
                  <SelectItem value="Frenos">Frenos</SelectItem>
                  <SelectItem value="Neumáticos">Neumáticos</SelectItem>
                  <SelectItem value="Aceite">Aceite y Filtros</SelectItem>
                  <SelectItem value="Mecánica">Mecánica General</SelectItem>
                  <SelectItem value="Electricidad">Electricidad</SelectItem>
                  <SelectItem value="Chapa y Pintura">Chapa y Pintura</SelectItem>
                  <SelectItem value="Otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Concepto */}
          <div className="space-y-2">
            <Label htmlFor="concepto">Concepto / Descripción del Servicio *</Label>
            <Input
              id="concepto"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej: Cambio de batería, Cambio de pastillas de freno"
              required
            />
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">💰 Costes Internos (no aparecen en factura)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="costeProducto">Coste del Producto</Label>
                <Input
                  id="costeProducto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={costeProducto}
                  onChange={(e) => setCosteProducto(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">Lo que te costó la pieza/producto</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="costeManoObra">Coste Mano de Obra</Label>
                <Input
                  id="costeManoObra"
                  type="number"
                  step="0.01"
                  min="0"
                  value={costeManoObra}
                  onChange={(e) => setCosteManoObra(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">Coste interno de mano de obra</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">💵 Precio al Cliente (aparece en factura)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="precioProducto">Precio Producto *</Label>
                <Input
                  id="precioProducto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={precioProducto}
                  onChange={(e) => setPrecioProducto(e.target.value)}
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-muted-foreground">Precio de venta al cliente</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="precioManoObra">Mano de Obra *</Label>
                <Input
                  id="precioManoObra"
                  type="number"
                  step="0.01"
                  min="0"
                  value={precioManoObra}
                  onChange={(e) => setPrecioManoObra(e.target.value)}
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-muted-foreground">Precio de la mano de obra</p>
              </div>
            </div>
          </div>

          {/* Método de Pago e IVA */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="metodoPago">Método de Pago *</Label>
              <Select value={metodoPago} onValueChange={setMetodoPago} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                  <SelectItem value="TPV_SUMUP">TPV SumUp</SelectItem>
                  <SelectItem value="TPV_UNICAJA">TPV Unicaja</SelectItem>
                  <SelectItem value="REVOLUT">Revolut</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="iva">IVA (%)</Label>
              <Select value={iva} onValueChange={setIva}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar IVA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="21">21%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="4">4%</SelectItem>
                  <SelectItem value="0">0% (Exento)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Resumen automático */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-lg">
              <span className="font-medium">TOTAL:</span>
              <span className="font-bold">{total.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Margen (Beneficio):</span>
              <span className={margen >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                {margen.toFixed(2)} €
              </span>
            </div>
          </div>

          {servicio.factura && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Este servicio ya tiene una {servicio.factura.tipo} asociada ({servicio.factura.numero}). 
                Al guardar se actualizarán también los datos de la factura.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
