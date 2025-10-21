'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Edit } from 'lucide-react'

interface EditarCierreDialogProps {
  cierreId: string
  onCierreActualizado: () => void
}

export function EditarCierreDialog({ cierreId, onCierreActualizado }: EditarCierreDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cierre, setCierre] = useState({
    fechaInicio: '',
    fechaFin: '',
    totalEfectivo: '',
    totalTPVSumup: '',
    totalTPVUnicaja: '',
    gastosEfectivo: '',
    gastosTarjeta: '',
    observaciones: ''
  })

  useEffect(() => {
    if (open) {
      loadCierre()
    }
  }, [open])

  const loadCierre = async () => {
    try {
      const response = await fetch(`/api/cierres-caja/${cierreId}`)
      if (response.ok) {
        const data = await response.json()
        setCierre({
          fechaInicio: data.fechaInicio.split('T')[0],
          fechaFin: data.fechaFin.split('T')[0],
          totalEfectivo: data.totalEfectivo.toString(),
          totalTPVSumup: data.totalTPVSumup.toString(),
          totalTPVUnicaja: data.totalTPVUnicaja.toString(),
          gastosEfectivo: data.gastosEfectivo.toString(),
          gastosTarjeta: data.gastosTarjeta.toString(),
          observaciones: data.observaciones || ''
        })
      }
    } catch (error) {
      console.error('Error loading cierre:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const efectivoFinal = parseFloat(cierre.totalEfectivo) - parseFloat(cierre.gastosEfectivo)

      const response = await fetch(`/api/cierres-caja/${cierreId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fechaInicio: cierre.fechaInicio,
          fechaFin: cierre.fechaFin,
          totalEfectivo: parseFloat(cierre.totalEfectivo),
          totalTPVSumup: parseFloat(cierre.totalTPVSumup),
          totalTPVUnicaja: parseFloat(cierre.totalTPVUnicaja),
          gastosEfectivo: parseFloat(cierre.gastosEfectivo),
          gastosTarjeta: parseFloat(cierre.gastosTarjeta),
          efectivoFinal,
          observaciones: cierre.observaciones || null
        }),
      })

      if (response.ok) {
        setOpen(false)
        onCierreActualizado()
      } else {
        alert('Error al actualizar el cierre de caja')
      }
    } catch (error) {
      console.error('Error updating cierre:', error)
      alert('Error al actualizar el cierre de caja')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Cierre de Caja</DialogTitle>
          <DialogDescription>
            Modifica los datos del cierre de caja. Los cambios se guardarán inmediatamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fechaInicio">Fecha Inicio</Label>
                <Input
                  id="fechaInicio"
                  type="date"
                  value={cierre.fechaInicio}
                  onChange={(e) => setCierre({ ...cierre, fechaInicio: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaFin">Fecha Fin</Label>
                <Input
                  id="fechaFin"
                  type="date"
                  value={cierre.fechaFin}
                  onChange={(e) => setCierre({ ...cierre, fechaFin: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Ventas */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">VENTAS</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalEfectivo">Efectivo (€)</Label>
                  <Input
                    id="totalEfectivo"
                    type="number"
                    step="0.01"
                    value={cierre.totalEfectivo}
                    onChange={(e) => setCierre({ ...cierre, totalEfectivo: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalTPVSumup">TPV SUMUP (€)</Label>
                  <Input
                    id="totalTPVSumup"
                    type="number"
                    step="0.01"
                    value={cierre.totalTPVSumup}
                    onChange={(e) => setCierre({ ...cierre, totalTPVSumup: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalTPVUnicaja">TPV UNICAJA (€)</Label>
                  <Input
                    id="totalTPVUnicaja"
                    type="number"
                    step="0.01"
                    value={cierre.totalTPVUnicaja}
                    onChange={(e) => setCierre({ ...cierre, totalTPVUnicaja: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Gastos */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">GASTOS</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gastosEfectivo">Efectivo (€)</Label>
                  <Input
                    id="gastosEfectivo"
                    type="number"
                    step="0.01"
                    value={cierre.gastosEfectivo}
                    onChange={(e) => setCierre({ ...cierre, gastosEfectivo: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gastosTarjeta">Tarjeta (€)</Label>
                  <Input
                    id="gastosTarjeta"
                    type="number"
                    step="0.01"
                    value={cierre.gastosTarjeta}
                    onChange={(e) => setCierre({ ...cierre, gastosTarjeta: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Resumen */}
            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  Efectivo Final en Caja
                </p>
                <p className="text-2xl font-bold text-primary">
                  €{(parseFloat(cierre.totalEfectivo || '0') - parseFloat(cierre.gastosEfectivo || '0')).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={cierre.observaciones}
                onChange={(e) => setCierre({ ...cierre, observaciones: e.target.value })}
                placeholder="Notas adicionales sobre este cierre..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
