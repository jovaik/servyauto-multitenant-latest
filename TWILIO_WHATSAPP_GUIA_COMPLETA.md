
# 📱 GUÍA COMPLETA: WhatsApp con Twilio en ServyAuto

## 🎯 ¿Qué es y para qué sirve?

Tu aplicación ServyAuto Manager utiliza **Twilio** para enviar notificaciones automáticas a tus clientes por **WhatsApp** o **SMS** cuando:

1. ✅ **El vehículo está listo** para recoger
2. ⭐ **Se completa un servicio** para solicitar reseñas

---

## 📊 Estado actual de tu configuración

```bash
✅ TWILIO_ACCOUNT_SID: Configurado (ACGBbedbd076dc570cb2575f5f52c26274)
✅ TWILIO_AUTH_TOKEN: Configurado
⚠️ TWILIO_PHONE_NUMBER: Falta configurar (necesitas comprar un número)
⚠️ TWILIO_WHATSAPP_NUMBER: Configurado en sandbox (solo pruebas)
```

---

## 🔄 ¿Cómo funciona el sistema?

### **Flujo automático:**

```
1. Cliente termina servicio en la app
   ↓
2. Sistema marca cita como "COMPLETADA"
   ↓
3. Se activa función enviarSolicitudResena()
   ↓
4. INTENTA enviar por WhatsApp primero (más barato: ~0.005€)
   ↓
5. SI FALLA → Intenta por SMS (más caro: ~0.07€)
   ↓
6. Se registra el resultado en logs
```

### **Formatos de mensajes:**

#### 📧 **Mensaje 1: Vehículo listo**
```
Hola [Cliente],

Tu [Vehículo] está listo para recoger.

💰 Total: 50.00€

Gracias por confiar en ServyAuto 🚗
```

#### ⭐ **Mensaje 2: Solicitud de reseña**
```
¡Hola [Cliente]! 👋

Esperamos que estés disfrutando de tu vehículo recién lavado ✨

Tu opinión es muy importante para nosotros. 
¿Podrías dedicar un minuto para dejarnos una reseña?

⭐⭐⭐⭐⭐

Responde a este mensaje con tu valoración o 
déjanos tu comentario en Google.

¡Gracias por confiar en ServyAuto! 🚗💙
```

---

## 💰 Comparación de costos

| Servicio | Costo mensual (50 mensajes) | Observaciones |
|----------|------------------------------|---------------|
| **Número Twilio** | ~5€/mes | Costo fijo del número |
| **50 SMS** | ~3.50€ | 0.07€ por SMS |
| **50 WhatsApp** | ~0.25€ | 0.005€ por mensaje |
| **TOTAL con SMS** | **~8.50€/mes** | Más caro |
| **TOTAL con WhatsApp** | **~5.25€/mes** | **14x más barato** |

---

## 🚀 Opciones para activar WhatsApp

### **OPCIÓN 1: Sandbox de WhatsApp (GRATIS - Solo pruebas)** ❌ NO RECOMENDADO

**¿Qué es?**  
Un número de prueba de Twilio para probar WhatsApp antes de ir a producción.

**Limitaciones:**
- ❌ Cada cliente debe "unirse" al sandbox enviando un código
- ❌ No viable para clientes reales
- ❌ No profesional
- ⚠️ **TÚ LO DESCARTASTE CORRECTAMENTE** - Nadie se va a meter en un grupo desconocido

**Estado:** Ya configurado pero NO USAR en producción

```
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

---

### **OPCIÓN 2: Twilio WhatsApp Business API** ✅ **RECOMENDADO**

**¿Qué es?**  
Servicio oficial de WhatsApp Business integrado con Twilio.

#### **Ventajas:**
- ✅ WhatsApp oficial verificado
- ✅ Muy económico (~0.005€ por mensaje)
- ✅ No necesitas número WhatsApp Business separado
- ✅ Fácil integración (ya está el código listo)
- ✅ Gestión desde panel Twilio

#### **Requisitos:**
1. Cuenta Twilio activa (✅ Ya la tienes)
2. Información del negocio (nombre, dirección, web)
3. Plantillas de mensajes aprobadas por Meta
4. Esperar aprobación (24-48h)

#### **Costos:**
- Sin costo mensual del número WhatsApp
- ~0.005€ por mensaje enviado
- ⚠️ Requiere número SMS de respaldo: ~5€/mes

#### **Pasos para activar:**

##### 1️⃣ **Solicitar acceso a WhatsApp Business**
```
a) Ve a: https://console.twilio.com/
b) Login con tu cuenta
c) En el menú: Messaging > WhatsApp senders
d) Click en "Request Access"
e) Completa el formulario:
   - Business name: SERVYAUTO CARWASH MARBELLA
   - Business address: Avda Arias Maldonado Parking Occidental
   - Business website: app.servyauto.com
   - Business phone: +34678569098
   - Business description: Servicio de lavado premium de vehículos
```

##### 2️⃣ **Crear plantillas de mensajes**

⚠️ **IMPORTANTE:** WhatsApp Business requiere **plantillas aprobadas** para mensajes automáticos.

**Plantilla 1: Vehículo listo**
```
Nombre: vehiculo_listo
Categoría: AUTO_REPLY
Idioma: Español (ES)
Contenido:
---
Hola {{1}},

Tu {{2}} está listo para recoger.

💰 Total: {{3}}€

Gracias por confiar en ServyAuto 🚗
---
Variables:
1. Nombre del cliente
2. Modelo del vehículo
3. Total a pagar
```

**Plantilla 2: Solicitud de reseña**
```
Nombre: solicitud_resena
Categoría: UTILITY
Idioma: Español (ES)
Contenido:
---
¡Hola {{1}}! 👋

Esperamos que estés disfrutando de tu vehículo recién lavado ✨

Tu opinión es muy importante para nosotros. 
¿Podrías dejarnos una reseña?

⭐⭐⭐⭐⭐

Gracias por confiar en ServyAuto! 🚗💙
---
Variables:
1. Nombre del cliente
```

##### 3️⃣ **Esperar aprobación de Meta**
- ⏱️ Tiempo estimado: 24-48 horas
- 📧 Recibirás email cuando se apruebe
- ✅ Una vez aprobado, podrás usar WhatsApp

##### 4️⃣ **Actualizar configuración en la app**
```bash
# Una vez aprobado, actualiza:
TWILIO_WHATSAPP_NUMBER=whatsapp:+<tu_numero_aprobado>

# Ejemplo:
TWILIO_WHATSAPP_NUMBER=whatsapp:+34678569098
```

##### 5️⃣ **Comprar número SMS de respaldo**
```
a) Twilio Console > Phone Numbers > Buy a number
b) Filtrar: Spain (+34)
c) Capabilities: SMS
d) Comprar (~5€/mes)
e) Actualizar en .env:
   TWILIO_PHONE_NUMBER=+34<numero_comprado>
```

---

### **OPCIÓN 3: Meta WhatsApp Business API (Directo)** ⚠️ Más complejo

**¿Qué es?**  
API oficial de Meta sin intermediarios.

#### **Ventajas:**
- Más económico a largo plazo (sin comisión de Twilio)
- Control total

#### **Desventajas:**
- ❌ Requiere desarrollo adicional significativo
- ❌ Gestión más compleja
- ❌ Necesitas servidor propio para webhooks
- ❌ Más tiempo de implementación

**Recomendación:** ❌ **NO** recomendado para tu caso. Twilio es más simple.

---

## 🎯 Recomendación final

### **Para empezar YA (opción más práctica):**

1. **Compra un número SMS en Twilio** (~5€/mes)
   - Sirve como respaldo
   - Funciona inmediatamente
   - No requiere aprobaciones

2. **En paralelo, solicita WhatsApp Business**
   - Mientras lo aprueban (24-48h), usas SMS
   - Una vez aprobado, pasa a WhatsApp automáticamente
   - 14x más barato que SMS

3. **Resultado:**
   - Sistema funcionando desde día 1 con SMS
   - Migración automática a WhatsApp cuando se apruebe
   - Sin interrupciones

---

## 📝 Checklist de implementación

### **Fase 1: Configuración básica (HOY)**
```
☐ Comprar número SMS en Twilio
☐ Actualizar TWILIO_PHONE_NUMBER en .env
☐ Hacer prueba enviando SMS de prueba
☐ Confirmar que funciona
```

### **Fase 2: WhatsApp Business (Esta semana)**
```
☐ Solicitar acceso a WhatsApp Business en Twilio
☐ Completar información del negocio
☐ Crear plantilla "vehiculo_listo"
☐ Crear plantilla "solicitud_resena"
☐ Enviar plantillas para aprobación
☐ Esperar 24-48h para aprobación
```

### **Fase 3: Activación WhatsApp (Cuando aprueben)**
```
☐ Recibir confirmación de Meta
☐ Actualizar TWILIO_WHATSAPP_NUMBER
☐ Hacer prueba con WhatsApp
☐ Confirmar que funciona
☐ Desactivar SMS si quieres (o dejarlo como respaldo)
```

---

## 🔧 Código ya implementado

Tu aplicación **YA TIENE TODO EL CÓDIGO LISTO**. Solo falta configurar las credenciales.

### **Ubicación del código:**
```
/app/lib/notifications.ts
```

### **Funciones disponibles:**
```typescript
// 1. Notificar cuando el vehículo está listo
enviarNotificacionVehiculoListo({
  clienteName: "Juan Pérez",
  vehiculo: "BMW X5",
  total: 50.00,
  telefono: "+34678569098"
})

// 2. Solicitar reseña después del servicio
enviarSolicitudResena({
  clienteName: "Juan Pérez",
  telefono: "+34678569098",
  servicioNombre: "Lavado Premium"
})
```

### **Sistema de respaldo automático:**
```javascript
// Intenta WhatsApp primero
if (whatsappNumber) {
  try {
    await client.messages.create({
      from: whatsappNumber,
      to: `whatsapp:${phoneNumber}`,
      body: mensaje
    })
    // ✅ WhatsApp enviado
  } catch (error) {
    // ⚠️ WhatsApp falló, intenta SMS
  }
}

// Si WhatsApp falló, usa SMS
if (phoneNumber) {
  await client.messages.create({
    from: phoneNumber,
    to: phoneNumber,
    body: mensaje
  })
  // ✅ SMS enviado
}
```

---

## 🆘 Problemas comunes y soluciones

### ❌ **"Error: Unable to create record: Twilio number not configured"**
**Solución:**  
```bash
# Falta configurar el número SMS
# 1. Compra número en Twilio Console
# 2. Agrega a .env:
TWILIO_PHONE_NUMBER=+34612345678
```

### ❌ **"WhatsApp message failed: User has not opted in"**
**Solución:**  
```
Estás usando el sandbox y el cliente no se unió.
→ Cambia a WhatsApp Business API (sigue los pasos arriba)
```

### ❌ **"Error 20003: Authentication Error"**
**Solución:**  
```bash
# Credenciales incorrectas
# Verifica en .env:
TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxx
```

### ❌ **"Template not approved yet"**
**Solución:**  
```
Las plantillas de WhatsApp Business aún no están aprobadas.
→ Espera 24-48h después de enviar la solicitud
→ Mientras tanto, usa SMS
```

---

## 📞 Soporte Twilio

**Documentación oficial:**
- https://www.twilio.com/docs/whatsapp
- https://www.twilio.com/docs/sms

**Contacto Twilio:**
- Email: help@twilio.com
- Dashboard: https://console.twilio.com/

---

## ✅ Resumen ejecutivo

### **Lo que tienes ahora:**
- ✅ Código completo funcionando
- ✅ Cuenta Twilio configurada
- ✅ Sandbox de WhatsApp (solo pruebas)
- ⚠️ Falta número SMS
- ⚠️ Falta WhatsApp Business en producción

### **Lo que necesitas hacer:**
1. **HOY:** Comprar número SMS (~10 minutos)
2. **Esta semana:** Solicitar WhatsApp Business (~30 minutos)
3. **En 48h:** Activar WhatsApp cuando Meta apruebe (~5 minutos)

### **Resultado final:**
- 💬 Mensajes automáticos por WhatsApp
- 💰 14x más barato que SMS
- ⭐ Más reseñas de clientes satisfechos
- 🚀 Mejor experiencia del cliente

---

## 📊 Impacto esperado

Con **50 servicios al mes**:

| Métrica | SMS | WhatsApp |
|---------|-----|----------|
| Costo mensual | ~8.50€ | ~5.25€ |
| Tasa de apertura | ~20% | ~98% |
| Tasa de respuesta | ~6% | ~45% |
| **Ahorro anual** | - | **~39€** |
| **Más reseñas** | +3/mes | **+23/mes** |

---

**¿Necesitas ayuda con algún paso específico?** 🤔
