

'use client'

import React, { useState } from 'react'
import { Mail, MessageCircle, Send, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

interface EnviarFacturaDialogProps {
  facturaId: string
  facturaNumero: string
  clienteNombre: string
  clienteEmail?: string
  clienteTelefono?: string
  tipo: 'TICKET' | 'FACTURA'
}

export function EnviarFacturaDialog({
  facturaId,
  facturaNumero,
  clienteNombre,
  clienteEmail,
  clienteTelefono,
  tipo
}: EnviarFacturaDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState(clienteEmail || '')
  const [telefono, setTelefono] = useState(clienteTelefono || '')
  const [mensaje, setMensaje] = useState(
    `Hola ${clienteNombre}, te enviamos tu ${tipo.toLowerCase()} #${facturaNumero}. Gracias por confiar en ServyAuto.`
  )
  const { toast } = useToast()

  const enviarPorEmail = async () => {
    if (!email) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa un email válido',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/facturas/enviar-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facturaId,
          email,
          mensaje,
        }),
      })

      if (response.ok) {
        toast({
          title: '¡Enviado!',
          description: `${tipo} enviado por email correctamente`,
        })
        setOpen(false)
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Error al enviar el email',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description: 'Error al enviar el email',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const enviarPorWhatsApp = () => {
    if (!telefono) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa un número de teléfono válido',
        variant: 'destructive',
      })
      return
    }

    // Limpiar el número de teléfono (eliminar espacios, guiones, etc.)
    const numeroLimpio = telefono.replace(/\D/g, '')
    
    // Si el número no comienza con código de país, agregar +34 (España)
    const numeroCompleto = numeroLimpio.startsWith('34') ? numeroLimpio : `34${numeroLimpio}`
    
    // Crear el mensaje para WhatsApp
    const mensajeWhatsApp = encodeURIComponent(mensaje)
    
    // Abrir WhatsApp Web/App
    const url = `https://wa.me/${numeroCompleto}?text=${mensajeWhatsApp}`
    window.open(url, '_blank')
    
    toast({
      title: '¡WhatsApp abierto!',
      description: 'Se ha abierto WhatsApp. Puedes adjuntar el documento manualmente.',
    })
    
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded-sm">
          <Send className="mr-2 h-4 w-4" />
          Enviar Documento
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Enviar {tipo}</DialogTitle>
          <DialogDescription>
            Envía el {tipo.toLowerCase()} #{facturaNumero} al cliente por Email o WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Mensaje</Label>
            <Textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={3}
              placeholder="Escribe un mensaje para el cliente..."
            />
          </div>

          {/* Enviar por Email */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium">Enviar por Email</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email del cliente</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@ejemplo.com"
              />
            </div>
            <Button
              onClick={enviarPorEmail}
              disabled={loading || !email}
              className="w-full"
            >
              <Mail className="mr-2 h-4 w-4" />
              {loading ? 'Enviando...' : 'Enviar por Email'}
            </Button>
          </div>

          {/* Enviar por WhatsApp */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              <h3 className="font-medium">Enviar por WhatsApp</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono del cliente</Label>
              <Input
                id="telefono"
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+34 600 000 000"
              />
            </div>
            <Button
              onClick={enviarPorWhatsApp}
              disabled={!telefono}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Abrir WhatsApp
            </Button>
            <p className="text-xs text-gray-500">
              Se abrirá WhatsApp con el mensaje. Deberás adjuntar el documento manualmente.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
