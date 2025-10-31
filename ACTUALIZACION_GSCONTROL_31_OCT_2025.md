# 🔄 ACTUALIZACIÓN SINCRONIZACIÓN GSCONTROL - 31 de Octubre 2025

## 📋 Resumen de Cambios

Se actualizó el sistema de sincronización con GSControl para incluir nuevos campos que permiten distinguir correctamente entre **FACTURAS**, **TICKETS** y **GASTOS**.

---

## ✅ Cambios Implementados

### 1. **Actualización de funciones de sincronización** (`/app/lib/gscontrol-sync.ts`)

#### **notificarCreacionGSControl()**
- Ahora acepta campos adicionales:
  - Para INGRESOS:
    - `documentType`: "FACTURA" o "TICKET"
    - `invoiceNumber`: Número de factura (solo para FACTURA)
    - `clientName`: Nombre completo del cliente
    - `clientDni`: DNI/NIF del cliente
  - Para GASTOS:
    - `costCategory`: Categoría del gasto (ALQUILER, COMBUSTIBLE, REPUESTOS, etc.)

#### **notificarModificacionGSControl()**
- Mismos campos adicionales que la función de creación

#### **mapearCategoriaGasto()**
- Nueva función que mapea las categorías de gasto de ServyAuto a las categorías válidas de GSControl:
  - ALQUILER → ALQUILER
  - AUTONOMO/AUTONOMOS → AUTONOMOS
  - GESTORIA/GESTORÍA → GESTORIA
  - COMBUSTIBLE/GASOLINA/DIESEL → COMBUSTIBLE
  - GASTOS FIJOS/GASTOS_FIJOS → GASTOS_FIJOS
  - TALLER/TALLERES/REPARACION → TALLERES
  - REPUESTO/REPUESTOS/PIEZAS/MATERIALES → REPUESTOS
  - SEGURO/SEGUROS → SEGUROS
  - Otros → OTROS_GASTOS

---

### 2. **Actualización de endpoints de FACTURAS**

#### `/app/app/api/facturas/route.ts` (CREATE)
Ahora envía a GSControl:
```typescript
{
  externalId: factura.id,
  type: "INGRESO",
  date: factura.createdAt,
  amount: factura.total,
  description: "FACTURA: FAC-2025-0001 - Juan Pérez",
  ivaRate: 21,
  // NUEVOS CAMPOS:
  documentType: "FACTURA", // o "TICKET"
  invoiceNumber: "FAC-2025-0001", // solo si es FACTURA
  clientName: "Juan Pérez",
  clientDni: "12345678A"
}
```

#### `/app/app/api/facturas/[id]/route.ts` (UPDATE)
- Mismos campos que CREATE
- Se sincronizan las modificaciones con GSControl

---

### 3. **Actualización de endpoints de GASTOS**

#### `/app/app/api/gastos/route.ts` (CREATE)
Ahora envía a GSControl:
```typescript
{
  externalId: gasto.id,
  type: "GASTO",
  date: gasto.fecha,
  amount: gasto.importe,
  description: "Compra de repuestos - Proveedor ABC",
  ivaRate: 21,
  // NUEVO CAMPO:
  costCategory: "REPUESTOS" // mapeado automáticamente
}
```

#### `/app/app/api/gastos/[id]/route.ts` (UPDATE)
- Mismos campos que CREATE
- Se sincronizan las modificaciones con GSControl

---

### 4. **Limpieza de código obsoleto**

#### `/app/app/api/cierres-caja/[id]/route.ts`
- Eliminado código problemático de sincronización de cierres de caja
- Los cierres NO se sincronizan con GSControl (solo facturas, tickets y gastos individuales)

#### `/app/app/api/citas/[id]/route.ts`
- Eliminadas llamadas a funciones obsoletas `syncFactura()` y `syncTicket()`
- La sincronización se hace automáticamente desde los endpoints de facturas

---

## 🔍 Tipos de Documentos

### **FACTURA**
- Se envía con `documentType: "FACTURA"`
- Incluye `invoiceNumber` (ej: FAC-2025-0001)
- Incluye datos del cliente (nombre y DNI)

### **TICKET**
- Se envía con `documentType: "TICKET"`
- NO incluye `invoiceNumber`
- Puede incluir datos del cliente (opcional)

### **GASTO**
- Se envía con `type: "GASTO"`
- Incluye `costCategory` (mapeada automáticamente)
- Categorías válidas:
  - ALQUILER
  - AUTONOMOS
  - GESTORIA
  - COMBUSTIBLE
  - GASTOS_FIJOS
  - TALLERES
  - REPUESTOS
  - SEGUROS
  - OTROS_GASTOS

---

## 📊 Ejemplo de Sincronización

### Crear una FACTURA:
```
ServyAuto → POST /api/facturas
  ↓
Guarda en base de datos
  ↓
Envía a GSControl: POST /api/integrations/ingest
  {
    "externalId": "clx123abc",
    "type": "INGRESO",
    "date": "2025-10-31T10:30:00Z",
    "amount": 242.00,
    "description": "FACTURA: FAC-2025-0123 - Juan Pérez",
    "ivaRate": 21,
    "documentType": "FACTURA",
    "invoiceNumber": "FAC-2025-0123",
    "clientName": "Juan Pérez",
    "clientDni": "12345678A"
  }
```

### Crear un TICKET:
```
ServyAuto → POST /api/facturas
  ↓
Guarda en base de datos
  ↓
Envía a GSControl: POST /api/integrations/ingest
  {
    "externalId": "clx456def",
    "type": "INGRESO",
    "date": "2025-10-31T14:20:00Z",
    "amount": 150.50,
    "description": "TICKET: TKT-2025-0089 - María García",
    "ivaRate": 21,
    "documentType": "TICKET",
    "clientName": "María García"
  }
```

### Crear un GASTO:
```
ServyAuto → POST /api/gastos
  ↓
Guarda en base de datos
  ↓
Mapea categoría: "Repuestos" → "REPUESTOS"
  ↓
Envía a GSControl: POST /api/integrations/ingest
  {
    "externalId": "clx789ghi",
    "type": "GASTO",
    "date": "2025-10-31",
    "amount": 363.00,
    "description": "Compra piezas repuesto - Proveedor S.L.",
    "ivaRate": 21,
    "costCategory": "REPUESTOS"
  }
```

---

## ✅ Estado del Sistema

- ✅ Compilación exitosa
- ✅ Checkpoint guardado
- ✅ Desplegado en producción (app.servyauto.com)
- ✅ Sistema retrocompatible (transacciones antiguas siguen funcionando)

---

## 📝 Notas Importantes

1. **Retrocompatibilidad**: Las transacciones antiguas sin estos nuevos campos seguirán funcionando.

2. **Mapeo automático**: El sistema mapea automáticamente las categorías de gasto de ServyAuto a las categorías válidas de GSControl.

3. **Sincronización en tiempo real**: Todas las operaciones (CREATE, UPDATE, DELETE) se sincronizan inmediatamente con GSControl.

4. **No bloqueante**: Si GSControl falla, la operación en ServyAuto se completa igualmente y se registra el error en los logs.

5. **Cierres de caja**: NO se sincronizan con GSControl. Solo se sincronizan facturas, tickets y gastos individuales.

---

Fecha de actualización: 31 de octubre de 2025  
Estado: ✅ **COMPLETADO Y DESPLEGADO EN PRODUCCIÓN**
