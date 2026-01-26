
'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Calendar, Clock, User, Car, CreditCard, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Cita, EstadoCita, MetodoPago } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'

interface Servicio {
  id: string
  nombre: string
  precio: number
  activo: boolean
}

interface EditarCitaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  cita: Cita
  onResenaRequest?: (data: {
    clienteName: string
    telefono: string
    whatsappUrl: string
    smsUrl: string
  }) => void
  onDepositoRequest?: (data: {
    clienteName: string
    telefono: string
    whatsappUrl: string
    smsUrl: string
  }) => void
  onListoRequest?: (data: {
    clienteName: string
    vehiculoInfo: string
    whatsappUrl: string
    smsUrl: string
    mensaje: string
  }) => void
  onConfirmacionICSRequest?: (data: {
    clienteName: string
    telefono: string
    whatsappUrl: string
    smsUrl: string
    icsUrl: string
    mensaje: string
  }) => void
}

export function EditarCitaDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  cita,
  onResenaRequest,
  onDepositoRequest,
  onListoRequest,
  onConfirmacionICSRequest
}: EditarCitaDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<string[]>([])
  
  const [formData, setFormData] = useState({
    fecha: '',
    horaInicio: '',
    horaFin: '',
    box: '',
    estado: EstadoCita.PENDIENTE,
    observaciones: '',
    metodoPago: '',
  })

  // Franjas horarias removidas - ahora se usa input type="time" para mayor flexibilidad

  const boxes = ['Box 1', 'Box 2', 'Box 3']
  const estados = Object.values(EstadoCita)
  const metodosPago = ['EFECTIVO', 'TPV_SUMUP', 'TPV_UNICAJA']

  // Cargar servicios disponibles
  useEffect(() => {
    const cargarServicios = async () => {
      try {
        const response = await fetch('/api/servicios')
        if (response.ok) {
          const data = await response.json()
          setServicios(data.filter((s: Servicio) => s.activo))
        }
      } catch (error) {
        console.error('Error cargando servicios:', error)
      }
    }
    if (open) {
      cargarServicios()
    }
  }, [open])

  // Cargar datos de la cita incluyendo servicios seleccionados
  useEffect(() => {
    const cargarCitaCompleta = async () => {
      if (open && cita) {
        setFormData({
          fecha: format(new Date(cita.fecha), 'yyyy-MM-dd'),
          horaInicio: cita.horaInicio,
          horaFin: cita.horaFin,
          box: cita.box,
          estado: cita.estado,
          observaciones: cita.observaciones || '',
          metodoPago: cita.metodoPago || '',
        })
        
        // Cargar servicios asociados a la cita
        try {
          const response = await fetch(`/api/citas/${cita.id}`)
          if (response.ok) {
            const citaCompleta = await response.json()
            if (citaCompleta.cita_servicios && citaCompleta.cita_servicios.length > 0) {
              setServiciosSeleccionados(citaCompleta.cita_servicios.map((cs: any) => cs.servicioId))
            } else {
              setServiciosSeleccionados([])
            }
          }
        } catch (error) {
          console.error('Error cargando cita completa:', error)
          setServiciosSeleccionados([])
        }
      }
    }
    cargarCitaCompleta()
  }, [open, cita])

  const getEstadoBadge = (estado: EstadoCita) => {
    const variants = {
      [EstadoCita.PENDIENTE]: 'default',
      [EstadoCita.CONFIRMADA]: 'secondary',
      [EstadoCita.EN_PROCESO]: 'default',
      [EstadoCita.LISTO_PARA_RECOGER]: 'default',
      [EstadoCita.COMPLETADA]: 'default',
      [EstadoCita.CANCELADA]: 'destructive',
      [EstadoCita.NO_SHOW]: 'destructive',
    } as const

    return (
      <Badge variant={variants[estado]}>
        {estado.replace('_', ' ')}
      </Badge>
    )
  }

  // Calcular precio total de los servicios seleccionados
  const calcularPrecioTotal = () => {
    return serviciosSeleccionados.reduce((sum, servicioId) => {
      const servicio = servicios.find(s => s.id === servicioId)
      return sum + (servicio?.precio || 0)
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setLoading(true)
    try {
      // Preparar datos de servicios
      const serviciosData = serviciosSeleccionados.map(servicioId => ({
        servicioId,
        precio: servicios.find(s => s.id === servicioId)?.precio || 0
      }))

      // Limpiar datos: convertir strings vacíos a undefined
      const dataToSend = {
        ...formData,
        metodoPago: formData.metodoPago && formData.metodoPago.trim() !== '' ? formData.metodoPago : undefined,
        observaciones: formData.observaciones && formData.observaciones.trim() !== '' ? formData.observaciones : undefined,
        servicios: serviciosData,
        total: calcularPrecioTotal(),
      }

      console.log('Enviando datos:', dataToSend)

      const response = await fetch(`/api/citas/${cita.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      })

      if (response.ok) {
        const data = await response.json()
        
        toast({
          title: "¡Éxito!",
          description: "Cita actualizada correctamente",
        })
        
        // Verificar si hay diálogos que mostrar
        const hasDepositoDialog = !!(data.depositoData && data.depositoData.whatsappUrl && data.depositoData.smsUrl)
        const hasConfirmacionICSDialog = !!(data.confirmacionICSData && data.confirmacionICSData.whatsappUrl && data.confirmacionICSData.smsUrl)
        const hasListoDialog = !!(data.listoData && data.listoData.whatsappUrl && data.listoData.smsUrl)
        const hasResenaDialog = !!(data.whatsappData && data.whatsappData.whatsappUrl && data.whatsappData.smsUrl)
        
        // Si NO hay diálogos que mostrar, llamar a onSuccess inmediatamente y cerrar
        if (!hasDepositoDialog && !hasConfirmacionICSDialog && !hasListoDialog && !hasResenaDialog) {
          onSuccess()
          onOpenChange(false)
          return
        }
        
        // Si HAY diálogos que mostrar, cerrar este dialog primero
        onOpenChange(false)
        
        // Si se generaron enlaces de confirmación de depósito (cuando estado es PENDIENTE)
        if (hasDepositoDialog) {
          const { clienteName, telefono, whatsappUrl, smsUrl } = data.depositoData
          
          console.log('✅ Datos de confirmación de depósito recibidos:', data.depositoData)
          
          // Usar callback para activar el dialog en el componente padre
          if (onDepositoRequest) {
            // Delay para asegurar que el dialog de editar se cierre completamente
            setTimeout(() => {
              console.log('🚗 Enviando solicitud de confirmación de depósito al componente padre...')
              onDepositoRequest({
                clienteName,
                telefono,
                whatsappUrl,
                smsUrl
              })
            }, 300)
          }
        }
        
        // Si se generaron enlaces de confirmación con ICS (cuando estado es CONFIRMADA)
        if (hasConfirmacionICSDialog) {
          const { clienteName, telefono, whatsappUrl, smsUrl, icsUrl, mensaje } = data.confirmacionICSData
          
          console.log('✅ Datos de confirmación con ICS recibidos:', data.confirmacionICSData)
          
          // Usar callback para activar el dialog en el componente padre
          if (onConfirmacionICSRequest) {
            // Delay para asegurar que el dialog de editar se cierre completamente
            setTimeout(() => {
              console.log('📅 Enviando solicitud de confirmación con ICS al componente padre...')
              onConfirmacionICSRequest({
                clienteName,
                telefono,
                whatsappUrl,
                smsUrl,
                icsUrl,
                mensaje
              })
            }, 300)
          }
        }
        
        // Si se generaron enlaces de notificación de vehículo listo (cuando estado es LISTO_PARA_RECOGER)
        if (hasListoDialog) {
          const { clienteName, vehiculoInfo, whatsappUrl, smsUrl, mensaje } = data.listoData
          
          console.log('✅ Datos de notificación de vehículo listo recibidos:', data.listoData)
          
          // Usar callback para activar el dialog en el componente padre
          if (onListoRequest) {
            // Delay para asegurar que el dialog de editar se cierre completamente
            setTimeout(() => {
              console.log('🚗 Enviando solicitud de notificación de vehículo listo al componente padre...')
              onListoRequest({
                clienteName,
                vehiculoInfo,
                whatsappUrl,
                smsUrl,
                mensaje
              })
            }, 300)
          }
        }
        
        // Si se generaron enlaces de WhatsApp/SMS (cuando se marca como COMPLETADA), activar el dialog de reseña
        if (hasResenaDialog) {
          const { clienteName, telefono, whatsappUrl, smsUrl } = data.whatsappData
          
          console.log('✅ Datos de reseña recibidos:', data.whatsappData)
          
          // Usar callback para activar el dialog en el componente padre
          if (onResenaRequest) {
            // Delay para asegurar que el dialog de editar se cierre completamente
            setTimeout(() => {
              console.log('📱 Enviando solicitud de reseña al componente padre...')
              onResenaRequest({
                clienteName,
                telefono,
                whatsappUrl,
                smsUrl
              })
            }, 300)
          }
        }
        
        // Llamar a onSuccess DESPUÉS de mostrar los diálogos
        setTimeout(() => {
          onSuccess()
        }, 400)
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || 'Error al actualizar la cita',
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al actualizar la cita",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta cita?')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/citas/${cita.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: "¡Éxito!",
          description: "Cita eliminada correctamente",
        })
        onSuccess()
        onOpenChange(false)
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || 'Error al eliminar la cita',
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al eliminar la cita",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Editar Cita
          </DialogTitle>
          <DialogDescription>
            Modifica los detalles de la cita
          </DialogDescription>
        </DialogHeader>

        {/* Client and Vehicle Info */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex items-center">
            <User className="mr-2 h-4 w-4 text-gray-600" />
            <span className="font-medium">
              {cita?.cliente?.nombre} {cita?.cliente?.apellido}
            </span>
          </div>
          <div className="flex items-center">
            <Car className="mr-2 h-4 w-4 text-gray-600" />
            <span>
              {cita?.vehiculo?.marca} {cita?.vehiculo?.modelo} - {cita?.vehiculo?.matricula}
            </span>
          </div>
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4 text-gray-600" />
            <span>Estado actual: </span>
            <span className="ml-2">{getEstadoBadge(cita?.estado)}</span>
          </div>
          {cita?.total && (
            <div className="flex items-center">
              <CreditCard className="mr-2 h-4 w-4 text-gray-600" />
              <span>Total: €{cita.total.toFixed(2)}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fecha y Horario */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="box">Box</Label>
              <Select value={formData.box || ""} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, box: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un box" />
                </SelectTrigger>
                <SelectContent>
                  {boxes.map((box) => (
                    <SelectItem key={box} value={box}>
                      {box}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="horaInicio">
                Hora inicio
                <span className="text-xs text-gray-500 ml-2">(Puedes escribir cualquier minuto)</span>
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="horaInicio"
                  type="time"
                  value={formData.horaInicio}
                  onChange={(e) => setFormData(prev => ({ ...prev, horaInicio: e.target.value }))}
                  className="pl-10"
                  required
                  min="08:00"
                  max="20:00"
                  step="60" // Permite cualquier minuto
                />
              </div>
              <p className="text-xs text-gray-500">
                Ej: 10:10, 14:23, 16:45
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="horaFin">
                Hora de recogida
                <span className="text-xs text-gray-500 ml-2">(Estimada)</span>
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="horaFin"
                  type="time"
                  value={formData.horaFin}
                  onChange={(e) => setFormData(prev => ({ ...prev, horaFin: e.target.value }))}
                  className="pl-10"
                  required
                  min="08:00"
                  max="20:00"
                  step="60"
                />
              </div>
              <p className="text-xs text-gray-500">
                Hora estimada de entrega
              </p>
            </div>
          </div>

          {/* Estado */}
          <div className="space-y-2">
            <Label>Estado de la cita</Label>
            <Select value={formData.estado || ""} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, estado: value as EstadoCita }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Estado de la cita" />
              </SelectTrigger>
              <SelectContent>
                {estados.map((estado) => (
                  <SelectItem key={estado} value={estado}>
                    {estado.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Servicios */}
          <div className="space-y-2">
            <Label>Servicios</Label>
            <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
              {servicios.length === 0 ? (
                <p className="text-sm text-muted-foreground">Cargando servicios...</p>
              ) : (
                servicios.map((servicio) => (
                  <div key={servicio.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`servicio-${servicio.id}`}
                      checked={serviciosSeleccionados.includes(servicio.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setServiciosSeleccionados(prev => [...prev, servicio.id])
                        } else {
                          setServiciosSeleccionados(prev => prev.filter(s => s !== servicio.id))
                        }
                      }}
                    />
                    <label
                      htmlFor={`servicio-${servicio.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                    >
                      {servicio.nombre}
                    </label>
                    <span className="text-sm font-semibold text-green-600">
                      {servicio.precio}€
                    </span>
                  </div>
                ))
              )}
            </div>
            {serviciosSeleccionados.length > 0 && (
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">Total:</span>
                <span className="text-lg font-bold text-green-600">
                  {calcularPrecioTotal()}€
                </span>
              </div>
            )}
          </div>

          {/* Método de Pago */}
          <div className="space-y-2">
            <Label>Método de pago</Label>
            <Select value={formData.metodoPago || ""} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, metodoPago: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona método de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EFECTIVO">
                  <div className="flex items-center">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Efectivo
                  </div>
                </SelectItem>
                <SelectItem value="TPV_SUMUP">
                  <div className="flex items-center">
                    <CreditCard className="mr-2 h-4 w-4" />
                    TPV SUMUP
                  </div>
                </SelectItem>
                <SelectItem value="TPV_UNICAJA">
                  <div className="flex items-center">
                    <CreditCard className="mr-2 h-4 w-4" />
                    TPV UNICAJA
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              placeholder="Observaciones adicionales..."
              value={formData.observaciones}
              onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
              rows={3}
            />
          </div>

          <DialogFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleting}
              className="mr-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
            
            <div className="space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Actualizando...' : 'Actualizar Cita'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
