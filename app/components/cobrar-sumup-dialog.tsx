'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { CreditCard, Loader2, CheckCircle, XCircle, RefreshCw, Link2, QrCode, Smartphone } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { SharePaymentLink } from '@/components/share-payment-link'

interface CobrarSumUpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  amount: number
  initialMode?: 'terminal' | 'link'
  description: string
  reference?: string
  citaId?: string
  facturaId?: string
  clienteTelefono?: string
  clienteEmail?: string
  onPaymentComplete?: (transactionCode: string) => void
  onPaymentFailed?: () => void
}

interface SumUpReader {
  id: string
  name: string
  userId?: string | null
  userNombre?: string | null
  localNombre?: string | null
  cuentaTpvId?: string | null
  cuentaTpvNombre?: string | null
}

type PaymentStatus = 'idle' | 'loading_readers' | 'ready' | 'processing' | 'polling' | 'success' | 'failed' | 'cancelled'

export function CobrarSumUpDialog({
  open,
  onOpenChange,
  amount,
  initialMode,
  description,
  reference,
  citaId,
  facturaId,
  clienteTelefono,
  clienteEmail,
  onPaymentComplete,
  onPaymentFailed,
}: CobrarSumUpDialogProps) {
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [readers, setReaders] = useState<SumUpReader[]>([])
  const [selectedReader, setSelectedReader] = useState<string>('')
  const [checkoutId, setCheckoutId] = useState<string | null>(null)
  const [paymentUrl, setPaymentUrl] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [transactionCode, setTransactionCode] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'terminal' | 'link'>('terminal')
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()
  const { data: session } = useSession() || {}

  // Cargar lectores cuando se abre el dialog
  useEffect(() => {
    if (open) {
      setActiveTab(initialMode || 'terminal')
      setSelectedReader('')
      setReaders([])
      setErrorMessage('')
      loadReaders()
    } else {
      resetState()
    }
  }, [open, initialMode])

  const resetState = () => {
    setStatus('idle')
    setCheckoutId(null)
    setPaymentUrl('')
    setErrorMessage('')
    setTransactionCode('')
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  const loadReaders = async () => {
    try {
      setStatus('loading_readers')
      setErrorMessage('')
      const response = await fetch('/api/sumup/readers')
      if (response.ok) {
        const data = await response.json()
        const readerList = (data.readers || []).filter((r: any) => r.id !== 'PAYMENT_LINK')
        setReaders(readerList)
        // Preseleccionar el TPV propio del usuario que cobra (si lo tiene asignado),
        // si no, y solo hay uno, preseleccionar ese.
        const myUserId = (session?.user as any)?.id
        const propio = myUserId ? readerList.find((r: SumUpReader) => r.userId === myUserId) : null
        if (propio) {
          setSelectedReader(propio.id)
        } else if (readerList.length === 1) {
          setSelectedReader(readerList[0].id)
        }
        // Si no hay terminales, cambiar a tab de link
        if (readerList.length === 0 && !initialMode) {
          setActiveTab('link')
        }
        setStatus('ready')
      } else {
        console.error('Error cargando terminales SumUp:', response.status)
        setErrorMessage('No se pudieron consultar los terminales. Reintenta la consulta.')
        setStatus('ready')
        if (!initialMode) setActiveTab('link')
      }
    } catch (error) {
      console.error('Error cargando terminales SumUp:', error)
      setErrorMessage('No se pudo conectar para consultar los terminales.')
      setStatus('ready')
      if (!initialMode) setActiveTab('link')
    }
  }

  // ============ COBRO CON TERMINAL (Cloud API) ============
  const startTerminalPayment = async () => {
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
          cuentaTpvId: readers.find((r) => r.id === selectedReader)?.cuentaTpvId || null,
          citaId,
          facturaId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCheckoutId(data.checkoutId)
        setStatus('polling')
        startPolling(data.checkoutId)
      } else {
        const error = await response.json().catch(() => null)
        console.error('Error enviando cobro al terminal SumUp:', response.status, error?.error)
        setStatus('failed')
        setErrorMessage(error?.error || `No se pudo confirmar el envío al terminal (HTTP ${response.status}). Comprueba el terminal antes de reintentar.`)
      }
    } catch (error) {
      console.error('Error de conexión al enviar el cobro SumUp:', error)
      setStatus('failed')
      setErrorMessage('No se pudo confirmar el envío al terminal. Comprueba si recibió el importe antes de reintentar para evitar un cobro duplicado.')
    }
  }

  // ============ COBRO CON LINK DE PAGO ============
  const createPaymentLink = async () => {
    try {
      setStatus('processing')
      setErrorMessage('')

      const response = await fetch('/api/sumup/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description,
          citaId,
          facturaId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCheckoutId(data.checkoutId)
        setPaymentUrl(data.paymentUrl)
        setStatus('polling')
        startPolling(data.checkoutId)
      } else {
        const error = await response.json()
        setStatus('failed')
        setErrorMessage(error.error || 'Error al crear el link de pago')
      }
    } catch (error) {
      setStatus('failed')
      setErrorMessage('Error de conexión')
    }
  }

  // ============ POLLING DE ESTADO ============
  const startPolling = (id: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }

    pollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/sumup/checkout/${id}`)
        if (response.ok) {
          const data = await response.json()
          
          if (data.status === 'PAID') {
            clearInterval(pollingRef.current!)
            pollingRef.current = null
            setStatus('success')
            setTransactionCode(data.transactionCode || data.transactionId || '')
            toast({
              title: '✅ Pago completado',
              description: `Cobro de ${amount.toFixed(2)}€ realizado con éxito`,
            })
            onPaymentComplete?.(data.transactionCode || data.transactionId || '')
          } else if (data.status === 'FAILED') {
            clearInterval(pollingRef.current!)
            pollingRef.current = null
            setStatus('failed')
            setErrorMessage('El pago fue rechazado')
            onPaymentFailed?.()
          } else if (data.status === 'CANCELLED') {
            clearInterval(pollingRef.current!)
            pollingRef.current = null
            setStatus('cancelled')
          }
        }
      } catch (error) {
        console.error('Error polling:', error)
      }
    }, 2000)

    // Timeout de 5 minutos
    setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
        if (status === 'polling') {
          setStatus('failed')
          setErrorMessage('Tiempo de espera agotado')
        }
      }
    }, 300000)
  }

  const cancelPayment = async () => {
    if (checkoutId) {
      try {
        await fetch(`/api/sumup/checkout/${checkoutId}`, { method: 'DELETE' })
      } catch (error) {
        console.error('Error cancelando:', error)
      }
    }
    resetState()
    setStatus('ready')
  }

  const copyLink = () => {
    navigator.clipboard.writeText(paymentUrl)
    toast({ title: 'Link copiado', description: 'Envíaselo al cliente por WhatsApp o SMS' })
  }

  const openLink = () => {
    window.open(paymentUrl, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Cobrar con SumUp
          </DialogTitle>
          <DialogDescription>
            Importe: <span className="font-bold text-lg text-black">{amount.toFixed(2)} €</span>
          </DialogDescription>
        </DialogHeader>

        {status === 'loading_readers' && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        )}

        {status === 'ready' && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'terminal' | 'link')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="terminal">
                <CreditCard className="h-4 w-4 mr-2" />
                Terminal
              </TabsTrigger>
              <TabsTrigger value="link">
                <Link2 className="h-4 w-4 mr-2" />
                Link de pago
              </TabsTrigger>
            </TabsList>

            <TabsContent value="terminal" className="space-y-4 pt-4">
              {readers.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p>{errorMessage || 'No hay terminales Solo disponibles para este local o cuenta.'}</p>
                  <p className="text-sm mt-2">Comprueba el emparejamiento y la asignación en Configuración → SumUp.</p>
                  <Button type="button" variant="outline" className="mt-3" onClick={loadReaders}>
                    <RefreshCw className="h-4 w-4 mr-2" />Actualizar terminales
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Selecciona terminal</Label>
                    <Select value={selectedReader} onValueChange={setSelectedReader}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar terminal" />
                      </SelectTrigger>
                      <SelectContent>
                        {readers.map((reader) => (
                          <SelectItem key={reader.id} value={reader.id}>
                            {reader.name}
                            {reader.cuentaTpvNombre ? ` — ${reader.cuentaTpvNombre}` : ''}
                            {reader.userNombre
                              ? ` (DE ${reader.userNombre})`
                              : reader.localNombre
                                ? ` (${reader.localNombre})`
                                : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={startTerminalPayment} className="w-full" disabled={!selectedReader}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Enviar al terminal
                  </Button>
                  <p className="text-xs text-gray-500 text-center">
                    El cobro aparecerá en la pantalla del terminal Solo
                  </p>
                </>
              )}
            </TabsContent>

            <TabsContent value="link" className="space-y-4 pt-4">
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <Smartphone className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                <p className="text-sm text-blue-800">
                  Genera un link de pago que el cliente abre en su móvil.
                  Funciona con <strong>Solo Lite</strong>, <strong>Air</strong> o <strong>sin terminal</strong>.
                </p>
              </div>
              <Button onClick={createPaymentLink} className="w-full">
                <Link2 className="h-4 w-4 mr-2" />
                Generar link de pago
              </Button>
            </TabsContent>
          </Tabs>
        )}

        {status === 'processing' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
            <p className="text-gray-600">Procesando...</p>
          </div>
        )}

        {status === 'polling' && activeTab === 'terminal' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-green-200 opacity-75" />
              <CreditCard className="relative h-16 w-16 text-green-600" />
            </div>
            <p className="mt-4 text-lg font-medium">Esperando pago en terminal...</p>
            <p className="text-sm text-gray-500">El cliente puede acercar su tarjeta</p>
            <Button variant="outline" onClick={cancelPayment} className="mt-4">
              Cancelar
            </Button>
          </div>
        )}

        {status === 'polling' && activeTab === 'link' && paymentUrl && (
          <div className="flex flex-col items-center py-2 space-y-4">
            <SharePaymentLink
              paymentUrl={paymentUrl}
              amount={amount}
              descripcion={description}
              clienteTelefono={clienteTelefono}
              clienteEmail={clienteEmail}
            />
            <div className="flex items-center gap-2 text-amber-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-sm">Esperando confirmación de pago...</p>
            </div>
            <Button variant="outline" onClick={cancelPayment} size="sm">
              Cancelar
            </Button>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <p className="text-xl font-bold text-green-600">¡Pago completado!</p>
            <p className="text-gray-600">{amount.toFixed(2)} € cobrados</p>
            {transactionCode && (
              <p className="text-xs text-gray-400 mt-2">Cód: {transactionCode}</p>
            )}
            <Button onClick={() => onOpenChange(false)} className="mt-4">
              Cerrar
            </Button>
          </div>
        )}

        {status === 'failed' && (
          <div className="flex flex-col items-center justify-center py-8">
            <XCircle className="h-16 w-16 text-red-500 mb-4" />
            <p className="text-xl font-bold text-red-600">Pago fallido</p>
            <p className="text-gray-600 text-center">{errorMessage}</p>
            <Button onClick={() => setStatus('ready')} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        )}

        {status === 'cancelled' && (
          <div className="flex flex-col items-center justify-center py-8">
            <XCircle className="h-16 w-16 text-gray-400 mb-4" />
            <p className="text-xl font-medium text-gray-600">Pago cancelado</p>
            <Button onClick={() => setStatus('ready')} className="mt-4">
              Reintentar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
