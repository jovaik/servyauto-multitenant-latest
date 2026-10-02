'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { MessageCircle, Mail, Copy, ExternalLink, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface SharePaymentLinkProps {
  paymentUrl: string
  amount: number
  descripcion?: string
  clienteTelefono?: string
  clienteEmail?: string
}

// Normaliza un teléfono español/internacional al formato que exige wa.me (sin + y con prefijo país)
function normalizarTelefonoWhatsApp(telefono: string): string {
  let phone = (telefono || '').replace(/\s+/g, '').replace(/^\+/, '')
  if (phone.length === 9 && /^[6-9]/.test(phone)) {
    phone = '34' + phone
  }
  return phone
}

export function SharePaymentLink({
  paymentUrl,
  amount,
  descripcion,
  clienteTelefono,
  clienteEmail,
}: SharePaymentLinkProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [emailEnviado, setEmailEnviado] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!paymentUrl) return
    QRCode.toDataURL(paymentUrl, { width: 240, margin: 1 })
      .then(setQrDataUrl)
      .catch((e) => console.error('Error generando QR:', e))
  }, [paymentUrl])

  const mensajeTexto = `Hola, aquí tienes tu enlace de pago de ServyAuto por ${amount.toFixed(2)} €.${
    descripcion ? `\n${descripcion}` : ''
  }\n\nPaga de forma segura desde tu propio móvil con tarjeta, Apple Pay o Google Pay:\n${paymentUrl}\n\nGracias.`

  const enviarWhatsApp = () => {
    const phone = normalizarTelefonoWhatsApp(clienteTelefono || '')
    const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/'
    window.open(`${base}?text=${encodeURIComponent(mensajeTexto)}`, '_blank')
  }

  const enviarEmail = async () => {
    if (!clienteEmail) {
      toast({ title: 'Sin email', description: 'Este cliente no tiene email guardado', variant: 'destructive' })
      return
    }
    try {
      setEnviandoEmail(true)
      const res = await fetch('/api/pagos/enviar-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clienteEmail, paymentUrl, amount, descripcion }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d?.error || 'Error enviando email')
      }
      setEmailEnviado(true)
      toast({ title: '✉️ Email enviado', description: `Enlace de pago enviado a ${clienteEmail}` })
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'No se pudo enviar el email', variant: 'destructive' })
    } finally {
      setEnviandoEmail(false)
    }
  }

  const copiar = () => {
    navigator.clipboard.writeText(mensajeTexto)
    toast({ title: 'Mensaje copiado', description: 'Incluye el importe y el enlace. Pégalo donde quieras' })
  }

  return (
    <div className="flex flex-col items-center w-full space-y-4">
      <p className="text-sm text-slate-600 text-center">
        El cliente paga desde <span className="font-semibold">su propio móvil</span>. No hace falta pasar la tarjeta por nuestro datáfono.
      </p>

      {qrDataUrl ? (
        <div className="p-3 bg-white rounded-xl border shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="Código QR del enlace de pago" width={200} height={200} className="w-48 h-48" />
        </div>
      ) : (
        <div className="w-48 h-48 flex items-center justify-center bg-slate-50 rounded-xl border">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}
      <p className="text-xs text-slate-500 text-center -mt-1">El cliente escanea este QR con su cámara para pagar</p>

      <div className="grid grid-cols-2 gap-2 w-full">
        <Button onClick={enviarWhatsApp} className="bg-green-600 hover:bg-green-700 text-white">
          <MessageCircle className="h-4 w-4 mr-2" />
          WhatsApp
        </Button>
        <Button onClick={enviarEmail} variant="outline" disabled={enviandoEmail || !clienteEmail}>
          {enviandoEmail ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : emailEnviado ? (
            <Check className="h-4 w-4 mr-2 text-green-600" />
          ) : (
            <Mail className="h-4 w-4 mr-2" />
          )}
          Email
        </Button>
        <Button onClick={copiar} variant="outline">
          <Copy className="h-4 w-4 mr-2" />
          Copiar
        </Button>
        <Button onClick={() => window.open(paymentUrl, '_blank')} variant="outline">
          <ExternalLink className="h-4 w-4 mr-2" />
          Abrir
        </Button>
      </div>
      {!clienteEmail && (
        <p className="text-xs text-slate-400 text-center">El cliente no tiene email guardado; usa WhatsApp o el QR.</p>
      )}
    </div>
  )
}
