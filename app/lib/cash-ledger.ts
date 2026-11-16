import { prisma } from '@/lib/db'
import { facturasPorLocal } from '@/lib/factura-local'
import { buildLocalFilter, LocalFilter } from '@/lib/local-context'

export interface CashMovement {
  id: string; fecha: Date; tipo: 'INGRESO' | 'GASTO'; concepto: string; categoria: string
  importe: number; metodoPago?: string | null; referencia?: string | null; creadoPor?: string | null; creadoEn?: Date | null
}
export async function loadCashLedger(context: LocalFilter, start?: Date, end?: Date): Promise<CashMovement[]> {
  const local = buildLocalFilter(context)
  const range = { gte: start, lte: end }
  const date = start || end ? { fecha: range } : {}
  const cashDate = start || end ? { OR: [{ fechaPago: range }, { fechaPago: null, fecha: range }] } : {}
  const lf = local as { localId?: string | { in: string[] } }
  const scope = lf.localId === undefined ? null : typeof lf.localId === 'string' ? [lf.localId] : lf.localId.in
  const visible = (id: string) => scope === null || scope.includes(id)
  const inRange = (d: Date) => (!start || d >= start) && (!end || d <= end)
  const [invoices, expenses, extra, payments, appointments, transfers] = await Promise.all([
    facturasPorLocal.findMany({ where: { ...local, estado: 'PAGADA', ...cashDate }, select: { id:true,numero:true,tipo:true,citaId:true,total:true,fecha:true,fechaPago:true,metodoPago:true,tpvNombre:true,creadoPorNombre:true,createdAt:true } }),
    prisma.gasto.findMany({where:{...local,...date},select:{id:true,fecha:true,concepto:true,tipoGasto:true,importe:true,metodoPago:true,numeroFactura:true,creadoPorNombre:true,createdAt:true}}),
    prisma.ingresoAdicional.findMany({where:{...local,...date},select:{id:true,fecha:true,concepto:true,descripcion:true,importe:true,metodoPago:true,creadoPorNombre:true,createdAt:true}}),
    // Todos los anticipos para deducirlos incluso si pertenecen a otro período.
    prisma.pagoParcial.findMany({where:{cita:local},include:{cita:{select:{facturaAgrupadaId:true,cliente:{select:{nombre:true}}}}}}),
    prisma.cita.findMany({where:{...local,...date,estado:'COMPLETADA',cobroDiferido:false,facturaAgrupadaId:null,facturas:{is:null},metodoPago:{not:null},total:{not:null}},select:{id:true,fecha:true,total:true,metodoPago:true,cliente:{select:{nombre:true}},vehiculo:{select:{matricula:true}}}}),
    prisma.transferenciaCaja.findMany({where:{AND:[...(scope === null ? [] : [{OR:[{origenLocalId:{in:scope}},{destinoLocalId:{in:scope}}]}]),...(start||end?[{OR:[{fecha:range},{estado:'DEVUELTO',fechaDevolucion:range}]}]:[])]},include:{origenLocal:{select:{nombre:true}},destinoLocal:{select:{nombre:true}}}}),
  ])
  const byAppointment:Record<string,number>={},byGrouped:Record<string,number>={}
  for(const p of payments){byAppointment[p.citaId]=(byAppointment[p.citaId]||0)+p.importe;const id=p.cita.facturaAgrupadaId;if(id)byGrouped[id]=(byGrouped[id]||0)+p.importe}
  const rows:CashMovement[]=[]
  for(const f of invoices){
    const paid=f.citaId?(byAppointment[f.citaId]||0):(byGrouped[f.id]||0)
    const amount=Math.round((f.total-paid)*100)/100
    if(paid>0&&amount<=.01)continue
    rows.push({id:`FAC-${f.id}`,fecha:f.fechaPago||f.fecha,tipo:'INGRESO',concepto:`${f.tipo==='TICKET'?'Ticket':'Factura'} #${f.numero}${paid>0?' (resto)':''}${f.tpvNombre?' ['+f.tpvNombre+']':''}`,categoria:f.tipo==='TICKET'?'Ticket':'Factura',importe:amount,metodoPago:f.metodoPago,referencia:f.numero,creadoPor:f.creadoPorNombre,creadoEn:f.createdAt})
  }
  for(const c of appointments){
    const paid=byAppointment[c.id]||0,amount=Math.round(((c.total||0)-paid)*100)/100
    if(amount<=.01)continue
    rows.push({id:`CITA-${c.id}`,fecha:c.fecha,tipo:'INGRESO',concepto:`COBRO SIN DOCUMENTO - ${c.cliente.nombre} (${c.vehiculo.matricula})${paid?' (resto)':''}`,categoria:'Cita cobrada',importe:amount,metodoPago:c.metodoPago})
  }
  for(const p of payments)if(inRange(p.fecha))rows.push({id:`PAG-${p.id}`,fecha:p.fecha,tipo:'INGRESO',concepto:`PAGO A CUENTA${p.concepto?' - '+p.concepto:''} (${p.cita.cliente.nombre})${p.tpvNombre?' ['+p.tpvNombre+']':''}`,categoria:'Pago a cuenta',importe:p.importe,metodoPago:p.metodoPago,creadoPor:p.creadoPorNombre,creadoEn:p.createdAt})
  for(const i of extra)rows.push({id:`ING-${i.id}`,fecha:i.fecha,tipo:'INGRESO',concepto:i.concepto+(i.descripcion?' - '+i.descripcion:''),categoria:'Ingreso Extra',importe:i.importe,metodoPago:i.metodoPago,creadoPor:i.creadoPorNombre,creadoEn:i.createdAt})
  for(const g of expenses)rows.push({id:`GAS-${g.id}`,fecha:g.fecha,tipo:'GASTO',concepto:g.concepto,categoria:g.tipoGasto||'General',importe:g.importe,metodoPago:g.metodoPago,referencia:g.numeroFactura,creadoPor:g.creadoPorNombre,creadoEn:g.createdAt})
  for(const t of transfers){
    const add=(incoming:boolean,fecha:Date,suffix:string,counterparty:string)=>{if(inRange(fecha))rows.push({id:`TRF-${suffix}-${t.id}`,fecha,tipo:incoming?'INGRESO':'GASTO',concepto:`${suffix.startsWith('RET')?'DEVOLUCIÓN':'TRANSFERENCIA'} ${incoming?'DE':'A'} ${counterparty} - ${t.concepto}`,categoria:'Transferencia Caja',importe:t.importe,metodoPago:'EFECTIVO',creadoPor:t.creadoPorNombre,creadoEn:t.createdAt})}
    if(visible(t.origenLocalId))add(false,t.fecha,'OUT',t.destinoLocal.nombre)
    if(visible(t.destinoLocalId))add(true,t.fecha,'IN',t.origenLocal.nombre)
    if(t.estado==='DEVUELTO'&&t.fechaDevolucion){
      if(visible(t.origenLocalId))add(true,t.fechaDevolucion,'RET-IN',t.destinoLocal.nombre)
      if(visible(t.destinoLocalId))add(false,t.fechaDevolucion,'RET-OUT',t.origenLocal.nombre)
    }
  }
  return rows.sort((a,b)=>b.fecha.getTime()-a.fecha.getTime())
}
export function summarizeCashLedger(rows: CashMovement[]) {
  const sum=(test:(r:CashMovement)=>boolean)=>Math.round(rows.filter(test).reduce((s,r)=>s+r.importe,0)*100)/100
  const totalIngresosCaja=sum(r=>r.tipo==='INGRESO'),gastosTotal=sum(r=>r.tipo==='GASTO')
  const transferenciasEntrada=sum(r=>r.tipo==='INGRESO'&&r.categoria==='Transferencia Caja'),transferenciasSalida=sum(r=>r.tipo==='GASTO'&&r.categoria==='Transferencia Caja')
  const incomes=(method:string)=>sum(r=>r.tipo==='INGRESO'&&r.metodoPago===method&&r.categoria!=='Transferencia Caja')
  const expenses=(method:string)=>sum(r=>r.tipo==='GASTO'&&r.metodoPago===method&&r.categoria!=='Transferencia Caja')
  const net=(method:string)=>Math.round((incomes(method)-expenses(method))*100)/100
  return {totalIngresosCaja,gastosTotal,balanceCaja:Math.round((totalIngresosCaja-gastosTotal)*100)/100,transferenciasEntrada,transferenciasSalida,
    totalVentas:sum(r=>r.tipo==='INGRESO'&&r.categoria!=='Transferencia Caja'),ventasEfectivo:incomes('EFECTIVO'),ventasTPVSumup:incomes('TPV_SUMUP'),ventasTPVUnicaja:incomes('TPV_UNICAJA'),ventasRevolut:incomes('REVOLUT'),
    gastosEfectivo:expenses('EFECTIVO'),gastosTPVSumup:expenses('TPV_SUMUP'),gastosTPVUnicaja:expenses('TPV_UNICAJA'),gastosRevolut:expenses('REVOLUT'),
    efectivoEnCaja:Math.round((net('EFECTIVO')+transferenciasEntrada-transferenciasSalida)*100)/100,netoTPVSumup:net('TPV_SUMUP'),netoTPVUnicaja:net('TPV_UNICAJA'),netoRevolut:net('REVOLUT')}
}
