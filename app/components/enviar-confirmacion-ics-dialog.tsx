'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Calendar, MessageSquare, Mail, Download } from 'lucide-react'

interface EnviarConfirmacionICSDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  confirmacionData: {
    clienteName: string
    telefono: string
    whatsappUrl: string
    smsUrl: string
    icsUrl: string
    mensaje: string
  } | null
}

export function EnviarConfirmacionICSDialog({
  open,
  onOpenChange,
  confirmacionData
}: EnviarConfirmacionICSDialogProps) {
  if (!confirmacionData) return null

  const handleWhatsApp = () => {
    window.open(confirmacionData.whatsappUrl, '_blank')
  }

  const handleSMS = () => {
    window.open(confirmacionData.smsUrl, '_blank')
  }

  const handleDownloadICS = () => {
    window.open(confirmacionData.icsUrl, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <DialogTitle>Enviar Confirmación con Calendario</DialogTitle>
          </div>
          <DialogDescription>
            Envía la confirmación de cita a {confirmacionData.clienteName} con archivo ICS para agregar a su calendario
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Vista previa del mensaje */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-600 mb-2">VISTA PREVIA DEL MENSAJE:</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {confirmacionData.mensaje.substring(0, 200)}...
            </p>
          </div>

          {/* Botones de acción */}
          <div className="space-y-3">
            {/* WhatsApp */}
            <Button
              onClick={handleWhatsApp}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              <MessageSquare className="mr-2 h-5 w-5" />
              Enviar por WhatsApp
            </Button>

            {/* SMS */}
            <Button
              onClick={handleSMS}
              variant="outline"
              className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
              size="lg"
            >
              <Mail className="mr-2 h-5 w-5" />
              Enviar por SMS
            </Button>

            {/* Descargar ICS */}
            <Button
              onClick={handleDownloadICS}
              variant="outline"
              className="w-full border-purple-600 text-purple-600 hover:bg-purple-50"
              size="lg"
            >
              <Download className="mr-2 h-5 w-5" />
              Descargar solo archivo ICS
            </Button>
          </div>

          {/* Nota informativa */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800">
              📅 <strong>Archivo ICS incluido:</strong> El cliente podrá agregar la cita directamente a Google Calendar, Outlook, Apple Calendar, etc.
            </p>
          </div>

          {/* Botón cancelar */}
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            className="w-full"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
