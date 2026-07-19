
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const trimestre = searchParams.get('trimestre') || 'Q1'
    const anio = parseInt(searchParams.get('anio') || new Date().getFullYear().toString())
    const esAnual = trimestre === 'ANUAL'

    // Calcular fechas del trimestre (o del año completo si es ANUAL)
    let startMonth = 0
    let endMonth = 2

    switch (trimestre) {
      case 'Q1':
        startMonth = 0
        endMonth = 2
        break
      case 'Q2':
        startMonth = 3
        endMonth = 5
        break
      case 'Q3':
        startMonth = 6
        endMonth = 8
        break
      case 'Q4':
        startMonth = 9
        endMonth = 11
        break
      case 'ANUAL':
        startMonth = 0
        endMonth = 11
        break
    }

    const startDate = new Date(anio, startMonth, 1)
    const endDate = new Date(anio, endMonth + 1, 0, 23, 59, 59)

    console.log(`Exportando IVA para ${trimestre} ${anio}`)
    console.log(`Rango de fechas: ${startDate.toISOString()} - ${endDate.toISOString()}`)

    // Obtener SOLO FACTURAS de ventas (no tickets)
    const ventas = await prisma.factura.findMany({
      where: {
        tipo: 'FACTURA',
        fecha: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        cliente: true
      },
      orderBy: {
        fecha: 'asc'
      }
    })

    console.log(`Facturas encontradas: ${ventas.length}`)

    // Obtener SOLO FACTURAS de gastos (no tickets)
    const compras = await prisma.gasto.findMany({
      where: {
        tipo: 'FACTURA',
        fecha: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        fecha: 'asc'
      }
    })

    console.log(`Gastos (facturas) encontrados: ${compras.length}`)

    // Preparar datos para Excel - VENTAS
    const ventasData = ventas.length > 0 ? ventas.map((v: any) => {
      const base = v.subtotal || 0
      const ivaAmount = v.iva || 0
      return {
        'Número': v.numero,
        'Fecha': new Date(v.fecha).toLocaleDateString('es-ES'),
        'Cliente': `${v.cliente?.nombre || ''} ${v.cliente?.apellido || ''}`.trim() || 'Sin cliente',
        'Base Imponible': base.toFixed(2),
        'IVA': ivaAmount.toFixed(2),
        'Total': (v.total || 0).toFixed(2)
      }
    }) : [{
      'Número': '',
      'Fecha': '',
      'Cliente': 'No hay datos para el período seleccionado',
      'Base Imponible': '0.00',
      'IVA': '0.00',
      'Total': '0.00'
    }]

    // Preparar datos para Excel - COMPRAS
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
    }) : [{
      'Fecha': '',
      'Proveedor': '',
      'Concepto': 'No hay datos para el período seleccionado',
      'Base Imponible': '0.00',
      'IVA': '0.00',
      'Total': '0.00'
    }]

    // Calcular totales
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

    // Agregar totales solo si hay datos reales
    if (ventas.length > 0) {
      ventasData.push({
        'Número': '',
        'Fecha': '',
        'Cliente': 'TOTAL',
        'Base Imponible': totalVentasBase.toFixed(2),
        'IVA': totalVentasIVA.toFixed(2),
        'Total': totalVentasTotal.toFixed(2)
      })
    }

    if (compras.length > 0) {
      comprasData.push({
        'Fecha': '',
        'Proveedor': '',
        'Concepto': 'TOTAL',
        'Base Imponible': totalComprasBase.toFixed(2),
        'IVA': totalComprasIVA.toFixed(2),
        'Total': totalComprasTotal.toFixed(2)
      })
    }

    // Crear libro de Excel
    const workbook = XLSX.utils.book_new()

    // Hoja de Ventas
    const ventasSheet = XLSX.utils.json_to_sheet(ventasData)
    XLSX.utils.book_append_sheet(workbook, ventasSheet, 'Ventas (Facturas)')

    // Hoja de Compras
    const comprasSheet = XLSX.utils.json_to_sheet(comprasData)
    XLSX.utils.book_append_sheet(workbook, comprasSheet, 'Compras (Facturas)')

    // Hoja de Resumen
    const resumenData = [
      { 'Concepto': 'IVA REPERCUTIDO (Ventas)', 'Importe': totalVentasIVA.toFixed(2) },
      { 'Concepto': 'IVA SOPORTADO (Compras)', 'Importe': totalComprasIVA.toFixed(2) },
      { 'Concepto': '', 'Importe': '' },
      { 
        'Concepto': 'IVA A INGRESAR / DEVOLVER', 
        'Importe': (totalVentasIVA - totalComprasIVA).toFixed(2) 
      }
    ]
    const resumenSheet = XLSX.utils.json_to_sheet(resumenData)
    XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen IVA')

    // Hoja de Resumen Anual (Modelo 390) - solo en exportación ANUAL
    if (esAnual) {
      // Definición de los 4 trimestres
      const trimestresDef = [
        { label: '1T (Ene-Mar)', ini: 0, fin: 2 },
        { label: '2T (Abr-Jun)', ini: 3, fin: 5 },
        { label: '3T (Jul-Sep)', ini: 6, fin: 8 },
        { label: '4T (Oct-Dic)', ini: 9, fin: 11 },
      ]

      const resumenAnualData = trimestresDef.map((t) => {
        const tIni = new Date(anio, t.ini, 1)
        const tFin = new Date(anio, t.fin + 1, 0, 23, 59, 59)

        // Ventas del trimestre
        const ventasT = ventas.filter((v: any) => {
          const f = new Date(v.fecha)
          return f >= tIni && f <= tFin
        })
        const baseVentasT = ventasT.reduce((s: number, v: any) => s + (v.subtotal || 0), 0)
        const ivaVentasT = ventasT.reduce((s: number, v: any) => s + (v.iva || 0), 0)

        // Compras del trimestre
        const comprasT = compras.filter((c: any) => {
          const f = new Date(c.fecha)
          return f >= tIni && f <= tFin
        })
        const baseComprasT = comprasT.reduce((s: number, c: any) => {
          const rate = (c.iva || 0) / 100
          return s + ((c.importe || 0) / (1 + rate))
        }, 0)
        const ivaComprasT = comprasT.reduce((s: number, c: any) => {
          const rate = (c.iva || 0) / 100
          const base = (c.importe || 0) / (1 + rate)
          return s + ((c.importe || 0) - base)
        }, 0)

        return {
          'Trimestre': t.label,
          'Base Ventas': baseVentasT.toFixed(2),
          'IVA Repercutido': ivaVentasT.toFixed(2),
          'Base Compras': baseComprasT.toFixed(2),
          'IVA Soportado': ivaComprasT.toFixed(2),
          'Resultado (Rep. - Sop.)': (ivaVentasT - ivaComprasT).toFixed(2),
        }
      })

      // Fila de totales anuales
      resumenAnualData.push({
        'Trimestre': 'TOTAL AÑO',
        'Base Ventas': totalVentasBase.toFixed(2),
        'IVA Repercutido': totalVentasIVA.toFixed(2),
        'Base Compras': totalComprasBase.toFixed(2),
        'IVA Soportado': totalComprasIVA.toFixed(2),
        'Resultado (Rep. - Sop.)': (totalVentasIVA - totalComprasIVA).toFixed(2),
      })

      const resumenAnualSheet = XLSX.utils.json_to_sheet(resumenAnualData)
      XLSX.utils.book_append_sheet(workbook, resumenAnualSheet, 'Resumen Anual (Modelo 390)')
    }

    // Generar buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Enviar respuesta
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
