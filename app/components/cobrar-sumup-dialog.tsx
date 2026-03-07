'use client'

import { useState, useEffect, useRef } from 'react'
import { CreditCard, Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface CobrarSumUpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  amount: number
  description: string
  reference?: string
  onPaymentComplete?: (transactionCode: string) => void
  onPaymentFailed?: () => void
}

interface SumUpReader {
  id: string
  name: string
}

type PaymentStatus = 'idle' | 'loading_readers' | 'ready' | 'processing' | 'polling' | 'success' | 'failed' | 'cancelled'

export function CobrarSumUpDialog({
  open,
  onOpenChange,
  amount,
  description,
  reference,
  onPaymentComplete,
  onPaymentFailed,
}: CobrarSumUpDialogProps) {
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [readers, setReaders] = useState<SumUpReader[]>([])
  const [selectedReader, setSelectedReader] = useState<string>('')
  const [checkoutId, setCheckoutId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [transactionCode, setTransactionCode] = useState<string>('')
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Cargar lectores cuando se abre el dialog
  useEffect(() => {
    if (open) {
      loadReaders()
    } else {
      // Limpiar estado al cerrar
      setStatus('idle')
      setCheckoutId(null)
      setErrorMessage('')
      setTransactionCode('')
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [open])

  const loadReaders = async () => {
    try {
      setStatus('loading_readers')
      const response = await fetch('/api/sumup/readers')
      if (response.ok) {
        const data = await response.json()
        const readerList = data.readers || []
        setReaders(readerList)
        if (readerList.length === 1) {
          setSelectedReader(readerList[0].id)
        }
        setStatus(readerList.length > 0 ? 'ready' : 'idle')
      } else {
        setStatus('idle')
        setErrorMessage('Error al cargar los terminales')
      }
    } catch (error) {
      setStatus('idle')
      setErrorMessage('Error de conexión')
    }
  }

  const startPayment = async () => {
    if (!selectedReader) {
      toast({
        title: 'Error',
        description: 'Selecciona un terminal',
        variant: 'destructive',
      })
      return
    }

    try {
      setStatus('processing')
      setErrorMessage('')

      const response = await fetch('/api/sumup/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description,
          reference,
          readerId: selectedReader,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCheckoutId(data.checkoutId)
        setStatus('polling')
        startPolling(data.checkoutId)
      } else {
        const error = await response.json()
        setStatus('failed')
        setErrorMessage(error.error || 'Error al procesar el cobro')
      }
    } catch (error) {
      setStatus('failed')
      setErrorMessage('Error de conexión con SumUp')
    }
  }

  const startPolling = (checkoutId: string) => {
    // Consultar estado cada 2 segundos
    pollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/sumup/checkout/${checkoutId}`)
        if (response.ok) {
          const data = await response.json()
          console.log('Estado checkout:', data.status)

          if (data.status === 'PAID') {
            clearInterval(pollingRef.current!)
            pollingRef.current = null
            setTransactionCode(data.transactionCode || data.transactionId || '')
            setStatus('success')
            toast({
              title: '✅ Pago completado',
              description: `Cobro de ${amount.toFixed(2)}€ realizado correctamente`,
            })
            if (onPaymentComplete) {
              onPaymentComplete(data.transactionCode || data.transactionId || '')
            }
          } else if (data.status === 'FAILED') {
            clearInterval(pollingRef.current!)
            pollingRef.current = null
            setStatus('failed')
            setErrorMessage('El pago fue rechazado')
            if (onPaymentFailed) {
              onPaymentFailed()
            }
          } else if (data.status === 'CANCELLED' || data.status === 'EXPIRED') {
            clearInterval(pollingRef.current!)
            pollingRef.current = null
            setStatus('cancelled')
            setErrorMessage('El cobro fue cancelado')
          }
        }
      } catch (error) {
        console.error('Error polling checkout:', error)
      }
    }, 2000)
  }

  const cancelPayment = async () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }

    if (checkoutId) {
      try {
        await fetch(`/api/sumup/checkout/${checkoutId}`, { method: 'DELETE' })
      } catch (error) {
        console.error('Error cancelando checkout:', error)
      }
    }

    setStatus('cancelled')
    setErrorMessage('Cobro cancelado')
  }

  const renderContent = () => {
    switch (status) {
      case 'loading_readers':
        return (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-gray-600">Conectando con SumUp...</p>
          </div>
        )

      case 'idle':
        return (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 mb-4">No hay terminales configurados</p>
            <p className="text-sm text-gray-500">
              Ve a Configuración → Terminales SumUp para emparejar un terminal
            </p>
          </div>
        )

      case 'ready':
        return (
          <div className="space-y-6">
            <div className="text-center py-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Importe a cobrar</p>
              <p className="text-4xl font-bold text-gray-900">{amount.toFixed(2)} €</p>
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            </div>

            <div className="space-y-2">
              <Label>Selecciona terminal</Label>
              <Select value={selectedReader} onValueChange={setSelectedReader}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un terminal" />
                </SelectTrigger>
                <SelectContent>
                  {readers.map((reader) => (
                    <SelectItem key={reader.id} value={reader.id}>
                      {reader.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={startPayment}
              disabled={!selectedReader}
              className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="mr-2 h-5 w-5" />
              Enviar al terminal
            </Button>
          </div>
        )

      case 'processing':
        return (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-gray-600">Enviando cobro al terminal...</p>
          </div>
        )

      case 'polling':
        return (
          <div className="text-center py-8">
            <div className="relative">
              <div className="w-20 h-20 mx-auto border-4 border-blue-200 rounded-full"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-blue-600 animate-pulse" />
              </div>
              <div className="absolute inset-0">
                <div className="w-20 h-20 mx-auto border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
            </div>
            <p className="text-xl font-semibold text-gray-900 mt-6">
              {amount.toFixed(2)} €
            </p>
            <p className="text-gray-600 mt-2">Esperando pago en el terminal...</p>
            <p className="text-sm text-gray-500 mt-1">El cliente puede pagar con tarjeta</p>
            <Button
              variant="outline"
              onClick={cancelPayment}
              className="mt-6"
            >
              Cancelar cobro
            </Button>
          </div>
        )

      case 'success':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <p className="text-xl font-semibold text-green-700">Pago completado</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{amount.toFixed(2)} €</p>
            {transactionCode && (
              <p className="text-sm text-gray-500 mt-2">Ref: {transactionCode}</p>
            )}
            <Button onClick={() => onOpenChange(false)} className="mt-6">
              Cerrar
            </Button>
          </div>
        )

      case 'failed':
      case 'cancelled':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <p className="text-xl font-semibold text-red-700">
              {status === 'failed' ? 'Pago fallido' : 'Cobro cancelado'}
            </p>
            {errorMessage && (
              <p className="text-gray-600 mt-2">{errorMessage}</p>
            )}
            <div className="flex gap-3 justify-center mt-6">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              <Button onClick={() => setStatus('ready')}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reintentar
              </Button>
            </div>
          </div>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Cobrar con SumUp
          </DialogTitle>
          {status === 'ready' && (
            <DialogDescription>
              El importe se enviará al terminal seleccionado
            </DialogDescription>
          )}
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  )
}
