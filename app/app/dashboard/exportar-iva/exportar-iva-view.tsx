
'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Download, FileSpreadsheet, AlertCircle, CheckCircle, Copy, Building2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'

export function ExportarIVAView() {
  const { data: session } = useSession() || {}
  const userRole = (session?.user as any)?.role || ''
  const currentYear = new Date().getFullYear()
  const [trimestre, setTrimestre] = useState('Q1')
  const [anio, setAnio] = useState(currentYear.toString())
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [loading303, setLoading303] = useState(false)
  const [resumen303, setResumen303] = useState<any>(null)
  const [copiado, setCopiado] = useState<string>('')

  const fmt = (n: number) => (n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const copiar = (clave: string, valor: string) => {
    navigator.clipboard?.writeText(valor)
    setCopiado(clave)
    setTimeout(() => setCopiado(''), 1500)
  }

  const handleVer303 = async () => {
    if (trimestre === 'PERSONALIZADO' && (!fechaDesde || !fechaHasta)) {
      setMessage({ type: 'error', text: 'Selecciona la fecha de inicio y la fecha de fin del rango personalizado.' })
      return
    }
    if (trimestre === 'PERSONALIZADO' && fechaDesde > fechaHasta) {
      setMessage({ type: 'error', text: 'La fecha de inicio no puede ser posterior a la fecha de fin.' })
      return
    }
    setLoading303(true)
    setMessage(null)
    try {
      const url_api = trimestre === 'PERSONALIZADO'
        ? `/api/exportar-iva?trimestre=PERSONALIZADO&fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}&formato=json303`
        : `/api/exportar-iva?trimestre=${trimestre}&anio=${anio}&formato=json303`
      const response = await fetch(url_api)
      if (!response.ok) throw new Error('Error')
      const data = await response.json()
      setResumen303(data)
    } catch (error) {
      console.error('Error modelo 303:', error)
      setMessage({ type: 'error', text: 'No se pudo calcular el Modelo 303. Intenta de nuevo.' })
    } finally {
      setLoading303(false)
    }
  }

  const handleExport = async () => {
    if (trimestre === 'PERSONALIZADO' && (!fechaDesde || !fechaHasta)) {
      setMessage({ type: 'error', text: 'Selecciona la fecha de inicio y la fecha de fin del rango personalizado.' })
      return
    }
    if (trimestre === 'PERSONALIZADO' && fechaDesde > fechaHasta) {
      setMessage({ type: 'error', text: 'La fecha de inicio no puede ser posterior a la fecha de fin.' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const url_api = trimestre === 'PERSONALIZADO'
        ? `/api/exportar-iva?trimestre=PERSONALIZADO&fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}`
        : `/api/exportar-iva?trimestre=${trimestre}&anio=${anio}`
      const response = await fetch(url_api)

      if (response.ok) {
        // Descargar el archivo
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = trimestre === 'PERSONALIZADO'
          ? `IVA_${fechaDesde}_${fechaHasta}_ServyAuto.xlsx`
          : `IVA_${trimestre}_${anio}_ServyAuto.xlsx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)

        setMessage({
          type: 'success',
          text: 'Excel generado correctamente. El archivo se está descargando.'
        })
      } else {
        throw new Error('Error al generar el archivo')
      }
    } catch (error) {
      console.error('Error exporting IVA:', error)
      setMessage({
        type: 'error',
        text: 'Error al generar el archivo. Por favor intenta de nuevo.'
      })
    } finally {
      setLoading(false)
    }
  }

  const getTrimestreLabel = (q: string) => {
    const labels: { [key: string]: string } = {
      'Q1': 'Q1 (Enero - Marzo)',
      'Q2': 'Q2 (Abril - Junio)',
      'Q3': 'Q3 (Julio - Septiembre)',
      'Q4': 'Q4 (Octubre - Diciembre)',
      'ANUAL': 'Resumen Anual (Modelo 390)',
      'PERSONALIZADO': 'Rango de fechas personalizado'
    }
    return labels[q] || q
  }

  const Casilla = ({ num, label, valor, money = true, destacado = false }: { num: string; label: string; valor: number; money?: boolean; destacado?: boolean }) => {
    const texto = money ? (valor || 0).toFixed(2).replace('.', ',') : String(valor)
    const clave = `${num}-${label}`
    return (
      <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md ${destacado ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center justify-center text-xs font-bold text-white bg-blue-600 rounded px-1.5 py-0.5 shrink-0">{num}</span>
          <span className="text-sm text-gray-700 truncate">{label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-sm font-semibold tabular-nums ${destacado ? 'text-blue-900' : 'text-gray-900'}`}>{money ? `${fmt(valor)} €` : `${valor}%`}</span>
          <button type="button" onClick={() => copiar(clave, texto)} className="text-gray-400 hover:text-blue-600" title="Copiar valor">
            {copiado === clave ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Exportación Trimestral IVA</h1>
        <p className="text-gray-600">
          Genera un XLSX con hojas IVA Real. Generar un XLSX con el resumen trimestral de IVA (solo facturas)
        </p>
      </div>

      {/* Main Card */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileSpreadsheet className="mr-2 h-5 w-5" />
            Seleccione el período a exportar
          </CardTitle>
          <CardDescription>
            Solo se incluirán las FACTURAS (no tickets) de ventas y compras en el reporte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Trimestre</label>
              <Select value={trimestre} onValueChange={setTrimestre}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona trimestre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1">Q1 (Enero - Marzo)</SelectItem>
                  <SelectItem value="Q2">Q2 (Abril - Junio)</SelectItem>
                  <SelectItem value="Q3">Q3 (Julio - Septiembre)</SelectItem>
                  <SelectItem value="Q4">Q4 (Octubre - Diciembre)</SelectItem>
                  <SelectItem value="ANUAL">Anual (Resumen Modelo 390)</SelectItem>
                  <SelectItem value="PERSONALIZADO">Rango personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {trimestre !== 'PERSONALIZADO' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Año</label>
              <Select value={anio} onValueChange={setAnio}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona año" />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear, currentYear - 1, currentYear - 2].map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            )}
          </div>

          {trimestre === 'PERSONALIZADO' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha desde</label>
                <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha hasta</label>
                <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
              </div>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Período seleccionado:</h4>
            <p className="text-blue-800">
              {trimestre === 'PERSONALIZADO'
                ? (fechaDesde && fechaHasta ? `Del ${fechaDesde} al ${fechaHasta}` : 'Selecciona el rango de fechas')
                : `${getTrimestreLabel(trimestre)} de ${anio}`}
            </p>
          </div>

          {userRole === 'SUPER_ADMIN' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={handleExport}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              <Download className="mr-2 h-5 w-5" />
              {loading ? 'Generando Excel...' : 'Exportar IVA a Excel'}
            </Button>
            <Button
              onClick={handleVer303}
              disabled={loading303}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Building2 className="mr-2 h-5 w-5" />
              {loading303 ? 'Calculando...' : 'Ver Resumen Modelo 303'}
            </Button>
          </div>
          )}
          {userRole !== 'SUPER_ADMIN' && (
            <p className="text-sm text-gray-500 text-center py-2">Solo SuperAdmin puede exportar datos</p>
          )}

          {message && (
            <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-2" />
              )}
              <AlertDescription>
                <strong>{message.type === 'success' ? 'Éxito: ' : 'Error: '}</strong>
                {message.text}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Resumen Modelo 303 */}
      {resumen303 && (
        <Card className="max-w-2xl border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <Building2 className="mr-2 h-5 w-5" />
              Resumen Modelo 303 — {resumen303.periodo}
            </CardTitle>
            <CardDescription>
              Copia cada casilla con el botón y pégala en el formulario del Modelo 303 de la Sede Electrónica. {resumen303.numVentas} facturas emitidas · {resumen303.numCompras} recibidas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-2">IVA devengado (repercutido)</h4>
              <div className="space-y-1.5">
                <Casilla num="01" label={`Base imponible (tipo ${resumen303.modelo303.casilla02}%)`} valor={resumen303.modelo303.casilla01} />
                <Casilla num="02" label="Tipo %" valor={resumen303.modelo303.casilla02} money={false} />
                <Casilla num="03" label="Cuota" valor={resumen303.modelo303.casilla03} />
                {(resumen303.modelo303.casilla04 || resumen303.modelo303.casilla06) ? (<>
                  <Casilla num="04" label={`Base imponible (tipo ${resumen303.modelo303.casilla05}%)`} valor={resumen303.modelo303.casilla04} />
                  <Casilla num="05" label="Tipo %" valor={resumen303.modelo303.casilla05} money={false} />
                  <Casilla num="06" label="Cuota" valor={resumen303.modelo303.casilla06} />
                </>) : null}
                {(resumen303.modelo303.casilla07 || resumen303.modelo303.casilla09) ? (<>
                  <Casilla num="07" label={`Base imponible (tipo ${resumen303.modelo303.casilla08}%)`} valor={resumen303.modelo303.casilla07} />
                  <Casilla num="08" label="Tipo %" valor={resumen303.modelo303.casilla08} money={false} />
                  <Casilla num="09" label="Cuota" valor={resumen303.modelo303.casilla09} />
                </>) : null}
                <Casilla num="27" label="Total cuota devengada" valor={resumen303.modelo303.casilla27} destacado />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-2">IVA deducible (soportado)</h4>
              <div className="space-y-1.5">
                <Casilla num="28" label="Base operaciones interiores corrientes" valor={resumen303.modelo303.casilla28} />
                <Casilla num="29" label="Cuota soportada deducible" valor={resumen303.modelo303.casilla29} />
                <Casilla num="45" label="Total a deducir" valor={resumen303.modelo303.casilla45} destacado />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-2">Resultado</h4>
              <div className="space-y-1.5">
                <Casilla num="46" label="Resultado régimen general (27 − 45)" valor={resumen303.modelo303.casilla46} />
                <Casilla num="64" label="Suma de resultados" valor={resumen303.modelo303.casilla64} />
                <Casilla num="66" label="Resultado" valor={resumen303.modelo303.casilla66} />
                <Casilla num="71" label="Resultado de la autoliquidación" valor={resumen303.modelo303.casilla71} destacado />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {resumen303.modelo303.casilla71 >= 0
                  ? 'Resultado positivo: IVA a ingresar.'
                  : 'Resultado negativo: IVA a compensar o devolver.'}
                {' '}La casilla 67 (cuotas a compensar de periodos anteriores) debes rellenarla a mano si procede.
              </p>
            </div>

            {resumen303.modelo130 && (
              <div className="pt-2 border-t">
                <h4 className="text-sm font-bold text-gray-800 mb-1">Modelo 130 (IRPF) — orientativo, acumulado del ejercicio</h4>
                <div className="space-y-1.5">
                  <Casilla num="01" label="Ingresos computables" valor={resumen303.modelo130.casilla01} />
                  <Casilla num="02" label="Gastos deducibles" valor={resumen303.modelo130.casilla02} />
                  <Casilla num="03" label="Rendimiento neto (01 − 02)" valor={resumen303.modelo130.casilla03} />
                  <Casilla num="04" label="20% del rendimiento neto" valor={resumen303.modelo130.casilla04} destacado />
                </div>
                <p className="text-xs text-gray-500 mt-2">Debes restar los pagos fraccionados de trimestres anteriores (casilla 12) en la Sede.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <h4 className="font-semibold text-sm">Hoja Ventas</h4>
              <p className="text-xs text-gray-600 mt-1">
                Facturas de ventas con base, IVA y total
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-red-600" />
              <h4 className="font-semibold text-sm">Hoja Compras</h4>
              <p className="text-xs text-gray-600 mt-1">
                Facturas de gastos con base, IVA y total
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <h4 className="font-semibold text-sm">Hoja Resumen</h4>
              <p className="text-xs text-gray-600 mt-1">
                IVA a ingresar o devolver calculado
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Important Notes */}
      <Card className="max-w-2xl border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-900 flex items-center">
            <AlertCircle className="mr-2 h-5 w-5" />
            Notas Importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-orange-800">
          <p>• Solo se incluyen documentos de tipo <strong>FACTURA</strong></p>
          <p>• Los tickets NO se incluyen en el reporte de IVA</p>
          <p>• El cálculo de base imponible se hace automáticamente según el % de IVA</p>
          <p>• Revisa siempre los datos antes de presentar a Hacienda</p>
        </CardContent>
      </Card>
    </div>
  )
}
