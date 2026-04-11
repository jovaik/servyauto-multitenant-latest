
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Endpoint PÚBLICO para obtener configuración de la página pública
 * No requiere autenticación - accesible para todos
 */
// Deshabilitar el cache de Next.js para este endpoint
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    console.log('📖 GET /api/configuracion/publica - Solicitado')
    
    // Obtener todas las configuraciones con categoría 'publica'
    const configuraciones = await prisma.configuracion.findMany({
      where: {
        categoria: 'publica'
      }
    })

    console.log(`✅ Encontradas ${configuraciones.length} configuraciones públicas en la BD`)

    // Convertir array a objeto { clave: valor }
    const config: Record<string, string> = {}
    configuraciones.forEach((item: any) => {
      config[item.clave] = item.valor
    })

    // Si no hay configuración, retornar valores por defecto
    if (Object.keys(config).length === 0) {
      console.log('⚠️ No hay configuraciones, retornando valores por defecto')
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
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    console.log('📤 Retornando configuración:', Object.keys(config).length, 'claves')

    return NextResponse.json(config, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('❌ Error fetching public configuration:', error)
    return NextResponse.json(
      { error: 'Error al cargar configuración' },
      { status: 500 }
    )
  }
}

/**
 * Endpoint para GUARDAR configuración de la página pública
 * Requiere autenticación de administrador
 */
export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session) {
      console.log('❌ PUT /api/configuracion/publica - No hay sesión válida')
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }
    
    console.log('✅ PUT /api/configuracion/publica - Usuario autenticado:', session.user?.email)

    const body = await request.json()
    
    // Validar que sea un objeto
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { error: 'Datos inválidos' },
        { status: 400 }
      )
    }

    console.log('📝 Guardando configuración pública:', Object.keys(body).length, 'claves')

    // Guardar cada configuración
    const saved = []
    for (const [clave, valor] of Object.entries(body)) {
      if (typeof valor === 'string') {
        const result = await prisma.configuracion.upsert({
          where: { clave },
          update: { 
            valor,
            categoria: 'publica'
          },
          create: {
            clave,
            valor,
            tipo: 'TEXTO',
            categoria: 'publica',
            descripcion: `Configuración pública: ${clave}`
          }
        })
        saved.push(clave)
        
        // Log especial para el color
        if (clave === 'publica.color_fondo') {
          console.log(`🎨 Color guardado: ${valor}`)
        }
      }
    }

    console.log(`✅ Guardadas ${saved.length} configuraciones públicas`)

    return NextResponse.json({ 
      success: true, 
      saved: saved.length,
      message: 'Configuración guardada correctamente'
    })
  } catch (error) {
    console.error('❌ Error saving public configuration:', error)
    return NextResponse.json(
      { error: 'Error al guardar configuración' },
      { status: 500 }
    )
  }
}
