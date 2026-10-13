export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const localId = searchParams.get("localId");
    const rol = searchParams.get("rol");
    const activo = searchParams.get("activo");

    const where: Record<string, unknown> = {};
    if (localId) where.localId = localId;
    if (rol) where.rol = rol;
    if (activo !== null && activo !== undefined && activo !== "") where.activo = activo === "true";

    const colaboradores = await prisma.colaborador.findMany({
      where,
      include: { local: { select: { id: true, nombre: true } }, user: { select: { id: true, name: true, email: true } } },
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json(colaboradores);
  } catch (error: unknown) {
    console.error("Error fetching colaboradores:", error);
    return NextResponse.json({ error: "Error al obtener colaboradores" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const user = session.user as { role?: string };
    if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await req.json();
    const { nombre, telefono, email, rol, comisionPct, localId, userId } = body;

    if (!nombre || !rol || !localId) {
      return NextResponse.json({ error: "Nombre, rol y local son obligatorios" }, { status: 400 });
    }

    const colaborador = await prisma.colaborador.create({
      data: {
        nombre,
        telefono: telefono || null,
        email: email || null,
        rol,
        comisionPct: comisionPct ?? 0,
        localId,
        userId: userId || null,
      },
      include: { local: { select: { id: true, nombre: true } }, user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(colaborador, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating colaborador:", error);
    return NextResponse.json({ error: "Error al crear colaborador" }, { status: 500 });
  }
}
