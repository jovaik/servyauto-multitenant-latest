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
import { Pencil, Search, Building2, User, Wallet, Handshake } from 'lucide-react'
import { getSelectedLocalId } from '@/lib/local-store'

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
  beneficiario?: string | null
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

// 📌 Categorías que NO requieren proveedor (gastos internos)
const CATEGORIAS_SIN_PROVEEDOR = [
  'Adelanto Empleado',
  'Pago Empleado',
  'Retiro Propietario',
  'Caja Menor',
  'Comisiones Bancarias',
  'Gastos Bancarios'
]

const requiereProveedor = (tipoGasto: string): boolean => {
  return !CATEGORIAS_SIN_PROVEEDOR.includes(tipoGasto)
}

export function EditarGastoDialog({ gasto, onGastoActualizado }: EditarGastoDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [busquedaProveedor, setBusquedaProveedor] = useState('')
  const [mostrarListaProveedores, setMostrarListaProveedores] = useState(false)
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null)
  const [colaboradores, setColaboradores] = useState<{ id: string; nombre: string; rol: string }[]>([])
  const [formData, setFormData] = useState({
    concepto: '',
    fecha: '',
    proveedor: '',
    proveedorId: '',
    beneficiario: '',
    tipoGasto: 'Otros',
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
    colaboradorId: '',
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
      const localId = getSelectedLocalId()
      const colabUrl = localId ? `/api/colaboradores?localId=${localId}&activo=true` : `/api/colaboradores?activo=true`
      fetch(colabUrl).then(r => r.ok ? r.json() : []).then(setColaboradores).catch(() => {})
    }
  }, [open])

  // Cargar datos del gasto al abrir
  useEffect(() => {
    if (open && gasto) {
      const fechaFormateada = gasto.fecha 
        ? format(new Date(gasto.fecha), 'yyyy-MM-dd')
        : ''
      
      setFormData({
        concepto: gasto.concepto || '',
        fecha: fechaFormateada,
        proveedor: gasto.proveedor || '',
        proveedorId: gasto.proveedorId || '',
        beneficiario: gasto.beneficiario || '',
        tipoGasto: gasto.tipoGasto || 'Otros',
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
        colaboradorId: (gasto as any).colaboradorId || '',
      })
      setBusquedaProveedor(gasto.proveedor || '')
    }
  }, [open, gasto])

  // Filtrar proveedores
  const proveedoresFiltrados = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(busquedaProveedor.toLowerCase()) ||
    (p.cif && p.cif.toLowerCase().includes(busquedaProveedor.toLowerCase()))
  )

  const seleccionarProveedor = (prov: Proveedor) => {
    setProveedorSeleccionado(prov)
    setBusquedaProveedor(prov.nombre)
    setMostrarListaProveedores(false)
    setFormData(prev => ({
      ...prev,
      proveedor: prov.nombre,
      proveedorId: prov.id,
      proveedorCIF: prov.cif || '',
      proveedorDireccion: prov.direccion || '',
      proveedorCodigoPostal: prov.codigoPostal || '',
      proveedorCiudad: prov.ciudad || '',
      proveedorProvincia: prov.provincia || ''
    }))
  }

  const handleProveedorChange = (valor: string) => {
    setBusquedaProveedor(valor)
    setFormData(prev => ({ ...prev, proveedor: valor, proveedorId: '' }))
    setProveedorSeleccionado(null)
    setMostrarListaProveedores(valor.length >= 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/gastos/${gasto.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Gasto actualizado correctamente')
        setOpen(false)
        onGastoActualizado()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al actualizar gasto')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al actualizar gasto')
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Gasto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Concepto *</Label>
            <Input
              value={formData.concepto}
              onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Importe (€) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.importe}
                onChange={(e) => setFormData({ ...formData, importe: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Método de Pago *</Label>
              <Select
                value={formData.metodoPago}
                onValueChange={(value) => setFormData({ ...formData, metodoPago: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                  <SelectItem value="TPV_SUMUP">TPV SUMUP</SelectItem>
                  <SelectItem value="TPV_UNICAJA">TPV UNICAJA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* TIPO DE GASTO */}
            <div className="space-y-2">
              <Label>Tipo de Gasto *</Label>
              <Select
                value={formData.tipoGasto}
                onValueChange={(value) => {
                  const esGastoInterno = CATEGORIAS_SIN_PROVEEDOR.includes(value)
                  setFormData({ 
                    ...formData, 
                    tipoGasto: value,
                    iva: esGastoInterno ? 0 : formData.iva,
                    tipo: esGastoInterno ? 'TICKET' : formData.tipo,
                    ...(esGastoInterno ? {
                      proveedor: '',
                      proveedorId: '',
                      proveedorCIF: '',
                      proveedorDireccion: '',
                      proveedorCodigoPostal: '',
                      proveedorCiudad: '',
                      proveedorProvincia: '',
                    } : {})
                  })
                  if (esGastoInterno) {
                    setBusquedaProveedor('')
                    setProveedorSeleccionado(null)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* GASTOS CON PROVEEDOR */}
                  <SelectItem value="Combustible">🛢️ Combustible</SelectItem>
                  <SelectItem value="Mantenimiento">🔧 Mantenimiento</SelectItem>
                  <SelectItem value="Productos Lavado">🧽 Productos Lavado</SelectItem>
                  <SelectItem value="Repuestos">⚙️ Repuestos</SelectItem>
                  <SelectItem value="Alquiler">🏢 Alquiler</SelectItem>
                  <SelectItem value="Seguros">🛡️ Seguros</SelectItem>
                  <SelectItem value="Limpieza">🧹 Limpieza</SelectItem>
                  <SelectItem value="Suministros">💡 Suministros</SelectItem>
                  <SelectItem value="Administración">📋 Administración</SelectItem>
                  <SelectItem value="Marketing">📢 Marketing</SelectItem>
                  <SelectItem value="Personal">👥 Personal</SelectItem>
                  <SelectItem value="Asesoría">💼 Asesoría</SelectItem>
                  <SelectItem value="Otros">📦 Otros</SelectItem>
                  {/* GASTOS INTERNOS (SIN PROVEEDOR) */}
                  <SelectItem value="Adelanto Empleado">👤 Adelanto a Empleado</SelectItem>
                  <SelectItem value="Pago Empleado">💵 Pago a Empleado</SelectItem>
                  <SelectItem value="Retiro Propietario">🏠 Retiro Propietario</SelectItem>
                  <SelectItem value="Caja Menor">🗃️ Caja Menor</SelectItem>
                  <SelectItem value="Comisiones Bancarias">🏦 Comisiones Bancarias</SelectItem>
                  <SelectItem value="Gastos Bancarios">💳 Gastos Bancarios</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!requiereProveedor(formData.tipoGasto) && formData.tipoGasto && (
            <p className="text-xs text-blue-600 flex items-center gap-1">
              <Wallet className="h-3 w-3" /> Gasto interno - no requiere datos de proveedor
            </p>
          )}

          {/* PROVEEDOR O BENEFICIARIO */}
          {requiereProveedor(formData.tipoGasto) ? (
            <div className="space-y-2 relative">
              <Label>Proveedor</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar proveedor..."
                  value={busquedaProveedor}
                  onChange={(e) => handleProveedorChange(e.target.value)}
                  onFocus={() => setMostrarListaProveedores(true)}
                  className="pl-10"
                />
              </div>
              {proveedorSeleccionado && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Proveedor registrado
                </p>
              )}
              {mostrarListaProveedores && proveedoresFiltrados.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {proveedoresFiltrados.slice(0, 5).map(prov => (
                    <div
                      key={prov.id}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => seleccionarProveedor(prov)}
                    >
                      <p className="font-medium text-sm">{prov.nombre}</p>
                      {prov.cif && <p className="text-xs text-muted-foreground">{prov.cif}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : formData.tipoGasto && (
            <div className="space-y-2">
              <Label>
                {formData.tipoGasto === 'Adelanto Empleado' || formData.tipoGasto === 'Pago Empleado'
                  ? '👤 Nombre del Empleado'
                  : formData.tipoGasto === 'Retiro Propietario'
                  ? '🏠 Nombre Propietario/Gerente'
                  : '📝 Descripción/Referencia'}
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre o referencia..."
                  value={formData.beneficiario}
                  onChange={(e) => setFormData({ ...formData, beneficiario: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo Documento</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
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
            <div className="space-y-2">
              <Label>IVA (%)</Label>
              <Select
                value={String(formData.iva)}
                onValueChange={(value) => setFormData({ ...formData, iva: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
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

          {formData.tipo === 'FACTURA' && (
            <div className="space-y-2">
              <Label>Número de Factura</Label>
              <Input
                value={formData.numeroFactura}
                onChange={(e) => setFormData({ ...formData, numeroFactura: e.target.value })}
                placeholder="Ej: FAC-2025-001"
              />
            </div>
          )}

          {/* Atribuir gasto a colaborador */}
          {colaboradores.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Handshake className="h-4 w-4" /> Atribuir a colaborador</Label>
              <Select value={formData.colaboradorId || "_none"} onValueChange={(v) => setFormData({ ...formData, colaboradorId: v === '_none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Sin atribuir" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sin atribuir (gasto general)</SelectItem>
                  {colaboradores.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
