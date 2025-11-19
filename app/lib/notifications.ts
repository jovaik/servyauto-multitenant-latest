
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

let twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  if (!accountSid || !authToken) {
    console.warn('⚠️ Twilio credentials not configured. Notifications disabled.');
    return null;
  }

  if (!twilioClient) {
    twilioClient = twilio(accountSid, authToken);
  }

  return twilioClient;
}

export interface NotificationData {
  clienteName: string;
  vehiculo: string;
  total: number;
  telefono: string;
}

/**
 * Envía notificación automática al cliente cuando su vehículo está listo
 * Intenta WhatsApp primero, si falla envía SMS
 */
export async function enviarNotificacionVehiculoListo(data: NotificationData) {
  const client = getTwilioClient();
  
  if (!client) {
    console.log('❌ Notificaciones deshabilitadas - Credenciales de Twilio no configuradas');
    return {
      success: false,
      error: 'Twilio not configured',
      whatsappSent: false,
      smsSent: false
    };
  }

  // Limpiar el número de teléfono
  let phoneNumber = data.telefono.replace(/\s+/g, '');
  
  // Asegurar formato internacional
  if (!phoneNumber.startsWith('+')) {
    // Asumir España si no tiene código de país
    phoneNumber = '+34' + phoneNumber;
  }

  const mensaje = `Hola ${data.clienteName},

Tu ${data.vehiculo} está listo para recoger.

💰 Total: ${data.total.toFixed(2)}€

Gracias por confiar en ServyAuto 🚗`;

  const result = {
    success: false,
    whatsappSent: false,
    smsSent: false,
    error: null as string | null
  };

  // Intentar WhatsApp primero (más barato)
  if (whatsappNumber) {
    try {
      console.log(`📱 Intentando enviar WhatsApp a ${phoneNumber}...`);
      
      const whatsappMessage = await client.messages.create({
        from: whatsappNumber,
        to: `whatsapp:${phoneNumber}`,
        body: mensaje
      });

      console.log(`✅ WhatsApp enviado exitosamente (SID: ${whatsappMessage.sid})`);
      result.success = true;
      result.whatsappSent = true;
      return result;
      
    } catch (whatsappError: any) {
      console.warn(`⚠️ WhatsApp falló: ${whatsappError.message}`);
      console.log('🔄 Intentando enviar por SMS...');
    }
  }

  // Si WhatsApp falló o no está configurado, intentar SMS
  if (process.env.TWILIO_PHONE_NUMBER) {
    try {
      const smsMessage = await client.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
        body: mensaje
      });

      console.log(`✅ SMS enviado exitosamente (SID: ${smsMessage.sid})`);
      result.success = true;
      result.smsSent = true;
      return result;
      
    } catch (smsError: any) {
      console.error(`❌ SMS también falló: ${smsError.message}`);
      result.error = smsError.message;
      return result;
    }
  } else {
    result.error = 'Ni WhatsApp ni SMS configurados';
    return result;
  }
}

/**
 * Genera enlace de WhatsApp Web con mensaje pre-cargado para solicitud de reseña
 * MODO MANUAL: El usuario hace clic en el enlace para enviar desde su WhatsApp
 */
export function generarEnlaceWhatsAppResena(data: {
  clienteName: string;
  telefono: string;
}) {
  // Limpiar el número de teléfono
  let phoneNumber = data.telefono.replace(/\s+/g, '').replace(/\+/g, '');
  
  // Si no tiene código de país, asumir España (+34)
  if (!phoneNumber.startsWith('34')) {
    phoneNumber = '34' + phoneNumber;
  }

  // Mensaje de reseña personalizado
  const mensaje = `Hola ${data.clienteName},

Muchas gracias por su confianza. Esperamos volver a tenerles como clientes. Le agradeceríamos que dejase un comentario acerca de nuestros servicios en nuestra pagina de google. Este es el enlace directo:

https://opinas.es/servyautocarwashdeta

Muchas gracias`;

  // Codificar mensaje para URL
  const mensajeCodificado = encodeURIComponent(mensaje);
  
  // Generar enlace de WhatsApp Web
  const enlaceWhatsApp = `https://wa.me/${phoneNumber}?text=${mensajeCodificado}`;
  
  console.log('📱 Enlace WhatsApp generado para:', data.clienteName);
  console.log('Teléfono:', phoneNumber);
  
  return {
    success: true,
    whatsappUrl: enlaceWhatsApp,
    telefono: phoneNumber,
    mensaje: mensaje
  };
}

/**
 * Envía solicitud de reseña al cliente cuando termina el servicio
 * DEPRECADO: Ahora se usa generarEnlaceWhatsAppResena() para modo manual
 */
export async function enviarSolicitudResena(data: {
  clienteName: string;
  telefono: string;
  servicioNombre?: string;
}) {
  // Modo manual: generar enlace de WhatsApp en lugar de enviar automáticamente
  console.log('⚠️ Usando modo manual de WhatsApp. Generando enlace...');
  return generarEnlaceWhatsAppResena({
    clienteName: data.clienteName,
    telefono: data.telefono
  });
}

/**
 * Valida que las credenciales de Twilio estén configuradas
 */
export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && (phoneNumber || whatsappNumber));
}

/**
 * Obtiene el estado de la configuración de Twilio
 */
export function getTwilioStatus() {
  return {
    configured: isTwilioConfigured(),
    hasWhatsApp: !!whatsappNumber,
    hasSMS: !!phoneNumber,
    accountSid: accountSid ? `${accountSid.substring(0, 8)}...` : 'No configurado'
  };
}
