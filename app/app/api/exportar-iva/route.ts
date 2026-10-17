
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import * as XLSX from 'xlsx'
import { calcularModelo303, calcularModelo130 } from '@/lib/modelo-303'

export const dynamic = 'force-dynamic'

// Normaliza a MAYÚSCULAS cualquier texto que se escriba en el Excel
function up(v: any): string {
  return (v === null || v === undefined ? '' : String(v)).toUpperCase().trim()
}

// Extrae los datos fiscales reales de la factura (introducidos al convertir el ticket)
// con respaldo en los datos del cliente.
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
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const trimestre = searchParams.get('trimestre') || 'Q1'
    const anio = parseInt(searchParams.get('anio') || new Date().getFullYear().toString())
    const fechaDesdeParam = searchParams.get('fechaDesde')
    const fechaHastaParam = searchParams.get('fechaHasta')
    const esAnual = trimestre === 'ANUAL'
    const esPersonalizado = trimestre === 'PERSONALIZADO'

    // Calcular rango de fechas
    let startDate: Date
    let endDate: Date
    let etiquetaPeriodo = ''

    if (esPersonalizado) {
      if (!fechaDesdeParam || !fechaHastaParam) {
        return NextResponse.json({ error: 'Debe indicar fecha desde y fecha hasta' }, { status: 400 })
      }
      startDate = new Date(fechaDesdeParam + 'T00:00:00')
      endDate = new Date(fechaHastaParam + 'T23:59:59')
      etiquetaPeriodo = `${fechaDesdeParam} a ${fechaHastaParam}`
    } else {
      let startMonth = 0
      let endMonth = 2
      switch (trimestre) {
        case 'Q1': startMonth = 0; endMonth = 2; break
        case 'Q2': startMonth = 3; endMonth = 5; break
        case 'Q3': startMonth = 6; endMonth = 8; break
        case 'Q4': startMonth = 9; endMonth = 11; break
        case 'ANUAL': startMonth = 0; endMonth = 11; break
      }
      startDate = new Date(anio, startMonth, 1)
      endDate = new Date(anio, endMonth + 1, 0, 23, 59, 59)
      etiquetaPeriodo = `${trimestre} ${anio}`
    }

    console.log(`Exportando IVA para ${etiquetaPeriodo}`)
    console.log(`Rango de fechas: ${startDate.toISOString()} - ${endDate.toISOString()}`)

    // Obtener SOLO FACTURAS de ventas (no tickets)
    const ventas = await prisma.factura.findMany({
      where: {
        tipo: 'FACTURA',
        fecha: { gte: startDate, lte: endDate }
      },
      include: { cliente: true },
      orderBy: { fecha: 'asc' }
    })

    console.log(`Facturas encontradas: ${ventas.length}`)

    // Obtener SOLO FACTURAS de gastos (no tickets)
    const compras = await prisma.gasto.findMany({
      where: {
        tipo: 'FACTURA',
        fecha: { gte: startDate, lte: endDate }
      },
      orderBy: { fecha: 'asc' }
    })

    console.log(`Gastos (facturas) encontrados: ${compras.length}`)

    // ---- VENTAS (IVA REPERCUTIDO) ----
    const ventasData = ventas.length > 0 ? ventas.map((v: any) => {
      const base = v.subtotal || 0
      const ivaAmount = v.iva || 0
      const porcentajeIVA = base > 0 ? Math.round((ivaAmount / base) * 100) : 0
      const fiscal = getDatosFiscales(v)
      return {
        'Fecha': new Date(v.fecha).toLocaleDateString('es-ES'),
        'Nº Factura': up(v.numero),
        'Cliente / Razón Social': up(fiscal.nombre),
        'NIF / CIF / NIE': up(fiscal.nif) || 'SIN NIF',
        'Dirección': up(fiscal.direccion),
        'C.P.': up(fiscal.codigoPostal),
        'Municipio': up(fiscal.municipio),
        '% IVA': porcentajeIVA,
        'Base Imponible': Number(base.toFixed(2)),
        'Cuota IVA': Number(ivaAmount.toFixed(2)),
        'Total Factura': Number((v.total || 0).toFixed(2)),
      }
    }) : [{
      'Fecha': '', 'Nº Factura': '', 'Cliente / Razón Social': 'NO HAY DATOS PARA EL PERÍODO SELECCIONADO',
      'NIF / CIF / NIE': '', 'Dirección': '', 'C.P.': '', 'Municipio': '',
      '% IVA': '', 'Base Imponible': 0, 'Cuota IVA': 0, 'Total Factura': 0
    }]

    // ---- COMPRAS (IVA SOPORTADO) ----
    const comprasData = compras.length > 0 ? compras.map((c: any) => {
      const ivaRate = (c.iva || 0) / 100
      const base = (c.importe || 0) / (1 + ivaRate)
      const ivaAmount = (c.importe || 0) - base
      return {
        'Fecha': new Date(c.fecha).toLocaleDateString('es-ES'),
        'Nº Factura': up(c.numeroFactura),
        'Proveedor': up(c.proveedor) || 'SIN PROVEEDOR',
        'CIF / NIF': up(c.proveedorCIF) || 'SIN CIF',
        'Dirección': up(c.proveedorDireccion),
        'C.P.': up(c.proveedorCodigoPostal),
        'Municipio': up(c.proveedorCiudad),
        'Concepto': up(c.concepto),
        '% IVA': c.iva || 0,
        'Base Imponible': Number(base.toFixed(2)),
        'Cuota IVA': Number(ivaAmount.toFixed(2)),
        'Total Factura': Number((c.importe || 0).toFixed(2)),
      }
    }) : [{
      'Fecha': '', 'Nº Factura': '', 'Proveedor': 'NO HAY DATOS PARA EL PERÍODO SELECCIONADO',
      'CIF / NIF': '', 'Dirección': '', 'C.P.': '', 'Municipio': '', 'Concepto': '',
      '% IVA': '', 'Base Imponible': 0, 'Cuota IVA': 0, 'Total Factura': 0
    }]

    // ---- TOTALES ----
    const totalVentasBase = ventas.reduce((s: number, v: any) => s + (v.subtotal || 0), 0)
    const totalVentasIVA = ventas.reduce((s: number, v: any) => s + (v.iva || 0), 0)
    const totalVentasTotal = ventas.reduce((s: number, v: any) => s + (v.total || 0), 0)

    const totalComprasBase = compras.reduce((s: number, c: any) => {
      const rate = (c.iva || 0) / 100
      return s + ((c.importe || 0) / (1 + rate))
    }, 0)
    const totalComprasIVA = compras.reduce((s: number, c: any) => {
      const rate = (c.iva || 0) / 100
      const base = (c.importe || 0) / (1 + rate)
      return s + ((c.importe || 0) - base)
    }, 0)
    const totalComprasTotal = compras.reduce((s: number, c: any) => s + (c.importe || 0), 0)

    // ---- MODELO 303 (casillas oficiales) ----
    const formato = searchParams.get('formato') || ''
    const m303 = calcularModelo303(ventas, compras)

    // Si se piden las casillas en JSON (resumen en pantalla para la Sede)
    if (formato === 'json303') {
      let m130: any = null
      if (!esPersonalizado) {
        const inicioAnio = new Date(anio, 0, 1)
        const ventasAnio = await prisma.factura.findMany({
          where: { tipo: 'FACTURA', fecha: { gte: inicioAnio, lte: endDate } },
          select: { subtotal: true }
        })
        const gastosAnio = await prisma.gasto.findMany({
          where: { tipo: 'FACTURA', fecha: { gte: inicioAnio, lte: endDate } },
          select: { importe: true, iva: true }
        })
        const ingresosAcum = ventasAnio.reduce((s: number, v: any) => s + (v.subtotal || 0), 0)
        const gastosAcum = gastosAnio.reduce((s: number, g: any) => {
          const rate = (g.iva || 0) / 100
          return s + ((g.importe || 0) / (1 + rate))
        }, 0)
        m130 = calcularModelo130(ingresosAcum, gastosAcum)
      }
      return NextResponse.json({
        periodo: etiquetaPeriodo.toUpperCase(),
        numVentas: ventas.length,
        numCompras: compras.length,
        modelo303: m303,
        modelo130: m130,
      })
    }

    if (ventas.length > 0) {
      ventasData.push({
        'Fecha': '', 'Nº Factura': '', 'Cliente / Razón Social': 'TOTAL', 'NIF / CIF / NIE': '',
        'Dirección': '', 'C.P.': '', 'Municipio': '', '% IVA': '',
        'Base Imponible': Number(totalVentasBase.toFixed(2)),
        'Cuota IVA': Number(totalVentasIVA.toFixed(2)),
        'Total Factura': Number(totalVentasTotal.toFixed(2)),
      } as any)
    }
    if (compras.length > 0) {
      comprasData.push({
        'Fecha': '', 'Nº Factura': '', 'Proveedor': 'TOTAL', 'CIF / NIF': '',
        'Dirección': '', 'C.P.': '', 'Municipio': '', 'Concepto': '', '% IVA': '',
        'Base Imponible': Number(totalComprasBase.toFixed(2)),
        'Cuota IVA': Number(totalComprasIVA.toFixed(2)),
        'Total Factura': Number(totalComprasTotal.toFixed(2)),
      } as any)
    }

    // ---- LIBRO EXCEL ----
    const workbook = XLSX.utils.book_new()

    const ventasSheet = XLSX.utils.json_to_sheet(ventasData)
    ventasSheet['!cols'] = [
      { wch: 12 }, { wch: 16 }, { wch: 34 }, { wch: 16 }, { wch: 34 },
      { wch: 8 }, { wch: 20 }, { wch: 8 }, { wch: 15 }, { wch: 13 }, { wch: 14 }
    ]
    XLSX.utils.book_append_sheet(workbook, ventasSheet, 'Ventas Emitidas')

    const comprasSheet = XLSX.utils.json_to_sheet(comprasData)
    comprasSheet['!cols'] = [
      { wch: 12 }, { wch: 16 }, { wch: 28 }, { wch: 16 }, { wch: 34 },
      { wch: 8 }, { wch: 20 }, { wch: 34 }, { wch: 8 }, { wch: 15 }, { wch: 13 }, { wch: 14 }
    ]
    XLSX.utils.book_append_sheet(workbook, comprasSheet, 'Compras Recibidas')

    // Resumen IVA
    const resumenData = [
      { 'Concepto': 'PERÍODO', 'Importe': etiquetaPeriodo.toUpperCase() },
      { 'Concepto': 'Nº FACTURAS EMITIDAS', 'Importe': ventas.length },
      { 'Concepto': 'Nº FACTURAS RECIBIDAS', 'Importe': compras.length },
      { 'Concepto': '', 'Importe': '' },
      { 'Concepto': 'BASE IMPONIBLE VENTAS', 'Importe': Number(totalVentasBase.toFixed(2)) },
      { 'Concepto': 'IVA REPERCUTIDO (VENTAS)', 'Importe': Number(totalVentasIVA.toFixed(2)) },
      { 'Concepto': 'BASE IMPONIBLE COMPRAS', 'Importe': Number(totalComprasBase.toFixed(2)) },
      { 'Concepto': 'IVA SOPORTADO (COMPRAS)', 'Importe': Number(totalComprasIVA.toFixed(2)) },
      { 'Concepto': '', 'Importe': '' },
      { 'Concepto': 'IVA A INGRESAR / DEVOLVER', 'Importe': Number((totalVentasIVA - totalComprasIVA).toFixed(2)) }
    ]
    const resumenSheet = XLSX.utils.json_to_sheet(resumenData)
    resumenSheet['!cols'] = [{ wch: 30 }, { wch: 22 }]
    XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen IVA')

    // ---- HOJA MODELO 303 (casillas oficiales) ----
    const casillasData: any[] = [
      { 'Casilla': '', 'Concepto': 'IVA DEVENGADO (REPERCUTIDO)', 'Importe': '' },
      { 'Casilla': '01', 'Concepto': `BASE IMPONIBLE (TIPO ${m303.casilla02}%)`, 'Importe': m303.casilla01 },
      { 'Casilla': '02', 'Concepto': 'TIPO %', 'Importe': m303.casilla02 },
      { 'Casilla': '03', 'Concepto': 'CUOTA', 'Importe': m303.casilla03 },
    ]
    if (m303.casilla04 || m303.casilla06) {
      casillasData.push(
        { 'Casilla': '04', 'Concepto': `BASE IMPONIBLE (TIPO ${m303.casilla05}%)`, 'Importe': m303.casilla04 },
        { 'Casilla': '05', 'Concepto': 'TIPO %', 'Importe': m303.casilla05 },
        { 'Casilla': '06', 'Concepto': 'CUOTA', 'Importe': m303.casilla06 },
      )
    }
    if (m303.casilla07 || m303.casilla09) {
      casillasData.push(
        { 'Casilla': '07', 'Concepto': `BASE IMPONIBLE (TIPO ${m303.casilla08}%)`, 'Importe': m303.casilla07 },
        { 'Casilla': '08', 'Concepto': 'TIPO %', 'Importe': m303.casilla08 },
        { 'Casilla': '09', 'Concepto': 'CUOTA', 'Importe': m303.casilla09 },
      )
    }
    casillasData.push(
      { 'Casilla': '27', 'Concepto': 'TOTAL CUOTA DEVENGADA', 'Importe': m303.casilla27 },
      { 'Casilla': '', 'Concepto': '', 'Importe': '' },
      { 'Casilla': '', 'Concepto': 'IVA DEDUCIBLE (SOPORTADO)', 'Importe': '' },
      { 'Casilla': '28', 'Concepto': 'BASE OPERACIONES INTERIORES CORRIENTES', 'Importe': m303.casilla28 },
      { 'Casilla': '29', 'Concepto': 'CUOTA SOPORTADA DEDUCIBLE', 'Importe': m303.casilla29 },
      { 'Casilla': '45', 'Concepto': 'TOTAL A DEDUCIR', 'Importe': m303.casilla45 },
      { 'Casilla': '', 'Concepto': '', 'Importe': '' },
      { 'Casilla': '', 'Concepto': 'RESULTADO', 'Importe': '' },
      { 'Casilla': '46', 'Concepto': 'RESULTADO REGIMEN GENERAL (27 - 45)', 'Importe': m303.casilla46 },
      { 'Casilla': '64', 'Concepto': 'SUMA DE RESULTADOS', 'Importe': m303.casilla64 },
      { 'Casilla': '65', 'Concepto': '% ATRIBUIBLE A LA ADMINISTRACION DEL ESTADO', 'Importe': m303.casilla65 },
      { 'Casilla': '66', 'Concepto': 'RESULTADO', 'Importe': m303.casilla66 },
      { 'Casilla': '67', 'Concepto': 'CUOTAS A COMPENSAR DE PERIODOS ANTERIORES (RELLENAR A MANO)', 'Importe': '' },
      { 'Casilla': '71', 'Concepto': 'RESULTADO DE LA AUTOLIQUIDACION', 'Importe': m303.casilla71 },
    )
    const casillasSheet = XLSX.utils.json_to_sheet(casillasData)
    casillasSheet['!cols'] = [{ wch: 10 }, { wch: 52 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(workbook, casillasSheet, 'Modelo 303')

    // Resumen Anual (Modelo 390) - solo en exportación ANUAL
    if (esAnual) {
      const trimestresDef = [
        { label: '1T (Ene-Mar)', ini: 0, fin: 2 },
        { label: '2T (Abr-Jun)', ini: 3, fin: 5 },
        { label: '3T (Jul-Sep)', ini: 6, fin: 8 },
        { label: '4T (Oct-Dic)', ini: 9, fin: 11 },
      ]
      const resumenAnualData = trimestresDef.map((t) => {
        const tIni = new Date(anio, t.ini, 1)
        const tFin = new Date(anio, t.fin + 1, 0, 23, 59, 59)
        const ventasT = ventas.filter((v: any) => { const f = new Date(v.fecha); return f >= tIni && f <= tFin })
        const baseVentasT = ventasT.reduce((s: number, v: any) => s + (v.subtotal || 0), 0)
        const ivaVentasT = ventasT.reduce((s: number, v: any) => s + (v.iva || 0), 0)
        const comprasT = compras.filter((c: any) => { const f = new Date(c.fecha); return f >= tIni && f <= tFin })
        const baseComprasT = comprasT.reduce((s: number, c: any) => { const rate = (c.iva || 0) / 100; return s + ((c.importe || 0) / (1 + rate)) }, 0)
        const ivaComprasT = comprasT.reduce((s: number, c: any) => { const rate = (c.iva || 0) / 100; const base = (c.importe || 0) / (1 + rate); return s + ((c.importe || 0) - base) }, 0)
        return {
          'Trimestre': t.label,
          'Base Ventas': Number(baseVentasT.toFixed(2)),
          'IVA Repercutido': Number(ivaVentasT.toFixed(2)),
          'Base Compras': Number(baseComprasT.toFixed(2)),
          'IVA Soportado': Number(ivaComprasT.toFixed(2)),
          'Resultado (Rep. - Sop.)': Number((ivaVentasT - ivaComprasT).toFixed(2)),
        }
      })
      resumenAnualData.push({
        'Trimestre': 'TOTAL AÑO',
        'Base Ventas': Number(totalVentasBase.toFixed(2)),
        'IVA Repercutido': Number(totalVentasIVA.toFixed(2)),
        'Base Compras': Number(totalComprasBase.toFixed(2)),
        'IVA Soportado': Number(totalComprasIVA.toFixed(2)),
        'Resultado (Rep. - Sop.)': Number((totalVentasIVA - totalComprasIVA).toFixed(2)),
      })
      const resumenAnualSheet = XLSX.utils.json_to_sheet(resumenAnualData)
      resumenAnualSheet['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 22 }]
      XLSX.utils.book_append_sheet(workbook, resumenAnualSheet, 'Resumen Anual (Modelo 390)')
    }

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    const nombreArchivo = esPersonalizado
      ? `IVA_${(fechaDesdeParam || '').replace(/-/g, '')}_${(fechaHastaParam || '').replace(/-/g, '')}_ServyAuto.xlsx`
      : `IVA_${trimestre}_${anio}_ServyAuto.xlsx`

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=${nombreArchivo}`
      }
    })
  } catch (error) {
    console.error('Error exporting IVA:', error)
    return NextResponse.json({ error: 'Error al exportar IVA' }, { status: 500 })
  }
}
