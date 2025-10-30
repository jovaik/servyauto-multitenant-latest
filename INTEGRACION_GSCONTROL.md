
# 🔌 Integración GSControl - Sincronización en Tiempo Real

## ✅ **IMPLEMENTACIÓN COMPLETADA**

La aplicación ServyAuto Manager ahora sincroniza automáticamente todas las transacciones económicas con GSControl en tiempo real.

---

## 📋 **¿Qué se sincroniza?**

### ✅ **Facturas (Ingresos con IVA deducible)**
- Se sincronizan automáticamente al **crear** una nueva factura
- Se sincronizan al **convertir un ticket a factura**
- Incluye: número de factura, cliente, NIF, servicios, IVA y total

### ✅ **Tickets (Ingresos sin factura)**
- NO se sincronizan automáticamente (ya que representan ingresos sin IVA deducible)
- **NOTA**: Si en el futuro deseas sincronizar tickets, puedes hacerlo fácilmente

### ✅ **Gastos**
- Se sincronizan automáticamente al **crear** un nuevo gasto
- Diferencia entre gastos con factura y sin factura
- Incluye: categoría, proveedor, número de factura (si aplica), IVA

---

## 🔑 **Configuración**

### API Key configurada:
```
GSCONTROL_API_KEY=servyauto_sk_a1b2c3d4e5f6g7h8i9j0
```

### Endpoint:
```
POST https://gscontrol.abacusai.app/api/integrations/sync
```

---

## 🚀 **Cómo Funciona**

### **Sincronización Automática en Tiempo Real:**

1. **Usuario crea una factura** → Se guarda en la BD → **Se sincroniza con GSControl automáticamente**
2. **Usuario registra un gasto** → Se guarda en la BD → **Se sincroniza con GSControl automáticamente**
3. **Usuario convierte ticket a factura** → Se actualiza en la BD → **Se sincroniza con GSControl automáticamente**

### **Proceso de Sincronización:**

```
┌─────────────────────────┐
│  Usuario crea factura   │
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│  Se guarda en ServyAuto │
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│  Se envía a GSControl   │ ← Automático, en segundo plano
└──────────┬──────────────┘
           ▼
┌─────────────────────────┐
│  GSControl lo recibe    │
│  y almacena             │
└─────────────────────────┘
```

### **Sistema de Reintentos:**

Si falla la sincronización (por ejemplo, internet caído), el sistema:
- ✅ Reintenta **3 veces** automáticamente
- ✅ Espera entre reintentos (1s, 2s, 3s)
- ✅ Registra el error en los logs
- ⚠️ **NO bloquea** la operación en ServyAuto (la factura/gasto se guarda siempre)

---

## 📊 **Formato de Datos Enviados**

### **Ejemplo de Factura Sincronizada:**

```json
{
  "transactions": [
    {
      "externalId": "SERVYAUTO-ING-20251030-abc12345",
      "type": "INGRESO",
      "date": "2025-10-30T10:30:00Z",
      "amount": 242.00,
      "ivaRate": 21,
      "description": "Reparación frenos, Cambio aceite",
      "documentType": "FACTURA",
      "invoiceNumber": "FAC-2025-0123",
      "clientName": "Juan Pérez",
      "clientDni": "12345678A",
      "metadata": {
        "facturaId": "clxxx123456789",
        "servicios": 2
      }
    }
  ]
}
```

### **Ejemplo de Gasto Sincronizado:**

```json
{
  "transactions": [
    {
      "externalId": "SERVYAUTO-GAS-20251030-def67890",
      "type": "GASTO",
      "date": "2025-10-30",
      "amount": 363.00,
      "ivaRate": 21,
      "description": "Compra piezas repuesto",
      "documentType": "FACTURA",
      "invoiceNumber": "F-2025-789",
      "costCategory": "MATERIALES",
      "metadata": {
        "gastoId": "clxxx987654321",
        "proveedor": "Recambios S.L."
      }
    }
  ]
}
```

---

## 📁 **Archivos Modificados**

### **Nuevo servicio creado:**
- `/app/lib/gscontrol-sync.ts` - Servicio de sincronización con GSControl

### **APIs modificadas:**
- `/app/app/api/facturas/route.ts` - Sincroniza al crear facturas
- `/app/app/api/facturas/[id]/convertir/route.ts` - Sincroniza al convertir tickets
- `/app/app/api/gastos/route.ts` - Sincroniza al crear gastos

### **Variables de entorno:**
- `/app/.env` - Agregado `GSCONTROL_API_KEY`

---

## 🔍 **Monitoreo y Logs**

### **Ver logs de sincronización:**

Los logs se muestran en la consola del servidor:

```
✅ Sincronización exitosa: 1 transacciones procesadas
📤 Sincronizando 1 transacción(es) con GSControl...
❌ Error sincronizando con GSControl: [detalle del error]
⚠️ Sincronización parcial: 2 exitosas, 1 con errores
```

### **Verificar en servidor:**

```bash
# Ver logs en tiempo real
cd /home/ubuntu/servyauto_manager_v89/app
yarn dev

# O en producción
pm2 logs servyauto
```

---

## 🎯 **Prevención de Duplicados**

Cada transacción tiene un **ID único** (`externalId`):

```
SERVYAUTO-ING-20251030-abc12345
│        │   │         │
│        │   │         └─ ID corto de la transacción
│        │   └─ Fecha (YYYYMMDD)
│        └─ Tipo (ING=Ingreso, GAS=Gasto)
└─ Proyecto
```

Si intentas sincronizar la misma transacción dos veces, GSControl la rechaza automáticamente.

---

## ⚙️ **Configuración Avanzada (Opcional)**

### **Deshabilitar sincronización:**

Si por alguna razón necesitas deshabilitar temporalmente la sincronización:

```bash
# Eliminar o comentar en .env
# GSCONTROL_API_KEY=servyauto_sk_a1b2c3d4e5f6g7h8i9j0
```

La app funcionará normalmente, pero no sincronizará con GSControl.

### **Sincronizar datos históricos:**

Si necesitas sincronizar facturas/gastos antiguos, puedes crear un script de migración:

```typescript
// Ejemplo: scripts/sync-historico.ts
import { prisma } from '@/lib/db'
import { syncFactura, syncGasto } from '@/lib/gscontrol-sync'

async function syncHistorico() {
  // Sincronizar facturas del último mes
  const facturas = await prisma.factura.findMany({
    where: {
      tipo: 'FACTURA',
      createdAt: {
        gte: new Date('2025-10-01')
      }
    },
    include: {
      cliente: true,
      factura_items: true
    }
  })

  for (const factura of facturas) {
    await syncFactura({
      id: factura.id,
      numeroFactura: factura.numero,
      fecha: factura.createdAt,
      total: factura.total,
      iva: 21,
      cliente: factura.cliente,
      servicios: factura.factura_items.map(item => ({
        nombre: item.descripcion,
        precio: item.total
      }))
    })
  }
}
```

---

## 🆘 **Solución de Problemas**

### **Error: "API key inválida"**
- ✅ Verificar que `GSCONTROL_API_KEY` esté en `.env`
- ✅ Verificar que el API key sea correcto
- ✅ Contactar al equipo de GSControl si persiste

### **Error: "Error del servidor (500)"**
- ✅ El sistema reintentará automáticamente
- ✅ Verificar conexión a internet
- ✅ Verificar que el endpoint de GSControl esté disponible

### **No se sincronizan las transacciones**
- ✅ Verificar logs en consola del servidor
- ✅ Verificar que `GSCONTROL_API_KEY` esté configurado
- ✅ Verificar que las transacciones sean de tipo correcto (FACTURA para ingresos)

---

## 📞 **Contacto**

Para consultas sobre la integración con GSControl:
- Revisar logs en `/home/ubuntu/servyauto_manager_v89/app`
- Verificar documentación en la aplicación de GSControl

---

## ✨ **Ventajas de esta Integración**

- ✅ **Sincronización automática** - No requiere intervención manual
- ✅ **En tiempo real** - Los datos están siempre actualizados
- ✅ **No bloqueante** - Si falla GSControl, ServyAuto sigue funcionando
- ✅ **Sistema de reintentos** - Maneja errores temporales automáticamente
- ✅ **Prevención de duplicados** - No se pueden enviar datos dos veces
- ✅ **Logs completos** - Fácil de monitorear y depurar
- ✅ **Formato estandarizado** - Compatible con el sistema GSControl

---

**🎉 ¡Integración completada y lista para usar!**

La sincronización funcionará automáticamente desde ahora. No necesitas hacer nada especial.
