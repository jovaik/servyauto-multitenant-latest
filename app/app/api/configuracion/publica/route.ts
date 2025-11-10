
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Endpoint PÚBLICO para obtener configuración de la página pública
 * No requiere autenticación - accesible para todos
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener todas las configuraciones con categoría 'publica'
    const configuraciones = await prisma.configuracion.findMany({
      where: {
        categoria: 'publica'
      }
    })

    // Convertir array a objeto { clave: valor }
    const config: Record<string, string> = {}
    configuraciones.forEach(item => {
      config[item.clave] = item.valor
    })

    // Si no hay configuración, retornar valores por defecto
    if (Object.keys(config).length === 0) {
      return NextResponse.json({
        'publica.nombre': 'ServyAuto',
        'publica.subtitulo': 'Lavado & Detailing',
        'publica.telefono': '600-123-456',
        'publica.email': '',
        'publica.titulo_servicios': 'Nuestros Servicios',
        'publica.descripcion_servicios': 'Desde lavados básicos hasta tratamientos premium de protección.',
        'publica.cta_texto': '¿Listo para transformar tu vehículo?',
        'publica.cta_subtexto': 'Únete a más de 1.000 clientes satisfechos.',
        'publica.sabado_apertura': '10:00',
        'publica.sabado_cierre': '19:00',
        'publica.domingo_cerrado': 'true',
        'publica.domingo_apertura': '10:00',
        'publica.domingo_cierre': '14:00',
        'publica.color_fondo': '#f0f7ff'
      })
    }

    return NextResponse.json(config, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60'
      }
    })
  } catch (error) {
    console.error('Error fetching public configuration:', error)
    return NextResponse.json(
      { error: 'Error al cargar configuración' },
      { status: 500 }
    )
  }
}
