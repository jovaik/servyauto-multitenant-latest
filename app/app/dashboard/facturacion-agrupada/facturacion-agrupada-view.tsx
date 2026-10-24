'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Layers, Search, FileText, Loader2, Building2, User, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

interface ClienteResumen {
  id: string
  nombre: string
  apellido?: string
  telefono?: string
  documento?: string
  clienteEmpresa?: boolean
  numCitas: number
  totalPendiente: number
}

interface CitaFacturable {
  id: string
  fecha: string
  matricula: string
  marca: string
  modelo: string
  servicios: string
  total: number
}

const fmtEur = (n: number) => `${(n || 0).toFixed(2).replace('.', ',')} €`
const fmtFecha = (d: string) => {
  const dt = new Date(d)
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`
}

export function FacturacionAgrupadaView() {
  const { toast } = useToast()
  const [clientes, setClientes] = useState<ClienteResumen[]>([])
  const [loadingClientes, setLoadingClientes] = useState(true)
  const [filtro, setFiltro] = useState('')

  const [clienteSel, setClienteSel] = useState<ClienteResumen | null>(null)
  const [citas, setCitas] = useState<CitaFacturable[]>([])
  const [seleccion, setSeleccion] = useState<Record<string, boolean>>({})
  const [loadingCitas, setLoadingCitas] = useState(false)

  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [metodoPago, setMetodoPago] = useState('PENDIENTE')
  const [generando, setGenerando] = useState(false)
  const [datosEmpresa, setDatosEmpresa] = useState({ nombreFiscal: '', nif: '', direccion: '' })
  const [autoSel, setAutoSel] = useState(false)

  const cargarClientes = useCallback(() => {
    setLoadingClientes(true)
    fetch('/api/facturacion-agrupada')
      .then(r => r.ok ? r.json() : { clientes: [] })
      .then(d => setClientes(d.clientes || []))
      .catch(() => setClientes([]))
      .finally(() => setLoadingClientes(false))
  }, [])

  useEffect(() => { cargarClientes() }, [cargarClientes])

  const cargarCitas = useCallback((cliente: ClienteResumen) => {
    setClienteSel(cliente)
    // Prefijar datos fiscales con los del cliente; se pueden sobreescribir con los de la empresa
    setDatosEmpresa({
      nombreFiscal: `${cliente.nombre} ${cliente.apellido || ''}`.trim().toUpperCase(),
      nif: cliente.documento || '',
      direccion: '',
    })
    setLoadingCitas(true)
    const params = new URLSearchParams({ clienteId: cliente.id })
    if (desde) params.set('desde', desde)
    if (hasta) params.set('hasta', hasta)
    fetch(`/api/facturacion-agrupada?${params.toString()}`)
      .then(r => r.ok ? r.json() : { citas: [] })
      .then(d => {
        const lista: CitaFacturable[] = d.citas || []
        setCitas(lista)
        const sel: Record<string, boolean> = {}
        lista.forEach(c => { sel[c.id] = true })
        setSeleccion(sel)
      })
      .catch(() => setCitas([]))
      .finally(() => setLoadingCitas(false))
  }, [desde, hasta])

  // Recargar citas al cambiar rango si hay cliente seleccionado
  useEffect(() => {
    if (clienteSel) cargarCitas(clienteSel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta])

  // Si venimos desde Operaciones sin completar con ?clienteId=... abrir ese cliente automáticamente
  useEffect(() => {
    if (autoSel || clientes.length === 0) return
    const cid = new URLSearchParams(window.location.search).get('clienteId')
    if (cid) {
      const found = clientes.find(c => c.id === cid)
      if (found) { cargarCitas(found); setAutoSel(true) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientes, autoSel])

  const citasSeleccionadas = citas.filter(c => seleccion[c.id])
  const totalSeleccionado = citasSeleccionadas.reduce((s, c) => s + (c.total || 0), 0)

  const toggleTodas = (val: boolean) => {
    const sel: Record<string, boolean> = {}
    citas.forEach(c => { sel[c.id] = val })
    setSeleccion(sel)
  }

  const generarFactura = async () => {
    if (!clienteSel || citasSeleccionadas.length === 0) {
      toast({ title: 'Nada que facturar', description: 'Selecciona al menos un servicio.', variant: 'destructive' })
      return
    }
    setGenerando(true)
    try {
      const res = await fetch('/api/facturacion-agrupada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: clienteSel.id,
          citaIds: citasSeleccionadas.map(c => c.id),
          metodoPago: metodoPago === 'PENDIENTE' ? null : metodoPago,
          datosFacturacion: (datosEmpresa.nombreFiscal.trim() || datosEmpresa.nif.trim())
            ? {
                nombreFiscal: datosEmpresa.nombreFiscal.trim().toUpperCase(),
                nif: datosEmpresa.nif.trim().toUpperCase(),
                direccion: datosEmpresa.direccion.trim(),
              }
            : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al generar la factura')
      toast({ title: '✅ Factura creada', description: `${data.numero} · ${data.numServicios} servicios · ${fmtEur(data.total)}` })
      // Abrir el PDF de la factura
      window.open(`/api/facturas/${data.facturaId}/pdf`, '_blank')
      // Refrescar
      setClienteSel(null)
      setCitas([])
      setSeleccion({})
      cargarClientes()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    } finally {
      setGenerando(false)
    }
  }

  const clientesFiltrados = clientes.filter(c => {
    if (!filtro.trim()) return true
    const q = filtro.toLowerCase()
    return (
      `${c.nombre} ${c.apellido || ''}`.toLowerCase().includes(q) ||
      (c.telefono || '').toLowerCase().includes(q) ||
      (c.documento || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Layers className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Factura Agrupada</h1>
          <p className="text-sm text-muted-foreground">
            Agrupa en una sola factura todos los servicios pendientes de un cliente (empresas y profesionales a mes o semana vencida).
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Columna clientes */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Clientes con servicios pendientes</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar cliente..."
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[65vh] overflow-y-auto">
            {loadingClientes && (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
              </div>
            )}
            {!loadingClientes && clientesFiltrados.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No hay servicios pendientes de facturar.</p>
            )}
            {!loadingClientes && clientesFiltrados.map(c => (
              <button
                key={c.id}
                onClick={() => cargarCitas(c)}
                className={`w-full rounded-lg border p-3 text-left transition hover:bg-accent ${clienteSel?.id === c.id ? 'border-primary bg-primary/5' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-semibold">
                    {c.clienteEmpresa ? <Building2 className="h-3.5 w-3.5 text-blue-600" /> : <User className="h-3.5 w-3.5 text-muted-foreground" />}
                    {`${c.nombre} ${c.apellido || ''}`.trim().toUpperCase()}
                  </span>
                  <span className="text-sm font-bold text-primary whitespace-nowrap">{fmtEur(c.totalPendiente)}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {c.numCitas} servicio{c.numCitas !== 1 ? 's' : ''}{c.telefono ? ` · ${c.telefono}` : ''}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Columna detalle */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {clienteSel ? `Servicios de ${`${clienteSel.nombre} ${clienteSel.apellido || ''}`.trim().toUpperCase()}` : 'Selecciona un cliente'}
            </CardTitle>
            <div className="grid grid-cols-2 gap-3 mt-2 max-w-md">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Desde</Label>
                <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Hasta</Label>
                <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!clienteSel && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Elige un cliente de la izquierda para ver sus servicios pendientes de facturar.
              </p>
            )}

            {clienteSel && loadingCitas && (
              <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando servicios...
              </div>
            )}

            {clienteSel && !loadingCitas && citas.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Este cliente no tiene servicios pendientes de facturar en el rango seleccionado.
              </p>
            )}

            {clienteSel && !loadingCitas && citas.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="p-2 w-8">
                          <Checkbox
                            checked={citas.length > 0 && citas.every(c => seleccion[c.id])}
                            onCheckedChange={(v) => toggleTodas(!!v)}
                          />
                        </th>
                        <th className="p-2">Fecha</th>
                        <th className="p-2">Matrícula</th>
                        <th className="p-2">Vehículo</th>
                        <th className="p-2">Servicios</th>
                        <th className="p-2 text-right">Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {citas.map(c => (
                        <tr key={c.id} className="border-b hover:bg-accent/40">
                          <td className="p-2">
                            <Checkbox
                              checked={!!seleccion[c.id]}
                              onCheckedChange={(v) => setSeleccion(prev => ({ ...prev, [c.id]: !!v }))}
                            />
                          </td>
                          <td className="p-2 whitespace-nowrap">{fmtFecha(c.fecha)}</td>
                          <td className="p-2 font-medium">{c.matricula || '—'}</td>
                          <td className="p-2">{[c.marca, c.modelo].filter(Boolean).join(' ') || '—'}</td>
                          <td className="p-2 text-muted-foreground">{c.servicios}</td>
                          <td className="p-2 text-right font-semibold whitespace-nowrap">{fmtEur(c.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 rounded-lg border bg-blue-50/50 p-3">
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold">Datos fiscales de la factura</span>
                    <span className="text-xs text-muted-foreground">(para facturar a una empresa; déjalo con los del cliente si no hace falta)</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Razón social / Nombre fiscal</Label>
                      <Input value={datosEmpresa.nombreFiscal} onChange={e => setDatosEmpresa(p => ({ ...p, nombreFiscal: e.target.value }))} placeholder="EMPRESA S.L." />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">NIF / CIF</Label>
                      <Input value={datosEmpresa.nif} onChange={e => setDatosEmpresa(p => ({ ...p, nif: e.target.value }))} placeholder="B12345678" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Dirección</Label>
                      <Input value={datosEmpresa.direccion} onChange={e => setDatosEmpresa(p => ({ ...p, direccion: e.target.value }))} placeholder="Calle..." />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-1 max-w-xs">
                    <Label className="text-xs">Forma de cobro</Label>
                    <Select value={metodoPago} onValueChange={setMetodoPago}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDIENTE">Pendiente de cobro (a mes vencido)</SelectItem>
                        <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                        <SelectItem value="TPV_SUMUP">TPV SumUp</SelectItem>
                        <SelectItem value="TPV_UNICAJA">TPV Unicaja</SelectItem>
                        <SelectItem value="REVOLUT">Revolut</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {citasSeleccionadas.length} servicio{citasSeleccionadas.length !== 1 ? 's' : ''} seleccionado{citasSeleccionadas.length !== 1 ? 's' : ''}
                    </div>
                    <div className="text-2xl font-bold text-primary">{fmtEur(totalSeleccionado)}</div>
                    <div className="text-xs text-muted-foreground">IVA incluido</div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button onClick={generarFactura} disabled={generando || citasSeleccionadas.length === 0} className="gap-2">
                    {generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    {generando ? 'Generando...' : 'Generar Factura Agrupada'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
