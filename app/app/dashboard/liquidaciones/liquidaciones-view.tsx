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
  reparto?: { numPartes: number; participa: boolean; netoLocal: number; gananciaPorParte: number; prestamoFuera: number; repartible: number; porParte: number; pendienteRecuperar: number; pendienteRecuperarPorParte: number } | null
  participacionNeto: number
  importeLiquidacion: number
  desglose: {
    prescriptor: { base: number; comision: number; numCitas: number }
    operario: { base: number; comision: number; numCitas: number }
    responsable: { base: number; comision: number }
  }
  numCitas: number
  citas: { id: string; fecha: string; total: number | null; cliente: string; vehiculo: string; servicios: string }[]
}

interface SimulacionData {
  propietarioPct: number
  numPartesIguales: number
  modeloA: {
    nombre: string
    descripcion: string
    neto: number
    comisionesAutonomos: number
    comisionPrescriptor: number
    comisionOperario: number
    comisionResponsable: number
    propietario: number
  }
  modeloB: {
    nombre: string
    descripcion: string
    neto: number
    numPartes: number
    porParte: number
    propietario: number
    comisionPrescriptorInformativa: number
  }
  diferenciaPropietario: number
}

interface LiquidacionData {
  periodo: { desde: string; hasta: string }
  vistaRestringida?: boolean
  propietarioPct?: number
  reparto?: { numPartes: number; netoLocal: number; gananciaPorParte: number; prestamoFuera: number; repartible: number; porParte: number; pendienteRecuperar: number; pendienteRecuperarPorParte: number } | null
  simulacion?: SimulacionData
  resumen: {
    ingresosTotales: number
    gastosTotales: number
    gastosGenerales: number
    netoLocal: number
    prestamosFuera: number
    netoRepartible: number
    totalComisiones: number
    totalComisionesPrescriptor: number
    totalComisionesOperario: number
    totalComisionesResponsable: number
    propietarioPct: number
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
  const [editPropPct, setEditPropPct] = useState<string>('50')
  const [savingPct, setSavingPct] = useState(false)
  const [editPartes, setEditPartes] = useState<string>('3')
  const [savingPartes, setSavingPartes] = useState(false)

  const calcular = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ desde, hasta })
      if (selectedLocalId) params.set('localId', selectedLocalId)
      const res = await fetch(`/api/liquidaciones?${params}`)
      if (res.ok) {
        const d = await res.json()
        setData(d)
        if (d.propietarioPct !== undefined) setEditPropPct(String(d.propietarioPct))
        if (d.simulacion?.numPartesIguales !== undefined) setEditPartes(String(d.simulacion.numPartesIguales))
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

  const guardarPropPct = async () => {
    setSavingPct(true)
    try {
      const res = await fetch('/api/liquidaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propietarioPct: parseFloat(editPropPct) || 50 }),
      })
      if (res.ok) calcular()
    } catch (e) { console.error(e) }
    finally { setSavingPct(false) }
  }

  const guardarPartes = async () => {
    setSavingPartes(true)
    try {
      const res = await fetch('/api/liquidaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numPartesIguales: parseInt(editPartes) || 3 }),
      })
      if (res.ok) calcular()
    } catch (e) { console.error(e) }
    finally { setSavingPartes(false) }
  }

  const exportCSV = () => {
    if (!data) return
    const rows = [
      ['AUTÓNOMO', 'Rol', '% Configurado', 'Com. Prescriptor (€)', 'Com. Operario (€)', 'Com. Responsable (€)', 'Comisión Bruta (€)', 'Gastos Atribuidos (€)', 'Comisión Neta (€)', 'Nº Citas', 'PARTICIPACIÓN EN NETO (€)', 'IMPORTE LIQUIDACIÓN (€)'],
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
        l.participacionNeto.toFixed(2),
        l.importeLiquidacion.toFixed(2),
      ]),
      [],
      ['RESUMEN'],
      ['Ingresos Totales', '', '', data.resumen.ingresosTotales.toFixed(2)],
      ['Gastos Totales', '', '', data.resumen.gastosTotales.toFixed(2)],
      ['Neto del Local', '', '', data.resumen.netoLocal.toFixed(2)],
      ['Total Comisiones Prescriptores', '', '', data.resumen.totalComisionesPrescriptor.toFixed(2)],
      ['Total Comisiones Operarios', '', '', data.resumen.totalComisionesOperario.toFixed(2)],
      ['Total Comisiones Encargados', '', '', data.resumen.totalComisionesResponsable.toFixed(2)],
      ['Total Comisiones (neto)', '', '', data.resumen.totalComisiones.toFixed(2)],
      ...(data.reparto && data.reparto.prestamoFuera > 0 ? [
        ['Beneficio ganado por parte', '', '', data.reparto.gananciaPorParte.toFixed(2)],
        ['(-) Prestamo/inversion en otro local (no esta en caja)', '', '', data.reparto.prestamoFuera.toFixed(2)],
        ['A repartir hoy (total)', '', '', data.reparto.repartible.toFixed(2)],
        ['Pendiente de recuperar del otro local', '', '', data.reparto.pendienteRecuperar.toFixed(2)],
      ] : []),
      [data.reparto ? (data.reparto.prestamoFuera > 0 ? `A REPARTIR HOY: 1 DE ${data.reparto.numPartes} PARTES` : `PROPIETARIO: 1 DE ${data.reparto.numPartes} PARTES`) : `Propietario (${data.propietarioPct ?? 50}% del neto)`, '', '', data.resumen.resultadoPropietario.toFixed(2)],
      ...(data.simulacion ? [
        [],
        ['SIMULADOR DE REPARTO'],
        ['MODELO A - Comisiones por acción (actual)'],
        ['Neto (Ingresos - Gastos)', '', '', data.simulacion.modeloA.neto.toFixed(2)],
        ['Comisiones a autónomos', '', '', data.simulacion.modeloA.comisionesAutonomos.toFixed(2)],
        ['  de ellas, prescriptor', '', '', data.simulacion.modeloA.comisionPrescriptor.toFixed(2)],
        ['Propietario (Modelo A)', '', '', data.simulacion.modeloA.propietario.toFixed(2)],
        [],
        [`MODELO B - Partes iguales entre ${data.simulacion.modeloB.numPartes}`],
        ['Neto (Ingresos - Gastos)', '', '', data.simulacion.modeloB.neto.toFixed(2)],
        ['Por parte', '', '', data.simulacion.modeloB.porParte.toFixed(2)],
        ['Comisión prescriptor (solo estadística)', '', '', data.simulacion.modeloB.comisionPrescriptorInformativa.toFixed(2)],
        ['Propietario (Modelo B, 1 parte)', '', '', data.simulacion.modeloB.propietario.toFixed(2)],
        [],
        ['Diferencia para el propietario (B - A)', '', '', data.simulacion.diferenciaPropietario.toFixed(2)],
      ] : []),
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
          {/* Cuenta de resultados - solo para admin/propietario */}
          {!data.vistaRestringida && <Card>
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

                {/* Neto del local */}
                <div className="flex justify-between items-center py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Neto del local</span>
                    <span className="text-xs text-muted-foreground">(Ingresos − Gastos)</span>
                  </div>
                  <span className={`text-lg font-bold ${data.resumen.netoLocal >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {data.resumen.netoLocal.toFixed(2)} €
                  </span>
                </div>

                <Separator className="my-0" />

                {/* Préstamo / inversión fuera: se descuenta de lo repartible hoy */}
                {data.reparto && data.reparto.prestamoFuera > 0 && (
                  <div className="py-3 space-y-2 border-t">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Beneficio ganado ÷ {data.reparto.numPartes}</span>
                      <span className="font-semibold">{data.reparto.gananciaPorParte.toFixed(2)} € / socio</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-amber-700">
                      <span>− Préstamo/inversión en otro local (no está en caja)</span>
                      <span className="font-semibold">-{data.reparto.prestamoFuera.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-blue-700">
                      <span>Pendiente de recuperar del otro local</span>
                      <span className="font-semibold">{data.reparto.pendienteRecuperar.toFixed(2)} € ({data.reparto.pendienteRecuperarPorParte.toFixed(2)} €/socio)</span>
                    </div>
                  </div>
                )}

                {/* Propietario con % editable */}
                <div className="py-4 bg-green-50/60 -mx-6 px-6 rounded-b-lg">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Euro className="h-5 w-5 text-green-700" />
                      <span className="text-lg font-bold">{data.reparto ? (data.reparto.prestamoFuera > 0 ? `A REPARTIR HOY ÷ ${data.reparto.numPartes}` : `PROPIETARIO · NETO ÷ ${data.reparto.numPartes}`) : 'Propietario'}</span>
                      {!data.reparto && <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={editPropPct}
                          onChange={e => setEditPropPct(e.target.value)}
                          className="w-16 h-7 text-sm text-center"
                        />
                        <span className="text-sm text-muted-foreground">% × neto</span>
                        {String(data.propietarioPct ?? 50) !== editPropPct && (
                          <Button size="sm" variant="outline" className="h-7 text-xs ml-1" onClick={guardarPropPct} disabled={savingPct}>
                            {savingPct ? '...' : 'Guardar'}
                          </Button>
                        )}
                      </div>}
                    </div>
                    <span className={`text-2xl font-bold ${data.resumen.resultadoPropietario >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {data.resumen.resultadoPropietario.toFixed(2)} €
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>}

          {/* Simulador de reparto - solo admin/propietario */}
          {!data.vistaRestringida && data.simulacion && (
            <Card className="border-2 border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  Simulador de Reparto — ¿qué modelo interesa más?
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Compara cuánto se lleva el propietario con cada modelo para el período y local seleccionados.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Modelo A */}
                  <div className="p-4 rounded-lg border bg-orange-50/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-orange-100 text-orange-800">Modelo A</Badge>
                      <span className="font-semibold text-sm">{data.simulacion.modeloA.nombre}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{data.simulacion.modeloA.descripcion}</p>
                    <div className="space-y-1 text-sm pt-1">
                      <div className="flex justify-between"><span>Neto (Ingresos − Gastos)</span><span className="font-medium">{data.simulacion.modeloA.neto.toFixed(2)} €</span></div>
                      <div className="flex justify-between text-muted-foreground"><span>− Comisiones a autónomos</span><span>-{data.simulacion.modeloA.comisionesAutonomos.toFixed(2)} €</span></div>
                      <div className="flex justify-between text-xs text-purple-700 pl-3"><span>· de ellas, prescriptor</span><span>{data.simulacion.modeloA.comisionPrescriptor.toFixed(2)} €</span></div>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center pt-1">
                      <span className="font-bold">Propietario</span>
                      <span className={`text-xl font-bold ${data.simulacion.modeloA.propietario >= 0 ? 'text-green-700' : 'text-red-600'}`}>{data.simulacion.modeloA.propietario.toFixed(2)} €</span>
                    </div>
                  </div>

                  {/* Modelo B */}
                  <div className="p-4 rounded-lg border bg-green-50/50 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-green-100 text-green-800">Modelo B</Badge>
                      <span className="font-semibold text-sm">Partes iguales tras gastos</span>
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-xs text-muted-foreground">Partes:</span>
                        <Input
                          type="number"
                          min={2}
                          max={10}
                          step={1}
                          value={editPartes}
                          onChange={e => setEditPartes(e.target.value)}
                          className="w-14 h-7 text-sm text-center"
                        />
                        {String(data.simulacion.numPartesIguales) !== editPartes && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={guardarPartes} disabled={savingPartes}>
                            {savingPartes ? '...' : 'Guardar'}
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{data.simulacion.modeloB.descripcion}</p>
                    <div className="space-y-1 text-sm pt-1">
                      <div className="flex justify-between"><span>Neto (Ingresos − Gastos)</span><span className="font-medium">{data.simulacion.modeloB.neto.toFixed(2)} €</span></div>
                      <div className="flex justify-between text-muted-foreground"><span>÷ {data.simulacion.modeloB.numPartes} partes iguales</span><span>{data.simulacion.modeloB.porParte.toFixed(2)} € / parte</span></div>
                      <div className="flex justify-between text-xs text-purple-700 pl-3"><span>· comisión prescriptor (solo estadística)</span><span>{data.simulacion.modeloB.comisionPrescriptorInformativa.toFixed(2)} €</span></div>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center pt-1">
                      <span className="font-bold">Propietario (1 parte)</span>
                      <span className={`text-xl font-bold ${data.simulacion.modeloB.propietario >= 0 ? 'text-green-700' : 'text-red-600'}`}>{data.simulacion.modeloB.propietario.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>

                {/* Veredicto */}
                <div className={`p-3 rounded-lg text-center text-sm font-medium ${data.simulacion.diferenciaPropietario > 0 ? 'bg-green-100 text-green-800' : data.simulacion.diferenciaPropietario < 0 ? 'bg-orange-100 text-orange-800' : 'bg-muted text-muted-foreground'}`}>
                  {data.simulacion.diferenciaPropietario > 0 && (
                    <>Con el <strong>Modelo B (partes iguales)</strong> el propietario se lleva <strong>{Math.abs(data.simulacion.diferenciaPropietario).toFixed(2)} € más</strong> en este período.</>
                  )}
                  {data.simulacion.diferenciaPropietario < 0 && (
                    <>Con el <strong>Modelo A (comisiones)</strong> el propietario se lleva <strong>{Math.abs(data.simulacion.diferenciaPropietario).toFixed(2)} € más</strong> en este período.</>
                  )}
                  {data.simulacion.diferenciaPropietario === 0 && (<>Ambos modelos dan el mismo resultado al propietario en este período.</>)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Liquidación por colaborador */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">DETALLE POR AUTÓNOMO</h2>
            {data.liquidaciones.length === 0 && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">NO HAY AUTÓNOMOS REGISTRADOS EN ESTE LOCAL</CardContent></Card>
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
                        <span className="text-sm text-muted-foreground">{liq.reparto?.participa ? `1/${liq.reparto.numPartes} DEL NETO (${liq.colaborador.comisionPct}% CONFIGURADO)` : `${liq.colaborador.comisionPct}%`}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`text-xl font-bold ${liq.importeLiquidacion >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {liq.importeLiquidacion.toFixed(2)} €
                          </div>
                          {liq.reparto && <div className="text-xs text-muted-foreground">PARTICIPACIÓN EN BENEFICIO NETO</div>}
                          <div className="text-xs text-muted-foreground">{liq.numCitas} citas</div>
                        </div>
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="space-y-4">
                      {liq.reparto && <div className="p-4 bg-green-50 text-green-900 rounded-lg space-y-1">
                        <h4 className="text-sm font-semibold">PARTICIPACIÓN EN BENEFICIO NETO</h4>
                        {!liq.reparto.participa ? (
                          <p>SIN PARTICIPACIÓN CONFIGURADA EN EL REPARTO</p>
                        ) : liq.reparto.prestamoFuera > 0 ? (
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm"><span>Beneficio ganado ÷ {liq.reparto.numPartes}</span><span className="font-semibold">{liq.reparto.gananciaPorParte.toFixed(2)} €</span></div>
                            <div className="flex justify-between text-sm text-amber-700"><span>− Préstamo/inversión en otro local (÷ {liq.reparto.numPartes})</span><span className="font-semibold">-{(liq.reparto.prestamoFuera / liq.reparto.numPartes).toFixed(2)} €</span></div>
                            <div className="flex justify-between text-sm font-bold border-t border-green-200 pt-1"><span>A repartir hoy</span><span>{liq.participacionNeto.toFixed(2)} €</span></div>
                            <div className="flex justify-between text-xs text-blue-700"><span>Pendiente de recuperar del otro local</span><span>{liq.reparto.pendienteRecuperarPorParte.toFixed(2)} €</span></div>
                          </div>
                        ) : (
                          <p>{`${liq.reparto.netoLocal.toFixed(2)} € ÷ ${liq.reparto.numPartes} = ${liq.participacionNeto.toFixed(2)} €`}</p>
                        )}
                        <p className="text-xs">TRAS DESCONTAR TODOS LOS GASTOS. NO SE RESTAN OTRA VEZ LOS GASTOS ATRIBUIDOS. COMISIONES POR ROL: 0 €.</p>
                      </div>}
                      {/* Desglose por acción */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">{liq.reparto ? 'COMISIONES POR ACCIÓN (0%)' : `Comisión por acción (${liq.colaborador.comisionPct}%)`}</h4>
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
                          <div className="text-xs text-muted-foreground">{liq.reparto ? 'GASTOS YA INCLUIDOS EN EL NETO' : 'Gastos atribuidos'}</div>
                          <div className="font-semibold text-red-600">-{liq.gastosAtribuidos.toFixed(2)} €</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">{liq.reparto ? 'IMPORTE DEL REPARTO' : 'Comisión neta'}</div>
                          <div className={`font-bold text-lg ${liq.importeLiquidacion >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {liq.importeLiquidacion.toFixed(2)} €
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
                {data.reparto ? <span>REPARTO DEFINITIVO: (INGRESOS − TODOS LOS GASTOS) ÷ {data.reparto.numPartes}. SIN COMISIONES POR ROL. LOS GASTOS ATRIBUIDOS YA ESTÁN INCLUIDOS Y NO SE DESCUENTAN OTRA VEZ.</span> : <span>
                  COMISIÓN <strong>POR ACCIÓN</strong>: CADA AUTÓNOMO COBRA POR CADA FUNCIÓN QUE REALIZA EN UNA CITA. |
                  <strong> Prescriptor</strong>: % × bruto de citas que prescribió |
                  <strong> Operario</strong>: % × bruto de lavados que realizó |
                  <strong> Responsable</strong>: % × (Ingresos − Gastos generales del local) |
                  si prescribe Y ejecuta la misma cita, cobra ambas. Menos sus gastos atribuidos. |
                  <strong> Propietario</strong>: % configurable × Neto del local (Ingresos − Gastos)
                </span>}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
