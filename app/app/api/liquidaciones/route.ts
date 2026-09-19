export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/liquidaciones?localId=xxx&desde=2026-09-01&hasta=2026-09-07
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const user = session.user as { role?: string };
    if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const localId = searchParams.get("localId");
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");

    if (!desde || !hasta) {
      return NextResponse.json({ error: "desde y hasta son obligatorios" }, { status: 400 });
    }

    const fechaDesde = new Date(desde);
    fechaDesde.setHours(0, 0, 0, 0);
    const fechaHasta = new Date(hasta);
    fechaHasta.setHours(23, 59, 59, 999);

    // 1. Colaboradores (del local, o de todos si no se especifica)
    const colaboradores = await prisma.colaborador.findMany({
      where: { activo: true, ...(localId ? { localId } : {}) },
      orderBy: { nombre: "asc" },
    });

    // 2. Citas completadas en el período (del local, o de todos)
    const citas = await prisma.cita.findMany({
      where: {
        ...(localId ? { localId } : {}),
        estado: "COMPLETADA",
        fecha: { gte: fechaDesde, lte: fechaHasta },
      },
      select: {
        id: true,
        total: true,
        fecha: true,
        localId: true,
        prescriptorId: true,
        realizadoPorId: true,
        cliente: { select: { nombre: true, apellido: true } },
        vehiculo: { select: { marca: true, modelo: true, matricula: true } },
        cita_servicios: { include: { servicios: { select: { nombre: true } } } },
      },
    });

    // 3. Gastos en el período (del local, o de todos)
    const gastos = await prisma.gasto.findMany({
      where: {
        ...(localId ? { localId } : {}),
        fecha: { gte: fechaDesde, lte: fechaHasta },
      },
      select: {
        id: true,
        concepto: true,
        importe: true,
        fecha: true,
        localId: true,
        colaboradorId: true,
      },
    });

    // 4. Calcular totales
    const ingresosTotales = citas.reduce((sum, c) => sum + (c.total || 0), 0);

    // Gastos generales (sin colaborador asignado)
    const gastosGenerales = gastos
      .filter(g => !g.colaboradorId)
      .reduce((sum, g) => sum + g.importe, 0);

    // Gastos totales
    const gastosTotales = gastos.reduce((sum, g) => sum + g.importe, 0);

    // Mapas por local (para responsables cuando se agregan varios locales)
    const ingresosPorLocal: Record<string, number> = {};
    citas.forEach(c => { const k = c.localId || ''; ingresosPorLocal[k] = (ingresosPorLocal[k] || 0) + (c.total || 0); });
    const gastosGeneralesPorLocal: Record<string, number> = {};
    gastos.filter(g => !g.colaboradorId).forEach(g => { const k = g.localId || ''; gastosGeneralesPorLocal[k] = (gastosGeneralesPorLocal[k] || 0) + g.importe; });

    // 5. Liquidación por colaborador
    const liquidaciones = colaboradores.map(col => {
      // Gastos atribuidos a este colaborador
      const gastosColaborador = gastos
        .filter(g => g.colaboradorId === col.id)
        .reduce((sum, g) => sum + g.importe, 0);

      const gastosColaboradorDetalle = gastos.filter(g => g.colaboradorId === col.id);

      let baseCalculo = 0;
      let comision = 0;
      let citasRelacionadas: typeof citas = [];

      if (col.rol === "RESPONSABLE") {
        // Responsable: comisión sobre el neto de SU local (ingresos - gastos generales del local)
        const ingLocal = ingresosPorLocal[col.localId || ''] || 0;
        const gastoGenLocal = gastosGeneralesPorLocal[col.localId || ''] || 0;
        baseCalculo = ingLocal - gastoGenLocal;
        comision = (baseCalculo * col.comisionPct) / 100;
        // Descontar gastos atribuidos al responsable
        comision -= gastosColaborador;
        citasRelacionadas = citas.filter(c => c.localId === col.localId); // Citas de su local
      } else if (col.rol === "PRESCRIPTOR") {
        // Prescriptor: comisión sobre el bruto de citas que prescribió
        citasRelacionadas = citas.filter(c => c.prescriptorId === col.id);
        baseCalculo = citasRelacionadas.reduce((sum, c) => sum + (c.total || 0), 0);
        comision = (baseCalculo * col.comisionPct) / 100;
        // Descontar gastos atribuidos al prescriptor
        comision -= gastosColaborador;
      } else {
        // Operario: comisión sobre el bruto de citas que realizó
        citasRelacionadas = citas.filter(c => c.realizadoPorId === col.id);
        baseCalculo = citasRelacionadas.reduce((sum, c) => sum + (c.total || 0), 0);
        comision = (baseCalculo * col.comisionPct) / 100;
        comision -= gastosColaborador;
      }

      return {
        colaborador: {
          id: col.id,
          nombre: col.nombre,
          rol: col.rol,
          comisionPct: col.comisionPct,
          telefono: col.telefono,
          email: col.email,
        },
        baseCalculo: Math.round(baseCalculo * 100) / 100,
        comisionBruta: Math.round((baseCalculo * col.comisionPct / 100) * 100) / 100,
        gastosAtribuidos: Math.round(gastosColaborador * 100) / 100,
        gastosDetalle: gastosColaboradorDetalle.map(g => ({
          id: g.id,
          concepto: g.concepto,
          importe: g.importe,
          fecha: g.fecha,
        })),
        comisionNeta: Math.round(comision * 100) / 100,
        numCitas: citasRelacionadas.length,
        citas: citasRelacionadas.map(c => ({
          id: c.id,
          fecha: c.fecha,
          total: c.total,
          cliente: c.cliente ? `${c.cliente.nombre} ${c.cliente.apellido || ''}`.trim() : 'Sin cliente',
          vehiculo: c.vehiculo ? `${c.vehiculo.marca} ${c.vehiculo.modelo} (${c.vehiculo.matricula})` : '',
          servicios: c.cita_servicios?.map(cs => cs.servicios?.nombre || '').filter(Boolean).join(', ') || '',
        })),
      };
    });

    // 6. Resultado del propietario
    const totalComisiones = liquidaciones.reduce((sum, l) => sum + Math.max(0, l.comisionNeta), 0);
    const resultadoPropietario = ingresosTotales - gastosTotales - totalComisiones;

    return NextResponse.json({
      periodo: { desde: fechaDesde, hasta: fechaHasta },
      resumen: {
        ingresosTotales: Math.round(ingresosTotales * 100) / 100,
        gastosTotales: Math.round(gastosTotales * 100) / 100,
        gastosGenerales: Math.round(gastosGenerales * 100) / 100,
        totalComisiones: Math.round(totalComisiones * 100) / 100,
        resultadoPropietario: Math.round(resultadoPropietario * 100) / 100,
        numCitas: citas.length,
      },
      liquidaciones,
    });
  } catch (error: unknown) {
    console.error("Error en liquidaciones:", error);
    return NextResponse.json({ error: "Error al calcular liquidaciones" }, { status: 500 });
  }
}
