export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const user = session.user as { role?: string };
    if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await req.json();
    const { nombre, telefono, email, rol, comisionPct, activo, localId } = body;

    const data: Record<string, unknown> = {};
    if (nombre !== undefined) data.nombre = nombre;
    if (telefono !== undefined) data.telefono = telefono || null;
    if (email !== undefined) data.email = email || null;
    if (rol !== undefined) data.rol = rol;
    if (comisionPct !== undefined) data.comisionPct = comisionPct;
    if (activo !== undefined) data.activo = activo;
    if (localId !== undefined) data.localId = localId;
    if (body.userId !== undefined) data.userId = body.userId || null;

    const colaborador = await prisma.colaborador.update({
      where: { id: params.id },
      data,
      include: { local: { select: { id: true, nombre: true } }, user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(colaborador);
  } catch (error: unknown) {
    console.error("Error updating colaborador:", error);
    return NextResponse.json({ error: "ERROR AL ACTUALIZAR AUTÓNOMO" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const user = session.user as { role?: string };
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    // Check if has related citas or gastos
    const [citasP, citasR, gastos] = await Promise.all([
      prisma.cita.count({ where: { prescriptorId: params.id } }),
      prisma.cita.count({ where: { realizadoPorId: params.id } }),
      prisma.gasto.count({ where: { colaboradorId: params.id } }),
    ]);

    if (citasP + citasR + gastos > 0) {
      // Soft delete - just deactivate
      const colaborador = await prisma.colaborador.update({
        where: { id: params.id },
        data: { activo: false },
        include: { local: { select: { id: true, nombre: true } } },
      });
      return NextResponse.json({ ...colaborador, _softDeleted: true });
    }

    await prisma.colaborador.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("Error deleting colaborador:", error);
    return NextResponse.json({ error: "ERROR AL ELIMINAR AUTÓNOMO" }, { status: 500 });
  }
}
