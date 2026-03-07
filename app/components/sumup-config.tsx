'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Plus, Trash2, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface SumUpReader {
  id: string
  name: string
  status: string
  pairedAt?: string
}

export function SumUpConfig() {
  const [readers, setReaders] = useState<SumUpReader[]>([])
  const [loading, setLoading] = useState(true)
  const [pairing, setPairing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pairingCode, setPairingCode] = useState('')
  const [readerName, setReaderName] = useState('')
  const { toast } = useToast()

  const loadReaders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/sumup/readers')
      if (response.ok) {
        const data = await response.json()
        setReaders(data.readers || [])
      }
    } catch (error) {
      console.error('Error cargando lectores:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReaders()
  }, [])

  const handlePairReader = async () => {
    if (!pairingCode) {
      toast({
        title: 'Error',
        description: 'Introduce el código de emparejamiento del terminal',
        variant: 'destructive',
      })
      return
    }

    try {
      setPairing(true)
      const response = await fetch('/api/sumup/readers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairingCode,
          name: readerName || 'ServyAuto Terminal',
        }),
      })

      if (response.ok) {
        toast({
          title: '✅ Terminal emparejado',
          description: 'El terminal SumUp está listo para cobrar',
        })
        setDialogOpen(false)
        setPairingCode('')
        setReaderName('')
        loadReaders()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'No se pudo emparejar el terminal',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión con SumUp',
        variant: 'destructive',
      })
    } finally {
      setPairing(false)
    }
  }

  const handleUnpairReader = async (readerId: string, readerName: string) => {
    if (!confirm(`¿Desemparejar el terminal "${readerName}"?`)) return

    try {
      const response = await fetch(`/api/sumup/readers/${readerId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Terminal desemparejado',
          description: 'El terminal ya no está conectado',
        })
        loadReaders()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'No se pudo desemparejar',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Terminales SumUp
            </CardTitle>
            <CardDescription>
              Configura los terminales TPV para cobrar directamente desde la app
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadReaders} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Emparejar Terminal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Emparejar Terminal SumUp Solo</DialogTitle>
                  <DialogDescription>
                    En el terminal Solo, ve a Conexiones → API → Conectar para obtener el código
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Código de emparejamiento</Label>
                    <Input
                      value={pairingCode}
                      onChange={(e) => setPairingCode(e.target.value)}
                      placeholder="Ej: ABC123"
                      className="text-lg font-mono text-center"
                    />
                    <p className="text-xs text-gray-500">
                      El código aparece en la pantalla del terminal Solo
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre del terminal (opcional)</Label>
                    <Input
                      value={readerName}
                      onChange={(e) => setReaderName(e.target.value)}
                      placeholder="Ej: Terminal Marbella"
                    />
                  </div>
                  <Button
                    onClick={handlePairReader}
                    disabled={pairing || !pairingCode}
                    className="w-full"
                  >
                    {pairing ? 'Emparejando...' : 'Emparejar Terminal'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            Cargando terminales...
          </div>
        ) : readers.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No hay terminales emparejados</p>
            <p className="text-sm text-gray-400 mt-1">
              Empareja un terminal SumUp Solo para empezar a cobrar
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {readers.map((reader) => (
              <div
                key={reader.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Wifi className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">{reader.name}</p>
                    <p className="text-xs text-gray-500">ID: {reader.id}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnpairReader(reader.id, reader.name)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">¿Cómo funciona?</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>En el terminal Solo, ve a <strong>Conexiones → API → Conectar</strong></li>
            <li>Copia el código que aparece en pantalla</li>
            <li>Introdúcelo aquí y pulsa "Emparejar Terminal"</li>
            <li>Una vez emparejado, podrás cobrar directamente desde la app</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
