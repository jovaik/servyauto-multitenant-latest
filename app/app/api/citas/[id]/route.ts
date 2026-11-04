
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { enviarNotificacionVehiculoListo, enviarSolicitudResena } from '@/lib/notifications'
import { notificarCreacionGSControl } from '@/lib/gscontrol-sync'
import { logActivity, requireSuperAdminForDelete } from '@/lib/activity-logger'

export const dynamic = 'force-dynamic'

// GET - Obtener una cita por ID con sus servicios
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const cita = await prisma.cita.findUnique({
      where: { id: params.id },
      include: {
        cliente: true,
        vehiculo: true,
        cita_servicios: {
          include: {
            servicios: true
          }
        },
        lineasManuales: true,
        facturas: true,
      },
    })

    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
    }

    const documentoAgrupado = cita.facturaAgrupadaId
      ? await prisma.factura.findUnique({ where: { id: cita.facturaAgrupadaId }, select: { id: true, numero: true, estado: true, metodoPago: true } })
      : null
    return NextResponse.json({ ...cita, ...(cita.estado === 'PAGO_POSTERIOR'
      ? { estado: 'COMPLETADA', cobroDiferido: true, metodoPago: null } : {}), documentoAgrupado })
  } catch (error: any) {
    console.error('Error al obtener cita:', error)
    return NextResponse.json({ error: 'Error al obtener cita', message: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const {
      fecha,
      fechaDevolucion,
      horaInicio,
      horaFin,
      box,
      estado,
      observaciones,
      metodoPago,
      vencimientoCredito,
      cobroDiferido,
      servicios,
      lineasManuales: bodyLineasManuales,
      ticketsUsados,
      localId,
      prescriptorId,
      realizadoPorId,
      tpvUserId,
      tpvNombre,
      clienteNombre,
      clienteApellido,
      clienteTelefono,
      vehiculoMarca,
      vehiculoModelo,
      vehiculoMatricula,
    } = body

    console.log('=== INICIO ACTUALIZACIÓN CITA ===')
    console.log('Cita ID:', params.id)
    console.log('Body completo:', JSON.stringify(body, null, 2))
    console.log('metodoPago:', metodoPago, 'tipo:', typeof metodoPago, 'es null:', metodoPago === null, 'es undefined:', metodoPago === undefined)

    // Verificar si la cita existe
    const citaExistente = await prisma.cita.findUnique({
      where: { id: params.id },
      include: { cita_servicios: true, lineasManuales: true, vehiculo: true, pagosParciales: true },
    })

    if (!citaExistente) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      )
    }

    // === RE-ENLACE ANTI-DUPLICADOS (completar cita rápida con cliente/matrícula ya existentes) ===
    // Si al completar una cita se teclea una matrícula o teléfono que YA existe en otra ficha,
    // en vez de duplicar, re-enlazamos la cita al vehículo/cliente real ya existente.
    let relinkVehiculoId: string | null = null
    let relinkClienteId: string | null = null

    if (vehiculoMatricula !== undefined && String(vehiculoMatricula).trim() && citaExistente.vehiculoId) {
      const matriculaUp = String(vehiculoMatricula).trim().toUpperCase()
      if (!matriculaUp.startsWith('PEND-')) {
        const vehiculoExistente = await prisma.vehiculo.findFirst({
          where: {
            matricula: matriculaUp,
            localId: citaExistente.localId,
            id: { not: citaExistente.vehiculoId },
          },
        })
        if (vehiculoExistente) {
          relinkVehiculoId = vehiculoExistente.id
          // Adoptar también el cliente propietario de ese vehículo
          if (vehiculoExistente.clienteId && vehiculoExistente.clienteId !== citaExistente.clienteId) {
            relinkClienteId = vehiculoExistente.clienteId
          }
          console.log(`Re-enlace por matrícula ${matriculaUp}: vehículo ${relinkVehiculoId}, cliente ${relinkClienteId || '(sin cambio)'}`)
        }
      }
    }

    // Re-enlace por teléfono si no hubo match por matrícula.
    // Solo cuando el vehículo actual sigue siendo un placeholder PEND- (cita rápida sin completar),
    // para no re-enlazar por error al editar una cita normal que comparte teléfono (p.ej. familia).
    const vehiculoEsPlaceholder = !!citaExistente.vehiculo?.matricula?.startsWith('PEND-')
    if (!relinkClienteId && vehiculoEsPlaceholder && clienteTelefono !== undefined && String(clienteTelefono).trim() && citaExistente.clienteId) {
      const telClean = String(clienteTelefono).trim()
      const clienteExistente = await prisma.cliente.findFirst({
        where: {
          telefono: telClean,
          id: { not: citaExistente.clienteId },
        },
      })
      if (clienteExistente) {
        relinkClienteId = clienteExistente.id
        console.log(`Re-enlace por teléfono ${telClean}: cliente ${relinkClienteId}`)
      }
    }

    const efectivoClienteId = relinkClienteId || citaExistente.clienteId

    // Actualizar datos del cliente enlazado (editar nombre/apellido/teléfono erróneos, p.ej. reserva rápida)
    // Solo si NO estamos re-enlazando a un cliente ya existente (para no pisar su ficha real)
    if (!relinkClienteId && citaExistente.clienteId && (clienteNombre !== undefined || clienteApellido !== undefined || clienteTelefono !== undefined)) {
      const clienteUpdate: any = {}
      if (clienteNombre !== undefined) clienteUpdate.nombre = String(clienteNombre).toUpperCase()
      if (clienteApellido !== undefined) clienteUpdate.apellido = clienteApellido ? String(clienteApellido).toUpperCase() : null
      if (clienteTelefono !== undefined) clienteUpdate.telefono = clienteTelefono
      if (Object.keys(clienteUpdate).length > 0) {
        try {
          await prisma.cliente.update({ where: { id: citaExistente.clienteId }, data: clienteUpdate })
        } catch (e) {
          console.error('Error actualizando cliente de la cita:', e)
        }
      }
    }

    // Actualizar datos del vehículo enlazado (editar marca/modelo/matrícula erróneos)
    // Solo si NO estamos re-enlazando a un vehículo ya existente
    if (!relinkVehiculoId && citaExistente.vehiculoId && (vehiculoMarca !== undefined || vehiculoModelo !== undefined || vehiculoMatricula !== undefined)) {
      const vehiculoUpdate: any = {}
      if (vehiculoMarca !== undefined) vehiculoUpdate.marca = String(vehiculoMarca).toUpperCase()
      if (vehiculoModelo !== undefined) vehiculoUpdate.modelo = String(vehiculoModelo).toUpperCase()
      if (vehiculoMatricula !== undefined) vehiculoUpdate.matricula = String(vehiculoMatricula).toUpperCase()
      if (Object.keys(vehiculoUpdate).length > 0) {
        try {
          await prisma.vehiculo.update({ where: { id: citaExistente.vehiculoId }, data: vehiculoUpdate })
        } catch (e: any) {
          // Si falla por matrícula duplicada (@@unique matricula+localId), reintentar sin matrícula
          if (e?.code === 'P2002' && vehiculoUpdate.matricula) {
            console.error('Matrícula duplicada, actualizando vehículo sin cambiar matrícula')
            delete vehiculoUpdate.matricula
            if (Object.keys(vehiculoUpdate).length > 0) {
              try {
                await prisma.vehiculo.update({ where: { id: citaExistente.vehiculoId }, data: vehiculoUpdate })
              } catch (e2) {
                console.error('Error actualizando vehículo de la cita:', e2)
              }
            }
          } else {
            console.error('Error actualizando vehículo de la cita:', e)
          }
        }
      }
    }

    // Un catálogo vacío no significa cita vacía: también cuentan las líneas manuales.
    const serviciosEfectivos = servicios ?? citaExistente.cita_servicios
    const manualesEfectivas = bodyLineasManuales ?? citaExistente.lineasManuales
    const cambianLineas = servicios !== undefined || bodyLineasManuales !== undefined
    let precioFinal = body.total !== undefined ? body.total : citaExistente.total
    if (cambianLineas) {
      // Si el frontend envía el total directamente (ya incluye descuentos), usarlo
      // Si no, recalcular desde los servicios con descuentos
      if (body.total === undefined) {
        const serviciosData = await prisma.servicio.findMany({
          where: {
            id: { in: serviciosEfectivos.map((s: any) => s.servicioId) },
          },
        })
        
        precioFinal = serviciosEfectivos.reduce((sum: number, svc: any) =>
          sum + (svc.precio ?? serviciosData.find(s => s.id === svc.servicioId)?.precio ?? 0), 0)
          + manualesEfectivas.reduce((sum: number, lm: any) =>
            sum + (lm.descripcion && lm.precioUnitario > 0 ? (lm.cantidad || 1) * lm.precioUnitario : 0), 0)
        
        // Aplicar descuentos automáticos según tipo de cliente
        const cliente = await prisma.cliente.findUnique({
          where: { id: efectivoClienteId },
          select: { clienteParking: true, clienteVIP: true, clienteEmpresa: true }
        })

        let totalDescuentosUpdate = 0

        const aplicarDescuentoUpdate = (subtotal: number, valor: number, tipo: string): number => {
          if (tipo === 'FIJO') return valor
          return (subtotal * valor) / 100
        }

        if (cliente?.clienteParking) {
          const descConfig = await prisma.configuracion.findUnique({ where: { clave: 'precios.descuentoParking' } })
          const tipoConfig = await prisma.configuracion.findUnique({ where: { clave: 'precios.descuentoParkingTipo' } })
          if (descConfig) {
            totalDescuentosUpdate += aplicarDescuentoUpdate(precioFinal, parseFloat(descConfig.valor) || 0, tipoConfig?.valor || 'FIJO')
          }
        }

        if (cliente?.clienteVIP) {
          const descConfig = await prisma.configuracion.findUnique({ where: { clave: 'precios.descuentoVIP' } })
          const tipoConfig = await prisma.configuracion.findUnique({ where: { clave: 'precios.descuentoVIPTipo' } })
          if (descConfig) {
            totalDescuentosUpdate += aplicarDescuentoUpdate(precioFinal, parseFloat(descConfig.valor) || 0, tipoConfig?.valor || 'PORCENTAJE')
          }
        }

        if (cliente?.clienteEmpresa) {
          const descConfig = await prisma.configuracion.findUnique({ where: { clave: 'precios.descuentoEmpresa' } })
          const tipoConfig = await prisma.configuracion.findUnique({ where: { clave: 'precios.descuentoEmpresaTipo' } })
          if (descConfig) {
            totalDescuentosUpdate += aplicarDescuentoUpdate(precioFinal, parseFloat(descConfig.valor) || 0, tipoConfig?.valor || 'PORCENTAJE')
          }
        }

        if (totalDescuentosUpdate > 0) {
          precioFinal = Math.max(0, precioFinal - totalDescuentosUpdate)
          console.log(`Descuentos aplicados en actualización: ${totalDescuentosUpdate.toFixed(2)}€ - Total final: €${precioFinal.toFixed(2)}`)
        }
      }
    }

    // Preparar datos de actualización
    const updateData: any = {}
    
    if (fecha) updateData.fecha = new Date(fecha)
    if (fechaDevolucion !== undefined) updateData.fechaDevolucion = fechaDevolucion ? new Date(fechaDevolucion) : null
    if (horaInicio) updateData.horaInicio = horaInicio
    if (horaFin) updateData.horaFin = horaFin
    if (box) updateData.box = box
    if (estado) updateData.estado = estado
    // Compatibilidad con clientes antiguos: crédito es condición de cobro, no estado de trabajo.
    const diferido = estado === 'PAGO_POSTERIOR' || (cobroDiferido !== undefined
      ? !!cobroDiferido : (metodoPago ? false : citaExistente.cobroDiferido || citaExistente.estado === 'PAGO_POSTERIOR'))
    updateData.cobroDiferido = diferido
    if (estado === 'PAGO_POSTERIOR') updateData.estado = 'COMPLETADA'
    if (vencimientoCredito !== undefined) updateData.vencimientoCredito = diferido ? vencimientoCredito || null : null
    if (!diferido) updateData.vencimientoCredito = null
    if (observaciones !== undefined) updateData.observaciones = observaciones
    if (ticketsUsados !== undefined) updateData.ticketsUsados = parseInt(ticketsUsados) || 0
    
    // Manejar cambio de local
    // IMPORTANTE: Solo cambiar el local si llega un valor REAL. Nunca borrar el local
    // de una cita porque el formulario envíe localId vacío/null por error: eso dejaba
    // tickets sin local -> la cita quedaba invisible en la facturación de su local.
    if (localId !== undefined && localId !== null && localId !== '') {
      updateData.localId = localId
      console.log('Cambiando local de la cita a:', localId)
    }
    
    // Manejar metodoPago: si es undefined se envía como null a Prisma
    if (metodoPago !== undefined) {
      updateData.metodoPago = metodoPago || null
    }

    if (diferido) updateData.metodoPago = null
    if (updateData.estado === 'COMPLETADA' && !citaExistente.facturaAgrupadaId && !(updateData.metodoPago ?? citaExistente.metodoPago)) {
      const pagado = citaExistente.pagosParciales.reduce((sum, p) => sum + p.importe, 0)
      if (pagado < (precioFinal || 0) - 0.01) updateData.cobroDiferido = true
    }
    // Las citas agrupadas se cobran desde su documento, nunca desde el estado de agenda.
    if (citaExistente.facturaAgrupadaId) {
      const agrupada = await prisma.factura.findUnique({ where: { id: citaExistente.facturaAgrupadaId } })
      if (agrupada && agrupada.estado !== 'CANCELADA') {
        updateData.estado = 'COMPLETADA'
        updateData.metodoPago = agrupada.estado === 'PAGADA' ? agrupada.metodoPago : null
        updateData.cobroDiferido = agrupada.estado !== 'PAGADA'
      }
    }

    // Colaboradores
    if (prescriptorId !== undefined) updateData.prescriptorId = prescriptorId || null
    if (realizadoPorId !== undefined) updateData.realizadoPorId = realizadoPorId || null
    if (tpvUserId !== undefined) updateData.tpvUserId = tpvUserId || null
    if (tpvNombre !== undefined) updateData.tpvNombre = tpvNombre || null
    
    if (precioFinal !== undefined) updateData.total = precioFinal

    // Aplicar re-enlace anti-duplicados a la cita
    if (relinkVehiculoId) updateData.vehiculoId = relinkVehiculoId
    if (relinkClienteId) updateData.clienteId = relinkClienteId

    // Trazabilidad: guardar quién completó la cita
    if (estado === 'COMPLETADA' || estado === 'LISTO_PARA_RECOGER') {
      const userEmail = session?.user?.email || ''
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true, name: true }
      })
      updateData.completadoPorId = user?.id || null
      updateData.completadoPorNombre = user?.name || session?.user?.name || userEmail
    }

    console.log('=== DATOS PREPARADOS PARA PRISMA ===')
    console.log('Update data:', JSON.stringify(updateData, null, 2))
    console.log('Cantidad de campos:', Object.keys(updateData).length)

    // Verificar que hay datos para actualizar
    if (Object.keys(updateData).length === 0) {
      console.log('ERROR: No hay datos para actualizar')
      return NextResponse.json(
        { error: 'No hay datos para actualizar' },
        { status: 400 }
      )
    }

    console.log('=== EJECUTANDO PRISMA UPDATE ===')
    
    // Persistir primero las manuales para que el ticket use las líneas de ESTA edición.
    if (bodyLineasManuales !== undefined) {
      await prisma.citaLineaManual.deleteMany({ where: { citaId: params.id } })
      if (Array.isArray(bodyLineasManuales)) {
        for (const lm of bodyLineasManuales) {
          if (lm.descripcion && lm.precioUnitario > 0) {
            await prisma.citaLineaManual.create({
              data: {
                citaId: params.id,
                descripcion: lm.descripcion,
                cantidad: lm.cantidad || 1,
                precioUnitario: lm.precioUnitario,
                total: (lm.cantidad || 1) * lm.precioUnitario,
              }
            })
          }
        }
      }
    }

    // El array vacío elimina solo el catálogo, no las líneas manuales ni su importe.
    if (servicios !== undefined) {
      console.log('Actualizando servicios de la cita...')
      
      // Eliminar servicios existentes
      await prisma.cita_servicios.deleteMany({
        where: { citaId: params.id }
      })
      
      // Crear nuevos servicios
      for (const svc of servicios) {
        const uniqueId = `cs_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
        await prisma.cita_servicios.create({
          data: {
            id: uniqueId,
            citaId: params.id,
            servicioId: svc.servicioId,
            precio: svc.precio
          }
        })
      }
      
      console.log(`Servicios actualizados: ${servicios.length} servicios`)
    }

    // Sincronizar con ambas clases de líneas, aunque solo cambien las manuales.
    if (cambianLineas || body.total !== undefined) {
      const servicios = await prisma.cita_servicios.findMany({ where: { citaId: params.id } })
      // ✅ ACTUALIZAR TAMBIÉN LA FACTURA/TICKET SI EXISTE
      const facturaExistente = await prisma.factura.findFirst({
        where: { citaId: params.id }
      })
      
      if (facturaExistente) {
        console.log('=== ACTUALIZANDO FACTURA EXISTENTE CON NUEVOS SERVICIOS ===')
        
        // Obtener nombres de servicios
        const serviciosInfo = await prisma.servicio.findMany({
          where: { id: { in: servicios.map((s: any) => s.servicioId) } }
        })
        
        // Eliminar items existentes de la factura
        await prisma.factura_items.deleteMany({
          where: { facturaId: facturaExistente.id }
        })
        
        // Crear nuevos items de servicios
        for (let i = 0; i < servicios.length; i++) {
          const svc = servicios[i]
          const servicioInfo = serviciosInfo.find((s: any) => s.id === svc.servicioId)
          const itemId = `fi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
          await prisma.factura_items.create({
            data: {
              id: itemId,
              facturaId: facturaExistente.id,
              cantidad: 1,
              descripcion: servicioInfo?.nombre || 'Servicio',
              precio: svc.precio,
              total: svc.precio
            }
          })
        }

        // Añadir líneas manuales de la cita a la factura
        const lmActuales = await prisma.citaLineaManual.findMany({ where: { citaId: params.id } })
        let sumaLineasManualesFactura = 0
        for (const lm of lmActuales) {
          const lmItemId = `fi_${Date.now()}_lm_${Math.random().toString(36).substring(2, 9)}`
          await prisma.factura_items.create({
            data: {
              id: lmItemId,
              facturaId: facturaExistente.id,
              descripcion: lm.descripcion,
              cantidad: lm.cantidad,
              precio: lm.precioUnitario,
              total: lm.total,
            }
          })
          sumaLineasManualesFactura += lm.total
        }
        
        // Calcular totales - usar el total de la cita (ya con descuentos) si está disponible
        const sumaServiciosFactura = servicios.reduce((sum: number, s: any) => sum + s.precio, 0) + sumaLineasManualesFactura
        const totalFactura = precioFinal !== undefined && precioFinal !== null ? precioFinal : sumaServiciosFactura
        const subtotal = totalFactura / 1.21  // Base imponible
        const iva = totalFactura - subtotal   // IVA incluido en el precio
        
        // Añadir línea de descuento si aplica
        const descuentoFactura = sumaServiciosFactura - totalFactura
        if (descuentoFactura > 0.01) {
          const dtoItemId = `fi_${Date.now()}_dto_${Math.random().toString(36).substring(2, 9)}`
          await prisma.factura_items.create({
            data: {
              id: dtoItemId,
              facturaId: facturaExistente.id,
              descripcion: 'Descuento aplicado',
              cantidad: 1,
              precio: -descuentoFactura,
              total: -descuentoFactura,
            }
          })
          console.log(`Línea de descuento añadida: -${descuentoFactura.toFixed(2)}€`)
        }
        
        // Actualizar factura
        await prisma.factura.update({
          where: { id: facturaExistente.id },
          data: {
            subtotal,
            iva,
            total: totalFactura
          }
        })
        
        console.log(`Factura ${facturaExistente.numero} actualizada: Total ${totalFactura}€`)
      }
    }
    
    // Actualizar la cita
    const cita = await prisma.cita.update({
      where: { id: params.id },
      data: updateData,
      include: {
        cliente: true,
        vehiculo: true,
        cita_servicios: {
          include: {
            servicios: true
          }
        },
        lineasManuales: true,
        facturas: true,
      },
    })

    console.log('=== ACTUALIZACIÓN EXITOSA ===')
    console.log('Cita actualizada:', cita.id)
    
    // Si la cita se marca como COMPLETADA y ya tiene una factura asociada, marcarla como PAGADA
    // IMPORTANTE: Por defecto las facturas se marcan como pagadas cuando se entrega el vehículo
    const pagosRegistrados = await prisma.pagoParcial.aggregate({ where: { citaId: cita.id }, _sum: { importe: true } })
    const cobrada = !cita.cobroDiferido && (!!cita.metodoPago || ((cita.total || 0) > 0 && (pagosRegistrados._sum.importe || 0) >= (cita.total || 0) - 0.01))
    if (cita.estado === 'COMPLETADA' && !cita.facturaAgrupadaId && cita.facturas && cobrada) {
      console.log('=== MARCANDO FACTURA COMO PAGADA (por defecto al entregar vehículo) ===')
      console.log('Factura ID:', cita.facturas.id)
      
      const facturaUpdateData: any = { 
        estado: 'PAGADA'
      }
      
      // Actualizar también el método de pago si está especificado
      if (metodoPago) {
        facturaUpdateData.metodoPago = metodoPago
      }
      // Propagar el TPV usado a la factura
      if (cita.tpvUserId !== undefined) facturaUpdateData.tpvUserId = cita.tpvUserId || null
      if (cita.tpvNombre !== undefined) facturaUpdateData.tpvNombre = cita.tpvNombre || null
      
      const facturaActualizada = await prisma.factura.update({
        where: { id: cita.facturas.id },
        data: facturaUpdateData,
        include: {
          cliente: true
        }
      })
      
      console.log('=== FACTURA MARCADA COMO PAGADA ===')
      
      // 🔄 SINCRONIZAR CON GSCONTROL cuando se paga la factura
      // NOTA: La sincronización se hace automáticamente desde el endpoint de facturas
      console.log('✅ Factura actualizada. Sincronización con GSControl se hace automáticamente.')
    }
    
    if (!cita.facturaAgrupadaId && cita.facturas && cobroDiferido === true && cita.facturas.estado !== 'CANCELADA') {
      await prisma.factura.update({ where: { id: cita.facturas.id }, data: { estado: 'PENDIENTE', metodoPago: null, fechaPago: null } })
    }

    // Si la cita se marca como COMPLETADA y no tiene factura, crear una automáticamente
    if (cita.estado === 'COMPLETADA' && !cita.facturaAgrupadaId && !cita.facturas && cobrada) {
      console.log('=== CREANDO FACTURA/TICKET AUTOMÁTICA ===')
      console.log('Método de pago:', cita.metodoPago)
      
      // Toda reserva cobrada genera un TICKET por defecto.
      // La factura se emite después (bajo petición) convirtiendo el ticket.
      const tipoDocumento: 'TICKET' | 'FACTURA' = 'TICKET'
      const prefijo = 'TICK'
      
      console.log('Tipo de documento:', tipoDocumento, '- Prefijo:', prefijo)
      
      // Generar número de documento
      const año = new Date().getFullYear()
      
      // Buscar el número más alto por orden del propio número (NO por createdAt)
      // para garantizar secuencia correcta según normativa fiscal española
      const documentosDelAño = await prisma.factura.findMany({
        where: { 
          numero: {
            startsWith: `${prefijo}-${año}-`
          }
        },
        select: { numero: true }
      })

      let numeroSecuencia = 1
      if (documentosDelAño.length > 0) {
        const numeros = documentosDelAño.map((d: any) => {
          const partes = d.numero.split('-')
          return partes.length === 3 ? (parseInt(partes[2]) || 0) : 0
        })
        const maxNumero = Math.max(...numeros)
        numeroSecuencia = maxNumero + 1
      }

      const numeroDocumento = `${prefijo}-${año}-${numeroSecuencia.toString().padStart(4, '0')}`
      
      console.log('Número de documento generado:', numeroDocumento)
      
      // Calcular subtotal e IVA
      const total = cita.total || 0
      const subtotal = total / 1.21  // Asumiendo 21% de IVA
      const iva = total - subtotal
      
      // Crear el documento (factura o ticket)
      // IMPORTANTE: Al crear la factura cuando se entrega el vehículo, se marca como PAGADA por defecto
      // La fecha de la factura es la fecha de la cita (servicio), no la fecha de entrega
      const factura = await prisma.factura.create({
        data: {
          numero: numeroDocumento,
          tipo: tipoDocumento,
          fecha: cita.fecha, // Usar la fecha del servicio, no la fecha actual
          estado: 'PAGADA', // Por defecto se marca como pagada al entregar el vehículo
          subtotal: Math.round(subtotal * 100) / 100,
          iva: Math.round(iva * 100) / 100,
          total: total,
          metodoPago: cita.metodoPago,
          clienteId: cita.clienteId,
          citaId: cita.id,
          localId: cita.localId ?? citaExistente.localId, // ✅ Asignar el local de la cita a la factura (con respaldo al local original)
          tpvUserId: cita.tpvUserId || null,
          tpvNombre: cita.tpvNombre || null,
        }
      })
      
      // Crear los items de la factura basados en los servicios de la cita
      const facturaItems: any[] = []
      if (cita.cita_servicios && cita.cita_servicios.length > 0) {
        cita.cita_servicios.forEach((cs: any, index: number) => {
          facturaItems.push({
            id: `${factura.id}_item_${index}`,
            facturaId: factura.id,
            descripcion: cs.servicios.nombre,
            cantidad: 1,
            precio: cs.precio,
            total: cs.precio,
          })
        })
      }

      // Añadir líneas manuales a la factura
      if (cita.lineasManuales && cita.lineasManuales.length > 0) {
        cita.lineasManuales.forEach((lm: any, index: number) => {
          facturaItems.push({
            id: `${factura.id}_lm_${index}`,
            facturaId: factura.id,
            descripcion: lm.descripcion,
            cantidad: lm.cantidad,
            precio: lm.precioUnitario,
            total: lm.total,
          })
        })
      }

      if (facturaItems.length > 0) {
        // Calcular si hay descuento (diferencia entre suma de líneas y total de la cita)
        const sumaLineas = facturaItems.reduce((sum: number, fi: any) => sum + fi.total, 0)
        const descuentoAplicado = sumaLineas - total
        
        if (descuentoAplicado > 0.01) {
          facturaItems.push({
            id: `${factura.id}_item_dto`,
            facturaId: factura.id,
            descripcion: 'Descuento aplicado',
            cantidad: 1,
            precio: -descuentoAplicado,
            total: -descuentoAplicado,
          })
          console.log(`Línea de descuento añadida a factura: -${descuentoAplicado.toFixed(2)}€`)
        }
        
        await prisma.factura_items.createMany({
          data: facturaItems
        })
      }
      
      console.log('=== DOCUMENTO CREADO ===')
      console.log('Tipo:', tipoDocumento)
      console.log('Número:', numeroDocumento)
      console.log('Total:', total)
      
      // 🔄 SINCRONIZAR CON GSCONTROL (factura o ticket desde cita completada)
      console.log('📤 Iniciando sincronización con GSControl...')
      console.log(`Tipo: ${tipoDocumento}, Total: ${total}`)
      
      // Obtener datos del cliente para la sincronización
      const clienteNombreCompleto = `${cita.cliente.nombre} ${cita.cliente.apellido || ''}`.trim()
      const descripcionFactura = `${tipoDocumento}: ${numeroDocumento} - ${clienteNombreCompleto}`
      
      try {
        await notificarCreacionGSControl({
          id: factura.id,
          esIngreso: true,
          fecha: factura.createdAt,
          importe: factura.total,
          descripcion: descripcionFactura,
          documentType: tipoDocumento as 'FACTURA' | 'TICKET',
          invoiceNumber: undefined, // Siempre TICKET al crear desde cita; la factura se emite al convertir

          clientName: clienteNombreCompleto || undefined,
          clientDni: cita.cliente.documento || undefined
        })
        console.log('✅ Sincronización con GSControl completada')
      } catch (gsError) {
        console.error('❌ Error sincronizando con GSControl:', gsError)
        // No bloqueamos la operación si falla GSControl
      }
    }
    
    // ⭐ GENERAR ENLACES DE CONFIRMACIÓN DE DEPÓSITO cuando estado es PENDIENTE
    let depositoData = null;
    if (estado === 'PENDIENTE') {
      try {
        console.log('=== GENERANDO CONFIRMACIÓN DE DEPÓSITO (CITA ACTUALIZADA) ===')
        console.log('Cliente:', cita.cliente.nombre)
        console.log('Teléfono:', cita.cliente.telefono)
        console.log('Vehículo:', `${cita.vehiculo.marca} ${cita.vehiculo.modelo} - ${cita.vehiculo.matricula}`)
        
        const { generarEnlaceConfirmacionDeposito } = await import('@/lib/notifications')
        
        // Formatear fecha
        const fechaFormateada = new Date(cita.fecha).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }) + ' - ' + cita.horaInicio;
        
        // Obtener nombres de servicios
        const nombresServicios = cita.cita_servicios?.map((cs: any) => cs.servicios.nombre) || [];
        
        const resultado = generarEnlaceConfirmacionDeposito({
          clienteName: cita.cliente.nombre,
          telefono: cita.cliente.telefono,
          vehiculo: {
            marca: cita.vehiculo.marca,
            modelo: cita.vehiculo.modelo,
            matricula: cita.vehiculo.matricula
          },
          fecha: fechaFormateada,
          servicios: nombresServicios,
          box: cita.box
        });
        
        if (resultado.success) {
          depositoData = {
            clienteName: cita.cliente.nombre,
            telefono: resultado.numeroOriginal,
            whatsappUrl: resultado.whatsappUrl,
            smsUrl: resultado.smsUrl,
            mensaje: resultado.mensaje
          };
          console.log('✅ Enlaces de confirmación de depósito generados exitosamente');
        }
      } catch (depositoError) {
        console.error('❌ Error generando confirmación de depósito:', depositoError);
      }
    }
    
    // ⭐ GENERAR CONFIRMACIÓN CON ICS cuando estado es CONFIRMADA
    let confirmacionICSData = null;
    if (estado === 'CONFIRMADA') {
      try {
        console.log('=== GENERANDO CONFIRMACIÓN CON ICS (CITA CONFIRMADA) ===')
        console.log('Cliente:', cita.cliente.nombre)
        console.log('Teléfono:', cita.cliente.telefono)
        console.log('Vehículo:', `${cita.vehiculo.marca} ${cita.vehiculo.modelo} - ${cita.vehiculo.matricula}`)
        
        const { generarNotificacionConICS } = await import('@/lib/notifications')
        
        // Formatear fecha solo (sin hora)
        const fechaSoloFormateada = new Date(cita.fecha).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        
        // Obtener nombres de servicios
        const nombresServicios = cita.cita_servicios?.map((cs: any) => cs.servicios.nombre) || [];
        
        const resultadoICS = generarNotificacionConICS({
          citaId: cita.id,
          clienteName: `${cita.cliente.nombre} ${cita.cliente.apellido || ''}`.trim(),
          telefono: cita.cliente.telefono,
          vehiculo: {
            marca: cita.vehiculo.marca,
            modelo: cita.vehiculo.modelo,
            matricula: cita.vehiculo.matricula
          },
          fecha: fechaSoloFormateada,
          horaInicio: cita.horaInicio,
          horaFin: cita.horaFin,
          servicios: nombresServicios,
          box: cita.box,
          tipoDestinatario: 'CLIENTE'
        });
        
        if (resultadoICS.success) {
          confirmacionICSData = {
            clienteName: `${cita.cliente.nombre} ${cita.cliente.apellido || ''}`.trim(),
            telefono: resultadoICS.numeroOriginal,
            whatsappUrl: resultadoICS.whatsappUrl,
            smsUrl: resultadoICS.smsUrl,
            icsUrl: resultadoICS.icsUrl,
            mensaje: resultadoICS.mensaje
          };
          console.log('📅 Confirmación con ICS generada exitosamente');
        }
      } catch (icsError) {
        console.error('❌ Error generando confirmación con ICS:', icsError);
      }
    }
    
    // ⭐ GENERAR ENLACES DE NOTIFICACIÓN cuando estado es LISTO_PARA_RECOGER
    let listoData = null;
    if (estado === 'LISTO_PARA_RECOGER') {
      try {
        console.log('=== GENERANDO NOTIFICACIÓN DE VEHÍCULO LISTO (CITA ACTUALIZADA) ===')
        console.log('Cliente:', cita.cliente.nombre)
        console.log('Teléfono:', cita.cliente.telefono)
        console.log('Vehículo:', `${cita.vehiculo.marca} ${cita.vehiculo.modelo} - ${cita.vehiculo.matricula}`)
        
        const { generarEnlaceNotificacionListoParaRecoger } = await import('@/lib/notifications')
        
        const resultado = generarEnlaceNotificacionListoParaRecoger({
          clienteName: cita.cliente.nombre,
          telefono: cita.cliente.telefono,
          vehiculo: {
            marca: cita.vehiculo.marca,
            modelo: cita.vehiculo.modelo,
            matricula: cita.vehiculo.matricula
          },
          total: cita.total || undefined,
          metodoPago: cita.metodoPago || undefined
        });
        
        if (resultado.success) {
          listoData = {
            clienteName: cita.cliente.nombre,
            telefono: resultado.numeroOriginal,
            whatsappUrl: resultado.whatsappUrl,
            smsUrl: resultado.smsUrl,
            mensaje: resultado.mensaje
          };
          console.log('✅ Enlaces de notificación de vehículo listo generados exitosamente');
        }
      } catch (listoError) {
        console.error('❌ Error generando notificación de vehículo listo:', listoError);
      }
    }
    
    // ⭐ GENERAR ENLACE WHATSAPP cuando se marca como COMPLETADA
    // Completar servicio = cliente pagó, momento para pedir reseña
    let whatsappData = null;
    if (estado === 'COMPLETADA') {
      try {
        console.log('=== GENERANDO ENLACES WHATSAPP Y SMS (CITA COMPLETADA) ===')
        console.log('Cliente:', cita.cliente.nombre)
        console.log('Teléfono:', cita.cliente.telefono)
        console.log('Vehículo:', `${cita.vehiculo.marca} ${cita.vehiculo.modelo} - ${cita.vehiculo.matricula}`)
        console.log('Total:', cita.total)
        
        const { generarEnlaceWhatsAppResena, generarEnlaceSMSResena } = await import('@/lib/notifications')
        
        // Generar enlace WhatsApp
        const whatsappResult = generarEnlaceWhatsAppResena({
          clienteName: cita.cliente.nombre,
          telefono: cita.cliente.telefono
        })
        
        // Generar enlace SMS
        const smsResult = generarEnlaceSMSResena({
          clienteName: cita.cliente.nombre,
          telefono: cita.cliente.telefono
        })
        
        if (whatsappResult.success && smsResult.success) {
          whatsappData = {
            clienteName: cita.cliente.nombre,
            telefono: whatsappResult.telefono,
            whatsappUrl: whatsappResult.whatsappUrl,
            smsUrl: smsResult.smsUrl,
            mensaje: whatsappResult.mensaje
          }
          console.log('✅ Enlaces WhatsApp y SMS generados exitosamente')
          console.log('WhatsApp URL:', whatsappResult.whatsappUrl)
          console.log('SMS URL:', smsResult.smsUrl)
        }
      } catch (reviewError) {
        // No fallar la actualización si falla la generación del enlace
        console.error('❌ Error generando enlaces WhatsApp/SMS:', reviewError)
      }
    }
    
    // 📝 Log de actividad
    logActivity({
      action: 'UPDATE',
      entity: 'Cita',
      entityId: params.id,
      description: `Cita actualizada - Estado: ${body.estado || cita.estado}`,
      details: { estado: body.estado, total: body.total },
    }).catch(() => {})

    return NextResponse.json({
      ...cita,
      depositoData: depositoData,
      confirmacionICSData: confirmacionICSData,
      listoData: listoData,
      whatsappData: whatsappData
    })
  } catch (error: any) {
    console.error('=== ERROR EN ACTUALIZACIÓN ===')
    console.error('Error completo:', error)
    console.error('Error message:', error.message)
    console.error('Error code:', error.code)
    console.error('Error meta:', error.meta)
    console.error('Error name:', error.name)
    
    // Si es un error de Prisma, mostrar más detalles
    if (error.code) {
      console.error('Es un error de Prisma con código:', error.code)
    }
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error.message,
        code: error.code,
        details: error.meta
      },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guardResponse = await requireSuperAdminForDelete()
    if (guardResponse) return guardResponse

    // Verificar si la cita existe
    const citaExistente = await prisma.cita.findUnique({
      where: { id: params.id },
      include: { vehiculo: true, cliente: true }
    })

    if (!citaExistente) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      )
    }

    // Eliminar la cita y sus servicios relacionados
    await prisma.cita.delete({
      where: { id: params.id },
    })

    await logActivity({
      action: 'DELETE',
      entity: 'Cita',
      entityId: params.id,
      description: `Cita eliminada - ${citaExistente.vehiculo?.matricula || 'Sin matrícula'} / ${citaExistente.cliente?.nombre || 'Sin cliente'} (${citaExistente.fecha?.toISOString().slice(0,10) || ''})`,
    })

    return NextResponse.json({ message: 'Cita eliminada correctamente' })
  } catch (error) {
    console.error('Error deleting appointment:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
