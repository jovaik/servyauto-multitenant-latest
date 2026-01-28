
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notificarCreacionGSControl, mapearCategoriaGasto } from '@/lib/gscontrol-sync'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const gastos = await prisma.gasto.findMany({
      orderBy: {
        fecha: 'desc'
      }
    })

    return NextResponse.json(gastos)
  } catch (error) {
    console.error('Error fetching gastos:', error)
    return NextResponse.json({ error: 'Error al obtener gastos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Datos recibidos para crear gasto:', JSON.stringify(body, null, 2))
    
    const { 
      concepto, 
      fecha, 
      proveedor, 
      proveedorId,
      tipoGasto, 
      importe, 
      metodoPago, 
      tipo, 
      iva,
      numeroFactura,
      proveedorCIF,
      proveedorDireccion,
      proveedorCodigoPostal,
      proveedorCiudad,
      proveedorProvincia,
      proveedorTelefono
    } = body

    // Validar campos requeridos
    if (!concepto || !fecha || !tipoGasto || !importe || !metodoPago) {
      console.error('Faltan campos requeridos', { concepto, fecha, tipoGasto, importe, metodoPago })
      return NextResponse.json(
        { error: 'Faltan campos requeridos: concepto, fecha, tipoGasto, importe, metodoPago' },
        { status: 400 }
      )
    }

    // Validar que metodoPago sea uno de los valores válidos del enum
    const metodosValidos = ['EFECTIVO', 'TPV_SUMUP', 'TPV_UNICAJA']
    if (!metodosValidos.includes(metodoPago)) {
      console.error('Método de pago inválido:', metodoPago)
      return NextResponse.json(
        { error: `Método de pago inválido. Debe ser uno de: ${metodosValidos.join(', ')}` },
        { status: 400 }
      )
    }

    // Si es FACTURA, validar campos fiscales adicionales (solo si no hay proveedor ya registrado)
    if (tipo === 'FACTURA' && !proveedorId) {
      if (!numeroFactura || !proveedor) {
        return NextResponse.json(
          { error: 'Para facturas se requiere número de factura y proveedor' },
          { status: 400 }
        )
      }
    }

    // ✅ REGISTRAR O BUSCAR PROVEEDOR AUTOMÁTICAMENTE
    let proveedorIdFinal: string | null = proveedorId || null
    
    if (proveedor && proveedor.trim() && !proveedorId) {
      console.log('Buscando/creando proveedor:', proveedor.trim())
      
      // Buscar si existe un proveedor con ese nombre
      let proveedorExistente = await prisma.proveedor.findFirst({
        where: { nombre: { equals: proveedor.trim(), mode: 'insensitive' } }
      })
      
      if (proveedorExistente) {
        console.log('Proveedor existente encontrado:', proveedorExistente.id)
        proveedorIdFinal = proveedorExistente.id
        
        // Actualizar datos fiscales si se proporcionaron nuevos
        if (proveedorCIF || proveedorDireccion || proveedorTelefono) {
          await prisma.proveedor.update({
            where: { id: proveedorExistente.id },
            data: {
              cif: proveedorCIF?.trim() || proveedorExistente.cif,
              direccion: proveedorDireccion?.trim() || proveedorExistente.direccion,
              codigoPostal: proveedorCodigoPostal?.trim() || proveedorExistente.codigoPostal,
              ciudad: proveedorCiudad?.trim() || proveedorExistente.ciudad,
              provincia: proveedorProvincia?.trim() || proveedorExistente.provincia,
              telefono: proveedorTelefono?.trim() || proveedorExistente.telefono
            }
          })
          console.log('Datos del proveedor actualizados')
        }
      } else {
        // Crear nuevo proveedor
        const nuevoProveedor = await prisma.proveedor.create({
          data: {
            nombre: proveedor.trim(),
            cif: proveedorCIF?.trim() || null,
            direccion: proveedorDireccion?.trim() || null,
            codigoPostal: proveedorCodigoPostal?.trim() || null,
            ciudad: proveedorCiudad?.trim() || null,
            provincia: proveedorProvincia?.trim() || null,
            telefono: proveedorTelefono?.trim() || null
          }
        })
        console.log('Nuevo proveedor creado:', nuevoProveedor.id, nuevoProveedor.nombre)
        proveedorIdFinal = nuevoProveedor.id
      }
    }

    // Preparar datos para crear el gasto
    const gastoData: any = {
      concepto: concepto.trim(),
      fecha: new Date(fecha),
      proveedor: proveedor && proveedor.trim() ? proveedor.trim() : null,
      tipoGasto: tipoGasto.trim(),
      importe: parseFloat(importe),
      metodoPago: metodoPago,
      tipo: tipo || 'TICKET',
      iva: parseFloat(iva) || 21,
      adjunto: false,
      numeroFactura: numeroFactura && numeroFactura.trim() ? numeroFactura.trim() : null,
      proveedorCIF: proveedorCIF && proveedorCIF.trim() ? proveedorCIF.trim() : null,
      proveedorDireccion: proveedorDireccion && proveedorDireccion.trim() ? proveedorDireccion.trim() : null,
      proveedorCodigoPostal: proveedorCodigoPostal && proveedorCodigoPostal.trim() ? proveedorCodigoPostal.trim() : null,
      proveedorCiudad: proveedorCiudad && proveedorCiudad.trim() ? proveedorCiudad.trim() : null,
      proveedorProvincia: proveedorProvincia && proveedorProvincia.trim() ? proveedorProvincia.trim() : null,
      // Trazabilidad - quién creó este gasto
      creadoPorId: (session.user as any)?.id || null,
      creadoPorNombre: session.user?.name || session.user?.email || 'Sistema'
    }
    
    // Vincular al proveedor registrado
    if (proveedorIdFinal) {
      gastoData.proveedorId = proveedorIdFinal
    }

    console.log('Datos preparados para Prisma:', JSON.stringify(gastoData, null, 2))

    const gasto = await prisma.gasto.create({
      data: gastoData
    })

    console.log('Gasto creado exitosamente:', gasto.id)

    // 🔄 SINCRONIZAR CON GSCONTROL - CÓDIGO ACTUALIZADO 31/10/2025
    const descripcionGasto = `${gasto.concepto}${gasto.proveedor ? ` - ${gasto.proveedor}` : ''}`
    const categoriaGSControl = mapearCategoriaGasto(gasto.tipoGasto)
    
    await notificarCreacionGSControl({
      id: gasto.id,
      esIngreso: false,
      fecha: gasto.fecha,
      importe: gasto.importe,
      descripcion: descripcionGasto,
      // Nuevo campo según PDF
      costCategory: categoriaGSControl
    })

    return NextResponse.json(gasto, { status: 201 })
  } catch (error: any) {
    console.error('Error creating gasto:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return NextResponse.json(
      { error: 'Error al crear gasto: ' + (error.message || 'Error desconocido') },
      { status: 500 }
    )
  }
}
