/**
 * Script de inicialización del tenant por defecto.
 * Ejecutar: npx tsx scripts/init-default-tenant.ts
 *
 * Este script:
 * (a) Crea un Tenant con slug=default si no existe
 * (b) Actualiza con updateMany todos los registros que tengan tenantId IS NULL
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Iniciando configuración del tenant por defecto...')

  const defaultSlug = process.env.DEFAULT_TENANT_SLUG || 'default'
  const defaultNombre = process.env.DEFAULT_TENANT_NOMBRE || 'ServyAuto Manager'

  // (a) Crear tenant por defecto si no existe
  let tenant = await prisma.tenant.findUnique({
    where: { slug: defaultSlug }
  })

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        slug: defaultSlug,
        nombre: defaultNombre,
        activo: true
      }
    })
    console.log(`✅ Tenant creado: ${tenant.slug} (${tenant.id})`)
  } else {
    console.log(`ℹ️  Tenant ya existe: ${tenant.slug} (${tenant.id})`)
  }

  const tenantId = tenant.id

  // (b) Asignar tenantId a todos los registros que lo tengan NULL
  const modelos = [
    { name: 'Local', model: prisma.local },
    { name: 'User', model: prisma.user },
    { name: 'Cliente', model: prisma.cliente },
    { name: 'Vehiculo', model: prisma.vehiculo },
    { name: 'Cita', model: prisma.cita },
    { name: 'Factura', model: prisma.factura },
    { name: 'Gasto', model: prisma.gasto },
    { name: 'IngresoAdicional', model: prisma.ingresoAdicional },
    { name: 'Proveedor', model: prisma.proveedor },
    { name: 'reservas', model: prisma.reservas },
    { name: 'ServicioTaller', model: prisma.servicioTaller },
    { name: 'CierreCaja', model: prisma.cierreCaja },
    { name: 'SumUpReader', model: prisma.sumUpReader },
    { name: 'SumUpTransaction', model: prisma.sumUpTransaction },
    { name: 'Configuracion', model: prisma.configuracion },
    { name: 'InventarioTickets', model: prisma.inventarioTickets },
    { name: 'SumUpConfig', model: prisma.sumUpConfig },
    { name: 'Portfolio', model: prisma.portfolio },
    { name: 'GaleriaAntesDespues', model: prisma.galeriaAntesDespues },
    { name: 'TipoServicio', model: prisma.tipoServicio },
    { name: 'Servicio', model: prisma.servicio },
  ]

  let totalActualizados = 0

  for (const { name, model } of modelos) {
    try {
      const result = await (model as any).updateMany({
        where: { tenantId: null },
        data: { tenantId }
      })
      if (result.count > 0) {
        console.log(`  ✅ ${name}: ${result.count} registros actualizados`)
        totalActualizados += result.count
      } else {
        console.log(`  ➡️  ${name}: sin registros pendientes`)
      }
    } catch (err: any) {
      console.warn(`  ⚠️  ${name}: error al actualizar (puede no tener tenantId) - ${err.message}`)
    }
  }

  console.log(`\n✅ Proceso completado. Total de registros actualizados: ${totalActualizados}`)
  console.log('\n📝 Próximo paso:')
  console.log('   Una vez verificado que todos los registros tienen tenantId,')
  console.log('   ejecuta: npx prisma migrate dev --name make-tenant-required')
  console.log('   para hacer el campo obligatorio.')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
