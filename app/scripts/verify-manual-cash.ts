import { prisma } from '../lib/db'
import { encode } from 'next-auth/jwt'
import assert from 'node:assert/strict'

async function main() {
 const u = await prisma.user.findFirstOrThrow({ where: { role: 'SUPER_ADMIN' }, select: { id: true, email: true, role: true } })
 const token = await encode({ token: { sub: u.id, id: u.id, email: u.email, role: u.role }, secret: process.env.NEXTAUTH_SECRET! })
 const source = await prisma.cita.findUniqueOrThrow({where:{id:'cmv6lvaky000ami08cugpimhw'}})
 const headers = { cookie: 'servyauto.session-token='+token, 'Content-Type':'application/json', 'x-selected-local-id':source.localId! }
 const call = async (p:string, body?:object) => {
  const r = await fetch('http://localhost:3000'+p, {headers, method:body?'PUT':'GET',body:body?JSON.stringify(body):undefined})
  if(!r.ok) throw Error(`HTTP ${r.status}`)
  return r.json()
 }
 let id: string | undefined
 let facturaId: string | undefined
 try {
  const cita = await prisma.cita.create({data:{fecha:source.fecha,horaInicio:'00:00',horaFin:'00:01',box:'PRUEBA TEMPORAL',clienteId:source.clienteId,vehiculoId:source.vehiculoId,localId:source.localId,total:0,estado:'PENDIENTE'}})
  id=cita.id
  const factura = await prisma.factura.create({data:{numero:'TEST-MANUAL-'+Date.now(),tipo:'TICKET',fecha:source.fecha,subtotal:0,iva:0,total:0,estado:'PAGADA',metodoPago:'EFECTIVO',clienteId:source.clienteId,citaId:id,localId:source.localId}})
  facturaId=factura.id
  const line = (amount:number, cantidad=1)=>[{descripcion:'PRUEBA LÍNEA MANUAL',cantidad,precioUnitario:amount}]
  const check = async (label:string, body:object, expected:number) => {
   const updated=await call('/api/citas/'+id,body)
   const saved=await call('/api/citas/'+id)
   const ticket=await prisma.factura.findUniqueOrThrow({where:{id:facturaId},include:{factura_items:true}})
   const diary=(await call('/api/facturas')).find((f:any)=>f.id===facturaId&&f.estado==='PAGADA')
   console.log(JSON.stringify({caso:label,esperado:expected,cita:updated.total,guardado:saved.total,ticket:ticket.total,diario:diary?.total,lineas:ticket.factura_items.map(x=>({descripcion:x.descripcion,total:x.total}))}))
   if(process.argv.includes('--before')) { assert.equal(updated.total,0);assert.equal(ticket.total,0);return }
   assert.equal(updated.total,expected); assert.equal(saved.total,expected); assert.equal(ticket.total,expected);assert.equal(diary.total,expected)
   assert.ok(Math.abs(ticket.factura_items.reduce((s,x)=>s+x.total,0)-expected)<0.01)
  }
  await check('SOLO MANUAL 450',{servicios:[],lineasManuales:line(450),total:450},450)
  if(process.argv.includes('--before'))return
  await check('SOLO MANUAL 150',{servicios:[],lineasManuales:line(150),total:150},150)
  await check('EDITAR MANUAL SIN SERVICIOS NI TOTAL',{lineasManuales:line(225,2)},450)
  const svc=await prisma.servicio.findFirstOrThrow({where:{precio:{gt:0}}})
  await check('MIXTO CON PRECIO GUARDADO',{servicios:[{servicioId:svc.id,precio:35}],lineasManuales:line(450),total:485},485)
  await check('CAMBIAR SOLO MANUAL CON CATÁLOGO',{lineasManuales:line(150)},185)
  await check('RETIRAR CATÁLOGO CONSERVA MANUAL',{servicios:[]},150)
  await check('DESCUENTO EXPLÍCITO',{servicios:[],lineasManuales:line(150),total:125},125)
  await check('CAMBIO SIN LÍNEAS CONSERVA TOTAL',{observaciones:'PRUEBA'},125)
  await check('QUITAR TODAS LAS LÍNEAS',{servicios:[],lineasManuales:[]},0)
  console.log('OK: GUARDADO Y LECTURA DEL DIARIO EN TODOS LOS CASOS')
 } finally {
  if(facturaId){for(const it of await prisma.factura_items.findMany({where:{facturaId}}))await prisma.factura_items.delete({where:{id:it.id}});await prisma.factura.delete({where:{id:facturaId}})}
  if(id){for(const it of await prisma.citaLineaManual.findMany({where:{citaId:id}}))await prisma.citaLineaManual.delete({where:{id:it.id}});for(const it of await prisma.cita_servicios.findMany({where:{citaId:id}}))await prisma.cita_servicios.delete({where:{id:it.id}});await prisma.cita.delete({where:{id}})}
  console.log('REGISTROS DE PRUEBA ELIMINADOS')
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>prisma.$disconnect())
