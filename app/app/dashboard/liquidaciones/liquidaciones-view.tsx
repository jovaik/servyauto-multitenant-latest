'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Calculator, Download, Euro, TrendingUp, TrendingDown, Users, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { useLocalStore } from '@/lib/local-store'
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { es } from 'date-fns/locale'

interface LiquidacionColaborador {
  colaborador: {
    id: string
    nombre: string
    rol: string
    comisionPct: number
    telefono: string | null
    email: string | null
  }
  baseCalculo: number
  comisionBruta: number
  gastosAtribuidos: number
  gastosDetalle: { id: string; concepto: string; importe: number; fecha: string }[]
  comisionNeta: number
  desglose: {
    prescriptor: { base: number; comision: number; numCitas: number }
    operario: { base: number; comision: number; numCitas: number }
    responsable: { base: number; comision: number }
  }
  numCitas: number
  citas: { id: string; fecha: string; total: number | null; cliente: string; vehiculo: string; servicios: string }[]
}

interface LiquidacionData {
  periodo: { desde: string; hasta: string }
  resumen: {
    ingresosTotales: number
    gastosTotales: number
    gastosGenerales: number
    totalComisiones: number
    totalComisionesPrescriptor: number
    totalComisionesOperario: number
    totalComisionesResponsable: number
    resultadoPropietario: number
    numCitas: number
  }
  liquidaciones: LiquidacionColaborador[]
}

const ROL_LABELS: Record<string, string> = {
  RESPONSABLE: 'Responsable',
  PRESCRIPTOR: 'Prescriptor',
  OPERARIO: 'Operario',
}

const ROL_COLORS: Record<string, string> = {
  RESPONSABLE: 'bg-blue-100 text-blue-800',
  PRESCRIPTOR: 'bg-purple-100 text-purple-800',
  OPERARIO: 'bg-gray-100 text-gray-800',
}

export default function LiquidacionesView() {
  const { selectedLocalId } = useLocalStore()
  // Por defecto: semana actual (lunes -> hoy) para ver de inmediato las citas recientes
  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 })

  const [desde, setDesde] = useState(format(thisWeekStart, 'yyyy-MM-dd'))
  const [hasta, setHasta] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [data, setData] = useState<LiquidacionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedColaborador, setExpandedColaborador] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const calcular = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ desde, hasta })
      if (selectedLocalId) params.set('localId', selectedLocalId)
      const res = await fetch(`/api/liquidaciones?${params}`)
      if (res.ok) {
        setData(await res.json())
      } else {
        const err = await res.json()
        setError(err.error || 'Error al calcular')
      }
    } catch (e) {
      console.error(e)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [selectedLocalId, desde, hasta])

  // Auto-calcular al montar y cuando cambie el local o el rango de fechas
  useEffect(() => {
    calcular()
  }, [selectedLocalId, desde, hasta, calcular])

  const setPreset = (preset: 'esta_semana' | 'semana_pasada' | 'este_mes' | 'mes_pasado') => {
    const now = new Date()
    switch (preset) {
      case 'esta_semana': {
        const s = startOfWeek(now, { weekStartsOn: 1 })
        setDesde(format(s, 'yyyy-MM-dd'))
        setHasta(format(now, 'yyyy-MM-dd'))
        break
      }
      case 'semana_pasada': {
        const s = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
        const e = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
        setDesde(format(s, 'yyyy-MM-dd'))
        setHasta(format(e, 'yyyy-MM-dd'))
        break
      }
      case 'este_mes': {
        setDesde(format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd'))
        setHasta(format(now, 'yyyy-MM-dd'))
        break
      }
      case 'mes_pasado': {
        const firstPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastPrev = new Date(now.getFullYear(), now.getMonth(), 0)
        setDesde(format(firstPrev, 'yyyy-MM-dd'))
        setHasta(format(lastPrev, 'yyyy-MM-dd'))
        break
      }
    }
  }

  const exportCSV = () => {
    if (!data) return
    const rows = [
      ['Colaborador', 'Rol', '% Comisión', 'Com. Prescriptor (€)', 'Com. Operario (€)', 'Com. Responsable (€)', 'Comisión Bruta (€)', 'Gastos Atribuidos (€)', 'Comisión Neta (€)', 'Nº Citas'],
      ...data.liquidaciones.map(l => [
        l.colaborador.nombre,
        ROL_LABELS[l.colaborador.rol],
        l.colaborador.comisionPct.toString(),
        l.desglose.prescriptor.comision.toFixed(2),
        l.desglose.operario.comision.toFixed(2),
        l.desglose.responsable.comision.toFixed(2),
        l.comisionBruta.toFixed(2),
        l.gastosAtribuidos.toFixed(2),
        l.comisionNeta.toFixed(2),
        l.numCitas.toString(),
      ]),
      [],
      ['RESUMEN'],
      ['Ingresos Totales', '', '', data.resumen.ingresosTotales.toFixed(2)],
      ['Gastos Totales', '', '', data.resumen.gastosTotales.toFixed(2)],
      ['Total Comisiones Prescriptores', '', '', data.resumen.totalComisionesPrescriptor.toFixed(2)],
      ['Total Comisiones Operarios', '', '', data.resumen.totalComisionesOperario.toFixed(2)],
      ['Total Comisiones Encargados', '', '', data.resumen.totalComisionesResponsable.toFixed(2)],
      ['Total Comisiones (neto)', '', '', data.resumen.totalComisiones.toFixed(2)],
      ['Resultado Propietario', '', '', data.resumen.resultadoPropietario.toFixed(2)],
    ]
    const csv = rows.map(r => r.join(';')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `liquidacion_${desde}_${hasta}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calculator className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">Liquidaciones</h1>
        </div>
        {data && (
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>Desde</Label>
              <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label>Hasta</Label>
              <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="w-40" />
            </div>
            <Button onClick={calcular} disabled={loading}>
              {loading ? 'Calculando...' : 'Calcular'}
            </Button>
            <div className="flex gap-2 ml-auto flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setPreset('esta_semana')}>Esta semana</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset('semana_pasada')}>Semana pasada</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset('este_mes')}>Este mes</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset('mes_pasado')}>Mes pasado</Button>
            </div>
          </div>
        </CardContent>
      </Card>


      {error && (
        <Card><CardContent className="py-6 text-center text-destructive">{error}</CardContent></Card>
      )}

      {/* Resumen */}
      {data && (
        <>
          {/* Cuenta de resultados */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Cuenta de Resultados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <div className="divide-y">
                {/* Ingresos */}
                <div className="flex justify-between items-center py-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Ingresos</span>
                    <span className="text-xs text-muted-foreground">({data.resumen.numCitas} citas)</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">{data.resumen.ingresosTotales.toFixed(2)} €</span>
                </div>
                {/* Gastos */}
                <div className="flex justify-between items-center py-3">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span className="font-medium">Gastos totales</span>
                    <span className="text-xs text-muted-foreground">(general: {data.resumen.gastosGenerales.toFixed(2)} €)</span>
                  </div>
                  <span className="text-lg font-bold text-red-600">-{data.resumen.gastosTotales.toFixed(2)} €</span>
                </div>

                <Separator className="my-0" />

                {/* Comisiones por rol */}
                <div className="py-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-muted-foreground text-sm uppercase tracking-wide">Comisiones por rol</span>
                    <span className="font-bold text-orange-600">{data.resumen.totalComisiones.toFixed(2)} €</span>
                  </div>
                  <div className="ml-6 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                        <span>Prescriptores</span>
                      </div>
                      <span className="font-semibold text-purple-700">{data.resumen.totalComisionesPrescriptor.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />
                        <span>Operarios</span>
                      </div>
                      <span className="font-semibold text-gray-700">{data.resumen.totalComisionesOperario.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span>Encargados</span>
                      </div>
                      <span className="font-semibold text-blue-700">{data.resumen.totalComisionesResponsable.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>

                <Separator className="my-0" />

                {/* Propietario */}
                <div className="flex justify-between items-center py-4 bg-green-50/60 -mx-6 px-6 rounded-b-lg">
                  <div className="flex items-center gap-2">
                    <Euro className="h-5 w-5 text-green-700" />
                    <span className="text-lg font-bold">Propietario</span>
                    <span className="text-xs text-muted-foreground">Ingresos − Gastos − Comisiones</span>
                  </div>
                  <span className={`text-2xl font-bold ${data.resumen.resultadoPropietario >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {data.resumen.resultadoPropietario.toFixed(2)} €
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liquidación por colaborador */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Detalle por Colaborador</h2>
            {data.liquidaciones.length === 0 && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No hay colaboradores registrados en este local</CardContent></Card>
            )}
            {data.liquidaciones.map(liq => {
              const isExpanded = expandedColaborador === liq.colaborador.id
              return (
                <Card key={liq.colaborador.id}>
                  <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpandedColaborador(isExpanded ? null : liq.colaborador.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{liq.colaborador.nombre}</CardTitle>
                        <Badge className={ROL_COLORS[liq.colaborador.rol]}>{ROL_LABELS[liq.colaborador.rol]}</Badge>
                        <span className="text-sm text-muted-foreground">{liq.colaborador.comisionPct}%</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`text-xl font-bold ${liq.comisionNeta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {liq.comisionNeta.toFixed(2)} €
                          </div>
                          <div className="text-xs text-muted-foreground">{liq.numCitas} citas</div>
                        </div>
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="space-y-4">
                      {/* Desglose por acción */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Comisión por acción ({liq.colaborador.comisionPct}%)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="p-3 bg-purple-50 rounded-lg">
                            <div className="text-xs text-purple-700 font-medium">Como Prescriptor</div>
                            <div className="text-lg font-bold text-purple-800">{liq.desglose.prescriptor.comision.toFixed(2)} €</div>
                            <div className="text-xs text-muted-foreground">{liq.desglose.prescriptor.numCitas} citas · base {liq.desglose.prescriptor.base.toFixed(2)} €</div>
                          </div>
                          <div className="p-3 bg-gray-100 rounded-lg">
                            <div className="text-xs text-gray-700 font-medium">Como Operario</div>
                            <div className="text-lg font-bold text-gray-800">{liq.desglose.operario.comision.toFixed(2)} €</div>
                            <div className="text-xs text-muted-foreground">{liq.desglose.operario.numCitas} lavados · base {liq.desglose.operario.base.toFixed(2)} €</div>
                          </div>
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="text-xs text-blue-700 font-medium">Como Responsable</div>
                            <div className="text-lg font-bold text-blue-800">{liq.desglose.responsable.comision.toFixed(2)} €</div>
                            <div className="text-xs text-muted-foreground">neto local {liq.desglose.responsable.base.toFixed(2)} €</div>
                          </div>
                        </div>
                      </div>

                      {/* Totales */}
                      <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                        <div>
                          <div className="text-xs text-muted-foreground">Comisión bruta</div>
                          <div className="font-semibold">{liq.comisionBruta.toFixed(2)} €</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Gastos atribuidos</div>
                          <div className="font-semibold text-red-600">-{liq.gastosAtribuidos.toFixed(2)} €</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Comisión neta</div>
                          <div className={`font-bold text-lg ${liq.comisionNeta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {liq.comisionNeta.toFixed(2)} €
                          </div>
                        </div>
                      </div>

                      {/* Gastos atribuidos detalle */}
                      {liq.gastosDetalle.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Gastos atribuidos</h4>
                          <div className="space-y-1">
                            {liq.gastosDetalle.map(g => (
                              <div key={g.id} className="flex justify-between text-sm px-2 py-1 bg-red-50 rounded">
                                <span>{g.concepto}</span>
                                <span className="text-red-600">-{g.importe.toFixed(2)} €</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Citas */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Citas ({liq.numCitas})</h4>
                        {liq.citas.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Sin citas en este período</p>
                        ) : (
                          <div className="max-h-60 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="text-xs text-muted-foreground">
                                <tr>
                                  <th className="text-left pb-2">Fecha</th>
                                  <th className="text-left pb-2">Cliente</th>
                                  <th className="text-left pb-2">Vehículo</th>
                                  <th className="text-left pb-2">Servicios</th>
                                  <th className="text-right pb-2">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {liq.citas.map(c => (
                                  <tr key={c.id} className="border-t">
                                    <td className="py-1.5">{format(new Date(c.fecha), 'dd/MM', { locale: es })}</td>
                                    <td className="py-1.5">{c.cliente}</td>
                                    <td className="py-1.5 text-muted-foreground">{c.vehiculo}</td>
                                    <td className="py-1.5 text-muted-foreground text-xs max-w-[200px] truncate">{c.servicios}</td>
                                    <td className="py-1.5 text-right font-medium">{(c.total || 0).toFixed(2)} €</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Fórmula explícita */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>
                  Comisión <strong>por acción</strong>: cada colaborador cobra por cada función que realiza en una cita. |
                  <strong> Prescriptor</strong>: % × bruto de citas que prescribió |
                  <strong> Operario</strong>: % × bruto de lavados que realizó |
                  <strong> Responsable</strong>: % × (Ingresos − Gastos generales del local) |
                  si prescribe Y ejecuta la misma cita, cobra ambas. Menos sus gastos atribuidos. |
                  <strong> Propietario</strong>: Ingresos − Gastos totales − Comisiones netas
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
