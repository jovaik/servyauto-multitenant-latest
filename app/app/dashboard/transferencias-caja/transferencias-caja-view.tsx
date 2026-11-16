'use client'

import { useState, useEffect } from 'react'
import { ArrowLeftRight, Plus, Check, RotateCcw, Trash2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useSession } from 'next-auth/react'

interface Local { id: string; nombre: string }
interface Transferencia {
  id: string
  fecha: string
  importe: number
  concepto: string
  tipo: string
  estado: string
  fechaDevolucion?: string | null
  observaciones?: string | null
  creadoPorNombre?: string | null
  devueltoPorNombre?: string | null
  origenLocal: { id: string; nombre: string }
  destinoLocal: { id: string; nombre: string }
}

function eur(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0)
}
function fecha(s?: string | null) {
  if (!s) return '-'
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Madrid' }).format(new Date(s))
}

export default function TransferenciasCajaView() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const isSuperAdmin = (session?.user as any)?.role === 'SUPER_ADMIN'

  const [transferencias, setTransferencias] = useState<Transferencia[]>([])
  const [locales, setLocales] = useState<Local[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form
  const [origenLocalId, setOrigenLocalId] = useState('')
  const [destinoLocalId, setDestinoLocalId] = useState('')
  const [importe, setImporte] = useState('')
  const [concepto, setConcepto] = useState('')
  const [tipo, setTipo] = useState<'PRESTAMO' | 'APORTACION'>('PRESTAMO')
  const [observaciones, setObservaciones] = useState('')
  const [fechaOperacion, setFechaOperacion] = useState('')

  const loadData = async () => {
    try {
      setLoading(true)
      const [tRes, lRes] = await Promise.all([
        fetch('/api/transferencias-caja'),
        fetch('/api/locales'),
      ])
      if (tRes.ok) setTransferencias(await tRes.json())
      if (lRes.ok) setLocales(await lRes.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const resetForm = () => {
    setOrigenLocalId(''); setDestinoLocalId(''); setImporte(''); setConcepto(''); setTipo('PRESTAMO'); setObservaciones(''); setFechaOperacion('')
  }

  const handleSubmit = async () => {
    if (!origenLocalId || !destinoLocalId) {
      toast({ title: 'Elige local de origen y destino', variant: 'destructive' }); return
    }
    if (origenLocalId === destinoLocalId) {
      toast({ title: 'El origen y destino deben ser distintos', variant: 'destructive' }); return
    }
    if (!importe || parseFloat(importe) <= 0) {
      toast({ title: 'Introduce un importe válido', variant: 'destructive' }); return
    }
    if (!fechaOperacion) {
      toast({ title: 'Indica la fecha real del movimiento', variant: 'destructive' }); return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/transferencias-caja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origenLocalId, destinoLocalId, importe, concepto, tipo, observaciones, fecha: fechaOperacion }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error') }
      toast({ title: 'Transferencia registrada' })
      setDialogOpen(false); resetForm(); loadData()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const marcarDevuelto = async (t: Transferencia, estado: 'DEVUELTO' | 'PENDIENTE') => {
    try {
      const res = await fetch(`/api/transferencias-caja/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      })
      if (!res.ok) throw new Error('Error')
      toast({ title: estado === 'DEVUELTO' ? 'Marcada como devuelta' : 'Reabierta como pendiente' })
      loadData()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
  }

  const eliminar = async (t: Transferencia) => {
    if (!confirm('¿Eliminar esta transferencia? Esta acción no se puede deshacer.')) return
    try {
      const res = await fetch(`/api/transferencias-caja/${t.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Solo un super administrador puede eliminar')
      toast({ title: 'Transferencia eliminada' })
      loadData()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
  }

  // Saldos pendientes: cuánto debe cada local (destino) a cada origen (solo PRESTAMO pendiente)
  const pendientes = transferencias.filter(t => t.estado === 'PENDIENTE' && t.tipo === 'PRESTAMO')
  const totalPendiente = pendientes.reduce((s, t) => s + t.importe, 0)
  const saldos: Record<string, number> = {}
  pendientes.forEach(t => {
    const key = `${t.destinoLocal.nombre} → debe a → ${t.origenLocal.nombre}`
    saldos[key] = (saldos[key] || 0) + t.importe
  })

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-blue-600" />
            Transferencias de Caja
          </h1>
          <p className="text-sm text-muted-foreground">Préstamos y aportaciones de dinero entre locales</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) resetForm(); setDialogOpen(v) }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1" /> Nueva transferencia
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-blue-600" /> Nueva transferencia de caja
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="fecha-transferencia" className="text-xs">Fecha real del movimiento *</Label>
                <Input id="fecha-transferencia" type="date" required value={fechaOperacion} onChange={e => setFechaOperacion(e.target.value)} />
                <p className="text-xs text-muted-foreground">Día en que salió el efectivo. Determina la semana del Diario y de la liquidación, aunque lo registres después.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Desde (origen)</Label>
                  <Select value={origenLocalId} onValueChange={setOrigenLocalId}>
                    <SelectTrigger><SelectValue placeholder="Local origen" /></SelectTrigger>
                    <SelectContent>
                      {locales.map(l => <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hacia (destino)</Label>
                  <Select value={destinoLocalId} onValueChange={setDestinoLocalId}>
                    <SelectTrigger><SelectValue placeholder="Local destino" /></SelectTrigger>
                    <SelectContent>
                      {locales.map(l => <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Importe (€)</Label>
                  <Input type="number" step="0.01" min={0} value={importe} onChange={e => setImporte(e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRESTAMO">Préstamo (se devuelve)</SelectItem>
                      <SelectItem value="APORTACION">Aportación (no se devuelve)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Concepto</Label>
                <Input value={concepto} onChange={e => setConcepto(e.target.value.toUpperCase())} placeholder="EJ: COMPRA DE MATERIAL PARA EL LAVADO" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Observaciones (opcional)</Label>
                <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value.toUpperCase())} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false) }} disabled={saving}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? 'Guardando...' : 'Registrar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumen de saldos pendientes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Saldos pendientes de devolver</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(saldos).length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay préstamos pendientes de devolución.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(saldos).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm border-b pb-1">
                  <span>{k}</span>
                  <span className="font-semibold text-amber-700">{eur(v)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 font-bold">
                <span>Total pendiente</span>
                <span className="text-amber-700">{eur(totalPendiente)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Listado */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Historial de transferencias</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : transferencias.length === 0 ? (
            <div className="text-center py-8">
              <ArrowLeftRight className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No hay transferencias registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transferencias.map(t => (
                <div key={t.id} className="flex items-start justify-between gap-3 p-4 border rounded-lg bg-gray-50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium flex-wrap">
                      <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{t.origenLocal.nombre}</Badge>
                      <ArrowLeftRight className="h-4 w-4 text-blue-500" />
                      <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{t.destinoLocal.nombre}</Badge>
                      <Badge className={t.tipo === 'PRESTAMO' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' : 'bg-purple-100 text-purple-800 hover:bg-purple-100'}>
                        {t.tipo === 'PRESTAMO' ? 'Préstamo' : 'Aportación'}
                      </Badge>
                      {t.estado === 'DEVUELTO'
                        ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Devuelto</Badge>
                        : <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pendiente</Badge>}
                    </div>
                    <p className="text-sm">{t.concepto}</p>
                    {t.observaciones && <p className="text-xs text-muted-foreground">{t.observaciones}</p>}
                    <p className="text-xs text-muted-foreground">
                      {fecha(t.fecha)}{t.creadoPorNombre ? ` · por ${t.creadoPorNombre}` : ''}
                      {t.estado === 'DEVUELTO' && t.fechaDevolucion ? ` · devuelto ${fecha(t.fechaDevolucion)}${t.devueltoPorNombre ? ` por ${t.devueltoPorNombre}` : ''}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-lg font-bold">{eur(t.importe)}</span>
                    <div className="flex items-center gap-1">
                      {t.tipo === 'PRESTAMO' && (t.estado === 'PENDIENTE' ? (
                        <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50" onClick={() => marcarDevuelto(t, 'DEVUELTO')}>
                          <Check className="h-3 w-3 mr-1" /> Devolver
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => marcarDevuelto(t, 'PENDIENTE')}>
                          <RotateCcw className="h-3 w-3 mr-1" /> Reabrir
                        </Button>
                      ))}
                      {isSuperAdmin && (
                        <Button size="sm" variant="ghost" className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => eliminar(t)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
