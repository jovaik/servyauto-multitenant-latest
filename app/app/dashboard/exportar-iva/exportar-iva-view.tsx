
'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Download, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react'
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
          <Button 
            onClick={handleExport} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            <Download className="mr-2 h-5 w-5" />
            {loading ? 'Generando Excel...' : 'Exportar IVA a Excel'}
          </Button>
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
