import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type TipoReporte = 'diario' | 'semanal' | 'mensual' | 'anual'

interface RangoFechas {
  inicio: Date
  fin: Date
  titulo: string
  notifId: string | undefined
}

function getRangoFechas(tipo: TipoReporte): RangoFechas {
  const ahora = new Date()
  // Usar hora de España - simplificado: tomamos hoy
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())

  switch (tipo) {
    case 'diario': {
      // Reporte del día que termina (hoy completo)
      const inicio = new Date(hoy)
      const fin = new Date(hoy)
      fin.setHours(23, 59, 59, 999)
      return {
        inicio,
        fin,
        titulo: `Reporte Diario - ${inicio.toLocaleDateString('es-ES')}`,
        notifId: process.env.NOTIF_ID_REPORTE_DIARIO,
      }
    }
    case 'semanal': {
      // Reporte de la semana anterior (lunes-domingo)
      const diaSemana = hoy.getDay() // 0=dom, 1=lun, ..., 6=sab
      const diasAtrasALunesAnterior = diaSemana === 0 ? 7 : diaSemana + 6
      const lunesAnterior = new Date(hoy)
      lunesAnterior.setDate(hoy.getDate() - diasAtrasALunesAnterior)
      const domingoAnterior = new Date(lunesAnterior)
      domingoAnterior.setDate(lunesAnterior.getDate() + 6)
      domingoAnterior.setHours(23, 59, 59, 999)
      return {
        inicio: lunesAnterior,
        fin: domingoAnterior,
        titulo: `Reporte Semanal - del ${lunesAnterior.toLocaleDateString('es-ES')} al ${domingoAnterior.toLocaleDateString('es-ES')}`,
        notifId: process.env.NOTIF_ID_REPORTE_SEMANAL,
      }
    }
    case 'mensual': {
      // Reporte del mes anterior completo
      const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
      const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59, 999)
      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      return {
        inicio: inicioMesAnterior,
        fin: finMesAnterior,
        titulo: `Reporte Mensual - ${meses[inicioMesAnterior.getMonth()]} ${inicioMesAnterior.getFullYear()}`,
        notifId: process.env.NOTIF_ID_REPORTE_MENSUAL,
      }
    }
    case 'anual': {
      // Reporte del año anterior completo
      const anioAnterior = hoy.getFullYear() - 1
      const inicioAnio = new Date(anioAnterior, 0, 1)
      const finAnio = new Date(anioAnterior, 11, 31, 23, 59, 59, 999)
      return {
        inicio: inicioAnio,
        fin: finAnio,
        titulo: `Reporte Anual - Año ${anioAnterior}`,
        notifId: process.env.NOTIF_ID_REPORTE_ANUAL,
      }
    }
  }
}

function formatEUR(n: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0)
}

async function generarContenidoReporte(tipo: TipoReporte, rango: RangoFechas) {
  const { inicio, fin } = rango

  // Obtener todos los locales
  const locales = await prisma.local.findMany({
    where: { activo: true },
    orderBy: { nombre: 'asc' },
  })

  interface DatosLocal {
    id: string
    nombre: string
    citasCompletadas: number
    citasPendientes: number
    citasTotal: number
    facturas: number
    tickets: number
    ingresosEfectivo: number
    ingresosSumup: number
    ingresosUnicaja: number
    ingresosTotal: number
    gastos: number
    beneficio: number
  }

  const datosPorLocal: DatosLocal[] = []
  let totalGeneral = {
    citasCompletadas: 0,
    citasPendientes: 0,
    citasTotal: 0,
    facturas: 0,
    tickets: 0,
    ingresosEfectivo: 0,
    ingresosSumup: 0,
    ingresosUnicaja: 0,
    ingresosTotal: 0,
    gastos: 0,
    beneficio: 0,
  }

  for (const local of locales) {
    // Citas en el rango
    const citas = await prisma.cita.findMany({
      where: {
        localId: local.id,
        fecha: { gte: inicio, lte: fin },
      },
      select: { estado: true },
    })
    const citasCompletadas = citas.filter((c) => c.estado === 'COMPLETADA').length
    const citasPendientes = citas.filter((c) => c.estado !== 'COMPLETADA' && c.estado !== 'CANCELADA').length

    // Facturas/Tickets en el rango
    const facturas = await prisma.factura.findMany({
      where: {
        localId: local.id,
        fecha: { gte: inicio, lte: fin },
      },
      select: { tipo: true, total: true, metodoPago: true, estado: true },
    })
    const numFacturas = facturas.filter((f) => f.tipo === 'FACTURA').length
    const numTickets = facturas.filter((f) => f.tipo === 'TICKET').length

    // Ingresos solo de los pagados (PAGADA)
    const pagadas = facturas.filter((f) => f.estado === 'PAGADA')
    const ingresosEfectivo = pagadas
      .filter((f) => f.metodoPago === 'EFECTIVO')
      .reduce((sum, f) => sum + (f.total || 0), 0)
    const ingresosSumup = pagadas
      .filter((f) => f.metodoPago === 'TPV_SUMUP')
      .reduce((sum, f) => sum + (f.total || 0), 0)
    const ingresosUnicaja = pagadas
      .filter((f) => f.metodoPago === 'TPV_UNICAJA')
      .reduce((sum, f) => sum + (f.total || 0), 0)
    const ingresosTotal = ingresosEfectivo + ingresosSumup + ingresosUnicaja

    // Gastos en el rango
    const gastosData = await prisma.gasto.findMany({
      where: {
        localId: local.id,
        fecha: { gte: inicio, lte: fin },
      },
      select: { importe: true },
    })
    const gastos = gastosData.reduce((sum, g) => sum + (g.importe || 0), 0)

    const datosLocal: DatosLocal = {
      id: local.id,
      nombre: local.nombre,
      citasCompletadas,
      citasPendientes,
      citasTotal: citas.length,
      facturas: numFacturas,
      tickets: numTickets,
      ingresosEfectivo,
      ingresosSumup,
      ingresosUnicaja,
      ingresosTotal,
      gastos,
      beneficio: ingresosTotal - gastos,
    }

    datosPorLocal.push(datosLocal)
    totalGeneral.citasCompletadas += datosLocal.citasCompletadas
    totalGeneral.citasPendientes += datosLocal.citasPendientes
    totalGeneral.citasTotal += datosLocal.citasTotal
    totalGeneral.facturas += datosLocal.facturas
    totalGeneral.tickets += datosLocal.tickets
    totalGeneral.ingresosEfectivo += datosLocal.ingresosEfectivo
    totalGeneral.ingresosSumup += datosLocal.ingresosSumup
    totalGeneral.ingresosUnicaja += datosLocal.ingresosUnicaja
    totalGeneral.ingresosTotal += datosLocal.ingresosTotal
    totalGeneral.gastos += datosLocal.gastos
    totalGeneral.beneficio += datosLocal.beneficio
  }

  return { datosPorLocal, totalGeneral }
}

function generarHTMLReporte(titulo: string, datosPorLocal: any[], totalGeneral: any): string {
  const filasLocales = datosPorLocal
    .map(
      (l) => `
    <tr>
      <td style="padding:10px; border:1px solid #ddd; font-weight:600;">${l.nombre.replace('SERVYAUTO ', '')}</td>
      <td style="padding:10px; border:1px solid #ddd; text-align:center;">${l.citasCompletadas}</td>
      <td style="padding:10px; border:1px solid #ddd; text-align:center;">${l.facturas + l.tickets}</td>
      <td style="padding:10px; border:1px solid #ddd; text-align:right;">${formatEUR(l.ingresosEfectivo)}</td>
      <td style="padding:10px; border:1px solid #ddd; text-align:right;">${formatEUR(l.ingresosSumup)}</td>
      <td style="padding:10px; border:1px solid #ddd; text-align:right;">${formatEUR(l.ingresosUnicaja)}</td>
      <td style="padding:10px; border:1px solid #ddd; text-align:right; font-weight:700; color:#2a7a2a;">${formatEUR(l.ingresosTotal)}</td>
      <td style="padding:10px; border:1px solid #ddd; text-align:right; color:#c43a3a;">${formatEUR(l.gastos)}</td>
      <td style="padding:10px; border:1px solid #ddd; text-align:right; font-weight:700; color:${l.beneficio >= 0 ? '#2a7a2a' : '#c43a3a'};">${formatEUR(l.beneficio)}</td>
    </tr>
  `
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background:#f5f5f5; padding:20px; margin:0;">
  <div style="max-width:900px; margin:0 auto; background:white; padding:30px; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
    <div style="border-bottom:3px solid #E67E22; padding-bottom:15px; margin-bottom:25px;">
      <h1 style="color:#E67E22; margin:0; font-size:24px;">📊 ServyAuto</h1>
      <h2 style="color:#333; margin:8px 0 0 0; font-size:18px; font-weight:normal;">${titulo}</h2>
    </div>

    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:15px; margin-bottom:25px;">
      <div style="background:#fff3e0; padding:15px; border-radius:6px; border-left:4px solid #E67E22;">
        <div style="color:#666; font-size:12px; text-transform:uppercase;">Citas Completadas</div>
        <div style="color:#E67E22; font-size:28px; font-weight:700; margin-top:5px;">${totalGeneral.citasCompletadas}</div>
      </div>
      <div style="background:#e8f5e9; padding:15px; border-radius:6px; border-left:4px solid #2a7a2a;">
        <div style="color:#666; font-size:12px; text-transform:uppercase;">Ingresos Totales</div>
        <div style="color:#2a7a2a; font-size:28px; font-weight:700; margin-top:5px;">${formatEUR(totalGeneral.ingresosTotal)}</div>
      </div>
      <div style="background:${totalGeneral.beneficio >= 0 ? '#e8f5e9' : '#ffebee'}; padding:15px; border-radius:6px; border-left:4px solid ${totalGeneral.beneficio >= 0 ? '#2a7a2a' : '#c43a3a'};">
        <div style="color:#666; font-size:12px; text-transform:uppercase;">Beneficio Neto</div>
        <div style="color:${totalGeneral.beneficio >= 0 ? '#2a7a2a' : '#c43a3a'}; font-size:28px; font-weight:700; margin-top:5px;">${formatEUR(totalGeneral.beneficio)}</div>
      </div>
    </div>

    <h3 style="color:#333; margin-top:30px;">Desglose por Local</h3>
    <table style="width:100%; border-collapse:collapse; margin-top:15px; font-size:13px;">
      <thead>
        <tr style="background:#E67E22; color:white;">
          <th style="padding:12px 10px; text-align:left;">Local</th>
          <th style="padding:12px 10px;">Citas</th>
          <th style="padding:12px 10px;">Docs</th>
          <th style="padding:12px 10px; text-align:right;">Efectivo</th>
          <th style="padding:12px 10px; text-align:right;">SumUp</th>
          <th style="padding:12px 10px; text-align:right;">Unicaja</th>
          <th style="padding:12px 10px; text-align:right;">Total</th>
          <th style="padding:12px 10px; text-align:right;">Gastos</th>
          <th style="padding:12px 10px; text-align:right;">Beneficio</th>
        </tr>
      </thead>
      <tbody>
        ${filasLocales}
        <tr style="background:#f5f5f5; font-weight:700;">
          <td style="padding:10px; border:1px solid #ddd;">TOTAL</td>
          <td style="padding:10px; border:1px solid #ddd; text-align:center;">${totalGeneral.citasCompletadas}</td>
          <td style="padding:10px; border:1px solid #ddd; text-align:center;">${totalGeneral.facturas + totalGeneral.tickets}</td>
          <td style="padding:10px; border:1px solid #ddd; text-align:right;">${formatEUR(totalGeneral.ingresosEfectivo)}</td>
          <td style="padding:10px; border:1px solid #ddd; text-align:right;">${formatEUR(totalGeneral.ingresosSumup)}</td>
          <td style="padding:10px; border:1px solid #ddd; text-align:right;">${formatEUR(totalGeneral.ingresosUnicaja)}</td>
          <td style="padding:10px; border:1px solid #ddd; text-align:right; color:#2a7a2a;">${formatEUR(totalGeneral.ingresosTotal)}</td>
          <td style="padding:10px; border:1px solid #ddd; text-align:right; color:#c43a3a;">${formatEUR(totalGeneral.gastos)}</td>
          <td style="padding:10px; border:1px solid #ddd; text-align:right; color:${totalGeneral.beneficio >= 0 ? '#2a7a2a' : '#c43a3a'};">${formatEUR(totalGeneral.beneficio)}</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top:30px; padding-top:20px; border-top:1px solid #eee; color:#888; font-size:12px; text-align:center;">
      Reporte generado automáticamente por ServyAuto Manager<br>
      ${new Date().toLocaleString('es-ES')}
    </div>
  </div>
</body>
</html>`
}

async function enviarEmailReporte(
  destinatarios: string[],
  subject: string,
  htmlBody: string,
  notifId: string | undefined
): Promise<{ success: boolean; message?: string; sentTo: string[] }> {
  if (!notifId) {
    return { success: false, message: 'NOTIF_ID no configurado', sentTo: [] }
  }

  const appUrl = process.env.NEXTAUTH_URL || 'https://app.servyauto.com'
  const appHost = new URL(appUrl).hostname

  const sent: string[] = []
  for (const email of destinatarios) {
    try {
      const res = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deployment_token: process.env.ABACUSAI_API_KEY,
          app_id: process.env.WEB_APP_ID,
          notification_id: notifId,
          subject,
          body: htmlBody,
          is_html: true,
          recipient_email: email,
          sender_email: `noreply@${appHost}`,
          sender_alias: 'ServyAuto',
        }),
      })
      const result = await res.json()
      if (result.success) {
        sent.push(email)
      } else {
        console.error(`Error enviando a ${email}:`, result.message || result)
      }
    } catch (err) {
      console.error(`Excepción enviando a ${email}:`, err)
    }
  }

  return { success: sent.length > 0, sentTo: sent }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { tipo: string } }
) {
  return await handleReporte(request, params)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { tipo: string } }
) {
  return await handleReporte(request, params)
}

async function handleReporte(
  request: NextRequest,
  params: { tipo: string }
) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token || token !== process.env.ABACUSAI_API_KEY) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const tipo = params.tipo as TipoReporte
    if (!['diario', 'semanal', 'mensual', 'anual'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
    }

    // Leer config
    const configs = await prisma.configuracion.findMany({
      where: { clave: { startsWith: 'reportes.' } },
    })
    const config: Record<string, any> = {}
    for (const c of configs) {
      const key = c.clave.replace('reportes.', '')
      config[key] = c.tipo === 'BOOLEANO' ? c.valor === 'true' : c.valor
    }

    // Verificar si el reporte está activo
    const activoKey = `reporte${tipo.charAt(0).toUpperCase() + tipo.slice(1)}Activo`
    if (config[activoKey] === false) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `Reporte ${tipo} desactivado`,
      })
    }

    // Destinatarios
    const emailDestinatarios = config.emailDestinatarios || 'info@servyauto.com'
    const destinatarios = emailDestinatarios
      .split(',')
      .map((e: string) => e.trim())
      .filter(Boolean)

    if (destinatarios.length === 0) {
      return NextResponse.json({ error: 'No hay destinatarios' }, { status: 400 })
    }

    const rango = getRangoFechas(tipo)
    const { datosPorLocal, totalGeneral } = await generarContenidoReporte(tipo, rango)
    const htmlBody = generarHTMLReporte(rango.titulo, datosPorLocal, totalGeneral)

    const result = await enviarEmailReporte(
      destinatarios,
      `📊 ${rango.titulo} - ServyAuto`,
      htmlBody,
      rango.notifId
    )

    return NextResponse.json({
      success: result.success,
      tipo,
      titulo: rango.titulo,
      destinatarios: result.sentTo,
      totalGeneral,
      message: result.message,
    })
  } catch (error: any) {
    console.error('Error generando reporte:', error)
    return NextResponse.json(
      { error: 'Error generando reporte', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
