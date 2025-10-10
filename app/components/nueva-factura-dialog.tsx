

'use client'

import React, { useState, useEffect } from 'react'
import { Plus, CreditCard, FileText, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

interface Cliente {
  id: string
  nombre: string
  apellido: string
  email?: string
}

interface Cita {
  id: string
  fecha: string
  cliente: Cliente
  servicios: any[]
}

interface ItemFactura {
  descripcion: string
  cantidad: number
  precio: number
  total: number
}

interface NuevaFacturaDialogProps {
  onFacturaCreada: () => void
}

export function NuevaFacturaDialog({ onFacturaCreada }: NuevaFacturaDialogProps) {
  const [open, setOpen] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(false)
  
  // Form data
  const [clienteSeleccionado, setClienteSeleccionado] = useState('')
  const [citaSeleccionada, setCitaSeleccionada] = useState('')
  const [metodoPago, setMetodoPago] = useState<string>('')
  const [solicitaFactura, setSolicitaFactura] = useState(false)
  const [items, setItems] = useState<ItemFactura[]>([
    { descripcion: '', cantidad: 1, precio: 0, total: 0 }
  ])
  const [datosFacturacion, setDatosFacturacion] = useState({
    nombreFiscal: '',
    nif: '',
    direccion: '',
    ciudad: '',
    codigoPostal: '',
    telefono: ''
  })

  useEffect(() => {
    if (open) {
      cargarClientes()
      cargarCitas()
    }
  }, [open])

  const cargarClientes = async () => {
    try {
      const response = await fetch('/api/clientes')
      if (response.ok) {
        const data = await response.json()
        setClientes(data || [])
      }
    } catch (error) {
      console.error('Error loading clientes:', error)
    }
  }

  const cargarCitas = async () => {
    try {
      const response = await fetch('/api/citas')
      if (response.ok) {
        const data = await response.json()
        setCitas(data || [])
      }
    } catch (error) {
      console.error('Error loading citas:', error)
    }
  }

  const agregarItem = () => {
    setItems([...items, { descripcion: '', cantidad: 1, precio: 0, total: 0 }])
  }

  const actualizarItem = (index: number, field: keyof ItemFactura, value: string | number) => {
    const nuevosItems = [...items]
    nuevosItems[index] = { ...nuevosItems[index], [field]: value }
    
    // Calcular total del item
    if (field === 'cantidad' || field === 'precio') {
      nuevosItems[index].total = nuevosItems[index].cantidad * nuevosItems[index].precio
    }
    
    setItems(nuevosItems)
  }

  const eliminarItem = (index: number) => {
    if (items.length > 1) {
      const nuevosItems = items.filter((_, i) => i !== index)
      setItems(nuevosItems)
    }
  }

  const calcularTotales = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const iva = subtotal * 0.21
    const total = subtotal + iva
    return { subtotal, iva, total }
  }

  const determinarTipoDocumento = () => {
    if (solicitaFactura) return 'FACTURA'
    if (metodoPago === 'TPV_UNICAJA') return 'FACTURA'
    if (metodoPago === 'EFECTIVO' || metodoPago === 'TPV_SUMUP') return 'TICKET'
    return 'TICKET' // Por defecto TICKET
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!clienteSeleccionado || !metodoPago || items.some(item => !item.descripcion || item.precio <= 0)) {
      alert('Por favor complete todos los campos requeridos')
      return
    }

    setLoading(true)
    
    try {
      const facturaData = {
        clienteId: clienteSeleccionado,
        citaId: citaSeleccionada && citaSeleccionada !== 'sin-cita' ? citaSeleccionada : null,
        items: items.filter(item => item.descripcion && item.precio > 0),
        metodoPago,
        solicitaFactura,
        datosFacturacion: determinarTipoDocumento() === 'FACTURA' ? datosFacturacion : null
      }

      console.log('Enviando datos de factura:', facturaData)

      const response = await fetch('/api/facturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facturaData)
      })

      if (response.ok) {
        const factura = await response.json()
        setOpen(false)
        resetForm()
        onFacturaCreada()
        
        // Mostrar mensaje de éxito con información del documento generado
        const tipoDoc = determinarTipoDocumento()
        alert(`${tipoDoc} creado correctamente: ${factura.numero}`)
      } else {
        const errorData = await response.json()
        console.error('Error del servidor:', errorData)
        alert(`Error al crear la factura: ${errorData.error || 'Error desconocido'}`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al crear la factura. Intente de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setClienteSeleccionado('')
    setCitaSeleccionada('')
    setMetodoPago('')
    setSolicitaFactura(false)
    setItems([{ descripcion: '', cantidad: 1, precio: 0, total: 0 }])
    setDatosFacturacion({
      nombreFiscal: '',
      nif: '',
      direccion: '',
      ciudad: '',
      codigoPostal: '',
      telefono: ''
    })
  }

  const { subtotal, iva, total } = calcularTotales()
  const tipoDocumento = determinarTipoDocumento()
  const requiereDatosFacturacion = tipoDocumento === 'FACTURA'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Factura
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Crear Nueva Factura o Ticket
          </DialogTitle>
          <DialogDescription>
            Complete los datos para generar un nuevo documento de facturación
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Cliente y Método de Pago */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cliente">Cliente *</Label>
              <Select value={clienteSeleccionado} onValueChange={setClienteSeleccionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nombre} {cliente.apellido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cita">Cita (opcional)</Label>
              <Select value={citaSeleccionada} onValueChange={setCitaSeleccionada}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cita" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sin-cita">Sin cita asociada</SelectItem>
                  {citas.map((cita) => (
                    <SelectItem key={cita.id} value={cita.id}>
                      {cita.cliente.nombre} - {new Date(cita.fecha).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Método de Pago */}
          <div>
            <Label htmlFor="metodoPago">Método de Pago *</Label>
            <Select value={metodoPago} onValueChange={setMetodoPago}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar método de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EFECTIVO">Efectivo (TICKET)</SelectItem>
                <SelectItem value="TPV_SUMUP">TPV SUMUP (TICKET)</SelectItem>
                <SelectItem value="TPV_UNICAJA">TPV UNICAJA (FACTURA)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Documento Resultante */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium">Documento a generar:</p>
              <Badge className={tipoDocumento === 'FACTURA' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                {tipoDocumento}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="solicitaFactura" 
                checked={solicitaFactura}
                onCheckedChange={(checked) => setSolicitaFactura(!!checked)}
              />
              <Label htmlFor="solicitaFactura" className="text-sm">
                Cliente solicita factura expresamente
              </Label>
            </div>
          </div>

          {/* Items de la Factura */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label>Items de Facturación *</Label>
              <Button type="button" variant="outline" size="sm" onClick={agregarItem}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar Item
              </Button>
            </div>
            
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-5 gap-2 p-3 border rounded">
                  <div className="col-span-2">
                    <Input
                      placeholder="Descripción"
                      value={item.descripcion}
                      onChange={(e) => actualizarItem(index, 'descripcion', e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Cant."
                      value={item.cantidad}
                      onChange={(e) => actualizarItem(index, 'cantidad', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Precio €"
                      value={item.precio}
                      onChange={(e) => actualizarItem(index, 'precio', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">€{item.total.toFixed(2)}</span>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => eliminarItem(index)}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Datos de Facturación (si es necesario) */}
          {requiereDatosFacturacion && (
            <div>
              <Label className="text-base font-medium">Datos de Facturación</Label>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <Label htmlFor="nombreFiscal">Nombre Fiscal *</Label>
                  <Input
                    id="nombreFiscal"
                    value={datosFacturacion.nombreFiscal}
                    onChange={(e) => setDatosFacturacion({...datosFacturacion, nombreFiscal: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="nif">NIF/CIF *</Label>
                  <Input
                    id="nif"
                    value={datosFacturacion.nif}
                    onChange={(e) => setDatosFacturacion({...datosFacturacion, nif: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    value={datosFacturacion.direccion}
                    onChange={(e) => setDatosFacturacion({...datosFacturacion, direccion: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="ciudad">Ciudad</Label>
                  <Input
                    id="ciudad"
                    value={datosFacturacion.ciudad}
                    onChange={(e) => setDatosFacturacion({...datosFacturacion, ciudad: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="codigoPostal">Código Postal</Label>
                  <Input
                    id="codigoPostal"
                    value={datosFacturacion.codigoPostal}
                    onChange={(e) => setDatosFacturacion({...datosFacturacion, codigoPostal: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Totales */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>€{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA (21%):</span>
                <span>€{iva.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>€{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : `Crear ${tipoDocumento}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

