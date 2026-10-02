'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, CheckCircle, XCircle, RefreshCw, Link2, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { SharePaymentLink } from '@/components/share-payment-link'

interface CobrarRevolutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  amount: number
  description: string
  reference?: string
  citaId?: string
  facturaId?: string
  clienteTelefono?: string
  clienteEmail?: string
  onPaymentComplete?: (orderId: string) => void
  onPaymentFailed?: () => void
}

type Status = 'ready' | 'processing' | 'polling' | 'success' | 'failed' | 'cancelled'

const POLL_MS = 3000
const MAX_WAIT_MS = 15 * 60 * 1000

export function CobrarRevolutDialog({
  open,
  onOpenChange,
  amount,
  description,
  reference,
  citaId,
  facturaId,
  clienteTelefono,
  clienteEmail,
  onPaymentComplete,
  onPaymentFailed,
}: CobrarRevolutDialogProps) {
  const [status, setStatus] = useState<Status>('ready')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [paymentUrl, setPaymentUrl] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  const stopPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    pollingRef.current = null
    timeoutRef.current = null
  }

  const resetState = () => {
    stopPolling()
    setStatus('ready')
    setOrderId(null)
    setPaymentUrl('')
    setErrorMessage('')
  }

  useEffect(() => {
    if (!open) resetState()
    return () => stopPolling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const startPolling = (id: string) => {
    stopPolling()
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/revolut/order/${id}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.status === 'PAID') {
          stopPolling()
          setStatus('success')
          toast({ title: '✅ Pago completado', description: `Cobro de ${amount.toFixed(2)}€ con Revolut realizado` })
          onPaymentComplete?.(id)
        } else if (data.status === 'FAILED') {
          stopPolling()
          setStatus('failed')
          setErrorMessage('El pago fue rechazado')
          onPaymentFailed?.()
        } else if (data.status === 'CANCELLED') {
          stopPolling()
          setStatus('cancelled')
        }
      } catch (e) {
        console.error('Error consultando Revolut:', e)
      }
    }, POLL_MS)
    timeoutRef.current = setTimeout(() => {
      if (pollingRef.current) {
        stopPolling()
        setStatus('failed')
        setErrorMessage('Tiempo de espera agotado. Si el cliente paga más tarde, vuelve a abrir la cita para comprobarlo.')
      }
    }, MAX_WAIT_MS)
  }

  const createPaymentLink = async () => {
    try {
      setStatus('processing')
      setErrorMessage('')
      const res = await fetch('/api/revolut/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description, reference, citaId, facturaId }),
      })
      const data = await res.json()
      if (!res.ok || !data.paymentUrl) {
        setStatus('failed')
        setErrorMessage(data?.error || 'Error al crear el link de Revolut')
        return
      }
      setOrderId(data.orderId)
      setPaymentUrl(data.paymentUrl)
      setStatus('polling')
      startPolling(data.orderId)
    } catch {
      setStatus('failed')
      setErrorMessage('Error de conexión')
    }
  }

  const cancelPayment = async () => {
    if (orderId) {
      try {
        await fetch(`/api/revolut/order/${orderId}`, { method: 'DELETE' })
      } catch (e) {
        console.error('Error cancelando Revolut:', e)
      }
    }
    resetState()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Cobrar con Revolut
          </DialogTitle>
          <DialogDescription>
            Importe: <span className="font-bold text-lg text-black">{amount.toFixed(2)} €</span>
          </DialogDescription>
        </DialogHeader>

        {status === 'ready' && (
          <div className="space-y-4 pt-2">
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <Smartphone className="h-8 w-8 mx-auto text-slate-700 mb-2" />
              <p className="text-sm text-slate-700">
                Genera un link de pago de Revolut que el cliente abre en su móvil y paga con tarjeta, Apple Pay o Google Pay.
              </p>
            </div>
            <Button onClick={createPaymentLink} className="w-full bg-slate-900 hover:bg-slate-800">
              <Link2 className="h-4 w-4 mr-2" />
              Generar link de Revolut
            </Button>
          </div>
        )}

        {status === 'processing' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-slate-700 mb-4" />
            <p className="text-gray-600">Procesando...</p>
          </div>
        )}

        {status === 'polling' && paymentUrl && (
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
            <Button variant="outline" onClick={cancelPayment} size="sm">Cancelar</Button>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <p className="text-xl font-bold text-green-600">¡Pago completado!</p>
            <p className="text-gray-600">{amount.toFixed(2)} € cobrados con Revolut</p>
            <Button onClick={() => onOpenChange(false)} className="mt-4">Cerrar</Button>
          </div>
        )}

        {status === 'failed' && (
          <div className="flex flex-col items-center justify-center py-8">
            <XCircle className="h-16 w-16 text-red-500 mb-4" />
            <p className="text-xl font-bold text-red-600">No se completó el cobro</p>
            <p className="text-gray-600 text-center">{errorMessage}</p>
            <Button onClick={resetState} className="mt-4"><RefreshCw className="h-4 w-4 mr-2" />Reintentar</Button>
          </div>
        )}

        {status === 'cancelled' && (
          <div className="flex flex-col items-center justify-center py-8">
            <XCircle className="h-16 w-16 text-gray-400 mb-4" />
            <p className="text-xl font-medium text-gray-600">Pago cancelado</p>
            <Button onClick={resetState} className="mt-4">Reintentar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
