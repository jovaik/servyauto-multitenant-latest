'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Package, Plus, Pencil, Trash2, Search, Lock, RefreshCw } from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface Repuesto {
  id: string
  nombre: string
  referencia?: string | null
  categoria: string
  costeInterno: number
  precioVenta: number
  stock?: number | null
  activo: boolean
}

const CATEGORIAS = ['BATERIA', 'FRENOS', 'NEUMATICOS', 'ACEITE', 'FILTROS', 'MECANICA', 'ELECTRICIDAD', 'CARROCERIA', 'OTROS']

const empty = { nombre: '', referencia: '', categoria: 'OTROS', costeInterno: '', precioVenta: '', stock: '' }

export function CatalogoRepuestosView() {
  const [items, setItems] = useState<Repuesto[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<any>(empty)
  const [guardando, setGuardando] = useState(false)
  const [delItem, setDelItem] = useState<Repuesto | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/repuestos', { cache: 'no-store' })
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch { setItems([]) } finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const abrirNuevo = () => { setEditId(null); setForm(empty); setDialogOpen(true) }
  const abrirEditar = (r: Repuesto) => {
    setEditId(r.id)
    setForm({
      nombre: r.nombre, referencia: r.referencia || '', categoria: r.categoria,
      costeInterno: String(r.costeInterno ?? ''), precioVenta: String(r.precioVenta ?? ''),
      stock: r.stock === null || r.stock === undefined ? '' : String(r.stock),
    })
    setDialogOpen(true)
  }

  const guardar = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setGuardando(true)
    try {
      const url = editId ? `/api/repuestos/${editId}` : '/api/repuestos'
      const res = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const e = await res.json(); toast.error(e?.error || 'Error al guardar'); return }
      toast.success(editId ? 'Repuesto actualizado' : 'Repuesto añadido')
      setDialogOpen(false)
      cargar()
    } catch (e: any) { toast.error(e?.message || 'Error') } finally { setGuardando(false) }
  }

  const eliminar = async () => {
    if (!delItem) return
    try {
      const res = await fetch(`/api/repuestos/${delItem.id}`, { method: 'DELETE' })
      if (!res.ok) { const e = await res.json(); toast.error(e?.error || 'Error al eliminar'); return }
      toast.success('Repuesto eliminado')
      setDelItem(null)
      cargar()
    } catch (e: any) { toast.error(e?.message || 'Error') }
  }

  const filtrados = items.filter((r) => {
    const q = busqueda.toLowerCase().trim()
    if (!q) return true
    return r.nombre.toLowerCase().includes(q) || (r.referencia || '').toLowerCase().includes(q) || r.categoria.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2"><Package className="h-5 w-5" /> Catálogo de repuestos</h2>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <Lock className="h-3.5 w-3.5" /> El coste interno es privado y nunca aparece en la factura del cliente. Catálogo común a todos los locales.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Actualizar</Button>
            <Button size="sm" onClick={abrirNuevo}><Plus className="h-4 w-4 mr-1" /> Nuevo repuesto</Button>
          </div>
        </div>
        <div className="relative mt-3 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <Input className="pl-8" placeholder="Buscar por nombre, referencia o categoría" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-10 text-center text-gray-400">Cargando…</div>
        ) : filtrados.length === 0 ? (
          <div className="py-10 text-center text-gray-500">No hay repuestos. Pulsa «Nuevo repuesto» para empezar.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b bg-gray-50">
                  <th className="py-2 px-3 font-medium">Repuesto</th>
                  <th className="py-2 px-3 font-medium">Referencia</th>
                  <th className="py-2 px-3 font-medium">Categoría</th>
                  <th className="py-2 px-3 font-medium text-right">Coste interno 🔒</th>
                  <th className="py-2 px-3 font-medium text-right">Precio venta</th>
                  <th className="py-2 px-3 font-medium text-right">Margen</th>
                  <th className="py-2 px-3 font-medium text-right">Stock</th>
                  <th className="py-2 px-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((r) => {
                  const margen = (r.precioVenta || 0) - (r.costeInterno || 0)
                  return (
                    <tr key={r.id} className={`border-b last:border-0 hover:bg-gray-50 ${!r.activo ? 'opacity-50' : ''}`}>
                      <td className="py-2 px-3 font-medium">{r.nombre}{!r.activo && <span className="ml-1 text-[10px] text-gray-400">(inactivo)</span>}</td>
                      <td className="py-2 px-3 text-gray-600">{r.referencia || '—'}</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-[10px]">{r.categoria}</Badge></td>
                      <td className="py-2 px-3 text-right text-gray-600">{(r.costeInterno || 0).toFixed(2)}€</td>
                      <td className="py-2 px-3 text-right font-semibold">{(r.precioVenta || 0).toFixed(2)}€</td>
                      <td className={`py-2 px-3 text-right font-medium ${margen >= 0 ? 'text-green-600' : 'text-red-600'}`}>{margen.toFixed(2)}€</td>
                      <td className="py-2 px-3 text-right text-gray-600">{r.stock === null || r.stock === undefined ? '—' : r.stock}</td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <Button size="sm" variant="ghost" onClick={() => abrirEditar(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setDelItem(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar repuesto' : 'Nuevo repuesto'}</DialogTitle>
            <DialogDescription>El coste interno queda oculto al cliente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Batería 70Ah" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Referencia</Label>
                <Input value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })} placeholder="Código / ref." />
              </div>
              <div>
                <Label className="text-xs">Categoría</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs flex items-center gap-1"><Lock className="h-3 w-3" /> Coste interno</Label>
                <Input type="number" step="0.01" min="0" value={form.costeInterno} onChange={(e) => setForm({ ...form, costeInterno: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs">Precio venta</Label>
                <Input type="number" step="0.01" min="0" value={form.precioVenta} onChange={(e) => setForm({ ...form, precioVenta: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs">Stock (opcional)</Label>
                <Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="—" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={guardando}>Cancelar</Button>
            <Button onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delItem} onOpenChange={(o) => { if (!o) setDelItem(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar repuesto</AlertDialogTitle>
            <AlertDialogDescription>¿Seguro que quieres eliminar «{delItem?.nombre}» del catálogo? Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={eliminar} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
