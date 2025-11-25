'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle, MessageCircle } from 'lucide-react'

interface EnviarNotificacionListoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clienteName: string
  vehiculoInfo: string
  whatsappUrl: string
  smsUrl: string
  message: string
}

export default function EnviarNotificacionListoDialog({
  open,
  onOpenChange,
  clienteName,
  vehiculoInfo,
  whatsappUrl,
  smsUrl,
  message,
}: EnviarNotificacionListoDialogProps) {

  const handleWhatsAppClick = () => {
    // Abrir WhatsApp Web en nueva pestaña
    window.open(whatsappUrl, '_blank')
    onOpenChange(false)
  }

  const handleSMSClick = () => {
    // Abrir app de SMS
    window.open(smsUrl, '_blank')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Vehículo Listo para Recoger
          </DialogTitle>
          <DialogDescription className="text-base">
            El vehículo de <span className="font-semibold">{clienteName}</span> ({vehiculoInfo}) está listo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-green-50 border border-green-200 p-4">
            <h4 className="font-medium text-green-900 mb-2">📱 Notificar al cliente</h4>
            <p className="text-sm text-green-700">
              Envíe un mensaje al cliente para informarle que su vehículo está listo para recoger.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleWhatsAppClick}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Enviar por WhatsApp
            </Button>

            <Button
              onClick={handleSMSClick}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
              variant="outline"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Enviar por SMS
            </Button>
          </div>

          <div className="rounded-md bg-gray-50 border border-gray-200 p-3">
            <p className="text-xs text-gray-600 mb-2 font-medium">Vista previa del mensaje:</p>
            <p className="text-xs text-gray-700 whitespace-pre-line">{message}</p>
          </div>

          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
