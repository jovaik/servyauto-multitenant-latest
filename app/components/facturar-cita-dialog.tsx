'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Building2, FileText, Loader2 } from 'lucide-react'

export interface CitaFacturable {
  id: string
  fecha: string
  estado?: string
  cobroDiferido?: boolean
  total: number
  servicios?: string
  vehiculo?: { matricula?: string; marca?: string; modelo?: string } | null
  local?: { nombre?: string } | null
  cliente?: {
    id: string
    nombre?: string
    apellido?: string | null
    documento?: string | null
    direccion?: string | null
    telefono?: string | null
    clienteEmpresa?: boolean
  } | null
}

interface Props {
  cita: CitaFacturable | null
  open: boolean
  onClose: () => void
  onFacturada: () => void
}

export function FacturarCitaDialog({ cita, open, onClose, onFacturada }: Props) {
  const [nombreFiscal, setNombreFiscal] = useState('')
  const [nif, setNif] = useState('')
  const [direccion, setDireccion] = useState('')
  const [metodoPago, setMetodoPago] = useState('PENDIENTE')
  const [guardando, setGuardando] = useState(false)

  // Prefijar datos fiscales con los del cliente al abrir
  useEffect(() => {
    if (open && cita?.cliente) {
      const nom = `${cita.cliente.nombre || ''} ${cita.cliente.apellido || ''}`.trim()
      setNombreFiscal(nom.toUpperCase())
      setNif((cita.cliente.documento || '').toUpperCase())
      setDireccion(cita.cliente.direccion || '')
      // Las ventas a crédito suelen cobrarse después; por defecto pendiente de cobro
      setMetodoPago(cita.estado === 'PAGO_POSTERIOR' ? 'PENDIENTE' : 'PENDIENTE')
    }
  }, [open, cita])

  if (!cita) return null

  const veh = cita.vehiculo
    ? [cita.vehiculo.matricula, cita.vehiculo.marca, cita.vehiculo.modelo].filter(Boolean).join(' ')
    : ''

  const handleSubmit = async () => {
    if (!cita.cliente?.id) {
      toast.error('Esta venta no tiene cliente asociado')
      return
    }
    setGuardando(true)
    try {
      const datosFacturacion =
        nombreFiscal.trim() || nif.trim()
          ? {
              nombreFiscal: nombreFiscal.trim().toUpperCase(),
              nif: nif.trim().toUpperCase(),
              direccion: direccion.trim(),
            }
          : undefined
      const res = await fetch('/api/facturacion-agrupada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: cita.cliente.id,
          citaIds: [cita.id],
          metodoPago: metodoPago === 'PENDIENTE' ? null : metodoPago,
          datosFacturacion,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'No se pudo crear la factura')
        return
      }
      toast.success(
        `Factura ${data.numero} creada${data.estado === 'PENDIENTE' ? ' (pendiente de cobro)' : ' y cobrada'}`
      )
      onFacturada()
      onClose()
    } catch (e: any) {
      toast.error(e?.message || 'Error al crear la factura')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Facturar venta
          </DialogTitle>
          <DialogDescription>
            Emite la factura de esta venta. Puedes facturarla a nombre del cliente o de una empresa/prescriptor.
          </DialogDescription>
        </DialogHeader>

        {/* Resumen de la venta */}
        <div className="rounded-lg border bg-gray-50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Fecha</span>
            <span className="font-medium">{new Date(cita.fecha).toLocaleDateString('es-ES')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Vehículo</span>
            <span className="font-medium">{veh || '—'}</span>
          </div>
          {cita.servicios && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Servicio</span>
              <span className="font-medium text-right">{cita.servicios}</span>
            </div>
          )}
          <div className="flex justify-between border-t mt-2 pt-2">
            <span className="text-gray-500">Total (IVA incl.)</span>
            <span className="font-bold text-primary">{(Number(cita.total) || 0).toFixed(2)}€</span>
          </div>
        </div>

        {/* Datos fiscales */}
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
            <Building2 className="h-4 w-4" />
            Datos fiscales de la factura
          </div>
          <p className="text-xs text-gray-500">
            Para facturar a una <strong>empresa o prescriptor</strong>, escribe aquí sus datos. Si lo dejas como está,
            la factura saldrá a nombre del cliente.
          </p>
          <div>
            <Label className="text-xs">Razón social / Nombre fiscal</Label>
            <Input value={nombreFiscal} onChange={(e) => setNombreFiscal(e.target.value)} placeholder="NOMBRE DE LA EMPRESA" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">NIF / CIF</Label>
              <Input value={nif} onChange={(e) => setNif(e.target.value)} placeholder="B12345678" />
            </div>
            <div>
              <Label className="text-xs">Dirección</Label>
              <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Dirección fiscal" />
            </div>
          </div>
        </div>

        {/* Forma de cobro */}
        <div>
          <Label className="text-xs">Forma de cobro</Label>
          <Select value={metodoPago} onValueChange={setMetodoPago}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDIENTE">Pendiente de cobro (crédito)</SelectItem>
              <SelectItem value="EFECTIVO">Efectivo</SelectItem>
              <SelectItem value="TPV_SUMUP">TPV SumUp</SelectItem>
              <SelectItem value="TPV_UNICAJA">TPV Unicaja</SelectItem>
              <SelectItem value="REVOLUT">Revolut</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            Si es a crédito, déjalo en «Pendiente de cobro»: no entrará en caja ni en el reparto hasta que la marques
            como cobrada.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={guardando}>
            {guardando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
            Generar factura
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
