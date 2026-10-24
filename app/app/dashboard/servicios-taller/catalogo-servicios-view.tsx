'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Wrench, Plus, Trash2, RefreshCw, Power } from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface TipoServicio {
  id: number
  nombre: string
  codigo: string
  categoria: string
  activo: boolean
}

export function CatalogoServiciosView() {
  const [items, setItems] = useState<TipoServicio[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevo, setNuevo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [delItem, setDelItem] = useState<TipoServicio | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tipos-servicio', { cache: 'no-store' })
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch { setItems([]) } finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const anadir = async () => {
    if (!nuevo.trim()) { toast.error('Escribe un nombre'); return }
    setGuardando(true)
    try {
      const res = await fetch('/api/tipos-servicio', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevo }),
      })
      if (!res.ok) { const e = await res.json(); toast.error(e?.error || 'Error'); return }
      toast.success('Servicio añadido')
      setNuevo('')
      cargar()
    } catch (e: any) { toast.error(e?.message || 'Error') } finally { setGuardando(false) }
  }

  const toggleActivo = async (t: TipoServicio) => {
    try {
      const res = await fetch(`/api/tipos-servicio/${t.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !t.activo }),
      })
      if (!res.ok) { toast.error('Error'); return }
      cargar()
    } catch { toast.error('Error') }
  }

  const eliminar = async () => {
    if (!delItem) return
    try {
      const res = await fetch(`/api/tipos-servicio/${delItem.id}`, { method: 'DELETE' })
      if (!res.ok) { const e = await res.json(); toast.error(e?.error || 'Error'); return }
      toast.success('Servicio eliminado')
      setDelItem(null)
      cargar()
    } catch (e: any) { toast.error(e?.message || 'Error') }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2"><Wrench className="h-5 w-5" /> Servicios de taller (línea rápida)</h2>
            <p className="text-sm text-gray-500 mt-1">Los tipos de servicio que aparecen al registrar un taller rápido. Común a todos los locales.</p>
          </div>
          <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Actualizar</Button>
        </div>
        <div className="flex items-end gap-2 mt-3 max-w-md">
          <div className="flex-1">
            <Label className="text-xs">Nuevo servicio</Label>
            <Input value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Ej: Aire acondicionado" onKeyDown={(e) => { if (e.key === 'Enter') anadir() }} />
          </div>
          <Button onClick={anadir} disabled={guardando}><Plus className="h-4 w-4 mr-1" /> Añadir</Button>
        </div>
      </Card>

      <Card className="p-4">
        {loading ? (
          <div className="py-10 text-center text-gray-400">Cargando…</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-gray-500">No hay servicios.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map((t) => (
              <div key={t.id} className={`flex items-center gap-2 border rounded-full pl-3 pr-1 py-1 ${t.activo ? 'bg-white' : 'bg-gray-100 opacity-60'}`}>
                <span className="text-sm font-medium">{t.nombre}</span>
                {!t.activo && <Badge variant="outline" className="text-[10px]">inactivo</Badge>}
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title={t.activo ? 'Desactivar' : 'Activar'} onClick={() => toggleActivo(t)}><Power className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" title="Eliminar" onClick={() => setDelItem(t)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AlertDialog open={!!delItem} onOpenChange={(o) => { if (!o) setDelItem(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar servicio</AlertDialogTitle>
            <AlertDialogDescription>¿Eliminar «{delItem?.nombre}» del catálogo? Si prefieres conservarlo, puedes desactivarlo en su lugar.</AlertDialogDescription>
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
