
'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Scan, Edit, Search, Building2 } from 'lucide-react'
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

export function NuevoGastoDialog({ onGastoCreado }: NuevoGastoDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('scan')
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [busquedaProveedor, setBusquedaProveedor] = useState('')
  const [mostrarListaProveedores, setMostrarListaProveedores] = useState(false)
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null)
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
    proveedorProvincia: ''
  })

  // Cargar proveedores al abrir
  useEffect(() => {
    if (open) {
      fetch('/api/proveedores')
        .then(res => res.json())
        .then(data => setProveedores(data))
        .catch(err => console.error('Error cargando proveedores:', err))
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
          proveedorProvincia: ''
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipoGasto">Tipo de Gasto *</Label>
            <Select
              value={formData.tipoGasto}
              onValueChange={(value) => setFormData({ ...formData, tipoGasto: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona categoría" />
              </SelectTrigger>
              <SelectContent>
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
                <SelectItem value="Otros">📦 Otros</SelectItem>
              </SelectContent>
            </Select>
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

              {proveedorSeleccionado ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800 flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> {proveedorSeleccionado.nombre}
                  </p>
                  <p className="text-xs text-green-700">
                    CIF: {proveedorSeleccionado.cif || '-'} | {proveedorSeleccionado.ciudad || '-'}
                  </p>
                </div>
              ) : (
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
              )}

              {!proveedorSeleccionado && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="proveedorDireccion">Dirección *</Label>
                    <Input
                      id="proveedorDireccion"
                      placeholder="Calle, número, etc."
                      value={formData.proveedorDireccion}
                      onChange={(e) => setFormData({ ...formData, proveedorDireccion: e.target.value })}
                      required={formData.tipo === 'FACTURA' && !proveedorSeleccionado}
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
                        required={formData.tipo === 'FACTURA' && !proveedorSeleccionado}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="proveedorCiudad">Ciudad *</Label>
                      <Input
                        id="proveedorCiudad"
                        placeholder="Madrid"
                        value={formData.proveedorCiudad}
                        onChange={(e) => setFormData({ ...formData, proveedorCiudad: e.target.value })}
                        required={formData.tipo === 'FACTURA' && !proveedorSeleccionado}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="proveedorProvincia">Provincia *</Label>
                      <Input
                        id="proveedorProvincia"
                        placeholder="Madrid"
                        value={formData.proveedorProvincia}
                        onChange={(e) => setFormData({ ...formData, proveedorProvincia: e.target.value })}
                        required={formData.tipo === 'FACTURA' && !proveedorSeleccionado}
                      />
                    </div>
                  </div>
                </>
              )}
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
