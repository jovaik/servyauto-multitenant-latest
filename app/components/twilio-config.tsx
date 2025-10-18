
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Bell, CheckCircle2, XCircle, AlertCircle, Save, Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface TwilioStatus {
  configured: boolean
  hasWhatsApp: boolean
  hasSMS: boolean
  accountSid: string
  phoneNumber?: string
  whatsappNumber?: string
}

export function TwilioConfig() {
  const [status, setStatus] = useState<TwilioStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSecrets, setShowSecrets] = useState(false)
  
  const [formData, setFormData] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: '',
    whatsappNumber: 'whatsapp:+14155238886'
  })

  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/configuracion/twilio')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Error loading Twilio status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.accountSid || !formData.authToken) {
      toast.error('Por favor completa al menos Account SID y Auth Token')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/configuracion/twilio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success('Configuración de Twilio guardada correctamente')
        await loadStatus()
        setFormData({
          accountSid: '',
          authToken: '',
          phoneNumber: '',
          whatsappNumber: 'whatsapp:+14155238886'
        })
      } else {
        toast.error('Error al guardar la configuración')
      }
    } catch (error) {
      console.error('Error saving Twilio config:', error)
      toast.error('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Cargando...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            <CardTitle>Notificaciones Automáticas</CardTitle>
          </div>
          {status?.configured ? (
            <Badge className="bg-green-500">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Configurado
            </Badge>
          ) : (
            <Badge variant="secondary">
              <AlertCircle className="mr-1 h-3 w-3" />
              Sin configurar
            </Badge>
          )}
        </div>
        <CardDescription>
          Configura Twilio para enviar notificaciones automáticas por WhatsApp y SMS cuando un vehículo está listo
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Estado actual */}
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="font-medium text-sm">Estado Actual</h3>
          <div className="grid gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Account SID:</span>
              <span className="font-mono">{status?.accountSid || 'No configurado'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">WhatsApp:</span>
              {status?.hasWhatsApp ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Activado
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="mr-1 h-3 w-3" />
                  Desactivado
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">SMS:</span>
              {status?.hasSMS ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Activado
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="mr-1 h-3 w-3" />
                  Desactivado
                </Badge>
              )}
            </div>
            {status?.phoneNumber && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Número SMS:</span>
                <span className="font-mono">{status.phoneNumber}</span>
              </div>
            )}
            {status?.whatsappNumber && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Número WhatsApp:</span>
                <span className="font-mono">{status.whatsappNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Cómo funciona */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 border p-4">
          <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-2">
            💡 Cómo funciona
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Cuando marcas una cita como "Completada", se envía automáticamente un mensaje al cliente</li>
            <li>• Primero intenta WhatsApp (más barato, ~€0.005-0.01 por mensaje)</li>
            <li>• Si falla, envía SMS como respaldo (~€0.05-0.10 por mensaje)</li>
            <li>• Solo pagas por UN mensaje (el que se envíe exitosamente)</li>
          </ul>
        </div>

        {/* Formulario de configuración */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm">Actualizar Credenciales</h3>
          
          <div className="space-y-2">
            <Label htmlFor="accountSid">Account SID *</Label>
            <Input
              id="accountSid"
              type={showSecrets ? 'text' : 'password'}
              placeholder="AC..."
              value={formData.accountSid}
              onChange={(e) => setFormData({ ...formData, accountSid: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="authToken">Auth Token *</Label>
            <div className="flex gap-2">
              <Input
                id="authToken"
                type={showSecrets ? 'text' : 'password'}
                placeholder="Tu Auth Token de Twilio"
                value={formData.authToken}
                onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowSecrets(!showSecrets)}
              >
                {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Número de Teléfono (SMS)</Label>
            <Input
              id="phoneNumber"
              type="text"
              placeholder="+34612345678"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Formato internacional. Ejemplo: +34612345678
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsappNumber">Número WhatsApp</Label>
            <Input
              id="whatsappNumber"
              type="text"
              placeholder="whatsapp:+14155238886"
              value={formData.whatsappNumber}
              onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Para pruebas usa: whatsapp:+14155238886 (Twilio Sandbox)
            </p>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </Button>
        </div>

        {/* Instrucciones */}
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="font-medium text-sm">📝 Cómo obtener las credenciales</h3>
          <ol className="text-sm space-y-2 text-muted-foreground">
            <li>1. Ve a <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://www.twilio.com/try-twilio</a></li>
            <li>2. Regístrate y verifica tu teléfono (incluye crédito gratis)</li>
            <li>3. En el Dashboard encontrarás el <strong>Account SID</strong> y <strong>Auth Token</strong></li>
            <li>4. Para SMS: Console → Phone Numbers → Buy a Number</li>
            <li>5. Para WhatsApp pruebas: Console → Messaging → Try WhatsApp</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
