'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  TrendingDown,
  BookOpen,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  CreditCard,
  Building2,
  Download
} from 'lucide-react'
import { generarPDFDiarioCaja } from '@/lib/pdf-generator'
import { exportarDiarioCajaExcel } from '@/lib/excel-generator'
import { getSelectedLocalId, useLocalStore } from '@/lib/local-store'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, subWeeks, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface Movimiento {
  id: string
  fecha: Date
  tipo: 'INGRESO' | 'GASTO'
  concepto: string
  categoria: string
  importe: number
  metodoPago?: string
  referencia?: string
  // Trazabilidad
  creadoPor?: string
  creadoEn?: Date
}

export default function DiarioCajaView() {
  const { data: session } = useSession() || {}
  const userRole = (session?.user as any)?.role || ''
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS')
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('MES_ACTUAL')
  const [busqueda, setBusqueda] = useState('')
  const [fechaInicio, setFechaInicio] = useState<string>('')
  const [fechaFin, setFechaFin] = useState<string>('')

  // Cargar datos
  const cargarDatos = async () => {
    setLoading(true)
    try {
      // Cargar facturas (ingresos)
      const resFacturas = await fetch('/api/facturas')
      const facturas = await resFacturas.json()

      // Cargar gastos
      const resGastos = await fetch('/api/gastos')
      const gastos = await resGastos.json()

      // Cargar ingresos adicionales (parking, máquinas, etc.)
      const resIngresosAdicionales = await fetch('/api/ingresos-adicionales')
      const ingresosAdicionales = await resIngresosAdicionales.json()

      // Cargar pagos parciales / a cuenta ANTES de las facturas, para poder deduplicar.
      // Una cita puede cobrarse en varios tramos/cuentas (pagos parciales). Si además existe
      // su factura/ticket PAGADA, contar ambos duplica el ingreso. Los pagos parciales son el
      // desglose real (método + cuenta/TPV concreto); la factura solo lleva un método único.
      let pagosData: any[] = []
      try {
        const resPagos = await fetch('/api/pagos-parciales')
        const pd = await resPagos.json()
        if (Array.isArray(pd)) pagosData = pd
      } catch {}
      const sumPagosPorCita: Record<string, number> = {}
      for (const p of pagosData) {
        if (!p.citaId) continue
        sumPagosPorCita[p.citaId] = (sumPagosPorCita[p.citaId] || 0) + (p.importe || 0)
      }

      // Transformar facturas a movimientos (solo pagadas).
      // Si la cita tiene pagos parciales, se muestran ESTOS (con su cuenta/TPV) y la factura
      // solo aporta el RESTO no cubierto por los pagos (para no contar doble ni perder importe).
      const ingresosFacturas = (facturas || []).filter((f: any) => f.estado === 'PAGADA').flatMap((f: any) => {
        const sumPagos = f.citaId ? (sumPagosPorCita[f.citaId] || 0) : 0
        const importeFactura = sumPagos > 0 ? Math.round(((f.total || 0) - sumPagos) * 100) / 100 : (f.total || 0)
        if (sumPagos > 0 && importeFactura <= 0.01) return [] // cubierto por los pagos parciales
        const base = f.tipo === 'TICKET' ? `Ticket #${f.numero}` : `Factura #${f.numero}`
        return [{
          id: `FAC-${f.id}`,
          fecha: new Date(f.fechaPago || f.fecha),
          tipo: 'INGRESO' as const,
          concepto: sumPagos > 0 ? `${base} (resto)` : base,
          categoria: f.tipo === 'TICKET' ? 'Ticket' : 'Factura',
          importe: importeFactura,
          metodoPago: f.metodoPago,
          referencia: f.numero,
          // Trazabilidad
          creadoPor: f.creadoPorNombre || null,
          creadoEn: f.createdAt ? new Date(f.createdAt) : null
        }]
      })

      // Transformar ingresos adicionales a movimientos
      const movimientosIngresosAdicionales = (ingresosAdicionales || []).map((i: any) => ({
        id: `ING-${i.id}`,
        fecha: new Date(i.fecha),
        tipo: 'INGRESO' as const,
        concepto: i.concepto + (i.descripcion ? ` - ${i.descripcion}` : ''),
        categoria: 'Ingreso Extra',
        importe: i.importe,
        metodoPago: i.metodoPago,
        referencia: null,
        // Trazabilidad
        creadoPor: i.creadoPorNombre || null,
        creadoEn: i.createdAt ? new Date(i.createdAt) : null
      }))

      // Transformar gastos a movimientos
      const movimientosGastos = (gastos || []).map((g: any) => ({
        id: `GAS-${g.id}`,
        fecha: new Date(g.fecha),
        tipo: 'GASTO' as const,
        concepto: g.concepto || g.descripcion || 'Gasto',
        categoria: g.tipoGasto || g.categoria || 'General',
        importe: g.importe || g.total,
        metodoPago: g.metodoPago,
        referencia: g.numeroFactura,
        // Trazabilidad
        creadoPor: g.creadoPorNombre || null,
        creadoEn: g.createdAt ? new Date(g.createdAt) : null
      }))

      // Movimientos de pagos parciales / a cuenta (ya cargados arriba en pagosData).
      // El método real de caja es p.metodoPago; p.tpvNombre identifica la cuenta/TPV concreto.
      const pagosParciales: Movimiento[] = pagosData.map((p: any) => ({
        id: `PAG-${p.id}`,
        fecha: new Date(p.fecha),
        tipo: 'INGRESO' as const,
        concepto: `PAGO A CUENTA${p.concepto ? ' - ' + p.concepto : ''} (${p.clienteNombre || 'Cliente'})${p.tpvNombre ? ' [' + p.tpvNombre + ']' : ''}`,
        categoria: 'Pago a cuenta',
        importe: p.importe,
        metodoPago: p.metodoPago,
        referencia: undefined,
        creadoPor: p.creadoPorNombre || undefined,
        creadoEn: p.createdAt ? new Date(p.createdAt) : undefined
      }))

      // Cargar transferencias de caja entre locales
      // Una transferencia SALE de la caja del origen (GASTO) y ENTRA en la del destino (INGRESO).
      // Cuando se marca DEVUELTA, se registra el movimiento inverso en su fecha de devolución.
      let transferencias: any[] = []
      try {
        const resTransferencias = await fetch('/api/transferencias-caja')
        transferencias = await resTransferencias.json()
        if (!Array.isArray(transferencias)) transferencias = []
      } catch (e) {
        transferencias = []
      }

      const selectedLocalId = getSelectedLocalId()
      const movimientosTransferencias: Movimiento[] = []
      for (const t of transferencias) {
        const origenNombre = t.origenLocal?.nombre || 'OTRO LOCAL'
        const destinoNombre = t.destinoLocal?.nombre || 'OTRO LOCAL'
        // Movimiento original (en la fecha de la transferencia)
        const addSalida = (fecha: any, id: string) => movimientosTransferencias.push({
          id, fecha: new Date(fecha), tipo: 'GASTO',
          concepto: `TRANSFERENCIA A ${destinoNombre}${t.concepto ? ' - ' + t.concepto : ''}`,
          categoria: 'Transferencia Caja', importe: t.importe, metodoPago: 'EFECTIVO',
          referencia: undefined, creadoPor: t.creadoPorNombre || undefined,
          creadoEn: t.createdAt ? new Date(t.createdAt) : undefined
        })
        const addEntrada = (fecha: any, id: string) => movimientosTransferencias.push({
          id, fecha: new Date(fecha), tipo: 'INGRESO',
          concepto: `TRANSFERENCIA DE ${origenNombre}${t.concepto ? ' - ' + t.concepto : ''}`,
          categoria: 'Transferencia Caja', importe: t.importe, metodoPago: 'EFECTIVO',
          referencia: undefined, creadoPor: t.creadoPorNombre || undefined,
          creadoEn: t.createdAt ? new Date(t.createdAt) : undefined
        })
        // Sin local seleccionado (ver todo): mostramos ambos lados → el total neto es cero.
        // Con un local seleccionado: solo el lado que corresponde a ese local.
        if (!selectedLocalId || t.origenLocalId === selectedLocalId) addSalida(t.fecha, `TRF-OUT-${t.id}`)
        if (!selectedLocalId || t.destinoLocalId === selectedLocalId) addEntrada(t.fecha, `TRF-IN-${t.id}`)
        // Devolución: movimiento inverso en la fecha de devolución
        if (t.estado === 'DEVUELTO' && t.fechaDevolucion) {
          if (!selectedLocalId || t.origenLocalId === selectedLocalId) addEntrada(t.fechaDevolucion, `TRF-RET-IN-${t.id}`)
          if (!selectedLocalId || t.destinoLocalId === selectedLocalId) addSalida(t.fechaDevolucion, `TRF-RET-OUT-${t.id}`)
        }
      }

      // Combinar y ordenar por fecha (más reciente primero)
      const todoMovimientos = [...ingresosFacturas, ...movimientosIngresosAdicionales, ...movimientosGastos, ...pagosParciales, ...movimientosTransferencias]
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

      setMovimientos(todoMovimientos)
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedLocalIdHook = useLocalStore((s) => s.selectedLocalId)

  useEffect(() => {
    cargarDatos()
  }, [selectedLocalIdHook])

  // Auto-refrescar al volver a la pestaña/ventana, para reflejar gastos o cobros
  // creados o editados en otras pantallas sin tener que pulsar "Actualizar".
  useEffect(() => {
    const refrescar = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        cargarDatos()
      }
    }
    window.addEventListener('focus', refrescar)
    document.addEventListener('visibilitychange', refrescar)
    return () => {
      window.removeEventListener('focus', refrescar)
      document.removeEventListener('visibilitychange', refrescar)
    }
  }, [])

  // Calcular rango de fechas según filtro de período
  const rangoFechas = useMemo(() => {
    const hoy = new Date()
    switch (filtroPeriodo) {
      case 'HOY':
        return { inicio: hoy, fin: hoy }
      case 'SEMANA':
        return { inicio: startOfWeek(hoy, { weekStartsOn: 1 }), fin: endOfWeek(hoy, { weekStartsOn: 1 }) }
      case 'SEMANA_PASADA': {
        const semanaPasada = subWeeks(hoy, 1)
        return { inicio: startOfWeek(semanaPasada, { weekStartsOn: 1 }), fin: endOfWeek(semanaPasada, { weekStartsOn: 1 }) }
      }
      case 'MES_ACTUAL':
        return { inicio: startOfMonth(hoy), fin: endOfMonth(hoy) }
      case 'MES_ANTERIOR':
        const mesAnterior = subMonths(hoy, 1)
        return { inicio: startOfMonth(mesAnterior), fin: endOfMonth(mesAnterior) }
      case 'PERSONALIZADO':
        return {
          inicio: fechaInicio ? parseISO(fechaInicio) : new Date(0),
          fin: fechaFin ? parseISO(fechaFin) : new Date()
        }
      default:
        return { inicio: startOfMonth(hoy), fin: endOfMonth(hoy) }
    }
  }, [filtroPeriodo, fechaInicio, fechaFin])

  // Filtrar movimientos
  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter(m => {
      // Filtro por tipo
      if (filtroTipo !== 'TODOS' && m.tipo !== filtroTipo) return false

      // Filtro por fecha
      const fechaMov = new Date(m.fecha)
      fechaMov.setHours(0, 0, 0, 0)
      const inicio = new Date(rangoFechas.inicio)
      inicio.setHours(0, 0, 0, 0)
      const fin = new Date(rangoFechas.fin)
      fin.setHours(23, 59, 59, 999)
      
      if (fechaMov < inicio || fechaMov > fin) return false

      // Filtro por búsqueda
      if (busqueda) {
        const termino = busqueda.toLowerCase()
        return (
          m.concepto.toLowerCase().includes(termino) ||
          m.categoria.toLowerCase().includes(termino) ||
          (m.referencia && m.referencia.toLowerCase().includes(termino))
        )
      }

      return true
    })
  }, [movimientos, filtroTipo, rangoFechas, busqueda])

  // Calcular totales
  const totales = useMemo(() => {
    const ingresos = movimientosFiltrados
      .filter(m => m.tipo === 'INGRESO')
      .reduce((sum, m) => sum + m.importe, 0)
    
    const gastos = movimientosFiltrados
      .filter(m => m.tipo === 'GASTO')
      .reduce((sum, m) => sum + m.importe, 0)

    // Desglose por método de pago
    const ingresosEfectivo = movimientosFiltrados
      .filter(m => m.tipo === 'INGRESO' && m.metodoPago === 'EFECTIVO')
      .reduce((sum, m) => sum + m.importe, 0)
    
    const gastosEfectivo = movimientosFiltrados
      .filter(m => m.tipo === 'GASTO' && m.metodoPago === 'EFECTIVO')
      .reduce((sum, m) => sum + m.importe, 0)

    const ingresosSumUp = movimientosFiltrados
      .filter(m => m.tipo === 'INGRESO' && m.metodoPago === 'TPV_SUMUP')
      .reduce((sum, m) => sum + m.importe, 0)

    const gastosSumUp = movimientosFiltrados
      .filter(m => m.tipo === 'GASTO' && m.metodoPago === 'TPV_SUMUP')
      .reduce((sum, m) => sum + m.importe, 0)

    const ingresosUnicaja = movimientosFiltrados
      .filter(m => m.tipo === 'INGRESO' && m.metodoPago === 'TPV_UNICAJA')
      .reduce((sum, m) => sum + m.importe, 0)

    const gastosUnicaja = movimientosFiltrados
      .filter(m => m.tipo === 'GASTO' && m.metodoPago === 'TPV_UNICAJA')
      .reduce((sum, m) => sum + m.importe, 0)

    const ingresosRevolut = movimientosFiltrados
      .filter(m => m.tipo === 'INGRESO' && m.metodoPago === 'REVOLUT')
      .reduce((sum, m) => sum + m.importe, 0)

    const gastosRevolut = movimientosFiltrados
      .filter(m => m.tipo === 'GASTO' && m.metodoPago === 'REVOLUT')
      .reduce((sum, m) => sum + m.importe, 0)

    return {
      ingresos,
      gastos,
      balance: ingresos - gastos,
      // Por método de pago
      efectivo: ingresosEfectivo - gastosEfectivo,
      tpvSumUp: ingresosSumUp - gastosSumUp,
      tpvUnicaja: ingresosUnicaja - gastosUnicaja,
      revolut: ingresosRevolut - gastosRevolut
    }
  }, [movimientosFiltrados])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-orange-600" />
            Diario de Caja
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Vista unificada de ingresos y gastos
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={async () => {
              const periodoTexto = filtroPeriodo === 'HOY' ? 'Hoy' :
                filtroPeriodo === 'SEMANA' ? 'Esta semana' :
                filtroPeriodo === 'SEMANA_PASADA' ? 'Semana pasada' :
                filtroPeriodo === 'MES_ACTUAL' ? 'Mes actual' :
                filtroPeriodo === 'MES_ANTERIOR' ? 'Mes anterior' :
                `${fechaInicio || ''} - ${fechaFin || ''}`
              await generarPDFDiarioCaja(movimientosFiltrados, totales, periodoTexto)
            }} 
            variant="outline"
            className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
          >
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          {userRole === 'SUPER_ADMIN' && (
            <Button 
              onClick={async () => {
                const periodoTexto = filtroPeriodo === 'HOY' ? 'Hoy' :
                  filtroPeriodo === 'SEMANA' ? 'Esta semana' :
                  filtroPeriodo === 'SEMANA_PASADA' ? 'Semana pasada' :
                  filtroPeriodo === 'MES_ACTUAL' ? 'Mes actual' :
                  filtroPeriodo === 'MES_ANTERIOR' ? 'Mes anterior' :
                  `${fechaInicio || ''} - ${fechaFin || ''}`
                await exportarDiarioCajaExcel(movimientosFiltrados, totales, periodoTexto)
              }} 
              variant="outline"
              className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
            >
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
          )}
          <Button onClick={cargarDatos} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Resumen general */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Ingresos</p>
                <p className="text-2xl font-bold text-green-600">
                  €{totales.ingresos.toFixed(2)}
                </p>
              </div>
              <ArrowUpCircle className="h-10 w-10 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Gastos</p>
                <p className="text-2xl font-bold text-red-600">
                  €{totales.gastos.toFixed(2)}
                </p>
              </div>
              <ArrowDownCircle className="h-10 w-10 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${totales.balance >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Balance Total</p>
                <p className={`text-2xl font-bold ${totales.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  €{totales.balance.toFixed(2)}
                </p>
              </div>
              <Wallet className={`h-10 w-10 opacity-50 ${totales.balance >= 0 ? 'text-blue-500' : 'text-orange-500'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desglose por método de pago */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-yellow-500 bg-yellow-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">💵 Efectivo</p>
                <p className={`text-2xl font-bold ${totales.efectivo >= 0 ? 'text-yellow-700' : 'text-red-600'}`}>
                  €{totales.efectivo.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">Ingresos - Gastos</p>
              </div>
              <Wallet className="h-10 w-10 text-yellow-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 bg-purple-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">💳 TPV SumUp</p>
                <p className={`text-2xl font-bold ${totales.tpvSumUp >= 0 ? 'text-purple-700' : 'text-red-600'}`}>
                  €{totales.tpvSumUp.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">Ingresos - Gastos</p>
              </div>
              <CreditCard className="h-10 w-10 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500 bg-cyan-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">🏦 TPV Unicaja</p>
                <p className={`text-2xl font-bold ${totales.tpvUnicaja >= 0 ? 'text-cyan-700' : 'text-red-600'}`}>
                  €{totales.tpvUnicaja.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">Ingresos - Gastos</p>
              </div>
              <Building2 className="h-10 w-10 text-cyan-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-700 bg-slate-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">📱 TPV REVOLUT</p>
                <p className={`text-2xl font-bold ${totales.revolut >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                  €{totales.revolut.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">Ingresos - Gastos</p>
              </div>
              <CreditCard className="h-10 w-10 text-slate-700 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar concepto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filtro por tipo */}
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="INGRESO">Solo Ingresos</SelectItem>
                <SelectItem value="GASTO">Solo Gastos</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro por período */}
            <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
              <SelectTrigger>
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HOY">Hoy</SelectItem>
                <SelectItem value="SEMANA">Esta semana</SelectItem>
                <SelectItem value="SEMANA_PASADA">Semana pasada</SelectItem>
                <SelectItem value="MES_ACTUAL">Mes actual</SelectItem>
                <SelectItem value="MES_ANTERIOR">Mes anterior</SelectItem>
                <SelectItem value="PERSONALIZADO">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            {/* Mostrar contador */}
            <div className="flex items-center justify-end text-sm text-gray-500">
              {movimientosFiltrados.length} movimientos
            </div>
          </div>

          {/* Fechas personalizadas */}
          {filtroPeriodo === 'PERSONALIZADO' && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm text-gray-500">Desde</label>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">Hasta</label>
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de movimientos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : movimientosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay movimientos para mostrar
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Método Pago</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead>Creado por</TableHead>
                    <TableHead>Registrado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientosFiltrados.map((mov) => (
                    <TableRow key={mov.id} className={mov.tipo === 'INGRESO' ? 'bg-green-50/50' : 'bg-red-50/50'}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(mov.fecha), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        {mov.tipo === 'INGRESO' ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Ingreso
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            Gasto
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={mov.concepto}>
                        {mov.concepto}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{mov.categoria}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {mov.metodoPago || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={mov.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}>
                          {mov.tipo === 'INGRESO' ? '+' : '-'}€{mov.importe.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {mov.creadoPor || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="text-xs text-gray-500">
                          {mov.creadoEn ? format(new Date(mov.creadoEn), 'dd/MM/yy HH:mm', { locale: es }) : '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
