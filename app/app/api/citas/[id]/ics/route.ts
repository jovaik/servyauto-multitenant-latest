import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generarArchivoICS, generarNombreArchivoICS } from '@/lib/ics-generator'

/**
 * Endpoint para generar archivos ICS (iCalendar) de citas
 * Soporta dos tipos: CLIENTE y EMPRESA
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tipo = searchParams.get('tipo') as 'CLIENTE' | 'EMPRESA' || 'CLIENTE'

    // Buscar cita con todos los datos necesarios
    const cita = await prisma.cita.findUnique({
      where: { id: params.id },
      include: {
        cliente: true,
        vehiculo: true,
        cita_servicios: {
          include: {
            servicios: true
          }
        }
      }
    })

    if (!cita) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      )
    }

    // Obtener configuración de la empresa (buscar por claves específicas)
    const configs = await prisma.configuracion.findMany({
      where: {
        clave: {
          in: ['empresa.nombre', 'empresa.direccion', 'empresa.telefono', 'empresa.email']
        }
      }
    })

    const getConfigValue = (key: string, defaultValue: string = '') => {
      const config = configs.find((c: any) => c.clave === key)
      return config?.valor || defaultValue
    }

    // Preparar datos para el ICS
    const vehiculoInfo = `${cita.vehiculo.marca} ${cita.vehiculo.modelo}`
    const serviciosNombres = cita.cita_servicios?.map((cs: any) => cs.servicios.nombre) || []

    const icsData = {
      citaId: cita.id,
      clienteNombre: `${cita.cliente.nombre} ${cita.cliente.apellido || ''}`.trim(),
      vehiculoInfo,
      matricula: cita.vehiculo.matricula,
      fecha: new Date(cita.fecha),
      horaInicio: cita.horaInicio,
      horaFin: cita.horaFin,
      servicios: serviciosNombres,
      box: cita.box,
      observaciones: cita.observaciones || undefined,
      empresaNombre: getConfigValue('empresa.nombre', 'ServyAuto'),
      empresaDireccion: getConfigValue('empresa.direccion') || undefined,
      empresaTelefono: getConfigValue('empresa.telefono') || undefined,
      empresaEmail: getConfigValue('empresa.email') || undefined,
      tipoDestinatario: tipo
    }

    // Generar contenido ICS
    const icsContent = generarArchivoICS(icsData)
    const nombreArchivo = generarNombreArchivoICS({
      clienteNombre: icsData.clienteNombre,
      fecha: icsData.fecha,
      tipoDestinatario: tipo
    })

    console.log(`📅 ICS generado para cita ${cita.id} (tipo: ${tipo})`)

    // Retornar archivo ICS
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
        'Cache-Control': 'no-cache'
      }
    })
  } catch (error) {
    console.error('Error generando archivo ICS:', error)
    return NextResponse.json(
      { error: 'Error generando archivo ICS' },
      { status: 500 }
    )
  }
}
