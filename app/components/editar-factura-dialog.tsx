
'use client'

import React, { useState, useEffect } from 'react'
import { Edit, Save, X, Search, Building2, User } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface EditarFacturaDialogProps {
  facturaId: string
  facturaNumero: string
  onFacturaActualizada: () => void
}

interface Cliente {
  id: string
  nombre: string
  apellido: string
  telefono?: string
  documento?: string
}

interface FacturaCompleta {
  id: string
  numero: string
  tipo: 'TICKET' | 'FACTURA'
  estado: 'PENDIENTE' | 'PAGADA' | 'VENCIDA' | 'CANCELADA'
  metodoPago?: string
  subtotal: number
  iva: number
  total: number
  clienteId: string
  items: Array<{
    id: string
    descripcion: string
    cantidad: number
    precio: number
    total: number
  }>
  cliente: {
    id: string
    nombre: string
    apellido: string
  }
  datosFacturacion?: string
}

export function EditarFacturaDialog({ facturaId, facturaNumero, onFacturaActualizada }: EditarFacturaDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [factura, setFactura] = useState<FacturaCompleta | null>(null)
  
  // Estados editables
  const [estado, setEstado] = useState<string>('')
  const [metodoPago, setMetodoPago] = useState<string>('')
  const [items, setItems] = useState<Array<{
    id: string
    descripcion: string
    cantidad: number
    precio: number
    total: number
  }>>([])
  
  // Estados para cambio de cliente
  const [clienteId, setClienteId] = useState<string>('')
  const [clienteNombre, setClienteNombre] = useState<string>('')
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [mostrarBuscador, setMostrarBuscador] = useState(false)
  
  // Estados para crear nuevo cliente
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    apellido: '',
    documento: '',
    telefono: '',
    direccion: ''
  })
  const [creandoCliente, setCreandoCliente] = useState(false)

  useEffect(() => {
    if (open && facturaId) {
      cargarFactura()
      cargarClientes()
    }
  }, [open, facturaId])

  const cargarFactura = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/facturas/${facturaId}`)
      if (response.ok) {
        const data = await response.json()
        setFactura(data)
        setEstado(data.estado)
        setMetodoPago(data.metodoPago || '')
        setItems(data.items || [])
        setClienteId(data.clienteId)
        setClienteNombre(`${data.cliente.nombre} ${data.cliente.apellido || ''}`.trim())
      }
    } catch (error) {
      console.error('Error loading factura:', error)
      alert('Error al cargar los datos de la factura')
    } finally {
      setLoading(false)
    }
  }

  const cargarClientes = async () => {
    try {
      const response = await fetch('/api/clientes')
      if (response.ok) {
        const data = await response.json()
        setClientes(data)
      }
    } catch (error) {
      console.error('Error loading clientes:', error)
    }
  }

  const clientesFiltrados = clientes.filter(c => 
    `${c.nombre} ${c.apellido || ''}`.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
    (c.documento && c.documento.toLowerCase().includes(busquedaCliente.toLowerCase()))
  )

  const seleccionarCliente = (cliente: Cliente) => {
    setClienteId(cliente.id)
    setClienteNombre(`${cliente.nombre} ${cliente.apellido || ''}`.trim())
    setMostrarBuscador(false)
    setBusquedaCliente('')
  }

  const crearNuevoCliente = async () => {
    if (!nuevoCliente.nombre.trim()) {
      alert('El nombre es obligatorio')
      return
    }
    
    setCreandoCliente(true)
    try {
      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nuevoCliente.nombre.trim(),
          apellido: nuevoCliente.apellido.trim() || null,
          documento: nuevoCliente.documento.trim() || null,
          telefono: nuevoCliente.telefono.trim() || null,
          direccion: nuevoCliente.direccion.trim() || null
        })
      })
      
      if (response.ok) {
        const cliente = await response.json()
        setClienteId(cliente.id)
        setClienteNombre(`${cliente.nombre} ${cliente.apellido || ''}`.trim())
        setMostrarFormNuevo(false)
        setMostrarBuscador(false)
        setNuevoCliente({ nombre: '', apellido: '', documento: '', telefono: '', direccion: '' })
        // Recargar lista de clientes
        cargarClientes()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al crear el cliente')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al crear el cliente')
    } finally {
      setCreandoCliente(false)
    }
  }

  const actualizarItem = (index: number, field: 'descripcion' | 'cantidad' | 'precio', value: string | number) => {
    const nuevosItems = [...items]
    nuevosItems[index] = { ...nuevosItems[index], [field]: value }
    
    // Recalcular total del item
    if (field === 'cantidad' || field === 'precio') {
      nuevosItems[index].total = nuevosItems[index].cantidad * nuevosItems[index].precio
    }
    
    setItems(nuevosItems)
  }

  const calcularTotales = () => {
    // Los precios ya incluyen IVA, hay que desglosarlo
    const total = items.reduce((sum, item) => sum + item.total, 0)
    const subtotal = total / 1.21  // Base imponible (desglosando IVA 21%)
    const iva = total - subtotal    // IVA desglosado
    return { subtotal, iva, total }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!estado || !metodoPago) {
      alert('Por favor complete todos los campos requeridos')
      return
    }

    // Validar items - permitir precio 0 para servicios gratuitos/incluidos
    if (items.some(item => !item.descripcion || item.precio < 0)) {
      alert('Por favor complete todos los items con descripción y precio válido')
      return
    }

    setLoading(true)
    
    try {
      // Preparar datos para actualizar
      const updateData: any = {
        estado,
        metodoPago
      }

      // Incluir cambio de cliente si es diferente
      if (clienteId !== factura?.clienteId) {
        updateData.clienteId = clienteId
      }

      // Incluir items si han cambiado
      const itemsOriginales = factura?.items || []
      const itemsCambiaron = JSON.stringify(items) !== JSON.stringify(itemsOriginales)
      
      if (itemsCambiaron) {
        updateData.items = items.map(item => ({
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio: item.precio
        }))
      }

      const response = await fetch(`/api/facturas/${facturaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        setOpen(false)
        onFacturaActualizada()
        alert('Factura actualizada correctamente')
      } else {
        throw new Error('Error al actualizar la factura')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al actualizar la factura. Intente de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const { subtotal, iva, total } = calcularTotales()

  return (
    <>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpen(true); }}>
        <Edit className="mr-2 h-4 w-4" />
        Editar
      </DropdownMenuItem>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar {factura?.tipo || 'Documento'}
          </DialogTitle>
          <DialogDescription>
            Modificar datos del documento #{facturaNumero}
          </DialogDescription>
        </DialogHeader>

        {loading && !factura ? (
          <div className="space-y-4 py-8">
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ) : factura ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información general */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Número de {factura.tipo}</Label>
                <Input value={factura.numero} disabled />
              </div>
              <div>
                <Label>Facturar a (Cliente/Empresa)</Label>
                <div className="relative">
                  <div className="flex gap-2">
                    <Input 
                      value={clienteNombre} 
                      readOnly 
                      className="flex-1 cursor-pointer"
                      onClick={() => setMostrarBuscador(!mostrarBuscador)}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setMostrarBuscador(!mostrarBuscador)}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {mostrarBuscador && !mostrarFormNuevo && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-72 overflow-hidden">
                      <div className="p-2 border-b">
                        <Input
                          placeholder="Buscar por nombre, empresa o NIF/CIF..."
                          value={busquedaCliente}
                          onChange={(e) => setBusquedaCliente(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {clientesFiltrados.length === 0 ? (
                          <div className="p-3 text-center text-gray-500 text-sm">
                            No se encontraron clientes
                          </div>
                        ) : (
                          clientesFiltrados.slice(0, 8).map((cliente) => (
                            <div
                              key={cliente.id}
                              className="p-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                              onClick={() => seleccionarCliente(cliente)}
                            >
                              {cliente.documento ? (
                                <Building2 className="h-4 w-4 text-blue-500" />
                              ) : (
                                <User className="h-4 w-4 text-gray-500" />
                              )}
                              <div>
                                <div className="font-medium text-sm">
                                  {cliente.nombre} {cliente.apellido || ''}
                                </div>
                                {cliente.documento && (
                                  <div className="text-xs text-gray-500">
                                    {cliente.documento}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="p-2 border-t bg-gray-50">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setMostrarFormNuevo(true)}
                        >
                          <Building2 className="h-4 w-4 mr-2" />
                          Nuevo cliente / empresa
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {mostrarFormNuevo && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg p-3">
                      <div className="text-sm font-medium mb-3">Nuevo cliente / empresa</div>
                      <div className="space-y-2">
                        <Input
                          placeholder="Nombre o Razón Social *"
                          value={nuevoCliente.nombre}
                          onChange={(e) => setNuevoCliente({...nuevoCliente, nombre: e.target.value})}
                        />
                        <Input
                          placeholder="Apellidos (si es persona física)"
                          value={nuevoCliente.apellido}
                          onChange={(e) => setNuevoCliente({...nuevoCliente, apellido: e.target.value})}
                        />
                        <Input
                          placeholder="NIF / CIF"
                          value={nuevoCliente.documento}
                          onChange={(e) => setNuevoCliente({...nuevoCliente, documento: e.target.value})}
                        />
                        <Input
                          placeholder="Teléfono"
                          value={nuevoCliente.telefono}
                          onChange={(e) => setNuevoCliente({...nuevoCliente, telefono: e.target.value})}
                        />
                        <Input
                          placeholder="Dirección fiscal"
                          value={nuevoCliente.direccion}
                          onChange={(e) => setNuevoCliente({...nuevoCliente, direccion: e.target.value})}
                        />
                        <div className="flex gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setMostrarFormNuevo(false)
                              setNuevoCliente({ nombre: '', apellido: '', documento: '', telefono: '', direccion: '' })
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="flex-1"
                            onClick={crearNuevoCliente}
                            disabled={creandoCliente || !nuevoCliente.nombre.trim()}
                          >
                            {creandoCliente ? 'Creando...' : 'Crear y seleccionar'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {clienteId !== factura.clienteId && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Se cambiará el cliente de la factura
                  </p>
                )}
              </div>
            </div>

            {/* Estados editables */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estado">Estado *</Label>
                <Select value={estado} onValueChange={setEstado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                    <SelectItem value="PAGADA">Pagada</SelectItem>
                    <SelectItem value="VENCIDA">Vencida</SelectItem>
                    <SelectItem value="CANCELADA">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="metodoPago">Método de Pago *</Label>
                <Select value={metodoPago} onValueChange={setMetodoPago}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    <SelectItem value="TPV_SUMUP">TPV SUMUP</SelectItem>
                    <SelectItem value="TPV_UNICAJA">TPV UNICAJA</SelectItem>
                    <SelectItem value="REVOLUT">TPV REVOLUT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Items del documento */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-medium">Items del Documento</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setItems([...items, {
                    id: `new_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    descripcion: '',
                    cantidad: 1,
                    precio: 0,
                    total: 0,
                  }])}
                  className="text-xs"
                >
                  + Añadir línea
                </Button>
              </div>
              <div className="mt-3 space-y-3">
                {items.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm border rounded bg-gray-50">
                    No hay items. Pulsa &quot;Añadir línea&quot; para agregar uno.
                  </div>
                )}
                {items.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-[1fr_80px_100px_100px_40px] gap-2 p-3 border rounded bg-gray-50 items-end">
                    <div>
                      <Label className="text-xs">Descripción</Label>
                      <Input
                        value={item.descripcion}
                        onChange={(e) => actualizarItem(index, 'descripcion', e.target.value)}
                        placeholder="Descripción del servicio"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Cant.</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        onChange={(e) => actualizarItem(index, 'cantidad', parseInt(e.target.value) || 1)}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Precio €</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.precio}
                        onChange={(e) => actualizarItem(index, 'precio', parseFloat(e.target.value) || 0)}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Total</Label>
                      <Input
                        value={`€${item.total.toFixed(2)}`}
                        disabled
                        className="text-sm font-medium"
                      />
                    </div>
                    <div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-8 w-8"
                        onClick={() => setItems(items.filter((_, i) => i !== index))}
                        title="Eliminar línea"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totales recalculados */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>€{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
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

            {/* Aviso de recálculo */}
            {subtotal !== factura.subtotal && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Nota:</strong> Al modificar los items, se recalcularán automáticamente los totales del documento.
                </p>
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Error al cargar los datos del documento.
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  )
}
