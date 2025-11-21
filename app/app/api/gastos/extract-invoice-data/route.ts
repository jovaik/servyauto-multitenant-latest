
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
  "categoria": "Combustible | Mantenimiento | Productos Lavado | Repuestos | Alquiler | Seguros | Limpieza | Suministros | Administración | Otros",
  "metodo_pago": "Efectivo | Tarjeta | Transferencia | Otro"
}

REGLAS ESTRICTAS:
1. Si encuentras el CIF/NIF, siempre inclúyelo completo con la letra
2. Si no encuentras CIF/NIF, devuelve null pero SIGUE BUSCANDO texto como "CIF", "NIF", "Tax ID"
3. El total es OBLIGATORIO (puede estar como "TOTAL", "IMPORTE", "A PAGAR")
4. La fecha debe ser la de emisión (no vencimiento ni entrega)
5. Devuelve SOLO JSON limpio, sin \`\`\`json ni texto extra`;

    // Llamar a la API de Vision
    console.log('🚀 [INVOICE-OCR] Enviando petición a Abacus.AI Vision API...');
    
    let visionResponse;
    try {
      const apiUrl = 'https://apps.abacus.ai/v1/chat/completions';
      
      console.log('📡 [INVOICE-OCR] URL de la API:', apiUrl);
      
      visionResponse = await fetch(apiUrl, {
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
                {
                  type: 'text',
                  text: extractionPrompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Data}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1000,
          temperature: 0.1
        })
      });

      console.log('📡 [INVOICE-OCR] Respuesta de Vision API - Status:', visionResponse.status);
      
      if (!visionResponse.ok) {
        const errorText = await visionResponse.text();
        console.error('❌ [INVOICE-OCR] Error de Vision API:', errorText);
        throw new Error(`Error de Vision API: ${visionResponse.status} - ${errorText}`);
      }

    } catch (error: any) {
      console.error('❌ [INVOICE-OCR] Error al llamar Vision API:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Error al procesar el documento con IA',
          details: error.message 
        },
        { status: 500 }
      );
    }

    // Procesar respuesta
    let aiResponse;
    try {
      aiResponse = await visionResponse.json();
      console.log('📦 [INVOICE-OCR] Respuesta completa de la API:', JSON.stringify(aiResponse, null, 2));
    } catch (error) {
      console.error('❌ [INVOICE-OCR] Error al parsear respuesta JSON:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Error al procesar respuesta de IA' 
        },
        { status: 500 }
      );
    }

    // Extraer contenido de la respuesta
    const content = aiResponse.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('❌ [INVOICE-OCR] No se recibió contenido de la IA');
      return NextResponse.json(
        { 
          success: false,
          error: 'No se pudo extraer datos del documento' 
        },
        { status: 500 }
      );
    }

    console.log('📄 [INVOICE-OCR] Contenido extraído:', content);

    // Parsear JSON de la respuesta
    let extractedData;
    try {
      // Limpiar markdown si existe
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedData = JSON.parse(cleanedContent);
      console.log('✅ [INVOICE-OCR] Datos parseados exitosamente:', extractedData);
    } catch (error) {
      console.error('❌ [INVOICE-OCR] Error al parsear JSON:', error);
      console.error('❌ [INVOICE-OCR] Contenido que falló:', content);
      return NextResponse.json(
        { 
          success: false,
          error: 'Error al parsear datos extraídos',
          rawContent: content
        },
        { status: 500 }
      );
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
