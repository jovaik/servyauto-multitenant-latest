
# 📱 Sistema de Notificaciones ServyAuto

## ✅ **Estado Actual: CONFIGURADO**

Las notificaciones automáticas ya están **activadas y funcionando**.

---

## 🎯 **Cómo Funciona**

Cuando marcas una cita como **COMPLETADA** en la app:

1. 📱 Se intenta enviar **WhatsApp** primero
2. 💬 Si falla WhatsApp → envía **SMS** automáticamente
3. ✅ El cliente recibe:

```
Hola [Nombre del Cliente],

Tu [Marca Modelo - Matrícula] está listo para recoger.

💰 Total: XX.XX€

Gracias por confiar en ServyAuto 🚗
```

---

## 🔧 **Credenciales Configuradas**

✅ **Account SID:** `ACGBbedbd076dc570cb2575f5f52c26274`  
✅ **Auth Token:** `d4922fcf768aeef7d6cdf16c7a1f84c10`  
✅ **WhatsApp Sandbox:** `+1 415 523 8886`  
⚠️ **SMS:** No configurado (requiere número de teléfono)

---

## 📱 **WhatsApp Sandbox (ACTIVO)**

### ⚠️ **IMPORTANTE - Pasos para que los clientes reciban WhatsApp:**

Los clientes deben **unirse al sandbox** primero:

1. **Abrir WhatsApp** en su teléfono
2. **Agregar el número:** `+1 415 523 8886`
3. **Enviar el mensaje:** `join mass-rhythm`
4. **Confirmación:** Recibirán un mensaje de confirmación

✅ **Después de esto**, podrán recibir notificaciones automáticas por WhatsApp.

### **Limitaciones del Sandbox:**
- ⚠️ Cada cliente debe unirse manualmente
- ⚠️ Solo válido para pruebas (no producción)
- ✅ **Gratis** - no cuesta nada

---

## 💬 **SMS (NO CONFIGURADO)**

Para activar **SMS como fallback**:

### **Opción 1: Comprar número Twilio (Recomendado)**

1. Ve a: https://console.twilio.com/
2. **Phone Numbers → Buy a number**
3. Compra un número español (+34): **~$1.30/mes**
4. Agrega el número al `.env`:
   ```
   TWILIO_PHONE_NUMBER=+34612345678
   ```

**Costo SMS:** ~$0.08 por mensaje a España

### **Opción 2: Usar WhatsApp Business API (Producción)**

Para uso en producción profesional:

1. **Solicitar WhatsApp Business API**
   - Ve a: https://www.twilio.com/whatsapp
   - Requiere aprobación de Meta
   - Permite enviar sin que clientes se unan al sandbox

2. **Costos:**
   - Sin mensualidad de número
   - Solo pagas por mensaje enviado
   - Más barato que SMS

---

## 🧪 **Probar las Notificaciones**

### **Paso 1: Unirte al Sandbox de WhatsApp**

Desde tu teléfono:
1. Abre WhatsApp
2. Agregar contacto: `+1 415 523 8886`
3. Enviar: `join mass-rhythm`

### **Paso 2: Marcar una cita como COMPLETADA**

1. Ve a tu app: https://servyautoges.abacusai.app
2. Abre una cita de prueba
3. Marca el estado como **COMPLETADA**
4. El sistema enviará automáticamente el WhatsApp

### **Paso 3: Verificar en logs**

Los logs del servidor mostrarán:
```
📱 Intentando enviar WhatsApp a +34612345678...
✅ WhatsApp enviado exitosamente (SID: SMxxxxxxxxxx)
```

O si falla:
```
⚠️ WhatsApp falló: [motivo]
🔄 Intentando enviar por SMS...
❌ SMS también falló: No phone number configured
```

---

## 📊 **Costos Twilio**

| Servicio | Costo |
|----------|-------|
| WhatsApp Sandbox | **GRATIS** (solo pruebas) |
| WhatsApp Business API | ~$0.005 - $0.02 por mensaje |
| SMS a España | ~$0.08 por mensaje |
| Número Español | ~$1.30/mes |
| Saldo actual | **$15.50** (trial) |

---

## 🔍 **Verificar Estado**

Para ver si las credenciales están configuradas correctamente:

```bash
cd /home/ubuntu/servyauto_manager_v89/app
cat .env | grep TWILIO
```

Deberías ver:
```
TWILIO_ACCOUNT_SID=ACGBbedbd076dc570cb2575f5f52c26274
TWILIO_AUTH_TOKEN=d4922fcf768aeef7d6cdf16c7a1f84c10
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

---

## ⚠️ **Limitaciones de Cuenta Trial**

Tu cuenta Twilio es **trial**, lo que significa:

- ✅ $15.50 de crédito gratis
- ⚠️ Solo puedes enviar a **números verificados**
- ⚠️ WhatsApp Sandbox requiere que clientes se unan

Para **producción**, necesitas:
1. **Actualizar a cuenta de pago** (sin costo inicial)
2. O usar solo el saldo de prueba para testear

---

## 📞 **Soporte**

- **Consola Twilio:** https://console.twilio.com/
- **Documentación:** https://www.twilio.com/docs
- **WhatsApp Business API:** https://www.twilio.com/whatsapp

---

## ✨ **Próximos Pasos Recomendados**

1. ✅ **Probar WhatsApp Sandbox** - Unirte y hacer prueba
2. 💰 **Decidir sobre SMS** - ¿Necesitas fallback por SMS?
3. 🚀 **WhatsApp Business API** - Para producción sin sandbox
4. 📊 **Monitorear uso** - Ver consumo en consola Twilio

---

**¡El sistema está listo para usar!** 🎉

Solo necesitas que tus clientes se unan al WhatsApp Sandbox para recibir notificaciones.
