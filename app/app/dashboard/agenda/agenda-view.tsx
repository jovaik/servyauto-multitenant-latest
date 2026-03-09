
'use client'

import React, { useState, useEffect } from 'react'
import { format, addDays, subDays, startOfDay, isToday, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  User,
  Car,
  Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { NuevaCitaDialog } from './nueva-cita-dialog'
import { EditarCitaDialog } from './editar-cita-dialog'
import { Cita } from '@/lib/types'
import EnviarResenaDialog from '@/components/enviar-resena-dialog'
import EnviarDepositoDialog from '@/components/enviar-deposito-dialog'
import { EnviarConfirmacionICSDialog } from '@/components/enviar-confirmacion-ics-dialog'
import EnviarNotificacionListoDialog from '@/components/enviar-notificacion-listo-dialog'
import { LOCAL_CHANGE_EVENT } from '@/lib/local-store'

interface AgendaSlot {
  time: string
  box1?: Cita
  box2?: Cita
  box3?: Cita
}

export function AgendaView() {
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()))
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(true)
  const [showNuevaCita, setShowNuevaCita] = useState(false)
  const [showEditarCita, setShowEditarCita] = useState(false)
  const [selectedCita, setSelectedCita] = useState<Cita | null>(null)
  const [preselectedSlot, setPreselectedSlot] = useState<{time: string, box: string} | null>(null)
  const [mounted, setMounted] = useState(false)
  
  // Estado para el dialog de reseña (movido desde EditarCitaDialog)
  const [showResenaDialog, setShowResenaDialog] = useState(false)
  const [resenaData, setResenaData] = useState<{
    clienteName: string
    telefono: string
    whatsappUrl: string
    smsUrl: string
  } | null>(null)

  // Estado para el dialog de confirmación de depósito
  const [showDepositoDialog, setShowDepositoDialog] = useState(false)
  const [depositoData, setDepositoData] = useState<{
    clienteName: string
    telefono: string
    whatsappUrl: string
    smsUrl: string
  } | null>(null)

  // Estado para el dialog de notificación de vehículo listo
  const [showListoDialog, setShowListoDialog] = useState(false)
  const [listoData, setListoData] = useState<{
    clienteName: string
    vehiculoInfo: string
    whatsappUrl: string
    smsUrl: string
    mensaje: string
  } | null>(null)

  // Estado para el dialog de confirmación con ICS
  const [showConfirmacionICSDialog, setShowConfirmacionICSDialog] = useState(false)
  const [confirmacionICSData, setConfirmacionICSData] = useState<{
    clienteName: string
    telefono: string
    whatsappUrl: string
    smsUrl: string
    icsUrl: string
    mensaje: string
  } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // ❌ ESTADO DESHABILITADO: Ya no se usan franjas horarias fijas
  // const [timeSlots, setTimeSlots] = useState<string[]>([])
  const [boxes, setBoxes] = useState(['Box 1', 'Box 2', 'Box 3'])

  useEffect(() => {
    loadCitas()
    loadConfiguration()
  }, [selectedDate])

  // Escuchar cambios de local para recargar datos
  useEffect(() => {
    const handleLocalChange = () => {
      console.log('🔄 Agenda: Local cambiado, recargando datos...')
      loadCitas()
    }
    
    window.addEventListener(LOCAL_CHANGE_EVENT, handleLocalChange)
    return () => window.removeEventListener(LOCAL_CHANGE_EVENT, handleLocalChange)
  }, [selectedDate])

  // ❌ FUNCIÓN DESHABILITADA: Ya no se usan franjas horarias fijas
  // Las citas ahora aparecen con su hora exacta (10:10, 14:23, etc.)
  const generateTimeSlots = (apertura: string, cierre: string): string[] => {
    // Función removida - ya no genera franjas fijas
    return []
    
    /* CÓDIGO ANTERIOR (comentado):
    const slots: string[] = []
    const [aperturaHour, aperturaMinute] = apertura.split(':').map(Number)
    const [cierreHour, cierreMinute] = cierre.split(':').map(Number)
    
    let currentHour = aperturaHour
    let currentMinute = aperturaMinute
    
    while (
      currentHour < cierreHour || 
      (currentHour === cierreHour && currentMinute <= cierreMinute)
    ) {
      const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
      slots.push(timeString)
      
      if (currentHour === cierreHour && currentMinute === cierreMinute) {
        break
      }
      
      currentMinute += 30
      if (currentMinute >= 60) {
        currentHour += 1
        currentMinute = 0
      }
    }
    
    return slots
    */
  }

  const loadConfiguration = async () => {
    try {
      const response = await fetch('/api/configuracion')
      if (response.ok) {
        const configs = await response.json()
        
        // Cargar nombres de boxes
        const boxesConfig = configs?.find((c: any) => c.clave === 'boxes.nombres')
        if (boxesConfig) {
          const boxNames = JSON.parse(boxesConfig.valor)
          setBoxes(boxNames)
        }
        
        // ❌ CÓDIGO DESHABILITADO: Ya no se generan franjas horarias fijas
        // Las citas aparecen dinámicamente con su hora exacta
        /*
        const aperturaConfig = configs?.find((c: any) => c.clave === 'horarios.apertura')
        const cierreConfig = configs?.find((c: any) => c.clave === 'horarios.cierre')
        
        const apertura = aperturaConfig?.valor || '09:00'
        const cierre = cierreConfig?.valor || '19:00'
        
        const slots = generateTimeSlots(apertura, cierre)
        setTimeSlots(slots)
        */
      }
    } catch (error) {
      console.error('Error loading configuration:', error)
      // Ya no se necesita fallback de timeSlots
    }
  }

  const loadCitas = async () => {
    try {
      setLoading(true)
      const dateString = format(selectedDate, 'yyyy-MM-dd')
      const response = await fetch(`/api/citas?fecha=${dateString}`)
      
      if (response.ok) {
        const data = await response.json()
        setCitas(data || [])
      }
    } catch (error) {
      console.error('Error loading appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  // 🔄 NUEVA LÓGICA: Genera slots dinámicamente basados en citas reales
  const getSlotData = (): AgendaSlot[] => {
    if (!citas || citas.length === 0) {
      // Si no hay citas, retornar array vacío (sin franjas vacías)
      return []
    }

    // Extraer todas las horas de inicio únicas de las citas
    const horasUnicas = Array.from(
      new Set(citas.map(cita => cita.horaInicio))
    ).sort() // Ordenar cronológicamente

    // Crear slots para cada hora única
    return horasUnicas.map((time) => {
      const slot: AgendaSlot = { time }
      
      // Asignar citas a sus boxes correspondientes
      citas.forEach((cita) => {
        if (cita.horaInicio === time) {
          const boxIndex = boxes.findIndex(box => box === cita.box)
          if (boxIndex === 0) slot.box1 = cita
          else if (boxIndex === 1) slot.box2 = cita
          else if (boxIndex === 2) slot.box3 = cita
        }
      })
      
      return slot
    })
  }

  const getEstadoColor = (estado?: string) => {
    switch (estado) {
      case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'CONFIRMADA': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'EN_PROCESO': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'LISTO_PARA_RECOGER': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'COMPLETADA': return 'bg-green-100 text-green-800 border-green-200'
      case 'CANCELADA': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleEditCita = (cita: Cita) => {
    setSelectedCita(cita)
    setShowEditarCita(true)
  }

  // NUEVA FUNCIONALIDAD: Reservar directamente desde slot
  const handleSlotClick = (time: string, box: string, cita?: Cita) => {
    if (cita) {
      handleEditCita(cita)
    } else {
      // Crear nueva cita con fecha y hora exactas preseleccionadas
      setPreselectedSlot({ time, box })
      setShowNuevaCita(true)
    }
  }

  const handleCitaUpdated = () => {
    loadCitas()
    setShowNuevaCita(false)
    setShowEditarCita(false)
    setSelectedCita(null)
    setPreselectedSlot(null)
  }

  const handleNewCitaClose = () => {
    setShowNuevaCita(false)
    setPreselectedSlot(null)
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedDate(subDays(selectedDate, 1))
    } else {
      setSelectedDate(addDays(selectedDate, 1))
    }
  }

  const goToToday = () => {
    setSelectedDate(startOfDay(new Date()))
  }

  if (!mounted) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
            <p className="text-gray-600">
              Gestiona las citas y horarios del taller
            </p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Cita
          </Button>
        </div>

        {/* Loading placeholder */}
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
          <p className="text-gray-600">
            Gestiona las citas y horarios del taller - Click en cualquier slot para reservar
          </p>
        </div>
        <Button onClick={() => setShowNuevaCita(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Cita
        </Button>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center space-x-4">
                <CalendarIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <h2 className="text-xl font-semibold">
                    {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {format(selectedDate, 'yyyy', { locale: es })}
                    {isToday(selectedDate) && (
                      <Badge variant="secondary" className="ml-2">Hoy</Badge>
                    )}
                  </p>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button 
              variant="outline" 
              onClick={goToToday}
              disabled={isToday(selectedDate)}
            >
              Hoy
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Horarios del día
          </CardTitle>
          <CardDescription>
            {citas?.length || 0} citas programadas para este día
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Cargando agenda...</p>
            </div>
          ) : getSlotData().length === 0 ? (
            /* 📅 Estado vacío: No hay citas para este día */
            <div className="text-center py-12">
              <div className="mb-4">
                <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-3" />
                <p className="text-lg font-medium text-gray-600 mb-2">
                  No hay citas programadas para este día
                </p>
                <p className="text-sm text-gray-500">
                  Haz clic en el botón de arriba para crear la primera cita
                </p>
              </div>
              <Button
                onClick={() => setShowNuevaCita(true)}
                className="mt-2"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva Cita
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {/* Header row */}
                <div className={`grid gap-2 mb-4 pb-2 border-b`} style={{gridTemplateColumns: `100px repeat(${boxes.length}, 1fr)`}}>
                  <div className="font-medium text-gray-700 p-2">Hora</div>
                  {boxes.map((box) => (
                    <div key={box} className="font-medium text-gray-700 p-2 text-center">
                      {box}
                    </div>
                  ))}
                </div>

                {/* Time slots - Dinámico basado en citas reales */}
                <div className="space-y-1">
                  {getSlotData().map((slot, index) => (
                    <div 
                      key={slot.time} 
                      className={`grid gap-2 min-h-[60px] ${
                        index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                      } rounded-lg p-1`}
                      style={{gridTemplateColumns: `100px repeat(${boxes.length}, 1fr)`}}
                    >
                      <div className="flex items-center p-2">
                        <span className="font-mono text-sm text-gray-600">
                          {slot.time}
                        </span>
                      </div>
                      
                      {boxes.map((box, boxIndex) => {
                        const cita = boxIndex === 0 ? slot.box1 : boxIndex === 1 ? slot.box2 : boxIndex === 2 ? slot.box3 : undefined
                        
                        return (
                          <div key={box} className="p-1">
                            {cita ? (
                              <div
                                className={`
                                  p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md
                                  ${getEstadoColor(cita.estado)}
                                `}
                                onClick={() => handleSlotClick(slot.time, box, cita)}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center text-xs">
                                    <User className="mr-1 h-3 w-3" />
                                    <span className="font-medium truncate">
                                      {cita?.cliente?.nombre} {cita?.cliente?.apellido}
                                    </span>
                                  </div>
                                  <div className="flex items-center text-xs text-gray-600">
                                    <Car className="mr-1 h-3 w-3" />
                                    <span className="truncate">
                                      {cita?.vehiculo?.marca} {cita?.vehiculo?.modelo}
                                    </span>
                                  </div>
                                  <div className="text-xs font-medium">
                                    {cita.horaInicio} - {cita.horaFin}
                                  </div>
                                  {/* Indicador de Local */}
                                  {(cita as any).local?.nombre && (
                                    <div className="flex items-center text-[10px] text-blue-600 truncate" title={(cita as any).local.nombre}>
                                      <Building2 className="mr-1 h-2.5 w-2.5" />
                                      <span className="truncate">{(cita as any).local.nombre.replace('SERVYAUTO ', '')}</span>
                                    </div>
                                  )}
                                  {/* Trazabilidad */}
                                  {(cita.creadoPorNombre || cita.completadoPorNombre) && (
                                    <div className="text-[10px] text-gray-400 truncate" title={`Creada por: ${cita.creadoPorNombre || 'N/A'}${cita.completadoPorNombre ? ` | Completada por: ${cita.completadoPorNombre}` : ''}`}>
                                      👤 {cita.completadoPorNombre || cita.creadoPorNombre}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* Slot vacío - sin cita en este box a esta hora */
                              <div className="w-full h-full min-h-[50px] flex items-center justify-center">
                                <span className="text-xs text-gray-300">—</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <NuevaCitaDialog 
        open={showNuevaCita}
        onOpenChange={handleNewCitaClose}
        onSuccess={handleCitaUpdated}
        selectedDate={selectedDate}
        preselectedSlot={preselectedSlot}
        onDepositoRequest={(data) => {
          console.log('🚗 Solicitud de confirmación de depósito recibida (nueva cita) en AgendaView:', data)
          setDepositoData(data)
          setShowDepositoDialog(true)
        }}
        onConfirmacionICSRequest={(data) => {
          console.log('📅 Solicitud de confirmación con ICS recibida (nueva cita) en AgendaView:', data)
          setConfirmacionICSData(data)
          setShowConfirmacionICSDialog(true)
        }}
      />

      {selectedCita && (
        <EditarCitaDialog
          open={showEditarCita}
          onOpenChange={setShowEditarCita}
          onSuccess={handleCitaUpdated}
          cita={selectedCita}
          onResenaRequest={(data) => {
            console.log('📱 Solicitud de reseña recibida en AgendaView:', data)
            setResenaData(data)
            setShowResenaDialog(true)
          }}
          onDepositoRequest={(data) => {
            console.log('🚗 Solicitud de confirmación de depósito recibida en AgendaView:', data)
            setDepositoData(data)
            setShowDepositoDialog(true)
          }}
          onListoRequest={(data) => {
            console.log('✅ Solicitud de notificación de vehículo listo recibida en AgendaView:', data)
            setListoData(data)
            setShowListoDialog(true)
          }}
          onConfirmacionICSRequest={(data) => {
            console.log('📅 Solicitud de confirmación con ICS recibida en AgendaView:', data)
            setConfirmacionICSData(data)
            setShowConfirmacionICSDialog(true)
          }}
        />
      )}

      {/* Dialog de selección de canal para enviar reseña */}
      {resenaData && (
        <EnviarResenaDialog
          open={showResenaDialog}
          onOpenChange={setShowResenaDialog}
          clienteName={resenaData.clienteName}
          telefono={resenaData.telefono}
          whatsappUrl={resenaData.whatsappUrl}
          smsUrl={resenaData.smsUrl}
        />
      )}

      {/* Dialog de confirmación de depósito */}
      {depositoData && (
        <EnviarDepositoDialog
          open={showDepositoDialog}
          onOpenChange={setShowDepositoDialog}
          clienteName={depositoData.clienteName}
          telefono={depositoData.telefono}
          whatsappUrl={depositoData.whatsappUrl}
          smsUrl={depositoData.smsUrl}
        />
      )}

      {/* Dialog de notificación de vehículo listo para recoger */}
      {listoData && (
        <EnviarNotificacionListoDialog
          open={showListoDialog}
          onOpenChange={setShowListoDialog}
          clienteName={listoData.clienteName}
          vehiculoInfo={listoData.vehiculoInfo}
          whatsappUrl={listoData.whatsappUrl}
          smsUrl={listoData.smsUrl}
          message={listoData.mensaje}
        />
      )}

      {/* Dialog de confirmación con archivo ICS */}
      {confirmacionICSData && (
        <EnviarConfirmacionICSDialog
          open={showConfirmacionICSDialog}
          onOpenChange={setShowConfirmacionICSDialog}
          confirmacionData={confirmacionICSData}
        />
      )}
    </div>
  )
}