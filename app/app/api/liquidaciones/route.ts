import { facturasPorLocal, partesFactura } from '@/lib/factura-local'
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { repartoIgualitario, PARTES_REPARTO } from '@/lib/reparto-local';

// POST /api/liquidaciones — actualizar configuración (propietarioPct)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const user = session.user as { role?: string };
    if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }
    const body = await req.json();
    let actualizado = false;
    const respuesta: Record<string, unknown> = { ok: true };
    if (body.propietarioPct !== undefined) {
      const pct = Math.max(0, Math.min(100, parseFloat(body.propietarioPct) || 0));
      await prisma.configuracion.upsert({
        where: { clave: 'liquidaciones.propietarioPct' },
        update: { valor: String(pct) },
        create: {
          clave: 'liquidaciones.propietarioPct',
          valor: String(pct),
          tipo: 'NUMERO',
          categoria: 'liquidaciones',
          descripcion: 'Porcentaje del propietario sobre el neto del local',
        },
      });
      respuesta.propietarioPct = pct;
      actualizado = true;
    }
    if (body.numPartesIguales !== undefined) {
      const partes = Math.max(2, Math.min(10, Math.round(parseFloat(body.numPartesIguales) || 3)));
      await prisma.configuracion.upsert({
        where: { clave: 'liquidaciones.numPartesIguales' },
        update: { valor: String(partes) },
        create: {
          clave: 'liquidaciones.numPartesIguales',
          valor: String(partes),
          tipo: 'NUMERO',
          categoria: 'liquidaciones',
          descripcion: 'Número de partes iguales para el reparto del neto (Modelo B)',
        },
      });
      respuesta.numPartesIguales = partes;
      actualizado = true;
    }
    if (!actualizado) {
      return NextResponse.json({ error: "No hay datos para actualizar" }, { status: 400 });
    }
    return NextResponse.json(respuesta);
  } catch (error: unknown) {
    console.error("Error actualizando config liquidaciones:", error);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}

// GET /api/liquidaciones?localId=xxx&desde=2026-09-01&hasta=2026-09-07
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const user = session.user as { id?: string; role?: string };
    const allowedRoles = ["SUPER_ADMIN", "ADMIN", "OPERADOR"];
    if (!allowedRoles.includes(user.role || '')) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    // Si es OPERADOR, buscar su colaborador vinculado
    let colaboradorIdUsuario: string | null = null;
    if (user.role === "OPERADOR" && user.id) {
      const miColaborador = await prisma.colaborador.findFirst({
        where: { userId: user.id, activo: true },
        select: { id: true },
      });
      if (!miColaborador) {
        return NextResponse.json({ error: "TU USUARIO NO ESTÁ VINCULADO A NINGÚN AUTÓNOMO. CONTACTA AL ADMINISTRADOR." }, { status: 403 });
      }
      colaboradorIdUsuario = miColaborador.id;
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
    // IMPORTANTE: se excluyen las citas que ya están dentro de una FACTURA
    // AGRUPADA (facturaAgrupadaId != null). Esas no se reparten por la cita;
    // se reparten cuando la factura agrupada se cobra (ver bloque 2b). Así se
    // evita el doble conteo.
    const citas = await prisma.cita.findMany({
      where: {
        ...(localId ? { localId } : {}),
        estado: "COMPLETADA",
        facturaAgrupadaId: null,
        cobroDiferido: false,
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

    // 2b. Facturas AGRUPADAS ya COBRADAS (PAGADA) en el período.
    // Cuando una factura agrupada se cobra, su importe pasa a estar disponible
    // para el reparto habitual ÷3. Sus citas llevan facturaAgrupadaId y se
    // excluyen del bloque 2 anterior, así que sumar la factura NO produce doble
    // conteo. Se usa la fecha real de cobro (fechaPago) y, si faltara, la fecha
    // de la factura, para que entre en el período en que realmente se cobró.
    const idsAgrupadas = (await prisma.cita.findMany({
      where: { facturaAgrupadaId: { not: null } },
      select: { facturaAgrupadaId: true },
      distinct: ['facturaAgrupadaId'],
    })).map(c => c.facturaAgrupadaId as string).filter(Boolean);

    let facturasAgrupadasCobradas: Array<{ id: string; numero: string; total: number; localId: string | null; fecha: Date; fechaPago: Date | null }> = [];
    if (idsAgrupadas.length > 0) {
      const facturasAgr = await facturasPorLocal.findMany({
        where: {
          id: { in: idsAgrupadas },
          estado: 'PAGADA',
          ...(localId ? { localId } : {}),
        },
        select: { id: true, numero: true, total: true, localId: true, fecha: true, fechaPago: true },
      }, true);
      facturasAgrupadasCobradas = facturasAgr.flatMap(partesFactura).filter(f => {
        const ref = f.fechaPago || f.fecha;
        return (!localId || f.localId === localId) && ref >= fechaDesde && ref <= fechaHasta;
      });
    }
    const ingresosFacturasAgrupadas = facturasAgrupadasCobradas.reduce((s, f) => s + (f.total || 0), 0);

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

    // 4. Calcular totales (citas completadas + facturas agrupadas cobradas)
    const ingresosTotales = citas.reduce((sum, c) => sum + (c.total || 0), 0) + ingresosFacturasAgrupadas;

    // Gastos generales (sin colaborador asignado)
    const gastosGenerales = gastos
      .filter(g => !g.colaboradorId)
      .reduce((sum, g) => sum + g.importe, 0);

    // Gastos totales
    const gastosTotales = gastos.reduce((sum, g) => sum + g.importe, 0);

    // Mapas por local (para responsables cuando se agregan varios locales)
    const ingresosPorLocal: Record<string, number> = {};
    citas.forEach(c => { const k = c.localId || ''; ingresosPorLocal[k] = (ingresosPorLocal[k] || 0) + (c.total || 0); });
    facturasAgrupadasCobradas.forEach(f => { const k = f.localId || ''; ingresosPorLocal[k] = (ingresosPorLocal[k] || 0) + (f.total || 0); });
    const gastosGeneralesPorLocal: Record<string, number> = {};
    gastos.filter(g => !g.colaboradorId).forEach(g => { const k = g.localId || ''; gastosGeneralesPorLocal[k] = (gastosGeneralesPorLocal[k] || 0) + g.importe; });

    const gastosPorLocal: Record<string, number> = {};
    gastos.forEach(g => { const k = g.localId || ''; gastosPorLocal[k] = (gastosPorLocal[k] || 0) + g.importe; });
    const round2 = (n: number) => Math.round(n * 100) / 100;

    // 4b. Préstamos / inversiones SALIENTES pendientes de devolver.
    // Ese dinero NO está físicamente en la caja (está invertido en otro local),
    // así que NO se puede repartir hoy, aunque sigue siendo beneficio ganado y
    // recuperable en el futuro. Se descuenta del importe repartible, no del neto.
    const transferenciasSalientes = await prisma.transferenciaCaja.findMany({
      where: {
        ...(localId ? { origenLocalId: localId } : {}),
        estado: 'PENDIENTE',
        fecha: { gte: fechaDesde, lte: fechaHasta },
      },
      select: { origenLocalId: true, destinoLocalId: true, importe: true, concepto: true, fecha: true, tipo: true },
    });
    const prestamosFueraPorLocal: Record<string, number> = {};
    transferenciasSalientes.forEach(t => { prestamosFueraPorLocal[t.origenLocalId] = (prestamosFueraPorLocal[t.origenLocalId] || 0) + t.importe; });
    const prestamosFueraTotal = transferenciasSalientes.reduce((s, t) => s + t.importe, 0);

    const citaResumen = (c: (typeof citas)[number]) => ({
      id: c.id,
      fecha: c.fecha,
      total: c.total,
      cliente: c.cliente ? `${c.cliente.nombre} ${c.cliente.apellido || ''}`.trim() : 'Sin cliente',
      vehiculo: c.vehiculo ? `${c.vehiculo.marca} ${c.vehiculo.modelo} (${c.vehiculo.matricula})` : '',
      servicios: c.cita_servicios?.map(cs => cs.servicios?.nombre || '').filter(Boolean).join(', ') || '',
    });

    // 5. Liquidación por colaborador — COMISIÓN POR ACCIÓN
    // Un colaborador cobra por CADA acción que realiza sobre una cita:
    //   - Prescriptor: % sobre el bruto de las citas que prescribió (prescriptorId)
    //   - Operario:    % sobre el bruto de las citas que ejecutó   (realizadoPorId)
    //   - Responsable: % sobre el neto de su local (ingresos − gastos generales del local)
    // Si la misma persona prescribe Y ejecuta una cita, cobra por ambas acciones (es justo).
    const liquidaciones = colaboradores.map(colOriginal => {
      const sinComisiones = repartoIgualitario(colOriginal.localId);
      const col = { ...colOriginal, comisionPct: sinComisiones ? 0 : colOriginal.comisionPct };
      // Gastos atribuidos a este colaborador
      const gastosColaboradorDetalle = gastos.filter(g => g.colaboradorId === col.id);
      const gastosColaborador = gastosColaboradorDetalle.reduce((sum, g) => sum + g.importe, 0);

      // --- Acción PRESCRIPTOR ---
      const citasPrescritas = citas.filter(c => c.prescriptorId === col.id);
      const basePrescriptor = citasPrescritas.reduce((sum, c) => sum + (c.total || 0), 0);
      const comisionPrescriptor = (basePrescriptor * col.comisionPct) / 100;

      // --- Acción OPERARIO ---
      const citasRealizadas = citas.filter(c => c.realizadoPorId === col.id);
      const baseOperario = citasRealizadas.reduce((sum, c) => sum + (c.total || 0), 0);
      const comisionOperario = (baseOperario * col.comisionPct) / 100;

      // --- Acción RESPONSABLE (solo si su rol es RESPONSABLE) ---
      let baseResponsable = 0;
      let comisionResponsable = 0;
      if (col.rol === "RESPONSABLE") {
        const ingLocal = ingresosPorLocal[col.localId || ''] || 0;
        const gastoGenLocal = gastosGeneralesPorLocal[col.localId || ''] || 0;
        baseResponsable = ingLocal - gastoGenLocal;
        comisionResponsable = (baseResponsable * col.comisionPct) / 100;
      }

      const comisionBruta = comisionPrescriptor + comisionOperario + comisionResponsable;
      const baseCalculo = basePrescriptor + baseOperario + baseResponsable;
      const comisionNeta = sinComisiones ? 0 : comisionBruta - gastosColaborador;
      // El reparto del neto NO es una comisión por acción. Los responsables
      // con participación configurada reciben una de las tres partes acordadas.
      const participaEnReparto = sinComisiones && colOriginal.rol === 'RESPONSABLE' && colOriginal.comisionPct > 0;
      const netoReparto = (ingresosPorLocal[col.localId] || 0) - (gastosPorLocal[col.localId] || 0);
      const prestamoFueraLocal = prestamosFueraPorLocal[col.localId] || 0;
      const repartibleLocal = netoReparto - prestamoFueraLocal; // lo que hay en caja para repartir hoy
      const participacionNeto = participaEnReparto ? round2(repartibleLocal / PARTES_REPARTO) : 0;

      // Citas relacionadas = unión (sin duplicar) de prescritas + realizadas
      // (+ las de su local si es responsable, para dar contexto de su base)
      const citasMap = new Map<string, (typeof citas)[number]>();
      citasPrescritas.forEach(c => citasMap.set(c.id, c));
      citasRealizadas.forEach(c => citasMap.set(c.id, c));
      if (col.rol === "RESPONSABLE") {
        citas.filter(c => c.localId === col.localId).forEach(c => citasMap.set(c.id, c));
      }
      const citasRelacionadas = Array.from(citasMap.values());

      return {
        colaborador: {
          id: col.id,
          nombre: col.nombre,
          rol: col.rol,
          comisionPct: colOriginal.comisionPct,
          telefono: col.telefono,
          email: col.email,
        },
        baseCalculo: round2(baseCalculo),
        comisionBruta: round2(comisionBruta),
        gastosAtribuidos: round2(gastosColaborador),
        gastosDetalle: gastosColaboradorDetalle.map(g => ({
          id: g.id,
          concepto: g.concepto,
          importe: g.importe,
          fecha: g.fecha,
        })),
        comisionNeta: round2(comisionNeta),
        reparto: sinComisiones ? {
          numPartes: PARTES_REPARTO,
          participa: participaEnReparto,
          netoLocal: round2(netoReparto),
          gananciaPorParte: round2(netoReparto / PARTES_REPARTO),
          prestamoFuera: round2(prestamoFueraLocal),
          repartible: round2(repartibleLocal),
          porParte: participacionNeto,
          pendienteRecuperar: round2(prestamoFueraLocal),
          pendienteRecuperarPorParte: participaEnReparto ? round2(prestamoFueraLocal / PARTES_REPARTO) : 0,
        } : null,
        participacionNeto,
        importeLiquidacion: sinComisiones ? participacionNeto : round2(comisionNeta),
        // Desglose por acción (una persona puede cobrar por varias)
        desglose: {
          prescriptor: {
            base: round2(basePrescriptor),
            comision: round2(comisionPrescriptor),
            numCitas: citasPrescritas.length,
          },
          operario: {
            base: round2(baseOperario),
            comision: round2(comisionOperario),
            numCitas: citasRealizadas.length,
          },
          responsable: {
            base: round2(baseResponsable),
            comision: round2(comisionResponsable),
          },
        },
        numCitas: citasRelacionadas.length,
        citas: citasRelacionadas.map(citaResumen),
      };
    });

    // 6. Leer % propietario de la configuración
    const configProp = await prisma.configuracion.findUnique({ where: { clave: 'liquidaciones.propietarioPct' } });
    const repartoActivo = repartoIgualitario(localId);
    const propietarioPct = repartoActivo ? 100 / PARTES_REPARTO : (configProp ? parseFloat(configProp.valor) : 50);

    // 7. Totales por rol/acción
    const totalComisionesPrescriptor = liquidaciones.reduce((sum, l) => sum + l.desglose.prescriptor.comision, 0);
    const totalComisionesOperario = liquidaciones.reduce((sum, l) => sum + l.desglose.operario.comision, 0);
    const totalComisionesResponsable = liquidaciones.reduce((sum, l) => sum + l.desglose.responsable.comision, 0);
    const totalComisiones = liquidaciones.reduce((sum, l) => sum + Math.max(0, l.comisionNeta), 0);

    // Resultado propietario = su % sobre el neto (Ingresos - Gastos)
    const netoLocal = ingresosTotales - gastosTotales;
    const netoRepartible = netoLocal - prestamosFueraTotal; // beneficio menos lo invertido fuera (no está en caja)
    const resultadoPropietario = repartoActivo ? netoRepartible / PARTES_REPARTO : (netoLocal * propietarioPct) / 100;

    // 7b. SIMULADOR DE MODELOS DE REPARTO (para comparar cuál interesa más)
    //   Modelo A (actual): se pagan comisiones por acción (incluida la del prescriptor
    //     que trae el vehículo) y el propietario se queda con el resto del neto.
    //   Modelo B (partes iguales): el neto se reparte a partes iguales ((Ingresos − Gastos) / N,
    //     N=3 por defecto), SIN pagar comisión al prescriptor (su % queda solo como dato
    //     estadístico de control).
    // Número de partes iguales del Modelo B (configurable, por defecto 3)
    const configPartes = await prisma.configuracion.findUnique({ where: { clave: 'liquidaciones.numPartesIguales' } });
    const numPartesIguales = configPartes ? Math.max(2, Math.round(parseFloat(configPartes.valor) || 3)) : 3;

    const comisionesAutonomosA = totalComisiones; // suma de comisiones netas (>0)
    const propietarioA = netoLocal - comisionesAutonomosA;
    const porParteB = netoLocal / numPartesIguales;
    const simulacion = {
      propietarioPct,
      numPartesIguales,
      modeloA: {
        nombre: 'Comisiones por acción (actual)',
        descripcion: 'Se restan gastos y se pagan comisiones por acción, incluida la del prescriptor que trae el vehículo. El propietario se queda con el resto del neto.',
        neto: round2(netoLocal),
        comisionesAutonomos: round2(comisionesAutonomosA),
        comisionPrescriptor: round2(totalComisionesPrescriptor),
        comisionOperario: round2(totalComisionesOperario),
        comisionResponsable: round2(totalComisionesResponsable),
        propietario: round2(propietarioA),
      },
      modeloB: {
        nombre: `Partes iguales entre ${numPartesIguales} tras gastos`,
        descripcion: `Se restan gastos y el neto se reparte a partes iguales ((Ingresos − Gastos) / ${numPartesIguales}). La comisión del prescriptor NO se paga: queda solo a efectos estadísticos de control.`,
        neto: round2(netoLocal),
        numPartes: numPartesIguales,
        porParte: round2(porParteB),
        propietario: round2(porParteB),
        comisionPrescriptorInformativa: round2(totalComisionesPrescriptor),
      },
      diferenciaPropietario: round2(porParteB - propietarioA),
    };

    // Si es OPERADOR, devolver solo su propia liquidación
    const liquidacionesFiltradas = colaboradorIdUsuario
      ? liquidaciones.filter(l => l.colaborador.id === colaboradorIdUsuario)
      : liquidaciones;

    return NextResponse.json({
      periodo: { desde: fechaDesde, hasta: fechaHasta },
      vistaRestringida: !!colaboradorIdUsuario,
      propietarioPct,
      simulacion: repartoActivo ? null : simulacion,
      reparto: repartoActivo ? {
        numPartes: PARTES_REPARTO,
        netoLocal: round2(netoLocal),
        gananciaPorParte: round2(netoLocal / PARTES_REPARTO),
        prestamoFuera: round2(prestamosFueraTotal),
        repartible: round2(netoRepartible),
        porParte: round2(netoRepartible / PARTES_REPARTO),
        pendienteRecuperar: round2(prestamosFueraTotal),
        pendienteRecuperarPorParte: round2(prestamosFueraTotal / PARTES_REPARTO),
      } : null,
      resumen: {
        ingresosTotales: round2(ingresosTotales),
        gastosTotales: round2(gastosTotales),
        gastosGenerales: round2(gastosGenerales),
        netoLocal: round2(netoLocal),
        prestamosFuera: round2(prestamosFueraTotal),
        netoRepartible: round2(netoRepartible),
        ingresosFacturasAgrupadas: round2(ingresosFacturasAgrupadas),
        numFacturasAgrupadas: facturasAgrupadasCobradas.length,
        totalComisiones: round2(totalComisiones),
        totalComisionesPrescriptor: round2(totalComisionesPrescriptor),
        totalComisionesOperario: round2(totalComisionesOperario),
        totalComisionesResponsable: round2(totalComisionesResponsable),
        propietarioPct,
        resultadoPropietario: round2(resultadoPropietario),
        numCitas: citas.length,
      },
      liquidaciones: liquidacionesFiltradas,
    });
  } catch (error: unknown) {
    console.error("Error en liquidaciones:", error);
    return NextResponse.json({ error: "Error al calcular liquidaciones" }, { status: 500 });
  }
}
