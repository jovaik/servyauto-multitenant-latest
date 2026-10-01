
'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { Calendar, Clock, User, Car, CreditCard, Trash2, Smartphone, Banknote, Building2, ToggleLeft, ToggleRight } from 'lucide-react'
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
import { CobrarSumUpDialog } from '@/components/cobrar-sumup-dialog'
import { CobrarRevolutDialog } from '@/components/cobrar-revolut-dialog'
import { getSelectedLocalId } from '@/lib/local-store'
import { 
  detectVehicleCategory, 
  filterServicesByCategory,
  CATEGORY_LABELS,
  CATEGORY_EMOJIS,
  CATEGORY_COLORS,
  type VehicleCategory 
} from '@/lib/vehicle-categories'

interface Servicio {
  id: string
  nombre: string
  precio: number
  duracion: number
  activo: boolean
}

interface Local {
  id: string
  nombre: string
  nombreComercial?: string
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
  const [showSumUpDialog, setShowSumUpDialog] = useState(false)
  const [showRevolutDialog, setShowRevolutDialog] = useState(false)
  const [locales, setLocales] = useState<Local[]>([])
  const [localIdSeleccionado, setLocalIdSeleccionado] = useState<string>('')
  const [categoriaVehiculo, setCategoriaVehiculo] = useState<VehicleCategory | null>(null)
  const [modoManualServicios, setModoManualServicios] = useState(false)
  const { data: session } = useSession() || {}
  const isSuperAdmin = (session?.user as any)?.role === 'SUPER_ADMIN'
  const [categoriaOverrides, setCategoriaOverrides] = useState<{ marca: string; modelo: string; categoria: string }[]>([])
  const [precioOverrides, setPrecioOverrides] = useState<{ servicioId: string; precio: number }[]>([])
  const [colaboradores, setColaboradores] = useState<{ id: string; nombre: string; rol: string }[]>([])
  
  const [formData, setFormData] = useState({
    fecha: '',
    horaInicio: '',
    horaFin: '',
    box: '',
    estado: EstadoCita.PENDIENTE,
    observaciones: '',
    metodoPago: '',
    ticketsUsados: 0,
    prescriptorId: '',
    realizadoPorId: '',
  })

  // Franjas horarias removidas - ahora se usa input type="time" para mayor flexibilidad

  const boxes = ['Box 1', 'Box 2', 'Box 3']
  const estados = Object.values(EstadoCita)
  const metodosPago = ['EFECTIVO', 'TPV_SUMUP', 'TPV_UNICAJA']

  // Helper: detectar categoría con overrides del local
  const detectCategoryWithOverrides = (marca: string, modelo: string): VehicleCategory | null => {
    const m = marca.toUpperCase().trim()
    const md = modelo.toUpperCase().trim()
    const override = categoriaOverrides.find(o => o.marca === m && o.modelo === md)
    if (override) return override.categoria as VehicleCategory
    return detectVehicleCategory(marca, modelo)
  }

  // Helper: obtener precio efectivo (con override local si existe)
  const getPrecioEfectivo = (servicioId: string): number => {
    const po = precioOverrides.find(o => o.servicioId === servicioId)
    if (po) return po.precio
    return servicios?.find(s => s.id === servicioId)?.precio || 0
  }

  // Cargar servicios y overrides
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
    const cargarOverrides = async () => {
      try {
        const localId = getSelectedLocalId()
        if (!localId) return
        const res = await fetch(`/api/overrides-local?localId=${localId}`)
        if (res.ok) {
          const data = await res.json()
          setCategoriaOverrides((data.categoriaOverrides || []).map((o: any) => ({ marca: o.marca, modelo: o.modelo, categoria: o.categoria })))
          setPrecioOverrides((data.precioOverrides || []).map((o: any) => ({ servicioId: o.servicioId, precio: o.precio })))
        }
      } catch (e) { console.error('Error cargando overrides:', e) }
    }
    if (open) {
      cargarServicios()
      cargarOverrides()
    }
  }, [open])

  // Cargar locales disponibles
  useEffect(() => {
    const cargarLocales = async () => {
      try {
        const response = await fetch('/api/locales')
        if (response.ok) {
          const data = await response.json()
          setLocales(data.filter((l: Local) => l.nombre))
        }
      } catch (error) {
        console.error('Error cargando locales:', error)
      }
    }
    if (open) {
      cargarLocales()
    }
  }, [open])

  // Cargar datos de la cita incluyendo servicios seleccionados y local
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
          ticketsUsados: cita.ticketsUsados || 0,
          prescriptorId: (cita as any).prescriptorId || '',
          realizadoPorId: (cita as any).realizadoPorId || '',
        })
        // Cargar colaboradores del local de la cita (o todos si no hay local)
        const citaLocalId = (cita as any).localId
        const colabUrl = citaLocalId ? `/api/colaboradores?localId=${citaLocalId}&activo=true` : `/api/colaboradores?activo=true`
        fetch(colabUrl).then(r => r.ok ? r.json() : []).then(setColaboradores).catch(() => {})
        
        // Establecer el local actual de la cita
        setLocalIdSeleccionado((cita as any).localId || '')

        // Auto-detectar categoría del vehículo (con override local)
        if (cita.vehiculo?.marca && cita.vehiculo?.modelo) {
          const cat = detectCategoryWithOverrides(cita.vehiculo.marca, cita.vehiculo.modelo)
          setCategoriaVehiculo(cat)
          // Si ya tiene servicios seleccionados, activar modo manual para no perderlos
          setModoManualServicios(true)
        }
        
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
            // Actualizar localId desde la cita completa si está disponible
            if (citaCompleta.localId) {
              setLocalIdSeleccionado(citaCompleta.localId)
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

  // Calcular precio total de los servicios seleccionados (con override local)
  const calcularPrecioTotal = () => {
    return serviciosSeleccionados.reduce((sum, servicioId) => {
      return sum + getPrecioEfectivo(servicioId)
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setLoading(true)
    try {
      // Preparar datos de servicios
      const serviciosData = serviciosSeleccionados.map(servicioId => ({
        servicioId,
        precio: getPrecioEfectivo(servicioId)
      }))

      // Limpiar datos: convertir strings vacíos a undefined
      const dataToSend = {
        ...formData,
        metodoPago: formData.metodoPago && formData.metodoPago.trim() !== '' ? formData.metodoPago : undefined,
        observaciones: formData.observaciones && formData.observaciones.trim() !== '' ? formData.observaciones : undefined,
        servicios: serviciosData,
        total: calcularPrecioTotal(),
        localId: localIdSeleccionado || undefined,
        prescriptorId: formData.prescriptorId || null,
        realizadoPorId: formData.realizadoPorId || null,
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
          <div className="flex items-center gap-2">
            <Car className="mr-2 h-4 w-4 text-gray-600" />
            <span>
              {cita?.vehiculo?.marca} {cita?.vehiculo?.modelo} - {cita?.vehiculo?.matricula}
            </span>
            {categoriaVehiculo && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_COLORS[categoriaVehiculo].bg} ${CATEGORY_COLORS[categoriaVehiculo].text}`}>
                {CATEGORY_EMOJIS[categoriaVehiculo]} {CATEGORY_LABELS[categoriaVehiculo]}
              </span>
            )}
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

          {/* Selector de Local */}
          {locales.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="local" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Local asignado
              </Label>
              <Select 
                value={localIdSeleccionado || ""} 
                onValueChange={(value) => setLocalIdSeleccionado(value)}
              >
                <SelectTrigger className={localIdSeleccionado !== (cita as any).localId ? "border-orange-400 bg-orange-50" : ""}>
                  <SelectValue placeholder="Selecciona un local" />
                </SelectTrigger>
                <SelectContent>
                  {locales.map((local) => (
                    <SelectItem key={local.id} value={local.id}>
                      {local.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {localIdSeleccionado && localIdSeleccionado !== (cita as any).localId && (
                <p className="text-xs text-orange-600 font-medium">
                  ⚠️ Se cambiará el local de esta cita
                </p>
              )}
            </div>
          )}

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
                  min="06:00"
                  max="23:59"
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
                  min="06:00"
                  max="23:59"
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

          {/* Tickets de Parking - Solo visible cuando el vehículo está listo o completado */}
          {(formData.estado === EstadoCita.LISTO_PARA_RECOGER || formData.estado === EstadoCita.COMPLETADA) && (
            <div className="space-y-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <Label htmlFor="ticketsUsados" className="flex items-center gap-2">
                <span className="text-amber-600">🎟️</span>
                Tickets de Parking Entregados
              </Label>
              <Input
                id="ticketsUsados"
                type="number"
                min="0"
                max="10"
                value={formData.ticketsUsados}
                onChange={(e) => setFormData(prev => ({ ...prev, ticketsUsados: parseInt(e.target.value) || 0 }))}
                placeholder="0"
                className="bg-white"
              />
              <p className="text-xs text-amber-700">
                Número de tickets de descuento del parking entregados al cliente
              </p>
            </div>
          )}

          {/* Servicios - filtrados por categoría del vehículo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Servicios</Label>
              {categoriaVehiculo && isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setModoManualServicios(!modoManualServicios)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {modoManualServicios ? (
                    <ToggleRight className="h-4 w-4 text-orange-500" />
                  ) : (
                    <ToggleLeft className="h-4 w-4" />
                  )}
                  {modoManualServicios ? 'Manual (todos)' : 'Auto-filtrado'}
                </button>
              )}
            </div>
            {categoriaVehiculo && !modoManualServicios && (
              <div className={`text-xs px-2 py-1 rounded ${CATEGORY_COLORS[categoriaVehiculo].bg} ${CATEGORY_COLORS[categoriaVehiculo].text}`}>
                {CATEGORY_EMOJIS[categoriaVehiculo]} Filtrado para <strong>{CATEGORY_LABELS[categoriaVehiculo]}</strong>
              </div>
            )}
            <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
              {servicios.length === 0 ? (
                <p className="text-sm text-muted-foreground">Cargando servicios...</p>
              ) : (
                ((!categoriaVehiculo || modoManualServicios)
                  ? servicios
                  : filterServicesByCategory(servicios, categoriaVehiculo)
                ).map((servicio) => (
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
                      {getPrecioEfectivo(servicio.id).toFixed(2)}€
                      {precioOverrides.some(po => po.servicioId === servicio.id) && (
                        <span className="text-xs text-blue-600 ml-1" title="Precio especial de este local">📍</span>
                      )}
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

          {/* Método de Pago - Botones de Cobro */}
          <div className="space-y-3">
            <Label>💳 Cobrar ({cita?.total ? `${cita.total.toFixed(2)}€` : 'Sin total'})</Label>
            
            {formData.metodoPago && (
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  ✅ Pagado: {formData.metodoPago === 'EFECTIVO' ? 'Efectivo' : formData.metodoPago === 'TPV_SUMUP' ? 'TPV SumUp' : formData.metodoPago === 'REVOLUT' ? 'Revolut' : 'TPV Unicaja'}
                </Badge>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, metodoPago: '' }))}
                  className="text-gray-500 h-6"
                >
                  Cambiar
                </Button>
              </div>
            )}
            
            {!formData.metodoPago && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 flex flex-col items-center justify-center gap-1 border-2 hover:bg-green-50 hover:border-green-500"
                  onClick={() => setFormData(prev => ({ ...prev, metodoPago: 'EFECTIVO' }))}
                >
                  <Banknote className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">Efectivo</span>
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 flex flex-col items-center justify-center gap-1 border-2 hover:bg-blue-50 hover:border-blue-500"
                  onClick={() => setFormData(prev => ({ ...prev, metodoPago: 'TPV_SUMUP' }))}
                >
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">TPV SumUp</span>
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 flex flex-col items-center justify-center gap-1 border-2 hover:bg-purple-50 hover:border-purple-500"
                  onClick={() => setFormData(prev => ({ ...prev, metodoPago: 'TPV_UNICAJA' }))}
                >
                  <Building2 className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium">TPV Unicaja</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-14 flex flex-col items-center justify-center gap-1 border-2 hover:bg-cyan-50 hover:border-cyan-500"
                  onClick={() => setShowSumUpDialog(true)}
                  disabled={!cita?.total || cita.total <= 0}
                >
                  <Smartphone className="h-5 w-5 text-cyan-600" />
                  <span className="text-xs font-medium text-center leading-tight">Generar Link SumUp</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-14 flex flex-col items-center justify-center gap-1 border-2 hover:bg-slate-100 hover:border-slate-700"
                  onClick={() => setShowRevolutDialog(true)}
                  disabled={!cita?.total || cita.total <= 0}
                >
                  <Smartphone className="h-5 w-5 text-slate-800" />
                  <span className="text-xs font-medium text-center leading-tight">Generar Link Revolut</span>
                </Button>
              </div>
            )}
          </div>

          {/* Colaboradores (prescriptor / realizado por) */}
          {colaboradores.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prescriptor</Label>
                <Select value={formData.prescriptorId || "_none"} onValueChange={(v) => setFormData(prev => ({ ...prev, prescriptorId: v === '_none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Sin prescriptor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Sin prescriptor</SelectItem>
                    {colaboradores.filter(c => c.rol === 'PRESCRIPTOR' || c.rol === 'RESPONSABLE').map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Realizado por</Label>
                <Select value={formData.realizadoPorId || "_none"} onValueChange={(v) => setFormData(prev => ({ ...prev, realizadoPorId: v === '_none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Sin asignar</SelectItem>
                    {colaboradores.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre} ({c.rol === 'RESPONSABLE' ? 'Resp.' : c.rol === 'PRESCRIPTOR' ? 'Presc.' : 'Op.'})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

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
    
    {/* Dialog de Cobro SumUp */}
    <CobrarSumUpDialog
      open={showSumUpDialog}
      onOpenChange={setShowSumUpDialog}
      amount={cita?.total || 0}
      description={`${cita?.cliente?.nombre || 'Cliente'} - ${cita?.vehiculo?.matricula || 'Vehículo'}`}
      citaId={cita?.id}
      onPaymentComplete={(transactionCode) => {
        setFormData(prev => ({ ...prev, metodoPago: 'TPV_SUMUP' }))
        toast({
          title: '✅ Pago completado',
          description: `Cobro de ${cita?.total?.toFixed(2)}€ realizado con SumUp`,
        })
      }}
      onPaymentFailed={() => {
        toast({
          title: 'Pago fallido',
          description: 'El pago no se pudo completar',
          variant: 'destructive',
        })
      }}
    />

    {/* Dialog de Cobro Revolut */}
    <CobrarRevolutDialog
      open={showRevolutDialog}
      onOpenChange={setShowRevolutDialog}
      amount={cita?.total || 0}
      description={`${cita?.cliente?.nombre || 'Cliente'} - ${cita?.vehiculo?.matricula || 'Vehículo'}`}
      citaId={cita?.id}
      onPaymentComplete={() => {
        setFormData(prev => ({ ...prev, metodoPago: 'REVOLUT' }))
        toast({
          title: '✅ Pago completado',
          description: `Cobro de ${cita?.total?.toFixed(2)}€ realizado con Revolut`,
        })
      }}
      onPaymentFailed={() => {
        toast({
          title: 'Pago fallido',
          description: 'El pago no se pudo completar',
          variant: 'destructive',
        })
      }}
    />
    </>
  )
}
