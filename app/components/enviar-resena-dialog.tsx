
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MessageCircle, MessageSquare, X } from "lucide-react"

interface EnviarResenaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clienteName: string
  telefono: string
  whatsappUrl: string
  smsUrl: string
}

export default function EnviarResenaDialog({
  open,
  onOpenChange,
  clienteName,
  telefono,
  whatsappUrl,
  smsUrl,
}: EnviarResenaDialogProps) {
  const handleWhatsApp = () => {
    window.open(whatsappUrl, '_blank')
    onOpenChange(false)
  }

  const handleSMS = () => {
    window.open(smsUrl, '_blank')
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            ¿Cómo quiere recibir el cliente el enlace?
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Cliente: {clienteName}</p>
              <p className="text-sm text-muted-foreground">Teléfono: {telefono}</p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          {/* Botón WhatsApp */}
          <Button
            onClick={handleWhatsApp}
            className="h-32 flex flex-col items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white text-lg font-semibold transition-all hover:scale-105"
          >
            <MessageCircle className="h-12 w-12" />
            <div className="text-center">
              <div className="text-xl font-bold">WhatsApp</div>
              <div className="text-sm font-normal opacity-90">Envío directo</div>
            </div>
          </Button>

          {/* Botón SMS */}
          <Button
            onClick={handleSMS}
            className="h-32 flex flex-col items-center justify-center gap-3 bg-blue-500 hover:bg-blue-600 text-white text-lg font-semibold transition-all hover:scale-105"
          >
            <MessageSquare className="h-12 w-12" />
            <div className="text-center">
              <div className="text-xl font-bold">SMS</div>
              <div className="text-sm font-normal opacity-90">Mensaje de texto</div>
            </div>
          </Button>
        </div>

        {/* Botón Cancelar */}
        <div className="pt-2">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="w-full h-12 text-base"
          >
            <X className="h-5 w-5 mr-2" />
            Cancelar (no enviar)
          </Button>
        </div>

        {/* Nota informativa */}
        <div className="text-xs text-center text-muted-foreground pt-2 border-t">
          El mensaje con la solicitud de reseña ya está pre-cargado. Solo tendrás que presionar ENVIAR.
        </div>
      </DialogContent>
    </Dialog>
  )
}
