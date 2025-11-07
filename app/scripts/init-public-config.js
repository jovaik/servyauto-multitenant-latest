
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('\n🚀 Inicializando configuración de página pública...\n')

  try {
    // Obtener configuraciones existentes
    const empresaConfigs = await prisma.configuracion.findMany({
      where: {
        OR: [
          { clave: 'empresa.nombre' },
          { clave: 'empresa.telefono' },
          { clave: 'empresa.email' },
          { clave: 'empresa.direccion' },
          { clave: 'horarios.sabadoApertura' },
          { clave: 'horarios.sabadoCierre' },
          { clave: 'horarios.domingoApertura' },
          { clave: 'horarios.domingoCierre' }
        ]
      }
    })

    const configMap = {}
    empresaConfigs.forEach(c => {
      configMap[c.clave] = c.valor
    })

    // Configuración pública por defecto
    const publicConfigs = [
      {
        clave: 'publica.nombre',
        valor: configMap['empresa.nombre'] || 'ServyAuto',
        tipo: 'TEXTO',
        categoria: 'publica',
        descripcion: 'Nombre del negocio para la página pública'
      },
      {
        clave: 'publica.subtitulo',
        valor: 'Lavado & Detailing Premium',
        tipo: 'TEXTO',
        categoria: 'publica',
        descripcion: 'Subtítulo o eslogan'
      },
      {
        clave: 'publica.telefono',
        valor: configMap['empresa.telefono'] || '+34 678 56 90 98',
        tipo: 'TEXTO',
        categoria: 'publica',
        descripcion: 'Teléfono de contacto'
      },
      {
        clave: 'publica.email',
        valor: configMap['empresa.email'] || 'info@servyauto.com',
        tipo: 'TEXTO',
        categoria: 'publica',
        descripcion: 'Email de contacto'
      },
      {
        clave: 'publica.direccion',
        valor: configMap['empresa.direccion'] || '',
        tipo: 'TEXTO',
        categoria: 'publica',
        descripcion: 'Dirección del negocio'
      },
      {
        clave: 'publica.titulo_servicios',
        valor: 'Nuestros Servicios',
        tipo: 'TEXTO',
        categoria: 'publica',
        descripcion: 'Título de la sección de servicios'
      },
      {
        clave: 'publica.descripcion_servicios',
        valor: 'Desde lavados básicos hasta tratamientos premium de protección. Elige el tamaño de tu vehículo y descubre nuestros servicios especializados.',
        tipo: 'TEXTO',
        categoria: 'publica',
        descripcion: 'Descripción de la sección de servicios'
      },
      {
        clave: 'publica.cta_texto',
        valor: '¿Listo para transformar tu vehículo?',
        tipo: 'TEXTO',
        categoria: 'publica',
        descripcion: 'Texto del call to action'
      },
      {
        clave: 'publica.cta_subtexto',
        valor: 'Únete a más de 1.000 clientes satisfechos que han confiado en nosotros para el cuidado de sus vehículos.',
        tipo: 'TEXTO',
        categoria: 'publica',
        descripcion: 'Subtexto del call to action'
      },
      {
        clave: 'publica.sabado_apertura',
        valor: configMap['horarios.sabadoApertura'] || '10:00',
        tipo: 'TEXTO',
        categoria: 'publica',
        descripcion: 'Hora de apertura los sábados'
      },
      {
        clave: 'publica.sabado_cierre',
        valor: configMap['horarios.sabadoCierre'] || '19:00',
        tipo: 'TEXTO',
        categoria: 'publica',
        descripcion: 'Hora de cierre los sábados'
      },
      {
        clave: 'publica.domingo_apertura',
        valor: configMap['horarios.domingoApertura'] || '10:00',
        tipo: 'TEXTO',
        categoria: 'publica',
        descripcion: 'Hora de apertura los domingos'
      },
      {
        clave: 'publica.domingo_cierre',
        valor: configMap['horarios.domingoCierre'] || '14:00',
        tipo: 'TEXTO',
        categoria: 'publica',
        descripcion: 'Hora de cierre los domingos'
      },
      {
        clave: 'publica.domingo_cerrado',
        valor: 'true',
        tipo: 'TEXTO',
        categoria: 'publica',
        descripcion: 'Cerrado los domingos (true/false)'
      },
      {
        clave: 'publica.whatsapp',
        valor: '',
        tipo: 'TEXTO',
        categoria: 'publica',
        descripcion: 'Número de WhatsApp (sin +)'
      },
      {
        clave: 'publica.instagram',
        valor: '',
        tipo: 'TEXTO',
        categoria: 'publica',
        descripcion: 'Usuario de Instagram'
      },
      {
        clave: 'publica.facebook',
        valor: '',
        tipo: 'TEXTO',
        categoria: 'publica',
        descripcion: 'Página de Facebook'
      }
    ]

    // Crear o actualizar cada configuración
    for (const config of publicConfigs) {
      const existing = await prisma.configuracion.findUnique({
        where: { clave: config.clave }
      })

      if (existing) {
        console.log(`✓ Ya existe: ${config.clave}`)
      } else {
        await prisma.configuracion.create({
          data: config
        })
        console.log(`✓ Creado: ${config.clave} = ${config.valor}`)
      }
    }

    console.log('\n✅ Configuración pública inicializada correctamente\n')
    console.log('📝 Puedes personalizar estos valores desde:')
    console.log('   👉 /dashboard/configuracion-publica\n')

  } catch (error) {
    console.error('❌ Error al inicializar configuración:', error)
    throw error
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
