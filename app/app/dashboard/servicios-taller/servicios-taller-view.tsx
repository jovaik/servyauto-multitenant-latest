'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Wrench, Plus, Edit, Trash2, FileText, FileCheck } from 'lucide-react'
import { useLocalStore } from '@/lib/local-store'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import EditarServicioTallerDialog from '@/components/editar-servicio-taller-dialog'
import { useRouter } from 'next/navigation'

interface Cliente {
  id: string
  nombre: string
  apellido: string | null
  telefono: string
}

interface Vehiculo {
  id: string
  marca: string
  modelo: string
  matricula: string
  clienteId: string
}

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
    id: string
    numero: string
    tipo: string
    total: number
  } | null
}

export default function ServiciosTallerView() {
  const router = useRouter()
  const [servicios, setServicios] = useState<ServicioTaller[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [vehiculosFiltrados, setVehiculosFiltrados] = useState<Vehiculo[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Estados para editar y eliminar
  const [servicioToEdit, setServicioToEdit] = useState<ServicioTaller | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [servicioToDelete, setServicioToDelete] = useState<ServicioTaller | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [convirtiendoId, setConvirtiendoId] = useState<string | null>(null)

  // Campos del formulario
  const [clienteId, setClienteId] = useState('')
  const [vehiculoId, setVehiculoId] = useState('')
  const [concepto, setConcepto] = useState('')
  const [tipoGasto, setTipoGasto] = useState('')
  const [costeProducto, setCosteProducto] = useState('')
  const [precioProducto, setPrecioProducto] = useState('')
  const [precioManoObra, setPrecioManoObra] = useState('')
  const [metodoPago, setMetodoPago] = useState('')

  // Calcular totales automáticamente
  const total = (parseFloat(precioProducto) || 0) + (parseFloat(precioManoObra) || 0)
  const margen = (parseFloat(precioProducto) || 0) - (parseFloat(costeProducto) || 0)

  const selectedLocalId = useLocalStore((s) => s.selectedLocalId)

  useEffect(() => {
    fetchServicios()
    fetchClientes()
    fetchVehiculos()
  }, [selectedLocalId])

  useEffect(() => {
    // Filtrar vehículos cuando se selecciona un cliente
    if (clienteId) {
      const vehiculosCliente = vehiculos.filter(v => v.clienteId === clienteId)
      setVehiculosFiltrados(vehiculosCliente)
    } else {
      setVehiculosFiltrados([])
    }
  }, [clienteId, vehiculos])

  const fetchServicios = async () => {
    try {
      const response = await fetch('/api/servicios-taller')
      if (response.ok) {
        const data = await response.json()
        setServicios(data)
      }
    } catch (error) {
      console.error('Error fetching servicios:', error)
      toast.error('Error al cargar los servicios')
    }
  }

  const fetchClientes = async () => {
    try {
      const response = await fetch('/api/clientes')
      if (response.ok) {
        const data = await response.json()
        setClientes(data)
      }
    } catch (error) {
      console.error('Error fetching clientes:', error)
    }
  }

  const fetchVehiculos = async () => {
    try {
      const response = await fetch('/api/vehiculos')
      if (response.ok) {
        const data = await response.json()
        setVehiculos(data)
      }
    } catch (error) {
      console.error('Error fetching vehiculos:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/servicios-taller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId,
          vehiculoId,
          concepto,
          tipoGasto,
          costeProducto: parseFloat(costeProducto) || 0,
          precioProducto: parseFloat(precioProducto) || 0,
          precioManoObra: parseFloat(precioManoObra) || 0,
          metodoPago,
          solicitaFactura: metodoPago === 'TPV_UNICAJA'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear el servicio')
      }

      const data = await response.json()
      toast.success(`Servicio registrado y ${data.factura?.tipo || 'Documento'} ${data.factura?.numero || ''} generado`)
      
      // Limpiar formulario
      setClienteId('')
      setVehiculoId('')
      setConcepto('')
      setTipoGasto('')
      setCosteProducto('')
      setPrecioProducto('')
      setPrecioManoObra('')
      setMetodoPago('')
      setShowForm(false)
      
      // Recargar lista
      fetchServicios()
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Error al crear el servicio')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (servicio: ServicioTaller) => {
    setServicioToEdit(servicio)
    setShowEditDialog(true)
  }

  const handleDelete = (servicio: ServicioTaller) => {
    setServicioToDelete(servicio)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!servicioToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/servicios-taller/${servicioToDelete.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar el servicio')
      }

      toast.success('Servicio eliminado correctamente')
      setShowDeleteDialog(false)
      setServicioToDelete(null)
      fetchServicios()
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Error al eliminar el servicio')
    } finally {
      setDeleting(false)
    }
  }

  const handleViewFactura = (servicio: ServicioTaller) => {
    if (servicio.factura) {
      router.push('/dashboard/facturacion')
      toast.info(`Busca el ${servicio.factura.tipo} ${servicio.factura.numero}`)
    }
  }

  const handleConvertirFactura = async (servicio: ServicioTaller) => {
    if (!servicio.factura || servicio.factura.tipo !== 'TICKET') return
    if (!confirm(`¿Convertir el ticket ${servicio.factura.numero} en factura?`)) return
    setConvirtiendoId(servicio.id)
    try {
      const response = await fetch(`/api/facturas/${servicio.factura.id}/convertir`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Error al convertir a factura')
      }
      const doc = await response.json()
      toast.success(`Convertido a factura ${doc.numero}`)
      fetchServicios()
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Error al convertir a factura')
    } finally {
      setConvirtiendoId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wrench className="h-8 w-8" />
            Servicios Extras
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión rápida de servicios extras: cambios de batería, frenos, neumáticos, etc.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          {showForm ? 'Cancelar' : 'Nuevo Servicio'}
        </Button>
      </div>

      {/* FORMULARIO */}
      {showForm && (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cliente */}
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente *</Label>
                <Select value={clienteId} onValueChange={setClienteId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(cliente => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nombre} {cliente.apellido || ''} - {cliente.telefono}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vehículo */}
              <div className="space-y-2">
                <Label htmlFor="vehiculo">Vehículo *</Label>
                <Select value={vehiculoId} onValueChange={setVehiculoId} required disabled={!clienteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar vehículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehiculosFiltrados.map(vehiculo => (
                      <SelectItem key={vehiculo.id} value={vehiculo.id}>
                        {vehiculo.marca} {vehiculo.modelo} - {vehiculo.matricula}
                      </SelectItem>
                    ))}
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
                placeholder="Ej: Cambio de batería, Cambio de pastillas de freno, etc."
                required
              />
            </div>

            {/* Tipo de Servicio */}
            <div className="space-y-2">
              <Label htmlFor="tipoGasto">Tipo de Servicio *</Label>
              <Select value={tipoGasto} onValueChange={setTipoGasto} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo de servicio" />
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

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">💰 Costes Internos (no aparecen en factura)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            {/* Método de pago */}
            <div className="space-y-2">
              <Label htmlFor="metodoPago">Método de Pago *</Label>
              <Select value={metodoPago} onValueChange={setMetodoPago} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EFECTIVO">Efectivo → Genera TICKET</SelectItem>
                  <SelectItem value="TPV_SUMUP">TPV SumUp → Genera TICKET</SelectItem>
                  <SelectItem value="TPV_UNICAJA">TPV Unicaja → Genera FACTURA</SelectItem>
                  <SelectItem value="REVOLUT">TPV REVOLUT → Genera TICKET</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {metodoPago === 'TPV_UNICAJA' && '📄 Se generará FACTURA automáticamente'}
                {(metodoPago === 'EFECTIVO' || metodoPago === 'TPV_SUMUP' || metodoPago === 'REVOLUT') && '🎫 Se generará TICKET automáticamente'}
              </p>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Guardando...' : 'Guardar y Cobrar'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* LISTA DE SERVICIOS */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Historial de Servicios</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Fecha</th>
                <th className="text-left py-3 px-4">Cliente</th>
                <th className="text-left py-3 px-4">Vehículo</th>
                <th className="text-left py-3 px-4">Tipo</th>
                <th className="text-left py-3 px-4">Concepto</th>
                <th className="text-right py-3 px-4">Total</th>
                <th className="text-right py-3 px-4">Margen</th>
                <th className="text-left py-3 px-4">Documento</th>
                <th className="text-center py-3 px-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {servicios.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground">
                    No hay servicios registrados
                  </td>
                </tr>
              ) : (
                servicios.map(servicio => (
                  <tr key={servicio.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      {new Date(servicio.fecha).toLocaleDateString('es-ES')}
                    </td>
                    <td className="py-3 px-4">
                      {servicio.cliente.nombre} {servicio.cliente.apellido || ''}
                    </td>
                    <td className="py-3 px-4">
                      {servicio.vehiculo.marca} {servicio.vehiculo.modelo}
                      <br />
                      <span className="text-xs text-muted-foreground">{servicio.vehiculo.matricula}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs bg-secondary px-2 py-1 rounded">
                        {servicio.tipoGasto || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4">{servicio.concepto}</td>
                    <td className="text-right py-3 px-4 font-semibold">
                      {servicio.importe.toFixed(2)} €
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={servicio.margen >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {servicio.margen.toFixed(2)} €
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {servicio.factura && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {servicio.factura.tipo} {servicio.factura.numero}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        {servicio.factura && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewFactura(servicio)}
                            title="Ver documento"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        {servicio.factura?.tipo === 'TICKET' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleConvertirFactura(servicio)}
                            disabled={convirtiendoId === servicio.id}
                            title="Convertir a factura"
                            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          >
                            <FileCheck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(servicio)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(servicio)}
                          title="Eliminar"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dialog de edición */}
      <EditarServicioTallerDialog
        servicio={servicioToEdit}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={() => {
          fetchServicios()
          setShowEditDialog(false)
          setServicioToEdit(null)
        }}
      />

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar el servicio:
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <p className="font-semibold">{servicioToDelete?.concepto}</p>
                <p className="text-sm mt-1">
                  Cliente: {servicioToDelete?.cliente.nombre} {servicioToDelete?.cliente.apellido || ''}
                </p>
                <p className="text-sm">
                  Vehículo: {servicioToDelete?.vehiculo.marca} {servicioToDelete?.vehiculo.modelo}
                </p>
                {servicioToDelete?.factura && (
                  <p className="text-sm text-orange-600 mt-2">
                    ⚠️ También se eliminará la {servicioToDelete.factura.tipo} {servicioToDelete.factura.numero}
                  </p>
                )}
              </div>
              <p className="mt-3 text-red-600 font-semibold">
                Esta acción no se puede deshacer.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
