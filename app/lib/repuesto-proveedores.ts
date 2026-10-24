import { prisma } from '@/lib/db'

export interface ProveedorPrecioInput {
  proveedorId?: string | null
  nombreProveedor?: string | null
  precioCompra?: number | string | null
  referencia?: string | null
}

// Sincroniza la lista de proveedores/precios de un repuesto.
// Crea los proveedores nuevos por nombre si no existen (catálogo común).
export async function syncProveedoresRepuesto(repuestoId: string, proveedores: ProveedorPrecioInput[]) {
  if (!Array.isArray(proveedores)) return

  // Resolver/crear cada proveedor y quedarnos con los válidos
  const filas: { proveedorId: string; precioCompra: number; referencia: string | null }[] = []
  for (const p of proveedores) {
    let proveedorId = p.proveedorId || null
    const nombre = (p.nombreProveedor || '').trim()
    if (!proveedorId && nombre) {
      const existente = await prisma.proveedor.findFirst({
        where: { nombre: { equals: nombre, mode: 'insensitive' } },
      })
      if (existente) proveedorId = existente.id
      else {
        const nuevo = await prisma.proveedor.create({ data: { nombre } })
        proveedorId = nuevo.id
      }
    }
    if (!proveedorId) continue
    // Evitar duplicados del mismo proveedor en la misma lista
    if (filas.some((f) => f.proveedorId === proveedorId)) continue
    filas.push({
      proveedorId,
      precioCompra: parseFloat(String(p.precioCompra)) || 0,
      referencia: (p.referencia || '').trim() || null,
    })
  }

  // Reemplazar el conjunto: borrar los que ya no están y upsert del resto
  const idsFinales = filas.map((f) => f.proveedorId)
  await prisma.repuestoProveedor.deleteMany({
    where: { repuestoId, proveedorId: { notIn: idsFinales.length ? idsFinales : ['__none__'] } },
  })
  for (const f of filas) {
    await prisma.repuestoProveedor.upsert({
      where: { repuestoId_proveedorId: { repuestoId, proveedorId: f.proveedorId } },
      create: { repuestoId, proveedorId: f.proveedorId, precioCompra: f.precioCompra, referencia: f.referencia },
      update: { precioCompra: f.precioCompra, referencia: f.referencia },
    })
  }
}

export const repuestoInclude = {
  proveedores: {
    include: { proveedor: { select: { id: true, nombre: true } } },
    orderBy: { precioCompra: 'asc' as const },
  },
}
