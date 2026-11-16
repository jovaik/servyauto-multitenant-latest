'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'

type Cobro = { id: string; importe: number; fecha: string; descripcion: string; referencia: string }
export function ConciliarRevolutDialog({ open, onOpenChange, citaId, descripcion, onComplete }: {
  open: boolean; onOpenChange: (open: boolean) => void; citaId: string; descripcion: string;
  onComplete: (result: { saldada: boolean; saldoPendiente: number }) => void;
}) {
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [selected, setSelected] = useState('')
  const [orderId, setOrderId] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [pending, setPending] = useState<number | null>(null)

  const load = async (id = '') => {
    setLoading(true); setError(''); setSelected(''); setConfirmed(false); setLoaded(false)
    try {
      const [res, balance] = await Promise.all([
        fetch(`/api/revolut/conciliar?citaId=${encodeURIComponent(citaId)}${id ? `&orderId=${encodeURIComponent(id.trim())}` : ''}`),
        fetch(`/api/citas/${citaId}/pagos`),
      ])
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudieron consultar los cobros.')
      if (!balance.ok) throw new Error('No se pudo consultar el saldo pendiente. Vuelve a actualizar.')
      setPending((await balance.json()).saldoPendiente)
      setCobros(data.cobros || []); setLoaded(true)
    } catch (e) { console.error('Consulta de cobros Revolut:', e); setError(e instanceof Error ? e.message : 'Error de conexión') }
    finally { setLoading(false) }
  }
  useEffect(() => {
    if (open) { setOrderId(''); setCobros([]); setPending(null); void load() }
    // Cada apertura consulta datos actuales; no se consulta mientras está cerrado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, citaId])

  const reconcile = async () => {
    if (!selected || !confirmed || saving) return
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/revolut/conciliar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ citaId, orderId: selected, confirmado: true }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo conciliar.')
      onComplete(data); onOpenChange(false)
    } catch (e) { console.error('Conciliación Revolut:', e); setError(e instanceof Error ? e.message : 'Error de conexión') }
    finally { setSaving(false) }
  }
  return <Dialog open={open} onOpenChange={value => { if (!saving) onOpenChange(value) }}>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Conciliar cobro Revolut</DialogTitle><DialogDescription>Vincula un pago ya recibido por QR, enlace o TPV. No se realiza ningún cargo nuevo.</DialogDescription></DialogHeader>
      <div className="rounded bg-slate-100 p-3 text-sm text-slate-900"><strong>{descripcion}</strong>{pending !== null && <p>Saldo pendiente guardado: {Math.max(0, pending).toFixed(2)} €</p>}<p>Se utiliza el local guardado de esta cita. Guarda antes cualquier cambio de servicios, importe o local.</p></div>
      <p className="text-sm text-slate-600">Cobros completados en EUR y sin vincular, entre los últimos 100 pedidos de la cuenta conectada. Para una operación anterior, busca por su ID de pedido Revolut. No es la referencia libre del cliente.</p>
      <div className="space-y-1"><Label htmlFor="revolut-order-search">ID de pedido (opcional)</Label><div className="flex gap-2"><Input id="revolut-order-search" value={orderId} onChange={e => setOrderId(e.target.value)} disabled={saving || loading} /><Button type="button" variant="outline" disabled={loading || saving} onClick={() => load(orderId)}>Buscar / actualizar</Button></div></div>
      {loading && <p role="status">Consultando Revolut…</p>}
      {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {loaded && !loading && !cobros.length && <p className="text-sm">No hay cobros disponibles en esta consulta. Los ya vinculados, pendientes, cancelados o devueltos no se ofrecen.</p>}
      {!loading && <div className="space-y-2 max-h-72 overflow-y-auto">{cobros.map(c => <label key={c.id} className={`flex gap-3 rounded border p-3 text-sm cursor-pointer ${selected === c.id ? 'border-blue-600 bg-blue-50' : 'bg-white'}`}>
        <input type="radio" name="revolut-cobro" value={c.id} checked={selected === c.id} disabled={saving} onChange={() => { setSelected(c.id); setConfirmed(false) }} />
        <span className="min-w-0"><strong>{c.importe.toFixed(2)} €</strong> · {new Date(c.fecha).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}<span className="block break-words">{c.descripcion || 'Sin descripción'}{c.referencia ? ` · ${c.referencia}` : ''}</span><span className="block break-all text-xs text-slate-500">{c.id}</span>{pending !== null && c.importe > pending && <span className="block text-amber-800">Supera el saldo pendiente: no se podrá vincular.</span>}</span>
      </label>)}</div>}
      <label className="flex items-start gap-2 text-sm"><Checkbox checked={confirmed} disabled={!selected || loading || saving} onCheckedChange={v => setConfirmed(v === true)} /><span>He comprobado que este cobro corresponde a esta cita y no lo he registrado ya por otro método.</span></label>
      <Button type="button" disabled={!selected || !confirmed || loading || saving || pending === null || (cobros.find(c => c.id === selected)?.importe || 0) > (pending || 0)} onClick={reconcile}>{saving ? 'Conciliando…' : 'Vincular cobro a esta cita'}</Button>
      <p className="text-xs text-slate-600">El pago queda guardado inmediatamente y aparecerá en Pagos a cuenta y Diario de Caja. Si cubre solo una parte, el resto seguirá pendiente. Cerrar la cita sin guardar otros cambios no deshace este cobro.</p>
    </DialogContent>
  </Dialog>
}
