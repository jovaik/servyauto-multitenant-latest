'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useLocalStore } from '@/lib/local-store'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  FileText, Plus, Download, Send, Trash2, Edit, Eye,
  Phone, Mail, MessageSquare, Search, X, ChevronDown,
  CalendarCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import NuevoPresupuestoDialog from './nuevo-presupuesto-dialog'

interface Presupuesto {
  id: string
  numero: string
  fecha: string
  validoHasta: string | null
  estado: string
  clienteNombre: string
  clienteTelefono: string | null
  clienteEmail: string | null
  vehiculoInfo: string | null
  subtotal: number
  iva: number
  total: number
  observaciones: string | null
  items: any[]
  local?: { id: string; nombre: string } | null
}

const estadoColors: Record<string, string> = {
  BORRADOR: 'bg-gray-100 text-gray-700',
  ENVIADO: 'bg-blue-100 text-blue-700',
  ACEPTADO: 'bg-green-100 text-green-700',
  RECHAZADO: 'bg-red-100 text-red-700',
  EXPIRADO: 'bg-yellow-100 text-yellow-700',
  CONVERTIDO: 'bg-purple-100 text-purple-700',
}

const estadoLabels: Record<string, string> = {
  BORRADOR: 'Borrador',
  ENVIADO: 'Enviado',
  ACEPTADO: 'Aceptado',
  RECHAZADO: 'Rechazado',
  EXPIRADO: 'Expirado',
  CONVERTIDO: 'Convertido',
}

export default function PresupuestosView() {
  const { toast } = useToast()
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [loading, setLoading] = useState(true)
  const [showNuevo, setShowNuevo] = useState(false)
  const [editingPres, setEditingPres] = useState<Presupuesto | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [aceptandoId, setAceptandoId] = useState<string | null>(null)

  const selectedLocalId = useLocalStore((s) => s.selectedLocalId)

  const fetchPresupuestos = useCallback(async () => {
    try {
      const res = await fetch('/api/presupuestos')
      if (res.ok) {
        const data = await res.json()
        setPresupuestos(data)
      }
    } catch (e) {
      console.error('Error cargando presupuestos:', e)
    } finally {
      setLoading(false)
    }
  }, [selectedLocalId])

  useEffect(() => { fetchPresupuestos() }, [fetchPresupuestos])

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este presupuesto?')) return
    try {
      const res = await fetch(`/api/presupuestos/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Presupuesto eliminado' })
        fetchPresupuestos()
      }
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const handleDownloadPDF = async (pres: Presupuesto) => {
    setDownloadingId(pres.id)
    try {
      const res = await fetch(`/api/presupuestos/${pres.id}/pdf`)
      if (!res.ok) throw new Error('Error generando PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Proforma_${pres.numero}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'PDF descargado' })
    } catch { toast({ title: 'Error generando PDF', variant: 'destructive' }) }
    finally { setDownloadingId(null) }
  }

  const handleChangeEstado = async (pres: Presupuesto, nuevoEstado: string) => {
    try {
      const res = await fetch(`/api/presupuestos/${pres.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      if (res.ok) {
        toast({ title: `Estado cambiado a ${estadoLabels[nuevoEstado]}` })
        fetchPresupuestos()
      }
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const handleAceptar = async (pres: Presupuesto) => {
    if (!confirm(`¿Aceptar el presupuesto ${pres.numero} y meterlo en la agenda? Se creará una cita pendiente con el cliente, vehículo y servicios.`)) return
    setAceptandoId(pres.id)
    try {
      const res = await fetch(`/api/presupuestos/${pres.id}/aceptar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        toast({ title: 'Presupuesto aceptado', description: 'Se ha metido en la agenda como cita pendiente.' })
        fetchPresupuestos()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Error al aceptar', description: err.error || 'Inténtalo de nuevo', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error al aceptar', variant: 'destructive' })
    } finally {
      setAceptandoId(null)
    }
  }

  const handleWhatsApp = (pres: Presupuesto) => {
    if (!pres.clienteTelefono) {
      toast({ title: 'Sin teléfono', description: 'Este presupuesto no tiene teléfono.', variant: 'destructive' })
      return
    }
    let phone = pres.clienteTelefono.replace(/\s+/g, '')
    if (phone.startsWith('0')) phone = phone.substring(1)
    if (!phone.startsWith('+') && !phone.startsWith('34')) phone = '34' + phone
    phone = phone.replace('+', '')

    const pdfUrl = `${window.location.origin}/api/presupuestos/${pres.id}/pdf`
    const msg = `Hola ${pres.clienteNombre}, le enviamos el presupuesto *${pres.numero}* por un total de *${pres.total.toFixed(2)}€*.\n\nPuede verlo y descargarlo aquí:\n${pdfUrl}\n\n¡Gracias por confiar en ServyAuto!`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleEmail = async (pres: Presupuesto) => {
    if (!pres.clienteEmail) {
      toast({ title: 'Sin email', description: 'Este presupuesto no tiene email del cliente.', variant: 'destructive' })
      return
    }
    try {
      const res = await fetch('/api/presupuestos/enviar-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presupuestoId: pres.id,
          email: pres.clienteEmail,
          mensaje: `Le enviamos el presupuesto ${pres.numero} por un total de ${pres.total.toFixed(2)}€. Puede verlo y descargarlo desde el enlace.`,
        }),
      })
      if (res.ok) {
        toast({ title: 'Email enviado', description: `Enviado a ${pres.clienteEmail}` })
        // Mark as ENVIADO if still BORRADOR
        if (pres.estado === 'BORRADOR') handleChangeEstado(pres, 'ENVIADO')
      } else {
        const err = await res.json()
        toast({ title: 'Error enviando email', description: err.error, variant: 'destructive' })
      }
    } catch { toast({ title: 'Error enviando email', variant: 'destructive' }) }
  }

  const filtered = presupuestos.filter(p => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return p.numero.toLowerCase().includes(q) ||
      p.clienteNombre.toLowerCase().includes(q) ||
      (p.clienteTelefono || '').includes(q) ||
      (p.vehiculoInfo || '').toLowerCase().includes(q)
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Presupuestos</h1>
        </div>
        <Card><CardContent className="p-6"><div className="animate-pulse space-y-4"><div className="h-4 bg-gray-200 rounded w-1/3"></div><div className="h-8 bg-gray-200 rounded w-1/2"></div></div></CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Presupuestos</h1>
          <p className="text-gray-600">Facturas proforma para clientes</p>
        </div>
        <Button onClick={() => { setEditingPres(null); setShowNuevo(true) }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Presupuesto
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por número, cliente, teléfono o vehículo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="pl-10"
        />
        {busqueda && (
          <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{presupuestos.length}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{presupuestos.filter(p => p.estado === 'ENVIADO').length}</div>
            <div className="text-sm text-muted-foreground">Enviados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{presupuestos.filter(p => p.estado === 'ACEPTADO').length}</div>
            <div className="text-sm text-muted-foreground">Aceptados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {presupuestos.reduce((sum, p) => sum + p.total, 0).toFixed(0)}€
            </div>
            <div className="text-sm text-muted-foreground">Valor total</div>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg">No hay presupuestos</p>
            <p className="text-sm">Crea tu primer presupuesto con el botón de arriba.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((pres) => (
            <Card key={pres.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base">{pres.numero}</span>
                      <Badge className={estadoColors[pres.estado] || 'bg-gray-100'}>
                        {estadoLabels[pres.estado] || pres.estado}
                      </Badge>
                      {pres.local && (
                        <Badge variant="outline" className="text-xs">{pres.local.nombre}</Badge>
                      )}
                    </div>
                    <div className="mt-1 text-sm">
                      <span className="font-medium">{pres.clienteNombre}</span>
                      {pres.clienteTelefono && <span className="text-muted-foreground ml-2">· {pres.clienteTelefono}</span>}
                      {pres.vehiculoInfo && <span className="text-muted-foreground ml-2">· {pres.vehiculoInfo}</span>}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(pres.fecha), "d MMM yyyy", { locale: es })}
                      {pres.validoHasta && ` · Válido hasta ${format(new Date(pres.validoHasta), "d MMM yyyy", { locale: es })}`}
                      {' · '}{pres.items.length} concepto{pres.items.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Right: total + actions */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-xl font-bold">{pres.total.toFixed(2)}€</div>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      <Button size="sm" variant="outline" onClick={() => handleDownloadPDF(pres)} disabled={downloadingId === pres.id}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleWhatsApp(pres)} title="Enviar por WhatsApp">
                        <MessageSquare className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                      {pres.clienteEmail && (
                        <Button size="sm" variant="outline" onClick={() => handleEmail(pres)} title="Enviar por Email">
                          <Mail className="h-3.5 w-3.5 text-blue-600" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => { setEditingPres(pres); setShowNuevo(true) }}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      {/* Aceptar → meter en agenda */}
                      {!['ACEPTADO', 'CONVERTIDO', 'RECHAZADO'].includes(pres.estado) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAceptar(pres)}
                          disabled={aceptandoId === pres.id}
                          title="Aceptar y meter en agenda"
                          className="border-green-200 text-green-700 hover:bg-green-50"
                        >
                          <CalendarCheck className="h-3.5 w-3.5 mr-1" />
                          Aceptar
                        </Button>
                      )}
                      {/* Estado dropdown */}
                      <select
                        value={pres.estado}
                        onChange={(e) => handleChangeEstado(pres, e.target.value)}
                        className="text-xs border rounded px-1.5 py-1 bg-white"
                      >
                        <option value="BORRADOR">Borrador</option>
                        <option value="ENVIADO">Enviado</option>
                        <option value="ACEPTADO">Aceptado</option>
                        <option value="RECHAZADO">Rechazado</option>
                        <option value="EXPIRADO">Expirado</option>
                        <option value="CONVERTIDO">Convertido</option>
                      </select>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(pres.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <NuevoPresupuestoDialog
        open={showNuevo}
        onOpenChange={setShowNuevo}
        onSuccess={fetchPresupuestos}
        editing={editingPres}
      />
    </div>
  )
}
