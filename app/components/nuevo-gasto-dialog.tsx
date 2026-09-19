
'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Scan, Edit, Search, Building2, User, Wallet, Handshake } from 'lucide-react'
import { getSelectedLocalId } from '@/lib/local-store'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SimpleDocumentScanner } from '@/app/components/gastos/simple-document-scanner'
import type { ExtractedInvoiceData } from '@/types/invoice-types'
import { toast } from 'react-hot-toast'

interface Proveedor {
  id: string
  nombre: string
  cif: string | null
  direccion: string | null
  codigoPostal: string | null
  ciudad: string | null
  provincia: string | null
  telefono: string | null
  email: string | null
}

interface NuevoGastoDialogProps {
  onGastoCreado: () => void
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

// Verificar si la categoría requiere proveedor
const requiereProveedor = (tipoGasto: string): boolean => {
  return !CATEGORIAS_SIN_PROVEEDOR.includes(tipoGasto)
}

export function NuevoGastoDialog({ onGastoCreado }: NuevoGastoDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('scan')
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [busquedaProveedor, setBusquedaProveedor] = useState('')
  const [mostrarListaProveedores, setMostrarListaProveedores] = useState(false)
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null)
  const [colaboradores, setColaboradores] = useState<{ id: string; nombre: string; rol: string }[]>([])
  const [formData, setFormData] = useState({
    concepto: '',
    fecha: new Date().toISOString().split('T')[0],
    proveedor: '',
    proveedorId: '',
    tipoGasto: '',
    importe: '',
    metodoPago: 'EFECTIVO',
    tipo: 'TICKET',
    iva: '21',
    numeroFactura: '',
    proveedorCIF: '',
    proveedorDireccion: '',
    proveedorCodigoPostal: '',
    proveedorCiudad: '',
    proveedorProvincia: '',
    proveedorTelefono: '',
    proveedorEmail: '',
    beneficiario: '', // 📌 Nuevo campo para gastos internos
    colaboradorId: '',
  })

  // Cargar proveedores y colaboradores al abrir
  useEffect(() => {
    if (open) {
      fetch('/api/proveedores')
        .then(res => res.json())
        .then(data => setProveedores(data))
        .catch(err => console.error('Error cargando proveedores:', err))
      const localId = getSelectedLocalId()
      const colabUrl = localId ? `/api/colaboradores?localId=${localId}&activo=true` : `/api/colaboradores?activo=true`
      fetch(colabUrl).then(r => r.ok ? r.json() : []).then(setColaboradores).catch(() => {})
    }
  }, [open])

  // Filtrar proveedores por búsqueda
  const proveedoresFiltrados = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(busquedaProveedor.toLowerCase()) ||
    (p.cif && p.cif.toLowerCase().includes(busquedaProveedor.toLowerCase()))
  )

  // Seleccionar proveedor existente
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

  // Escribir nuevo proveedor
  const handleProveedorChange = (valor: string) => {
    setBusquedaProveedor(valor)
    setFormData(prev => ({ ...prev, proveedor: valor, proveedorId: '' }))
    setProveedorSeleccionado(null)
    setMostrarListaProveedores(valor.length >= 1)
  }

  // ✅ Manejar datos extraídos del OCR
  const handleExtractedData = (data: ExtractedInvoiceData) => {
    console.log('📄 [OCR] Datos extraídos:', data)
    
    setFormData(prev => ({
      ...prev,
      concepto: data.concepto || prev.concepto,
      fecha: data.fecha || prev.fecha,
      proveedor: data.proveedor || prev.proveedor,
      tipoGasto: data.categoria || prev.tipoGasto,
      importe: data.total ? String(data.total) : prev.importe,
      metodoPago: data.metodo_pago?.toUpperCase() === 'EFECTIVO' ? 'EFECTIVO' : 
                  data.metodo_pago?.toUpperCase() === 'TARJETA' ? 'TARJETA' : 
                  data.metodo_pago?.toUpperCase() === 'TRANSFERENCIA' ? 'TRANSFERENCIA' : prev.metodoPago,
      tipo: data.tipo_documento as any || prev.tipo,
      iva: data.iva_porcentaje ? String(data.iva_porcentaje) : prev.iva,
      numeroFactura: data.numero_factura || prev.numeroFactura,
      proveedorCIF: data.proveedor_cif || data.cif || prev.proveedorCIF, // ✅ Soporta ambos formatos
      proveedorDireccion: data.proveedor_direccion || prev.proveedorDireccion,
      proveedorCodigoPostal: data.proveedor_codigo_postal || prev.proveedorCodigoPostal,
      proveedorCiudad: data.proveedor_ciudad || prev.proveedorCiudad,
      proveedorProvincia: data.proveedor_provincia || prev.proveedorProvincia
    }))

    toast.success('✅ Datos extraídos y rellenados automáticamente')
    
    // Cambiar a la pestaña manual para que el usuario vea los datos
    setActiveTab('manual')
  }

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
          proveedorId: '',
          tipoGasto: '',
          importe: '',
          metodoPago: 'EFECTIVO',
          tipo: 'TICKET',
          iva: '21',
          numeroFactura: '',
          proveedorCIF: '',
          proveedorDireccion: '',
          proveedorCodigoPostal: '',
          proveedorCiudad: '',
          proveedorProvincia: '',
          proveedorTelefono: '',
          proveedorEmail: '',
          beneficiario: '',
          colaboradorId: '',
        })
        setBusquedaProveedor('')
        setProveedorSeleccionado(null)
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Gasto</DialogTitle>
          <DialogDescription>
            Escanea una factura/ticket o rellena manualmente los datos
          </DialogDescription>
        </DialogHeader>

        {/* ✅ TABS: Escanear vs Manual */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan" className="flex items-center gap-2">
              <Scan className="h-4 w-4" />
              Escanear Documento
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Rellenar Manual
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Escanear con OCR */}
          <TabsContent value="scan" className="space-y-4 mt-4">
            <SimpleDocumentScanner
              onExtractedDataChange={handleExtractedData}
              onFileSelect={(file) => {
                console.log('📁 Archivo seleccionado:', file.name)
              }}
            />
            
            {/* Mostrar preview de datos extraídos */}
            {formData.importe && parseFloat(formData.importe) > 0 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  ✅ Datos Extraídos
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-green-700">
                  <div><strong>Fecha:</strong> {formData.fecha}</div>
                  <div><strong>Total:</strong> €{formData.importe}</div>
                  <div><strong>Proveedor:</strong> {formData.proveedor || '-'}</div>
                  <div><strong>Categoría:</strong> {formData.tipoGasto || '-'}</div>
                </div>
                <p className="mt-2 text-xs text-green-600">
                  Cambia a "Rellenar Manual" para revisar/editar los datos antes de guardar
                </p>
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Formulario Manual */}
          <TabsContent value="manual" className="mt-4">
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
            <Label htmlFor="metodoPago">Método de Pago *</Label>
            <Select
              value={formData.metodoPago}
              onValueChange={(value) => setFormData({ ...formData, metodoPago: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                <SelectItem value="TPV_SUMUP">TPV SUMUP</SelectItem>
                <SelectItem value="TPV_UNICAJA">TPV UNICAJA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 📌 TIPO DE GASTO PRIMERO - Para determinar si se necesita proveedor */}
          <div className="space-y-2">
            <Label htmlFor="tipoGasto">Tipo de Gasto *</Label>
            <Select
              value={formData.tipoGasto}
              onValueChange={(value) => {
                // Si es gasto interno (sin proveedor), limpiar datos de proveedor y poner IVA 0%
                const esGastoInterno = CATEGORIAS_SIN_PROVEEDOR.includes(value)
                setFormData({ 
                  ...formData, 
                  tipoGasto: value,
                  iva: esGastoInterno ? '0' : formData.iva,
                  tipo: esGastoInterno ? 'TICKET' : formData.tipo,
                  // Limpiar datos de proveedor si es gasto interno
                  ...(esGastoInterno ? {
                    proveedor: '',
                    proveedorId: '',
                    proveedorCIF: '',
                    proveedorDireccion: '',
                    proveedorCodigoPostal: '',
                    proveedorCiudad: '',
                    proveedorProvincia: '',
                    proveedorTelefono: '',
                    proveedorEmail: ''
                  } : {})
                })
                if (esGastoInterno) {
                  setBusquedaProveedor('')
                  setProveedorSeleccionado(null)
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona categoría" />
              </SelectTrigger>
              <SelectContent>
                {/* 💰 GASTOS CON PROVEEDOR */}
                <SelectItem value="Combustible">🛢️ Combustible</SelectItem>
                <SelectItem value="Mantenimiento">🔧 Mantenimiento</SelectItem>
                <SelectItem value="Productos Lavado">🧽 Productos Lavado</SelectItem>
                <SelectItem value="Repuestos">⚙️ Repuestos</SelectItem>
                <SelectItem value="Alquiler">🏢 Alquiler</SelectItem>
                <SelectItem value="Seguros">🛡️ Seguros</SelectItem>
                <SelectItem value="Limpieza">🧹 Limpieza</SelectItem>
                <SelectItem value="Suministros">💡 Suministros (Agua/Luz/Gas)</SelectItem>
                <SelectItem value="Administración">📋 Administración</SelectItem>
                <SelectItem value="Marketing">📢 Marketing y Publicidad</SelectItem>
                <SelectItem value="Personal">👥 Personal (Nóminas/SS)</SelectItem>
                <SelectItem value="Asesoría">💼 Asesoría</SelectItem>
                <SelectItem value="Otros">📦 Otros Gastos</SelectItem>
                {/* 💼 GASTOS INTERNOS (SIN PROVEEDOR) */}
                <SelectItem value="Adelanto Empleado">👤 Adelanto a Empleado</SelectItem>
                <SelectItem value="Pago Empleado">💵 Pago a Empleado</SelectItem>
                <SelectItem value="Retiro Propietario">🏠 Retiro Propietario/Gerente</SelectItem>
                <SelectItem value="Caja Menor">🗃️ Caja Menor</SelectItem>
                <SelectItem value="Comisiones Bancarias">🏦 Comisiones Bancarias</SelectItem>
                <SelectItem value="Gastos Bancarios">💳 Gastos Bancarios</SelectItem>
              </SelectContent>
            </Select>
            {!requiereProveedor(formData.tipoGasto) && formData.tipoGasto && (
              <p className="text-xs text-blue-600 flex items-center gap-1">
                <Wallet className="h-3 w-3" /> Gasto interno - no requiere datos de proveedor
              </p>
            )}
          </div>

          {/* 📌 CAMPO PROVEEDOR O BENEFICIARIO según tipo de gasto */}
          {requiereProveedor(formData.tipoGasto) ? (
            // Mostrar campo de proveedor para gastos con proveedor
            <div className="space-y-2 relative">
              <Label htmlFor="proveedor">Proveedor</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="proveedor"
                  placeholder="Buscar o escribir proveedor..."
                  value={busquedaProveedor}
                  onChange={(e) => handleProveedorChange(e.target.value)}
                  onFocus={() => setMostrarListaProveedores(busquedaProveedor.length >= 1 || proveedores.length > 0)}
                  className="pl-10"
                  autoComplete="off"
                />
              </div>
              {proveedorSeleccionado && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Proveedor registrado - datos fiscales cargados
                </p>
              )}
              {!proveedorSeleccionado && busquedaProveedor && (
                <p className="text-xs text-amber-600">
                  ⚠️ Nuevo proveedor - se registrará automáticamente
                </p>
              )}
              {mostrarListaProveedores && proveedoresFiltrados.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {proveedoresFiltrados.slice(0, 8).map(prov => (
                    <div
                      key={prov.id}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                      onClick={() => seleccionarProveedor(prov)}
                    >
                      <div>
                        <p className="font-medium text-sm">{prov.nombre}</p>
                        {prov.cif && <p className="text-xs text-muted-foreground">{prov.cif}</p>}
                      </div>
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}

              {/* Datos fiscales del proveedor */}
              {formData.proveedor && formData.proveedor.trim() && !proveedorSeleccionado && (
                <div className="space-y-3 border-2 border-amber-300 bg-amber-50 rounded-lg p-3 mt-2">
                  <p className="text-xs font-medium text-amber-800">
                    📝 Completa los datos fiscales de "{formData.proveedor}"
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="CIF/NIF"
                      value={formData.proveedorCIF}
                      onChange={(e) => setFormData({ ...formData, proveedorCIF: e.target.value })}
                      className="border-amber-300 text-sm"
                    />
                    <Input
                      placeholder="Teléfono"
                      value={formData.proveedorTelefono || ''}
                      onChange={(e) => setFormData({ ...formData, proveedorTelefono: e.target.value })}
                      className="border-amber-300 text-sm"
                    />
                  </div>
                  <Input
                    placeholder="Dirección completa"
                    value={formData.proveedorDireccion}
                    onChange={(e) => setFormData({ ...formData, proveedorDireccion: e.target.value })}
                    className="border-amber-300 text-sm"
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={formData.proveedorEmail || ''}
                    onChange={(e) => setFormData({ ...formData, proveedorEmail: e.target.value })}
                    className="border-amber-300 text-sm"
                  />
                </div>
              )}
            </div>
          ) : formData.tipoGasto && (
            // Mostrar campo de beneficiario para gastos internos
            <div className="space-y-2">
              <Label htmlFor="beneficiario">
                {formData.tipoGasto === 'Adelanto Empleado' || formData.tipoGasto === 'Pago Empleado' 
                  ? '👤 Nombre del Empleado' 
                  : formData.tipoGasto === 'Retiro Propietario'
                  ? '🏠 Nombre del Propietario/Gerente'
                  : '📝 Descripción/Referencia'}
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="beneficiario"
                  placeholder={
                    formData.tipoGasto === 'Adelanto Empleado' || formData.tipoGasto === 'Pago Empleado'
                      ? "Ej: Juan García"
                      : formData.tipoGasto === 'Retiro Propietario'
                      ? "Ej: Carlos Propietario"
                      : formData.tipoGasto === 'Comisiones Bancarias' || formData.tipoGasto === 'Gastos Bancarios'
                      ? "Ej: Comisión TPV Sumup - Octubre"
                      : "Ej: Compra pequeña urgente"
                  }
                  value={formData.beneficiario}
                  onChange={(e) => setFormData({ ...formData, beneficiario: e.target.value })}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500">
                {formData.tipoGasto === 'Caja Menor' && "Para pequeños gastos sin factura"}
                {formData.tipoGasto === 'Comisiones Bancarias' && "Comisiones del banco o TPV"}
                {formData.tipoGasto === 'Gastos Bancarios' && "Otros cargos bancarios"}
              </p>
            </div>
          )}

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

          {/* Número de factura solo para FACTURAS */}
          {formData.tipo === 'FACTURA' && (
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
          )}

          {/* Atribuir gasto a colaborador */}
          {colaboradores.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Handshake className="h-4 w-4" /> Atribuir a colaborador</Label>
              <Select value={formData.colaboradorId || "_none"} onValueChange={(v) => setFormData({ ...formData, colaboradorId: v === '_none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Sin atribuir (gasto general)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sin atribuir (gasto general)</SelectItem>
                  {colaboradores.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Si este gasto es de un colaborador, se descontará de su liquidación</p>
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
              {loading ? 'Guardando...' : 'Crear Gasto'}
            </Button>
          </div>
        </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
