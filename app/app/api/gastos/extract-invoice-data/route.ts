
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🔵 [INVOICE-OCR] /api/gastos/extract-invoice-data - Inicio de petición');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    console.log('📥 [INVOICE-OCR] Parámetros recibidos:', {
      hasFile: !!file,
      fileSize: file?.size,
      fileName: file?.name,
      fileType: file?.type
    });

    if (!file) {
      console.error('❌ [INVOICE-OCR] No se proporcionó archivo');
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      );
    }

    // Convertir archivo a base64
    console.log('🔄 [INVOICE-OCR] Convirtiendo archivo a base64...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');
    console.log('✅ [INVOICE-OCR] Base64 generado:', base64Data.length, 'caracteres');

    // Determinar el tipo MIME correcto
    const mimeType = file.type || 'application/octet-stream';
    console.log('📄 [INVOICE-OCR] Tipo de archivo:', mimeType);

    // Usar API de Abacus.AI para análisis de facturas
    const apiKey = process.env.ABACUSAI_API_KEY;
    
    if (!apiKey) {
      console.error('❌ [INVOICE-OCR] No se encontró ABACUSAI_API_KEY');
      return NextResponse.json(
        { error: 'API key no configurada' },
        { status: 500 }
      );
    }
    console.log('🔑 [INVOICE-OCR] API key encontrada');

    // ✅ PROMPT MEJORADO PARA SERVYAUTO - EXTRACCIÓN AGRESIVA DE CIF/NIF
    const extractionPrompt = `Analiza esta factura o ticket ESPAÑOL y extrae TODOS los datos en formato JSON.

IMPORTANTE - CIF/NIF:
- Busca OBLIGATORIAMENTE el CIF o NIF del proveedor en TODAS las áreas del documento
- Formatos comunes: "CIF:", "NIF:", "C.I.F.:", "N.I.F.:", cerca del nombre de la empresa, en el encabezado, al final
- Patrones típicos: letra seguida de 8 dígitos (ej: B12345678, A87654321) o 8 dígitos seguidos de letra
- Si ves "NIF/CIF" seguido de un número, ese es el que necesito
- Si encuentras múltiples identificadores, elige el que esté cerca del nombre del proveedor

FORMATO DE RESPUESTA (JSON únicamente, sin markdown):
{
  "tipo_documento": "FACTURA o TICKET (si dice 'FACTURA SIMPLIFICADA' = TICKET)",
  "fecha": "YYYY-MM-DD (busca fecha de emisión, no de vencimiento)",
  "numero_factura": "número completo de factura/ticket",
  "proveedor": "nombre exacto de la empresa proveedora",
  "proveedor_cif": "CIF/NIF completo con letra (OBLIGATORIO, busca exhaustivamente)",
  "proveedor_direccion": "calle, número, edificio completo",
  "proveedor_codigo_postal": "5 dígitos del CP",
  "proveedor_ciudad": "ciudad/municipio",
  "proveedor_provincia": "provincia",
  "concepto": "descripción del servicio/producto principal",
  "base_imponible": número decimal sin símbolo €,
  "iva_porcentaje": 21 (o el porcentaje real si aparece),
  "iva_importe": número decimal del IVA,
  "total": número decimal total OBLIGATORIO,
  "categoria": "Combustible | Mantenimiento | Productos Lavado | Repuestos | Equipamiento | Alquiler | Seguros | Limpieza | Suministros | Administración | Otros",
  "metodo_pago": "Efectivo | Tarjeta | Transferencia | Otro"
}

REGLAS ESTRICTAS:
1. Si encuentras el CIF/NIF, siempre inclúyelo completo con la letra
2. Si no encuentras CIF/NIF, devuelve null pero SIGUE BUSCANDO texto como "CIF", "NIF", "Tax ID"
3. El total es OBLIGATORIO (puede estar como "TOTAL", "IMPORTE", "A PAGAR")
4. La fecha debe ser la de emisión (no vencimiento ni entrega)
5. Devuelve SOLO JSON limpio, sin \`\`\`json ni texto extra`;

    // Llamar a la API de Vision CON REINTENTOS
    console.log('🚀 [INVOICE-OCR] Enviando petición a Abacus.AI Vision API...');

    const apiUrl = 'https://apps.abacus.ai/v1/chat/completions';
    const MAX_INTENTOS = 2;
    let extractedData: any = null;
    let ultimoContenido = '';
    let ultimoError = '';

    for (let intento = 1; intento <= MAX_INTENTOS && !extractedData; intento++) {
      console.log(`🔁 [INVOICE-OCR] Intento ${intento}/${MAX_INTENTOS}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      try {
        const visionResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: extractionPrompt },
                  { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } }
                ]
              }
            ],
            max_tokens: 1000,
            temperature: 0.1
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log(`📡 [INVOICE-OCR] Status intento ${intento}:`, visionResponse.status);

        if (!visionResponse.ok) {
          ultimoError = `HTTP ${visionResponse.status}`;
          console.error('❌ [INVOICE-OCR] Vision API no OK:', await visionResponse.text().catch(() => ''));
          continue;
        }

        const aiResponse = await visionResponse.json();
        const content = aiResponse?.choices?.[0]?.message?.content;

        if (!content || typeof content !== 'string') {
          ultimoError = 'Sin contenido';
          console.error('❌ [INVOICE-OCR] Respuesta sin contenido');
          continue;
        }

        ultimoContenido = content;
        console.log('📄 [INVOICE-OCR] Contenido:', content.substring(0, 300));

        // Intentar extraer JSON del contenido (tolerante a texto extra / negativas)
        try {
          let cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          // Si el modelo añadió texto, quedarnos con el primer objeto JSON
          const primerLlave = cleaned.indexOf('{');
          const ultimaLlave = cleaned.lastIndexOf('}');
          if (primerLlave !== -1 && ultimaLlave !== -1 && ultimaLlave > primerLlave) {
            cleaned = cleaned.substring(primerLlave, ultimaLlave + 1);
          }
          extractedData = JSON.parse(cleaned);
          console.log('✅ [INVOICE-OCR] JSON parseado en intento', intento);
        } catch (parseErr) {
          ultimoError = 'No se pudo parsear JSON';
          console.error('❌ [INVOICE-OCR] Parse falló en intento', intento, '- reintentando...');
          // seguir al siguiente intento
        }

      } catch (error: any) {
        clearTimeout(timeoutId);
        ultimoError = error?.name === 'AbortError' ? 'Timeout (45s)' : (error?.message || 'Error de red');
        console.error(`❌ [INVOICE-OCR] Error intento ${intento}:`, ultimoError);
        // seguir al siguiente intento
      }
    }

    // Si tras los reintentos NO hay datos → devolver éxito parcial (formulario manual)
    // en vez de un 500 que bloquea la pantalla de recorte.
    if (!extractedData) {
      console.warn('⚠️ [INVOICE-OCR] Sin datos tras reintentos. Devolviendo formulario vacío. Último error:', ultimoError);
      return NextResponse.json({
        success: true,
        parcial: true,
        mensaje: 'No se pudieron leer los datos automáticamente. Rellena los campos a mano.',
        data: {
          tipo_documento: 'TICKET',
          fecha: null,
          numero_factura: '',
          proveedor: '',
          proveedor_cif: '',
          proveedor_direccion: '',
          proveedor_codigo_postal: '',
          proveedor_ciudad: '',
          proveedor_provincia: '',
          concepto: '',
          base_imponible: null,
          iva_porcentaje: 21,
          iva_importe: null,
          total: 0,
          categoria: 'Otros',
          metodo_pago: 'Efectivo'
        }
      });
    }

    // Normalizar datos para ServyAuto
    const normalizedData = {
      tipo_documento: extractedData.tipo_documento || 'TICKET',
      fecha: extractedData.fecha || null,
      numero_factura: extractedData.numero_factura || '',
      proveedor: extractedData.proveedor || '',
      proveedor_cif: extractedData.proveedor_cif || '',
      proveedor_direccion: extractedData.proveedor_direccion || '',
      proveedor_codigo_postal: extractedData.proveedor_codigo_postal || '',
      proveedor_ciudad: extractedData.proveedor_ciudad || '',
      proveedor_provincia: extractedData.proveedor_provincia || '',
      concepto: extractedData.concepto || extractedData.descripcion || '',
      base_imponible: extractedData.base_imponible ? Number(extractedData.base_imponible) : null,
      iva_porcentaje: extractedData.iva_porcentaje ? Number(extractedData.iva_porcentaje) : 21,
      iva_importe: extractedData.iva_importe ? Number(extractedData.iva_importe) : null,
      total: extractedData.total ? Number(extractedData.total) : 0,
      categoria: extractedData.categoria || 'Otros',
      metodo_pago: extractedData.metodo_pago || 'Efectivo'
    };

    console.log('✅ [INVOICE-OCR] Datos normalizados:', normalizedData);

    return NextResponse.json({
      success: true,
      data: normalizedData
    });

  } catch (error: any) {
    console.error('❌ [INVOICE-OCR] Error general:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al procesar el documento',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
