import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * PUNTO DE CONSOLIDACIÓN DE IVA — SOLO LECTURA
 * ------------------------------------------------------------------
 * Devuelve en JSON las facturas de VENTAS (IVA repercutido) y las
 * facturas de COMPRAS/gastos (IVA soportado) con todos los datos
 * fiscales, para que un sistema externo (consolidador DD4U) las una
 * con las de otras apps.
 *
 * AUTENTICACIÓN: cabecera  Authorization: Bearer <CONSOLIDACION_API_KEY>
 *                o bien    x-api-key: <CONSOLIDACION_API_KEY>
 *
 * Este endpoint NO escribe nada. Solo lee.
 *
 * PARÁMETROS (query string, todos opcionales):
 *   fechaDesde=YYYY-MM-DD   fechaHasta=YYYY-MM-DD   (rango personalizado)
 *   trimestre=Q1|Q2|Q3|Q4|ANUAL   anio=YYYY           (si no hay rango)
 *   localId=<id>            (filtra por local; si se omite, todos)
 * Si no se indica período, por defecto el año natural en curso.
 */

function up(v: any): string {
  return (v === null || v === undefined ? '' : String(v)).toUpperCase().trim()
}

function getDatosFiscales(v: any) {
  const clienteNombre = `${v.cliente?.nombre || ''} ${v.cliente?.apellido || ''}`.trim()
  const fallback = {
    nombre: clienteNombre || 'SIN CLIENTE',
    nif: v.cliente?.documento || '',
    direccion: v.cliente?.direccion || '',
    codigoPostal: '',
    municipio: '',
  }
  if (!v.datosFacturacion) return fallback
  try {
    const d = typeof v.datosFacturacion === 'string' ? JSON.parse(v.datosFacturacion) : v.datosFacturacion
    return {
      nombre: d.nombreFiscal || d.razonSocial || fallback.nombre,
      nif: d.nif || d.cif || fallback.nif,
      direccion: d.direccion || fallback.direccion,
      codigoPostal: d.codigoPostal || fallback.codigoPostal,
      municipio: d.ciudad || d.municipio || fallback.municipio,
    }
  } catch {
    return fallback
  }
}

export async function GET(request: NextRequest) {
  try {
    // ---- Autenticación por API key (solo lectura) ----
    const expected = process.env.CONSOLIDACION_API_KEY
    if (!expected) {
      return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 })
    }
    const authHeader = request.headers.get('authorization') || ''
    const bearer = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : ''
    const apiKey = bearer || request.headers.get('x-api-key') || ''
    if (apiKey !== expected) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const trimestre = searchParams.get('trimestre') || ''
    const anioParam = searchParams.get('anio')
    const fechaDesdeParam = searchParams.get('fechaDesde')
    const fechaHastaParam = searchParams.get('fechaHasta')
    const localId = searchParams.get('localId') || ''

    // ---- Resolver rango de fechas ----
    let startDate: Date
    let endDate: Date
    let etiquetaPeriodo = ''

    if (fechaDesdeParam && fechaHastaParam) {
      startDate = new Date(fechaDesdeParam + 'T00:00:00')
      endDate = new Date(fechaHastaParam + 'T23:59:59')
      etiquetaPeriodo = `${fechaDesdeParam} a ${fechaHastaParam}`
    } else {
      const anio = parseInt(anioParam || new Date().getFullYear().toString())
      let startMonth = 0
      let endMonth = 11
      switch (trimestre) {
        case 'Q1': startMonth = 0; endMonth = 2; break
        case 'Q2': startMonth = 3; endMonth = 5; break
        case 'Q3': startMonth = 6; endMonth = 8; break
        case 'Q4': startMonth = 9; endMonth = 11; break
        default: startMonth = 0; endMonth = 11; break // ANUAL / sin especificar
      }
      startDate = new Date(anio, startMonth, 1)
      endDate = new Date(anio, endMonth + 1, 0, 23, 59, 59)
      etiquetaPeriodo = `${trimestre || 'ANUAL'} ${anio}`
    }

    const localFilter = localId ? { localId } : {}

    // ---- VENTAS (IVA repercutido) — solo FACTURAS, no tickets ----
    const ventas = await prisma.factura.findMany({
      where: {
        tipo: 'FACTURA',
        fecha: { gte: startDate, lte: endDate },
        ...localFilter,
      },
      include: { cliente: true, local: { select: { id: true, nombre: true } } },
      orderBy: { fecha: 'asc' },
    })

    // ---- COMPRAS (IVA soportado) — solo gastos tipo FACTURA ----
    const compras = await prisma.gasto.findMany({
      where: {
        tipo: 'FACTURA',
        fecha: { gte: startDate, lte: endDate },
        ...localFilter,
      },
      include: { local: { select: { id: true, nombre: true } } },
      orderBy: { fecha: 'asc' },
    })

    const ventasData = ventas.map((v: any) => {
      const base = v.subtotal || 0
      const ivaAmount = v.iva || 0
      const porcentajeIVA = base > 0 ? Math.round((ivaAmount / base) * 100) : 0
      const fiscal = getDatosFiscales(v)
      return {
        fecha: new Date(v.fecha).toISOString(),
        numeroFactura: up(v.numero),
        cliente: up(fiscal.nombre),
        nif: up(fiscal.nif),
        direccion: up(fiscal.direccion),
        codigoPostal: up(fiscal.codigoPostal),
        municipio: up(fiscal.municipio),
        porcentajeIVA,
        baseImponible: Number(base.toFixed(2)),
        cuotaIVA: Number(ivaAmount.toFixed(2)),
        total: Number((v.total || 0).toFixed(2)),
        metodoPago: v.metodoPago || null,
        localId: v.local?.id || v.localId || null,
        local: v.local?.nombre || null,
      }
    })

    const comprasData = compras.map((c: any) => {
      const ivaRate = (c.iva || 0) / 100
      const base = (c.importe || 0) / (1 + ivaRate)
      const ivaAmount = (c.importe || 0) - base
      return {
        fecha: new Date(c.fecha).toISOString(),
        numeroFactura: up(c.numeroFactura),
        proveedor: up(c.proveedor),
        cif: up(c.proveedorCIF),
        direccion: up(c.proveedorDireccion),
        codigoPostal: up(c.proveedorCodigoPostal),
        municipio: up(c.proveedorCiudad),
        concepto: up(c.concepto),
        porcentajeIVA: c.iva || 0,
        baseImponible: Number(base.toFixed(2)),
        cuotaIVA: Number(ivaAmount.toFixed(2)),
        total: Number((c.importe || 0).toFixed(2)),
        metodoPago: c.metodoPago || null,
        localId: c.local?.id || c.localId || null,
        local: c.local?.nombre || null,
      }
    })

    // ---- Totales de control ----
    const sum = (arr: any[], k: string) => Number(arr.reduce((s, x) => s + (x[k] || 0), 0).toFixed(2))
    const resumen = {
      ventas: {
        numFacturas: ventasData.length,
        baseImponible: sum(ventasData, 'baseImponible'),
        cuotaIVA: sum(ventasData, 'cuotaIVA'),
        total: sum(ventasData, 'total'),
      },
      compras: {
        numFacturas: comprasData.length,
        baseImponible: sum(comprasData, 'baseImponible'),
        cuotaIVA: sum(comprasData, 'cuotaIVA'),
        total: sum(comprasData, 'total'),
      },
      ivaResultado: Number((sum(ventasData, 'cuotaIVA') - sum(comprasData, 'cuotaIVA')).toFixed(2)),
    }

    return NextResponse.json({
      ok: true,
      origen: 'servyauto',
      periodo: etiquetaPeriodo,
      fechaDesde: startDate.toISOString(),
      fechaHasta: endDate.toISOString(),
      localId: localId || null,
      generadoEn: new Date().toISOString(),
      resumen,
      ventas: ventasData,
      compras: comprasData,
    })
  } catch (error: any) {
    console.error('Error en consolidación IVA:', error)
    return NextResponse.json({ error: 'Error interno', detalle: error?.message }, { status: 500 })
  }
}
