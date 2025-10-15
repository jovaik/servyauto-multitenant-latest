
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AnalysisResult {
  totalRecords: number;
  februaryRecords: number;
  columns: string[];
  preview: any[];
  warnings: string[];
}

export default function ImportarPage() {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setAnalysis(null);
      setError(null);
      setSuccess(null);
    }
  };

  const analyzeFile = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/importar/analizar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al analizar el archivo');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo');
    } finally {
      setLoading(false);
    }
  };

  const executeImport = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/importar/ejecutar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al importar los datos');
      }

      const data = await response.json();
      setSuccess(`✅ Importación exitosa: ${data.imported} clientes importados de ${data.total} registros de febrero 2025`);
      setFile(null);
      setAnalysis(null);
    } catch (err: any) {
      setError(err.message || 'Error al importar los datos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Importar Clientes desde Excel</h1>
        <p className="text-muted-foreground mt-2">
          Importa clientes desde un archivo Excel. Solo se importarán los registros de febrero 2025.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Paso 1: Seleccionar Archivo</CardTitle>
          <CardDescription>
            Selecciona el archivo Excel que contiene los datos de los clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent">
                <Upload className="h-5 w-5" />
                <span>Seleccionar archivo Excel</span>
              </div>
              <input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {file && (
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <span className="font-medium">{file.name}</span>
              </div>
            )}
          </div>

          {file && !analysis && (
            <Button onClick={analyzeFile} disabled={loading} className="mt-4">
              {loading ? 'Analizando...' : 'Analizar Archivo'}
            </Button>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-green-600 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {analysis && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Paso 2: Revisar Análisis</CardTitle>
              <CardDescription>
                Verifica la información antes de importar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Total de registros en el archivo</div>
                    <div className="text-2xl font-bold">{analysis.totalRecords}</div>
                  </div>
                  <div className="p-4 border rounded-lg bg-green-50">
                    <div className="text-sm text-muted-foreground">Registros de febrero 2025</div>
                    <div className="text-2xl font-bold text-green-600">{analysis.februaryRecords}</div>
                  </div>
                </div>

                {analysis.warnings.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-2">Advertencias:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {analysis.warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Vista previa de los primeros 5 registros de febrero 2025:</h3>
                  <div className="border rounded-lg overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left">Fecha</th>
                          <th className="p-2 text-left">Nombre</th>
                          <th className="p-2 text-left">Teléfono</th>
                          <th className="p-2 text-left">Email</th>
                          <th className="p-2 text-left">Vehículo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.preview.map((record, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2">{record.FECHA}</td>
                            <td className="p-2">{record.NOMBRE}</td>
                            <td className="p-2">{record.TELEFONO || '-'}</td>
                            <td className="p-2">{record.EMAIL || '-'}</td>
                            <td className="p-2">{record.MARCA} {record.MODELO}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paso 3: Ejecutar Importación</CardTitle>
              <CardDescription>
                Una vez que hayas revisado los datos, puedes proceder con la importación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Esta acción importará {analysis.februaryRecords} clientes de febrero 2025.
                  Los clientes duplicados (mismo nombre, teléfono o matrícula) serán omitidos.
                </AlertDescription>
              </Alert>
              <Button onClick={executeImport} disabled={loading} className="w-full">
                {loading ? 'Importando...' : `Importar ${analysis.februaryRecords} Clientes`}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
