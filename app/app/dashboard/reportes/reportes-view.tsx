'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  CreditCard,
  BarChart3,
  Building2,
  Loader2,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Car,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Periodo = 'diario' | 'semanal' | 'mensual' | 'trimestral' | 'anual'

interface Resumen {
  totalIngresos: number
  totalGastos: number
  balance: number
  facturasPagadas: number
  facturasPendientes: number
  importePendiente: number
  ingresosAdicionales: number
  totalCitas: number
  citasCompletadas: number
  citasCanceladas: number
  clientesNuevos: number
  numGastos: number
}

interface DesglosePago {
  metodo: string
  total: number
  count: number
}

interface DesgloseTPV {
  tpv: string
  total: number
  count: number
}

interface DesgloseGasto {
  tipo: string
  total: number
  count: number
}

interface DesgloseIngresoAdicional {
  concepto: string
  total: number
  count: number
}

interface TopServicio {
  servicio: string
  total: number
  count: number
}

interface DatoLocal {
  localId: string
  localNombre: string
  ingresos: number
  gastos: number
  balance: number
  citas: number
}

interface DetalleCita {
  id: string
  fecha: string
  hora: string
  matricula: string
  vehiculo: string
  color: string
  cliente: string
  servicios: string[]
  total: number
  metodoPago: string | null
  operario: string
  local: string
}

interface LocalDisponible {
  id: string
  nombre: string
}

interface ReporteData {
  periodoLabel: string
  periodo: string
  startDate: string
  endDate: string
  resumen: Resumen
  desglosePagos: DesglosePago[]
  desgloseTPV: DesgloseTPV[]
  desgloseGastos: DesgloseGasto[]
  desgloseIngresosAdicionales: DesgloseIngresoAdicional[]
  topServicios: TopServicio[]
  detalleCitas: DetalleCita[]
  datosLocales: DatoLocal[]
  localesDisponibles: LocalDisponible[]
}

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: 'diario', label: 'Diario' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'anual', label: 'Anual' },
]

const METODO_LABELS: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TPV_SUMUP: 'TPV SumUp',
  TPV_UNICAJA: 'TPV Unicaja',
  REVOLUT: 'TPV REVOLUT',
  SIN_ESPECIFICAR: 'Sin especificar',
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function ReportesView() {
  const { data: session } = useSession() || {}
  const userRole = (session?.user as any)?.role || ''
  const [periodo, setPeriodo] = useState<Periodo>('diario')
  const [fecha, setFecha] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [localId, setLocalId] = useState('todos')
  const [data, setData] = useState<ReporteData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busquedaCitas, setBusquedaCitas] = useState('')
  const [mostrarDetalle, setMostrarDetalle] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  const fetchReporte = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        periodo,
        fecha,
        localId,
      })
      const res = await fetch(`/api/reportes?${params}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Error al cargar el reporte')
      }
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [periodo, fecha, localId])

  useEffect(() => {
    fetchReporte()
  }, [fetchReporte])

  const navigateDate = (direction: 'prev' | 'next') => {
    const d = new Date(fecha + 'T00:00:00')
    let newDate: Date
    switch (periodo) {
      case 'diario':
        newDate = direction === 'prev' ? subDays(d, 1) : addDays(d, 1)
        break
      case 'semanal':
        newDate = direction === 'prev' ? subWeeks(d, 1) : addWeeks(d, 1)
        break
      case 'mensual':
        newDate = direction === 'prev' ? subMonths(d, 1) : addMonths(d, 1)
        break
      case 'trimestral':
        newDate = direction === 'prev' ? subMonths(d, 3) : addMonths(d, 3)
        break
      case 'anual':
        newDate = direction === 'prev' ? subYears(d, 1) : addYears(d, 1)
        break
      default:
        newDate = d
    }
    setFecha(format(newDate, 'yyyy-MM-dd'))
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportCSV = () => {
    if (!data) return
    const rows: string[][] = []
    rows.push(['REPORTE SERVYAUTO'])
    rows.push(['Período', data.periodoLabel])
    rows.push(['Local', localId === 'todos' ? 'Todos los locales' : data.localesDisponibles.find(l => l.id === localId)?.nombre || localId])
    rows.push([])
    rows.push(['RESUMEN'])
    rows.push(['Total Ingresos', data.resumen.totalIngresos.toFixed(2)])
    rows.push(['Total Gastos', data.resumen.totalGastos.toFixed(2)])
    rows.push(['Balance', data.resumen.balance.toFixed(2)])
    rows.push(['Facturas Pagadas', String(data.resumen.facturasPagadas)])
    rows.push(['Facturas Pendientes', String(data.resumen.facturasPendientes)])
    rows.push(['Importe Pendiente', data.resumen.importePendiente.toFixed(2)])
    rows.push(['Ingresos Adicionales', data.resumen.ingresosAdicionales.toFixed(2)])
    rows.push(['Total Citas', String(data.resumen.totalCitas)])
    rows.push(['Citas Completadas', String(data.resumen.citasCompletadas)])
    rows.push(['Clientes Nuevos', String(data.resumen.clientesNuevos)])
    rows.push([])
    if (data.desglosePagos.length > 0) {
      rows.push(['DESGLOSE POR MÉTODO DE PAGO'])
      rows.push(['Método', 'Total', 'Operaciones'])
      data.desglosePagos.forEach(p => rows.push([METODO_LABELS[p.metodo] || p.metodo, p.total.toFixed(2), String(p.count)]))
      rows.push([])
    }
    if (data.desgloseTPV && data.desgloseTPV.length > 0) {
      rows.push(['DESGLOSE POR TPV (AUTÓNOMO)'])
      rows.push(['TPV', 'Total', 'Operaciones'])
      data.desgloseTPV.forEach(t => rows.push([t.tpv, t.total.toFixed(2), String(t.count)]))
      rows.push([])
    }
    if (data.desgloseGastos.length > 0) {
      rows.push(['DESGLOSE DE GASTOS'])
      rows.push(['Tipo', 'Total', 'Operaciones'])
      data.desgloseGastos.forEach(g => rows.push([g.tipo, g.total.toFixed(2), String(g.count)]))
      rows.push([])
    }
    if (data.topServicios.length > 0) {
      rows.push(['TOP SERVICIOS'])
      rows.push(['Servicio', 'Total', 'Cantidad'])
      data.topServicios.forEach(s => rows.push([s.servicio, s.total.toFixed(2), String(s.count)]))
      rows.push([])
    }
    if (data.detalleCitas.length > 0) {
      rows.push(['DETALLE DE VEHÍCULOS ATENDIDOS'])
      rows.push(['Fecha', 'Hora', 'Matrícula', 'Vehículo', 'Cliente', 'Servicios', 'Total', 'Método Pago', 'Operario', 'Local'])
      data.detalleCitas.forEach(c => rows.push([
        new Date(c.fecha).toLocaleDateString('es-ES'),
        c.hora,
        c.matricula,
        c.vehiculo,
        c.cliente,
        c.servicios.join(' + '),
        c.total.toFixed(2),
        METODO_LABELS[c.metodoPago || ''] || c.metodoPago || '',
        c.operario,
        c.local,
      ]))
      rows.push([])
    }
    if (data.datosLocales.length > 0) {
      rows.push(['COMPARATIVA POR LOCAL'])
      rows.push(['Local', 'Ingresos', 'Gastos', 'Balance', 'Citas'])
      data.datosLocales.forEach(l => rows.push([l.localNombre, l.ingresos.toFixed(2), l.gastos.toFixed(2), l.balance.toFixed(2), String(l.citas)]))
    }
    const csvContent = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte_${periodo}_${fecha}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="h-7 w-7 text-blue-600" />
            Reportes
          </h1>
          <p className="text-sm text-gray-500 mt-1">Genera reportes por período y local</p>
        </div>
        {userRole === 'SUPER_ADMIN' && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!data || loading}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!data || loading}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        </div>
        )}
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Period selector */}
            <div className="flex flex-wrap gap-1">
              {PERIODOS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriodo(p.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    periodo === p.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Date navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateDate('prev')} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="px-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
              />
              <Button variant="outline" size="icon" onClick={() => navigateDate('next')} className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Local selector */}
            <select
              value={localId}
              onChange={e => setLocalId(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 min-w-[180px]"
            >
              <option value="todos">Todos los locales</option>
              {data?.localesDisponibles.map(l => (
                <option key={l.id} value={l.id}>{l.nombre}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-500">Generando reporte...</span>
        </div>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Report content */}
      {data && !loading && (
        <div ref={printRef} className="space-y-6 print:space-y-4">
          {/* Period label */}
          <div className="text-center print:mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 capitalize">
              Reporte {data.periodo}: {data.periodoLabel}
            </h2>
            <p className="text-sm text-gray-500">
              {localId === 'todos' ? 'Todos los locales' : data.localesDisponibles.find(l => l.id === localId)?.nombre || ''}
            </p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Ingresos</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(data.resumen.totalIngresos)}</p>
                  </div>
                  <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">{data.resumen.facturasPagadas} facturas pagadas</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Gastos</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(data.resumen.totalGastos)}</p>
                  </div>
                  <div className="h-10 w-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">{data.resumen.numGastos} gastos registrados</p>
              </CardContent>
            </Card>

            <Card className={`border-l-4 ${data.resumen.balance >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Balance</p>
                    <p className={`text-2xl font-bold ${data.resumen.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {formatCurrency(data.resumen.balance)}
                    </p>
                  </div>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${data.resumen.balance >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                    {data.resumen.balance >= 0 ? <ArrowUpRight className="h-5 w-5 text-blue-600" /> : <ArrowDownRight className="h-5 w-5 text-orange-600" />}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {data.resumen.importePendiente > 0 ? `${formatCurrency(data.resumen.importePendiente)} pendiente` : 'Sin pendientes'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Citas</p>
                    <p className="text-2xl font-bold text-purple-600">{data.resumen.totalCitas}</p>
                  </div>
                  <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {data.resumen.citasCompletadas} completadas · {data.resumen.clientesNuevos} clientes nuevos
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detail sections - 2 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Desglose pagos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-500" />
                  Desglose por Método de Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.desglosePagos.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Sin datos</p>
                ) : (
                  <div className="space-y-2">
                    {data.desglosePagos.map((p, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 dark:border-gray-700">
                        <div>
                          <span className="text-sm font-medium">{METODO_LABELS[p.metodo] || p.metodo}</span>
                          <span className="text-xs text-gray-400 ml-2">({p.count} ops)</span>
                        </div>
                        <span className="text-sm font-semibold text-green-600">{formatCurrency(p.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Desglose por TPV (autónomo) */}
            {data.desgloseTPV && data.desgloseTPV.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-orange-500" />
                    Cobros por TPV (autónomo)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.desgloseTPV.map((t, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 dark:border-gray-700">
                        <div>
                          <span className="text-sm font-medium">💳 {t.tpv}</span>
                          <span className="text-xs text-gray-400 ml-2">({t.count} ops)</span>
                        </div>
                        <span className="text-sm font-semibold text-green-600">{formatCurrency(t.total)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Desglose gastos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Desglose de Gastos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.desgloseGastos.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Sin datos</p>
                ) : (
                  <div className="space-y-2">
                    {data.desgloseGastos.map((g, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 dark:border-gray-700">
                        <div>
                          <span className="text-sm font-medium">{g.tipo}</span>
                          <span className="text-xs text-gray-400 ml-2">({g.count})</span>
                        </div>
                        <span className="text-sm font-semibold text-red-600">{formatCurrency(g.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top servicios */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  Top Servicios
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.topServicios.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Sin datos</p>
                ) : (
                  <div className="space-y-2">
                    {data.topServicios.map((s, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                          <span className="text-sm font-medium">{s.servicio}</span>
                          <span className="text-xs text-gray-400">({s.count})</span>
                        </div>
                        <span className="text-sm font-semibold">{formatCurrency(s.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ingresos adicionales */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  Ingresos Adicionales
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.desgloseIngresosAdicionales.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Sin datos</p>
                ) : (
                  <div className="space-y-2">
                    {data.desgloseIngresosAdicionales.map((ia, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 dark:border-gray-700">
                        <div>
                          <span className="text-sm font-medium">{ia.concepto}</span>
                          <span className="text-xs text-gray-400 ml-2">({ia.count})</span>
                        </div>
                        <span className="text-sm font-semibold text-green-600">{formatCurrency(ia.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detalle de vehículos atendidos */}
          {data.detalleCitas.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Car className="h-4 w-4 text-blue-500" />
                    Vehículos Atendidos ({data.detalleCitas.length})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Buscar matrícula, cliente, servicio..."
                        value={busquedaCitas}
                        onChange={e => setBusquedaCitas(e.target.value)}
                        className="pl-8 h-8 text-sm w-[250px]"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMostrarDetalle(!mostrarDetalle)}
                      className="text-xs"
                    >
                      {mostrarDetalle ? 'Ocultar' : 'Mostrar'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {mostrarDetalle && (
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                          <th className="text-left py-2 px-2 font-semibold">Fecha</th>
                          <th className="text-left py-2 px-2 font-semibold">Hora</th>
                          <th className="text-left py-2 px-2 font-semibold">Matrícula</th>
                          <th className="text-left py-2 px-2 font-semibold">Vehículo</th>
                          <th className="text-left py-2 px-2 font-semibold">Cliente</th>
                          <th className="text-left py-2 px-2 font-semibold">Servicios</th>
                          <th className="text-right py-2 px-2 font-semibold">Total</th>
                          <th className="text-left py-2 px-2 font-semibold">Pago</th>
                          <th className="text-left py-2 px-2 font-semibold">Operario</th>
                          {localId === 'todos' && <th className="text-left py-2 px-2 font-semibold">Local</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {data.detalleCitas
                          .filter(c => {
                            if (!busquedaCitas) return true
                            const q = busquedaCitas.toLowerCase()
                            return (
                              c.matricula.toLowerCase().includes(q) ||
                              c.vehiculo.toLowerCase().includes(q) ||
                              c.cliente.toLowerCase().includes(q) ||
                              c.servicios.some(s => s.toLowerCase().includes(q)) ||
                              c.operario.toLowerCase().includes(q) ||
                              c.local.toLowerCase().includes(q)
                            )
                          })
                          .map((c, i) => (
                            <tr key={c.id} className="border-b last:border-0 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="py-1.5 px-2 whitespace-nowrap">
                                {new Date(c.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                              </td>
                              <td className="py-1.5 px-2 whitespace-nowrap">{c.hora}</td>
                              <td className="py-1.5 px-2 font-mono font-bold text-blue-600 whitespace-nowrap">{c.matricula}</td>
                              <td className="py-1.5 px-2 whitespace-nowrap">
                                <span className="font-medium">{c.vehiculo}</span>
                                {c.color && <span className="text-xs text-gray-400 ml-1">({c.color})</span>}
                              </td>
                              <td className="py-1.5 px-2 whitespace-nowrap">{c.cliente}</td>
                              <td className="py-1.5 px-2">
                                <div className="flex flex-wrap gap-1">
                                  {c.servicios.map((s, si) => (
                                    <span key={si} className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-1.5 py-0.5 rounded">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-1.5 px-2 text-right font-semibold whitespace-nowrap">{formatCurrency(c.total)}</td>
                              <td className="py-1.5 px-2 whitespace-nowrap text-xs">
                                {METODO_LABELS[c.metodoPago || ''] || c.metodoPago || '-'}
                              </td>
                              <td className="py-1.5 px-2 whitespace-nowrap text-xs text-gray-500">{c.operario || '-'}</td>
                              {localId === 'todos' && <td className="py-1.5 px-2 whitespace-nowrap text-xs">{c.local}</td>}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Comparativa por local - only shown when all locals selected */}
          {data.datosLocales.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-indigo-500" />
                  Comparativa por Local
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-2 font-semibold">Local</th>
                        <th className="text-right py-2 font-semibold">Ingresos</th>
                        <th className="text-right py-2 font-semibold">Gastos</th>
                        <th className="text-right py-2 font-semibold">Balance</th>
                        <th className="text-right py-2 font-semibold">Citas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.datosLocales.map((l, i) => (
                        <tr key={i} className="border-b last:border-0 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-2 font-medium">{l.localNombre}</td>
                          <td className="py-2 text-right text-green-600 font-medium">{formatCurrency(l.ingresos)}</td>
                          <td className="py-2 text-right text-red-600 font-medium">{formatCurrency(l.gastos)}</td>
                          <td className={`py-2 text-right font-medium ${l.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {formatCurrency(l.balance)}
                          </td>
                          <td className="py-2 text-right">{l.citas}</td>
                        </tr>
                      ))}
                      {/* Totals row */}
                      <tr className="border-t-2 dark:border-gray-600 font-bold">
                        <td className="py-2">TOTAL</td>
                        <td className="py-2 text-right text-green-600">
                          {formatCurrency(data.datosLocales.reduce((sum, l) => sum + l.ingresos, 0))}
                        </td>
                        <td className="py-2 text-right text-red-600">
                          {formatCurrency(data.datosLocales.reduce((sum, l) => sum + l.gastos, 0))}
                        </td>
                        <td className={`py-2 text-right ${data.datosLocales.reduce((sum, l) => sum + l.balance, 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                          {formatCurrency(data.datosLocales.reduce((sum, l) => sum + l.balance, 0))}
                        </td>
                        <td className="py-2 text-right">
                          {data.datosLocales.reduce((sum, l) => sum + l.citas, 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info adicional */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-200">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-xs text-amber-600 font-medium uppercase">Facturas Pendientes</p>
                <p className="text-xl font-bold text-amber-700">{data.resumen.facturasPendientes}</p>
                <p className="text-xs text-amber-500">{formatCurrency(data.resumen.importePendiente)}</p>
              </CardContent>
            </Card>
            <Card className="bg-teal-50 dark:bg-teal-900/10 border-teal-200">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-xs text-teal-600 font-medium uppercase">Ingresos Adicionales</p>
                <p className="text-xl font-bold text-teal-700">{formatCurrency(data.resumen.ingresosAdicionales)}</p>
              </CardContent>
            </Card>
            <Card className="bg-rose-50 dark:bg-rose-900/10 border-rose-200">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-xs text-rose-600 font-medium uppercase">Citas Canceladas</p>
                <p className="text-xl font-bold text-rose-700">{data.resumen.citasCanceladas}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print\:space-y-4, .print\:space-y-4 * { visibility: visible; }
          .print\:space-y-4 { position: absolute; left: 0; top: 0; width: 100%; }
          button, select, input { display: none !important; }
        }
      `}</style>
    </div>
  )
}
