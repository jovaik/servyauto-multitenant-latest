/**
 * Generador de archivos ICS (iCalendar) para citas
 * Compatible con Google Calendar, Outlook, Apple Calendar, etc.
 */

import { format } from 'date-fns'

interface ICSEventData {
  citaId: string
  clienteNombre: string
  vehiculoInfo: string
  matricula: string
  fecha: Date
  horaInicio: string
  horaFin: string
  servicios: string[]
  box: string
  observaciones?: string
  empresaNombre: string
  empresaDireccion?: string
  empresaTelefono?: string
  empresaEmail?: string
  tipoDestinatario: 'CLIENTE' | 'EMPRESA'
}

/**
 * Formatea una fecha al formato ICS (YYYYMMDDTHHMMSS)
 */
function formatICSDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss")
}

/**
 * Genera el contenido de un archivo ICS
 */
export function generarArchivoICS(data: ICSEventData): string {
  const {
    citaId,
    clienteNombre,
    vehiculoInfo,
    matricula,
    fecha,
    horaInicio,
    horaFin,
    servicios,
    box,
    observaciones,
    empresaNombre,
    empresaDireccion,
    empresaTelefono,
    empresaEmail,
    tipoDestinatario
  } = data

  // Crear objetos Date para inicio y fin
  const [horaInicioH, horaInicioM] = horaInicio.split(':').map(Number)
  const [horaFinH, horaFinM] = horaFin.split(':').map(Number)
  
  const fechaInicio = new Date(fecha)
  fechaInicio.setHours(horaInicioH, horaInicioM, 0, 0)
  
  const fechaFin = new Date(fecha)
  fechaFin.setHours(horaFinH, horaFinM, 0, 0)

  const ahora = new Date()

  // Título del evento según el destinatario
  const summary = tipoDestinatario === 'CLIENTE'
    ? `Cita ServyAuto - ${vehiculoInfo} (${matricula})`
    : `${clienteNombre} - ${vehiculoInfo} (${matricula}) - ${box}`

  // Descripción del evento
  let description = tipoDestinatario === 'CLIENTE'
    ? `Cita para su vehículo ${vehiculoInfo} con matrícula ${matricula}.\n\n`
    : `Cliente: ${clienteNombre}\nVehículo: ${vehiculoInfo}\nMatrícula: ${matricula}\nBox: ${box}\n\n`

  description += `Servicios:\n${servicios.map(s => `• ${s}`).join('\n')}`
  
  if (observaciones) {
    description += `\n\nObservaciones:\n${observaciones}`
  }

  if (tipoDestinatario === 'CLIENTE' && empresaTelefono) {
    description += `\n\nContacto: ${empresaTelefono}`
  }

  // Ubicación
  const location = empresaDireccion || empresaNombre

  // UID único
  const uid = `cita-${citaId}@servyauto.com`

  // Generar contenido ICS
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ServyAuto//Gestor de Citas//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(ahora)}`,
    `DTSTART:${formatICSDate(fechaInicio)}`,
    `DTEND:${formatICSDate(fechaFin)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    `LOCATION:${location}`,
    `ORGANIZER;CN=${empresaNombre}:MAILTO:${empresaEmail || 'info@servyauto.com'}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H', // Recordatorio 1 hora antes
    'DESCRIPTION:Recordatorio de cita',
    'ACTION:DISPLAY',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

  return icsContent
}

/**
 * Genera un nombre de archivo ICS apropiado
 */
export function generarNombreArchivoICS(data: {
  clienteNombre: string
  fecha: Date
  tipoDestinatario: 'CLIENTE' | 'EMPRESA'
}): string {
  const fechaStr = format(data.fecha, 'yyyy-MM-dd')
  const nombreLimpio = data.clienteNombre.replace(/[^a-zA-Z0-9]/g, '_')
  
  if (data.tipoDestinatario === 'CLIENTE') {
    return `cita_servyauto_${fechaStr}.ics`
  } else {
    return `cita_${nombreLimpio}_${fechaStr}.ics`
  }
}
