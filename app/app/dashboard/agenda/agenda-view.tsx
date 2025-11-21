
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
  Car
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { NuevaCitaDialog } from './nueva-cita-dialog'
import { EditarCitaDialog } from './editar-cita-dialog'
import { Cita } from '@/lib/types'
import EnviarResenaDialog from '@/components/enviar-resena-dialog'
import EnviarDepositoDialog from '@/components/enviar-deposito-dialog'

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

  useEffect(() => {
    setMounted(true)
  }, [])

  const [timeSlots, setTimeSlots] = useState<string[]>([])
  const [boxes, setBoxes] = useState(['Box 1', 'Box 2', 'Box 3'])

  useEffect(() => {
    loadCitas()
    loadConfiguration()
  }, [selectedDate])

  const generateTimeSlots = (apertura: string, cierre: string): string[] => {
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
      
      // Si llegamos exactamente a la hora de cierre, parar
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
        
        // Cargar horarios
        const aperturaConfig = configs?.find((c: any) => c.clave === 'horarios.apertura')
        const cierreConfig = configs?.find((c: any) => c.clave === 'horarios.cierre')
        
        const apertura = aperturaConfig?.valor || '09:00'
        const cierre = cierreConfig?.valor || '19:00'
        
        const slots = generateTimeSlots(apertura, cierre)
        setTimeSlots(slots)
      }
    } catch (error) {
      console.error('Error loading configuration:', error)
      // Fallback a horarios por defecto
      setTimeSlots(generateTimeSlots('09:00', '19:00'))
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

  const getSlotData = (): AgendaSlot[] => {
    return timeSlots.map((time) => {
      const slot: AgendaSlot = { time }
      
      citas?.forEach((cita) => {
        if (cita?.horaInicio === time) {
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

                {/* Time slots */}
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
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleSlotClick(slot.time, box)}
                                className="w-full h-full min-h-[50px] border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center opacity-50 hover:opacity-100 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                              >
                                <div className="text-center">
                                  <Plus className="h-4 w-4 text-gray-400 group-hover:text-blue-500 mx-auto mb-1" />
                                  <span className="text-xs text-gray-400 group-hover:text-blue-500">Reservar</span>
                                </div>
                              </button>
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
    </div>
  )
}
