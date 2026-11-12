import { prisma } from '../lib/db'
import { resolveReaderSumUpKeys } from '../lib/sumup'
async function main() {
 const citas = await prisma.cita.findMany({where:{vehiculo:{matricula:'7631LDL'}},select:{id:true,fecha:true,total:true,metodoPago:true,localId:true},orderBy:{fecha:'desc'},take:3})
 console.log('CITAS',JSON.stringify(citas))
 const txns = await prisma.sumUpTransaction.findMany({where:{citaId:{in:citas.map(c=>c.id)}},include:{reader:true},orderBy:{createdAt:'desc'},take:12})
 for (const t of txns) {
  console.log('ATTEMPT',JSON.stringify({checkoutId:t.checkoutId,clientTransactionId:t.clientTransactionId,amount:t.amount,status:t.status,createdAt:t.createdAt,reader:t.reader?.sumupReaderId}))
  if (!t.reader || !t.clientTransactionId) continue
  const {apiKey}=await resolveReaderSumUpKeys({readerId:t.reader.sumupReaderId,cuentaTpvId:t.cuentaTpvId,localId:t.localId})
  const headers={Authorization:`Bearer ${apiKey}`}
  const me=await fetch('https://api.sumup.com/v0.1/me',{headers}); if(!me.ok) throw Error(`Profile HTTP ${me.status}`)
  const p=await me.json(); const merchant=p.merchant_code||p.merchant_profile?.merchant_code||p.account?.merchant_code
  for (const [kind,path] of [['transaction',`/v0.1/me/transactions?client_transaction_id=${encodeURIComponent(t.clientTransactionId)}`],['readerCheckout',`/v0.1/merchants/${merchant}/readers/${t.reader.sumupReaderId}/checkout/${t.checkoutId}`]]) {
   const r=await fetch(`https://api.sumup.com${path}`,{headers}); const d=await r.json().catch(()=>({}));
   const sanitize=(v:any):any=>Array.isArray(v)?v.map(sanitize):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>!/(card|email|phone|address|token|key|account|receipt|lat|lon)/i.test(k)).map(([k,x])=>[k,sanitize(x)])):v
   console.log(kind,r.status,JSON.stringify(sanitize(d)))
   if(r.status===401||r.status===403||r.status===429) throw Error(`Access blocked HTTP ${r.status}`)
  }
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>prisma.$disconnect())
