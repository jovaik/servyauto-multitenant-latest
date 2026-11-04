'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, FileText, AlertTriangle, Calendar, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { LOCAL_CHANGE_EVENT } from '@/lib/local-store'
import { FacturarCitaDialog, type CitaFacturable } from '@/components/facturar-cita-dialog'

const estadoBadge = (estado?: string) => {
  switch (estado) {
    case 'PAGO_POSTERIOR':
      return { cls: 'bg-indigo-100 text-indigo-800 border-indigo-300', label: 'CRÉDITO' }
    case 'COMPLETADA':
      return { cls: 'bg-green-100 text-green-800 border-green-200', label: 'COMPLETADA' }
    default:
      return { cls: 'bg-gray-100 text-gray-700 border-gray-200', label: (estado || '-').replace(/_/g, ' ') }
  }
}

export function PendientesFacturarView() {
  const [citas, setCitas] = useState<CitaFacturable[]>([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<CitaFacturable | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/facturacion-agrupada?flat=1', { cache: 'no-store' })
      const data = await res.json()
      setCitas(Array.isArray(data?.citas) ? data.citas : [])
    } catch {
      setCitas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
    const handler = () => cargar()
    window.addEventListener(LOCAL_CHANGE_EVENT, handler)
    return () => window.removeEventListener(LOCAL_CHANGE_EVENT, handler)
  }, [cargar])

  const abrirFacturar = (c: CitaFacturable) => {
    setSel(c)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Pendientes de facturar</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Ventas con trabajo hecho que todavía no tienen factura. Incluye las ventas a crédito (prescriptores y
              empresas). Pulsa «Facturar» para emitir la factura al cliente o a una empresa.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={cargar}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-gray-400">Cargando…</div>
          ) : citas.length === 0 ? (
            <div className="py-10 text-center text-gray-500 flex flex-col items-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <span>No hay ventas pendientes de facturar. ¡Todo facturado!</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-3 font-medium">Fecha</th>
                    <th className="py-2 pr-3 font-medium">Tipo</th>
                    <th className="py-2 pr-3 font-medium">Cliente</th>
                    <th className="py-2 pr-3 font-medium">Vehículo</th>
                    <th className="py-2 pr-3 font-medium">Local</th>
                    <th className="py-2 pr-3 font-medium text-right">Importe</th>
                    <th className="py-2 pr-3 font-medium text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {citas.map((c) => {
                    const cli = c.cliente
                      ? `${c.cliente.nombre || ''} ${c.cliente.apellido || ''}`.trim()
                      : '—'
                    const veh = c.vehiculo
                      ? `${c.vehiculo.marca || ''} ${c.vehiculo.modelo || ''} ${c.vehiculo.matricula ? '· ' + c.vehiculo.matricula : ''}`.trim()
                      : '—'
                    const badge = c.cobroDiferido || c.estado === 'PAGO_POSTERIOR'
                      ? { cls: 'bg-indigo-100 text-indigo-800 border-indigo-300', label: `${c.estado === 'PAGO_POSTERIOR' ? 'COMPLETADA' : c.estado || ''} · PAGO DIFERIDO` }
                      : estadoBadge(c.estado)
                    return (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            {format(new Date(c.fecha), 'd MMM yyyy', { locale: es })}
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <Badge variant="outline" className={badge.cls}>{badge.label}</Badge>
                        </td>
                        <td className="py-2 pr-3 font-medium">
                          {cli}
                          {c.cliente?.clienteEmpresa && (
                            <span className="ml-1 text-[10px] text-blue-600">(empresa)</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-gray-600">{veh}</td>
                        <td className="py-2 pr-3 text-gray-600">{c.local?.nombre || '—'}</td>
                        <td className="py-2 pr-3 text-right font-semibold">{(Number(c.total) || 0).toFixed(2)}€</td>
                        <td className="py-2 pr-3 text-right">
                          <Button size="sm" onClick={() => abrirFacturar(c)} disabled={!c.cliente?.id}>
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            Facturar
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <FacturarCitaDialog
        cita={sel}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onFacturada={cargar}
      />
    </div>
  )
}
