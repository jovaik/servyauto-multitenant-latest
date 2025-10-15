
'use client'

import { useState } from 'react'
import { Upload, AlertCircle, CheckCircle, FileSpreadsheet, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

type RegistroExcel = {
  fecha: string
  marca: string
  matricula: string
  nombre: string
  telefono: string
  lavado: number
  detail: number
  tarjeta: number
  abonado: string
}

type AnalisisResultado = {
  total: number
  registros: RegistroExcel[]
  clientesUnicos: number
  vehiculosUnicos: number
}

export default function ImportadorPage() {
  const router = useRouter()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [cargando, setCargando] = useState(false)
  const [analisis, setAnalisis] = useState<AnalisisResultado | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setArchivo(file)
      setAnalisis(null)
      setError(null)
    }
  }

  const analizarArchivo = async () => {
    if (!archivo) return

    setCargando(true)
    setError(null)

    try {
      const data = await archivo.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // Leer desde la fila 8 (índice 7) que es donde están los encabezados
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        range: 7,
        defval: null 
      }) as any[]

      console.log('Datos leídos del Excel:', jsonData.length, 'registros')

      // Filtrar y procesar solo febrero 2025
      const registrosFebrero: RegistroExcel[] = []
      
      jsonData.forEach((row, index) => {
        const fechaStr = row['DIA / HORA']
        if (!fechaStr) return

        try {
          // Parsear fecha en formato "dd/mm/yyyy hh H"
          const fechaParte = String(fechaStr).split(' ')[0]
          const [dia, mes, anio] = fechaParte.split('/')
          
          if (anio === '2025' && mes === '02') {
            // Es febrero 2025
            const registro: RegistroExcel = {
              fecha: fechaStr,
              marca: row['MARCA Y MODELO'] || '',
              matricula: row['MATRÍCULA'] || '',
              nombre: row['NOMBRE'] || '',
              telefono: String(row['TELÉFONO'] || ''),
              lavado: Number(row['LAVADO']) || 0,
              detail: Number(row['DETAIL']) || 0,
              tarjeta: Number(row['TARJETA ']) || 0,
              abonado: row['ABONADO'] || ''
            }
            registrosFebrero.push(registro)
          }
        } catch (err) {
          console.warn(`Error procesando fila ${index}:`, err)
        }
      })

      console.log('Registros de febrero 2025:', registrosFebrero.length)

      // Calcular estadísticas
      const telefonosUnicos = new Set(
        registrosFebrero
          .filter(r => r.telefono)
          .map(r => r.telefono)
      ).size

      const matriculasUnicas = new Set(
        registrosFebrero
          .filter(r => r.matricula)
          .map(r => r.matricula)
      ).size

      setAnalisis({
        total: registrosFebrero.length,
        registros: registrosFebrero,
        clientesUnicos: telefonosUnicos,
        vehiculosUnicos: matriculasUnicas
      })

    } catch (err) {
      console.error('Error al analizar archivo:', err)
      setError('Error al leer el archivo Excel. Verifica que el formato sea correcto.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Dashboard
        </Button>
        
        <h1 className="text-3xl font-bold">Importador de Datos Históricos</h1>
        <p className="text-muted-foreground mt-2">
          Importa registros de Febrero 2025 desde tu archivo Excel
        </p>
      </div>

      {/* Advertencia de seguridad */}
      <Alert className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800 dark:text-yellow-200">
          <strong>MODO PRUEBA:</strong> Esta herramienta solo importará datos de Febrero 2025 (aproximadamente 33 registros).
          Podrás revisar todo antes de confirmar la importación.
        </AlertDescription>
      </Alert>

      {/* Paso 1: Subir archivo */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Paso 1: Seleccionar archivo Excel
          </CardTitle>
          <CardDescription>
            Sube tu archivo Excel con los datos históricos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleArchivoChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
            {archivo && (
              <Button 
                onClick={analizarArchivo}
                disabled={cargando}
              >
                {cargando ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Analizar Archivo
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Resultados del análisis */}
      {analisis && (
        <div className="space-y-6">
          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{analisis.total}</div>
                <p className="text-sm text-muted-foreground">Registros encontrados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{analisis.clientesUnicos}</div>
                <p className="text-sm text-muted-foreground">Clientes únicos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{analisis.vehiculosUnicos}</div>
                <p className="text-sm text-muted-foreground">Vehículos únicos</p>
              </CardContent>
            </Card>
          </div>

          {/* Vista previa de registros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Vista Previa de Registros - Febrero 2025
              </CardTitle>
              <CardDescription>
                Estos son los primeros 10 registros que se importarán. Revisa que todo sea correcto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-2 font-semibold">Fecha</th>
                      <th className="pb-2 font-semibold">Vehículo</th>
                      <th className="pb-2 font-semibold">Matrícula</th>
                      <th className="pb-2 font-semibold">Cliente</th>
                      <th className="pb-2 font-semibold">Teléfono</th>
                      <th className="pb-2 font-semibold text-right">Lavado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analisis.registros.slice(0, 10).map((reg, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2">{reg.fecha}</td>
                        <td className="py-2">{reg.marca || '-'}</td>
                        <td className="py-2 font-mono text-xs">{reg.matricula || '-'}</td>
                        <td className="py-2">{reg.nombre || 'Sin nombre'}</td>
                        <td className="py-2 font-mono text-xs">{reg.telefono || '-'}</td>
                        <td className="py-2 text-right">{reg.lavado ? `€${reg.lavado}` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {analisis.registros.length > 10 && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  ... y {analisis.registros.length - 10} registros más
                </p>
              )}
            </CardContent>
          </Card>

          {/* Botón de siguiente paso */}
          <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-100">
                    ¿Todo correcto?
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    El siguiente paso será verificar duplicados antes de importar
                  </p>
                </div>
                <Button 
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    // Por ahora solo mostramos un mensaje
                    alert('Próximamente: Verificación de duplicados')
                  }}
                >
                  Continuar al Paso 2
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
