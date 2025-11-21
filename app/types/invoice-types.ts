
/**
 * Tipos TypeScript para el sistema de OCR de documentos
 * 
 * Este archivo contiene todas las interfaces y tipos necesarios
 * para el procesamiento de facturas y tickets.
 */

/**
 * Datos extraídos por OCR de una factura o ticket
 * Adaptado para ServyAuto Manager v8.9
 */
export interface ExtractedInvoiceData {
  /** Tipo de documento: 'FACTURA' o 'TICKET' */
  tipo_documento?: 'FACTURA' | 'TICKET' | string;
  
  /** Fecha del documento en formato YYYY-MM-DD */
  fecha?: string;
  
  /** Número de factura o ticket */
  numero_factura?: string;
  
  /** Nombre del proveedor */
  proveedor?: string;
  
  /** CIF/NIF del proveedor */
  cif?: string;
  
  /** CIF/NIF del proveedor (alternativo) */
  proveedor_cif?: string;
  
  /** Categoría del gasto (ServyAuto: tipoGasto) */
  categoria?: string;
  
  /** Base imponible (sin IVA) */
  base_imponible?: number;
  
  /** Importe del IVA */
  iva?: number;
  
  /** Porcentaje de IVA */
  iva_porcentaje?: number;
  
  /** Total a pagar (ServyAuto: importe) */
  total?: number;
  
  /** Descripción o concepto */
  concepto?: string;
  
  /** Método de pago */
  metodo_pago?: string;
  
  // ✅ Campos adicionales de ServyAuto
  /** Dirección del proveedor */
  proveedor_direccion?: string;
  
  /** Código postal del proveedor */
  proveedor_codigo_postal?: string;
  
  /** Ciudad del proveedor */
  proveedor_ciudad?: string;
  
  /** Provincia del proveedor */
  proveedor_provincia?: string;
}

/**
 * Props del componente InvoiceDocumentManagement
 */
export interface InvoiceDocumentManagementProps {
  /** Callback cuando se extraen datos del OCR */
  onExtractedDataChange?: (data: ExtractedInvoiceData) => void;
  
  /** Callback cuando se selecciona un archivo */
  onFileSelect?: (file: File) => void;
  
  /** Clases CSS adicionales */
  className?: string;
}

/**
 * Props del componente FourPointCropper
 */
export interface FourPointCropperProps {
  /** Archivo de imagen a recortar */
  file: File;
  
  /** Callback cuando se completa el recorte */
  onCropComplete: (blob: Blob) => void;
  
  /** Callback cuando se cancela */
  onCancel: () => void;
  
  /** Tipo de documento (opcional, para contexto) */
  docType?: string;
}

/**
 * Coordenadas de un punto en el canvas
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Cuatro esquinas de un documento
 */
export interface DocumentCorners {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

/**
 * Respuesta de la API de detección de documentos
 */
export interface DocumentDetectionResponse {
  success: boolean;
  corners?: DocumentCorners;
  confidence?: number;
  error?: string;
}

/**
 * Respuesta de la API de extracción de datos
 */
export interface InvoiceExtractionResponse {
  success: boolean;
  data?: ExtractedInvoiceData;
  error?: string;
}
