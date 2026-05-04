
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext } from '@/lib/local-context'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const localContext = await getLocalContext()
    const tenantId = localContext?.tenantId || null

    const searchParams = request.nextUrl.searchParams
    const trimestre = searchParams.get('trimestre') || 'Q1'
    const anio = parseInt(searchParams.get('anio') || new Date().getFullYear().toString())

    let startMonth = 0
    let endMonth = 2

    switch (trimestre) {
      case 'Q1': startMonth = 0; endMonth = 2; break
      case 'Q2': startMonth = 3; endMonth = 5; break
      case 'Q3': startMonth = 6; endMonth = 8; break
      case 'Q4': startMonth = 9; endMonth = 11; break
    }

    const startDate = new Date(anio, startMonth, 1)
    const endDate = new Date(anio, endMonth + 1, 0, 23, 59, 59)

    const tenantFilter = tenantId ? { tenantId } : {}

    const ventas = await prisma.factura.findMany({
      where: {
        tipo: 'FACTURA',
        fecha: { gte: startDate, lte: endDate },
        ...tenantFilter
      },
      include: { cliente: true },
      orderBy: { fecha: 'asc' }
    })

    const compras = await prisma.gasto.findMany({
      where: {
        tipo: 'FACTURA',
        fecha: { gte: startDate, lte: endDate },
        ...tenantFilter
      },
      orderBy: { fecha: 'asc' }
    })

    const ventasData = ventas.length > 0 ? ventas.map((v: any) => ({
      'Número': v.numero,
      'Fecha': new Date(v.fecha).toLocaleDateString('es-ES'),
      'Cliente': `${v.cliente?.nombre || ''} ${v.cliente?.apellido || ''}`.trim() || 'Sin cliente',
      'Base Imponible': (v.subtotal || 0).toFixed(2),
      'IVA': (v.iva || 0).toFixed(2),
      'Total': (v.total || 0).toFixed(2)
    })) : [{ 'Número': '', 'Fecha': '', 'Cliente': 'No hay datos para el período seleccionado', 'Base Imponible': '0.00', 'IVA': '0.00', 'Total': '0.00' }]

    const comprasData = compras.length > 0 ? compras.map((c: any) => {
      const ivaRate = (c.iva || 0) / 100
      const base = c.importe / (1 + ivaRate)
      const ivaAmount = c.importe - base
      return {
        'Fecha': new Date(c.fecha).toLocaleDateString('es-ES'),
        'Proveedor': c.proveedor || 'Sin proveedor',
        'Concepto': c.concepto,
        'Base Imponible': base.toFixed(2),
        'IVA': ivaAmount.toFixed(2),
        'Total': (c.importe || 0).toFixed(2)
      }
    }) : [{ 'Fecha': '', 'Proveedor': '', 'Concepto': 'No hay datos para el período seleccionado', 'Base Imponible': '0.00', 'IVA': '0.00', 'Total': '0.00' }]

    const totalVentasBase = ventas.reduce((sum: number, v: any) => sum + (v.subtotal || 0), 0)
    const totalVentasIVA = ventas.reduce((sum: number, v: any) => sum + (v.iva || 0), 0)
    const totalVentasTotal = ventas.reduce((sum: number, v: any) => sum + (v.total || 0), 0)

    const totalComprasBase = compras.reduce((sum: number, c: any) => {
      const ivaRate = (c.iva || 0) / 100
      return sum + ((c.importe || 0) / (1 + ivaRate))
    }, 0)
    const totalComprasIVA = compras.reduce((sum: number, c: any) => {
      const ivaRate = (c.iva || 0) / 100
      const base = (c.importe || 0) / (1 + ivaRate)
      return sum + ((c.importe || 0) - base)
    }, 0)
    const totalComprasTotal = compras.reduce((sum: number, c: any) => sum + (c.importe || 0), 0)

    if (ventas.length > 0) {
      ventasData.push({ 'Número': '', 'Fecha': '', 'Cliente': 'TOTAL', 'Base Imponible': totalVentasBase.toFixed(2), 'IVA': totalVentasIVA.toFixed(2), 'Total': totalVentasTotal.toFixed(2) })
    }
    if (compras.length > 0) {
      comprasData.push({ 'Fecha': '', 'Proveedor': '', 'Concepto': 'TOTAL', 'Base Imponible': totalComprasBase.toFixed(2), 'IVA': totalComprasIVA.toFixed(2), 'Total': totalComprasTotal.toFixed(2) })
    }

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(ventasData), 'Ventas (Facturas)')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(comprasData), 'Compras (Facturas)')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
      { 'Concepto': 'IVA REPERCUTIDO (Ventas)', 'Importe': totalVentasIVA.toFixed(2) },
      { 'Concepto': 'IVA SOPORTADO (Compras)', 'Importe': totalComprasIVA.toFixed(2) },
      { 'Concepto': '', 'Importe': '' },
      { 'Concepto': 'IVA A INGRESAR / DEVOLVER', 'Importe': (totalVentasIVA - totalComprasIVA).toFixed(2) }
    ]), 'Resumen IVA')

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=IVA_${trimestre}_${anio}_ServyAuto.xlsx`
      }
    })
  } catch (error) {
    console.error('Error exporting IVA:', error)
    return NextResponse.json({ error: 'Error al exportar IVA' }, { status: 500 })
  }
}
