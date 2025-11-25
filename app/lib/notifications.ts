
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
  // Limpiar el número de teléfono (quitar espacios en blanco)
  let phoneNumber = data.telefono.replace(/\s+/g, '');
  
  // Quitar el signo + si existe (WhatsApp Web lo requiere sin +)
  phoneNumber = phoneNumber.replace(/^\+/, '');
  
  // Guardar el número original para mostrar
  const numeroOriginal = data.telefono;
  
  // ⭐ CORRECCIÓN DEFINITIVA: WhatsApp Web REQUIERE código de país
  // Aunque la app móvil funcione sin prefijo dentro del mismo país,
  // WhatsApp Web (wa.me) SIEMPRE necesita el formato internacional completo
  // 
  // REGLA: Si el número tiene 9 dígitos y empieza con 6/7/8/9 → es español → agregar 34
  if (phoneNumber.length === 9 && /^[6-9]/.test(phoneNumber)) {
    console.log('📱 Número español detectado (9 dígitos):', phoneNumber);
    phoneNumber = '34' + phoneNumber;
    console.log('📱 Prefijo 34 agregado para WhatsApp Web:', phoneNumber);
  } else {
    console.log('📱 Número internacional o ya con prefijo:', phoneNumber);
  }
  
  // Números válidos para WhatsApp Web:
  //   - España: 34658347687
  //   - Marruecos: 212612345678
  //   - Francia: 33612345678

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
  console.log('Teléfono original:', numeroOriginal);
  console.log('Teléfono para WhatsApp:', phoneNumber);
  
  return {
    success: true,
    whatsappUrl: enlaceWhatsApp,
    telefono: numeroOriginal, // Devolver el número original sin modificar
    telefonoCompleto: `+${phoneNumber}`, // Número completo con formato internacional
    mensaje: mensaje
  };
}

/**
 * Genera enlace de SMS con mensaje pre-cargado para solicitud de reseña
 * MODO MANUAL: El usuario hace clic en el enlace para enviar desde su app de SMS
 */
export function generarEnlaceSMSResena(data: {
  clienteName: string;
  telefono: string;
}) {
  // Limpiar el número de teléfono (quitar espacios en blanco)
  let phoneNumber = data.telefono.replace(/\s+/g, '');
  
  // Agregar + si no lo tiene (SMS requiere formato internacional con +)
  if (!phoneNumber.startsWith('+')) {
    // Si el número no tiene código de país, agregamos +34 (España) como último recurso
    if (phoneNumber.length === 9 && /^[6-9]/.test(phoneNumber)) {
      phoneNumber = '+34' + phoneNumber;
    } else if (!phoneNumber.startsWith('34')) {
      phoneNumber = '+' + phoneNumber;
    } else {
      phoneNumber = '+' + phoneNumber;
    }
  }
  
  // Guardar el número original para mostrar
  const numeroOriginal = data.telefono;

  // Mensaje de reseña personalizado (igual que WhatsApp)
  const mensaje = `Hola ${data.clienteName},

Muchas gracias por su confianza. Esperamos volver a tenerles como clientes. Le agradeceríamos que dejase un comentario acerca de nuestros servicios en nuestra pagina de google. Este es el enlace directo:

https://opinas.es/servyautocarwashdeta

Muchas gracias`;

  // Codificar mensaje para URL
  const mensajeCodificado = encodeURIComponent(mensaje);
  
  // Generar enlace de SMS
  const enlaceSMS = `sms:${phoneNumber}?body=${mensajeCodificado}`;
  
  console.log('📧 Enlace SMS generado para:', data.clienteName);
  console.log('Teléfono original:', numeroOriginal);
  console.log('Teléfono para SMS:', phoneNumber);
  
  return {
    success: true,
    smsUrl: enlaceSMS,
    telefono: numeroOriginal,
    telefonoCompleto: phoneNumber,
    mensaje: mensaje
  };
}

/**
 * Envía solicitud de reseña al cliente cuando termina el servicio
 * DEPRECADO: Ahora se usa generarEnlaceWhatsAppResena() o generarEnlaceSMSResena() para modo manual
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

/**
 * Genera enlaces de WhatsApp y SMS para confirmación de depósito de vehículo
 * Se utiliza al crear/editar una cita para confirmar la recepción del vehículo
 */
export function generarEnlaceConfirmacionDeposito(data: {
  clienteName: string;
  telefono: string;
  vehiculo: {
    marca: string;
    modelo: string;
    matricula: string;
  };
  fecha: string; // formato: "dd/mm/yyyy - HH:mm"
  servicios: string[]; // lista de nombres de servicios
  box: string;
}) {
  // Limpiar el número de teléfono (quitar espacios en blanco)
  let phoneNumber = data.telefono.replace(/\s+/g, '');
  
  // Quitar el signo + si existe (WhatsApp Web lo requiere sin +)
  phoneNumber = phoneNumber.replace(/^\+/, '');
  
  // Guardar el número original para mostrar
  const numeroOriginal = data.telefono;
  
  // Agregar prefijo 34 para números españoles de 9 dígitos
  if (phoneNumber.length === 9 && /^[6-9]/.test(phoneNumber)) {
    console.log('📱 Número español detectado (9 dígitos):', phoneNumber);
    phoneNumber = '34' + phoneNumber;
    console.log('📱 Prefijo 34 agregado para WhatsApp Web:', phoneNumber);
  } else {
    console.log('📱 Número internacional o ya con prefijo:', phoneNumber);
  }

  // Formatear lista de servicios
  const serviciosTexto = data.servicios.length > 0 
    ? data.servicios.map(s => `• ${s}`).join('\n')
    : '• Servicio estándar';

  // Mensaje de confirmación de depósito personalizado
  const mensaje = `Hola ${data.clienteName},

¡Hemos recibido su vehículo en ServyAuto! 🚗

📋 *CONFIRMACIÓN DE DEPÓSITO*

🚙 Vehículo: ${data.vehiculo.marca} ${data.vehiculo.modelo}
🔢 Matrícula: ${data.vehiculo.matricula}
📅 Fecha: ${data.fecha}
📍 Box asignado: ${data.box}

🔧 *Servicios solicitados:*
${serviciosTexto}

Le mantendremos informado del progreso de su vehículo.
¡Gracias por confiar en nosotros!

*ServyAuto Car Wash & Detailing*
📞 +34 678 569 098`;

  const mensajeCodificado = encodeURIComponent(mensaje);
  
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${mensajeCodificado}`;
  const smsUrl = `sms:${phoneNumber}?body=${mensajeCodificado}`;

  console.log('✅ Enlaces de confirmación de depósito generados correctamente');
  console.log('📱 Número para WhatsApp:', phoneNumber);
  console.log('🔗 WhatsApp URL:', whatsappUrl);
  console.log('📧 SMS URL:', smsUrl);

  return {
    success: true,
    smsUrl,
    whatsappUrl,
    phoneNumber,
    numeroOriginal,
    mensaje
  };
}

/**
 * Genera enlaces de WhatsApp y SMS para notificar al cliente que su vehículo está listo para recoger
 * Se utiliza al marcar una cita como LISTO_PARA_RECOGER
 */
export function generarEnlaceNotificacionListoParaRecoger(data: {
  clienteName: string;
  telefono: string;
  vehiculo: {
    marca: string;
    modelo: string;
    matricula: string;
  };
  total?: number;
  metodoPago?: string;
}) {
  // Limpiar el número de teléfono (quitar espacios en blanco)
  let phoneNumber = data.telefono.replace(/\s+/g, '');
  
  // Quitar el signo + si existe (WhatsApp Web lo requiere sin +)
  phoneNumber = phoneNumber.replace(/^\+/, '');
  
  // Guardar el número original para mostrar
  const numeroOriginal = data.telefono;
  
  // Agregar prefijo 34 para números españoles de 9 dígitos
  if (phoneNumber.length === 9 && /^[6-9]/.test(phoneNumber)) {
    console.log('📱 Número español detectado (9 dígitos):', phoneNumber);
    phoneNumber = '34' + phoneNumber;
    console.log('📱 Prefijo 34 agregado para WhatsApp Web:', phoneNumber);
  } else {
    console.log('📱 Número internacional o ya con prefijo:', phoneNumber);
  }

  // Formatear información de pago si está disponible
  const infoPago = data.total && data.metodoPago 
    ? `\n💰 Total: ${data.total.toFixed(2)}€\n💳 Forma de pago: ${data.metodoPago}\n`
    : '';

  // Mensaje de notificación de vehículo listo
  const mensaje = `Hola ${data.clienteName},

¡Buenas noticias! Su vehículo está listo para recoger. 🎉

🚙 Vehículo: ${data.vehiculo.marca} ${data.vehiculo.modelo}
🔢 Matrícula: ${data.vehiculo.matricula}${infoPago}
Puede pasar a recogerlo cuando le resulte conveniente durante nuestro horario de atención.

¡Gracias por confiar en ServyAuto! 🚗✨

*ServyAuto Car Wash & Detailing*
📞 +34 678 569 098`;

  const mensajeCodificado = encodeURIComponent(mensaje);
  
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${mensajeCodificado}`;
  const smsUrl = `sms:${phoneNumber}?body=${mensajeCodificado}`;

  console.log('✅ Enlaces de notificación de vehículo listo generados correctamente');
  console.log('📱 Número para WhatsApp:', phoneNumber);
  console.log('🔗 WhatsApp URL:', whatsappUrl);
  console.log('📧 SMS URL:', smsUrl);

  return {
    success: true,
    smsUrl,
    whatsappUrl,
    phoneNumber,
    numeroOriginal,
    mensaje
  };
}