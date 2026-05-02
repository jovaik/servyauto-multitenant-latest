/**
 * Base de datos de categorías de vehículos por marca y modelo.
 * Categorías basadas en los criterios de ServyAuto:
 * - PEQ: Coches pequeños, 2 puertas, city cars (Fiat 500, Mini, Smart...)
 * - MED: La inmensa mayoría. Compactos, berlinas medias, SUV compactos
 *   (BMW 1-4, X1-X4, Audi A1-A5, Q2-Q3, Mercedes A/B/C/GLA/GLB/GLC...)
 * - GR: Coches grandes, berlinas grandes, SUV grandes
 *   (Audi Q5-Q8, A6-A8, BMW X5-X7, 5-7 series, Mercedes S/E/GLE/GLS...)
 * - EXTGR: Monovolúmenes, furgonetas, vehículos muy grandes
 *   (Mercedes V-class, VW Multivan/Caravelle, Ford Transit...)
 */

export type VehicleCategory = 'PEQ' | 'MED' | 'GR' | 'EXTGR'

export const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  PEQ: 'Pequeño',
  MED: 'Mediano',
  GR: 'Grande',
  EXTGR: 'Extra Grande / Monovolumen',
}

export const CATEGORY_COLORS: Record<VehicleCategory, { bg: string; text: string; border: string }> = {
  PEQ: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  MED: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  GR: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  EXTGR: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
}

export const CATEGORY_EMOJIS: Record<VehicleCategory, string> = {
  PEQ: '🚗',
  MED: '🚙',
  GR: '🚐',
  EXTGR: '🚌',
}

// ============================================================
// BASE DE DATOS DE MODELOS
// Cada marca tiene modelos con su categoría asignada.
// La clave del modelo se busca como subcadena dentro del modelo real
// (ej: "X3" coincide con "X3", "X3 XDRIVE", "X30E", etc.)
// IMPORTANTE: Los modelos se evalúan en orden, el más específico primero.
// ============================================================

type ModelEntry = { pattern: string; category: VehicleCategory }

const VEHICLE_DATABASE: Record<string, ModelEntry[]> = {
  // ==================== PREMIUM ALEMANAS ====================
  BMW: [
    // EXTGR
    // GR - Series grandes y SUV grandes
    { pattern: 'X7', category: 'GR' },
    { pattern: 'X6', category: 'GR' },
    { pattern: 'X5', category: 'GR' },
    { pattern: 'IX', category: 'GR' },
    { pattern: 'SERIE 7', category: 'GR' },
    { pattern: 'Serie 7', category: 'GR' },
    { pattern: 'SERIE7', category: 'GR' },
    { pattern: 'SERIE 6', category: 'GR' },
    { pattern: 'Serie 6', category: 'GR' },
    { pattern: 'SERIE6', category: 'GR' },
    { pattern: 'SERIE 5', category: 'GR' },
    { pattern: 'Serie 5', category: 'GR' },
    { pattern: 'SERIE5', category: 'GR' },
    { pattern: '7', category: 'GR' },   // 730, 740, 750...
    { pattern: '6', category: 'GR' },   // 630, 640...
    { pattern: '5', category: 'GR' },   // 520, 530...
    // MED - Series compactas y SUV compactos
    { pattern: 'X4', category: 'MED' },
    { pattern: 'X3', category: 'MED' },
    { pattern: 'X2', category: 'MED' },
    { pattern: 'X1', category: 'MED' },
    { pattern: 'SERIE 4', category: 'MED' },
    { pattern: 'Serie 4', category: 'MED' },
    { pattern: 'SERIE4', category: 'MED' },
    { pattern: 'SERIE 3', category: 'MED' },
    { pattern: 'Serie 3', category: 'MED' },
    { pattern: 'SERIE3', category: 'MED' },
    { pattern: 'SERIE 2', category: 'MED' },
    { pattern: 'Serie 2', category: 'MED' },
    { pattern: 'SERIE2', category: 'MED' },
    { pattern: 'SERIE 1', category: 'MED' },
    { pattern: 'Serie 1', category: 'MED' },
    { pattern: 'SERIE1', category: 'MED' },
    { pattern: 'M4', category: 'MED' },
    { pattern: 'M3', category: 'MED' },
    { pattern: 'M2', category: 'MED' },
    { pattern: 'M1', category: 'MED' },
    { pattern: '4', category: 'MED' },   // 420, 430, 440...
    { pattern: '3', category: 'MED' },   // 318, 320, 330...
    { pattern: '2', category: 'MED' },   // 218, 220...
    { pattern: '1', category: 'MED' },   // 116, 118, 120...
    { pattern: 'Z4', category: 'MED' },
    { pattern: 'Z3', category: 'MED' },
    { pattern: 'I4', category: 'MED' },
    { pattern: 'I3', category: 'PEQ' },
  ],

  MERCEDES: [
    // EXTGR - Furgonetas
    { pattern: 'V2', category: 'EXTGR' },  // V220, V250, V300
    { pattern: 'V-CLASS', category: 'EXTGR' },
    { pattern: 'VITO', category: 'EXTGR' },
    { pattern: 'SPRINTER', category: 'EXTGR' },
    { pattern: 'CITAN', category: 'EXTGR' },
    // GR - Grandes berlinas, SUV grandes
    { pattern: 'GLS', category: 'GR' },
    { pattern: 'GLE', category: 'GR' },
    { pattern: 'G63', category: 'GR' },
    { pattern: 'G65', category: 'GR' },
    { pattern: 'CLASE G', category: 'GR' },
    { pattern: 'G-CLASS', category: 'GR' },
    { pattern: 'CLASE S', category: 'GR' },
    { pattern: 'S-CLASS', category: 'GR' },
    { pattern: 'S 500', category: 'GR' },
    { pattern: 'S350', category: 'GR' },
    { pattern: 'S500', category: 'GR' },
    { pattern: 'S63', category: 'GR' },
    { pattern: 'CLASE E', category: 'GR' },
    { pattern: 'CLASSE E', category: 'GR' },
    { pattern: 'E-CLASS', category: 'GR' },
    { pattern: 'E 350', category: 'GR' },
    { pattern: 'E220', category: 'GR' },
    { pattern: 'E350', category: 'GR' },
    { pattern: 'CLS', category: 'GR' },
    { pattern: 'SL6', category: 'GR' },   // SL600, SL63
    { pattern: 'SL5', category: 'GR' },
    { pattern: 'AMG GT', category: 'GR' },
    { pattern: 'EQS', category: 'GR' },
    { pattern: 'EQE', category: 'GR' },
    // MED - Compactos, SUV compactos
    { pattern: 'GLC', category: 'MED' },
    { pattern: 'GLB', category: 'MED' },
    { pattern: 'GLA', category: 'MED' },
    { pattern: 'CLASE C', category: 'MED' },
    { pattern: 'CLASE B', category: 'MED' },
    { pattern: 'CLASE A', category: 'MED' },
    { pattern: 'C-CLASS', category: 'MED' },
    { pattern: 'C220', category: 'MED' },
    { pattern: 'C200', category: 'MED' },
    { pattern: 'C180', category: 'MED' },
    { pattern: 'C300', category: 'MED' },
    { pattern: 'B180', category: 'MED' },
    { pattern: 'B200', category: 'MED' },
    { pattern: 'A200', category: 'MED' },
    { pattern: 'A180', category: 'MED' },
    { pattern: 'A250', category: 'MED' },
    { pattern: 'A45', category: 'MED' },
    { pattern: 'A35', category: 'MED' },
    { pattern: 'CLA', category: 'MED' },
    { pattern: 'CLE', category: 'MED' },
    { pattern: 'CLC', category: 'MED' },
    { pattern: 'SLK', category: 'MED' },
    { pattern: 'SLC', category: 'MED' },
    { pattern: 'AMG', category: 'MED' },   // AMG genérico → MED por defecto
    { pattern: 'EQA', category: 'MED' },
    { pattern: 'EQB', category: 'MED' },
    { pattern: 'BENZ', category: 'MED' },  // entrada genérica
  ],

  // También cubrir "MERCEDEA" (typo en la BD)
  MERCEDEA: [
    { pattern: 'CLE', category: 'MED' },
  ],

  'MERCEDES ': [
    { pattern: 'GLE', category: 'GR' },
  ],

  AUDI: [
    // GR
    { pattern: 'Q8', category: 'GR' },
    { pattern: 'Q7', category: 'GR' },
    { pattern: 'Q6', category: 'GR' },
    { pattern: 'Q5', category: 'GR' },
    { pattern: 'A8', category: 'GR' },
    { pattern: 'A7', category: 'GR' },
    { pattern: 'A6', category: 'GR' },
    { pattern: 'RS7', category: 'GR' },
    { pattern: 'RS6', category: 'GR' },
    { pattern: 'E-TRON GT', category: 'GR' },
    // MED
    { pattern: 'Q4', category: 'MED' },
    { pattern: 'Q3', category: 'MED' },
    { pattern: 'Q2', category: 'MED' },
    { pattern: 'A5', category: 'MED' },
    { pattern: 'S5', category: 'MED' },
    { pattern: 'A4', category: 'MED' },
    { pattern: 'S4', category: 'MED' },
    { pattern: 'A3', category: 'MED' },
    { pattern: 'S3', category: 'MED' },
    { pattern: 'RS3', category: 'MED' },
    { pattern: 'A2', category: 'MED' },
    { pattern: 'A1', category: 'PEQ' },
    { pattern: 'TT', category: 'MED' },
    { pattern: 'E-TRON', category: 'GR' },
  ],

  PORSCHE: [
    // GR
    { pattern: 'CAYENNE', category: 'GR' },
    { pattern: 'PANAMERA', category: 'GR' },
    { pattern: 'TAYCAN', category: 'GR' },
    // MED
    { pattern: 'MACAN', category: 'MED' },
    { pattern: '911', category: 'MED' },
    { pattern: 'CARRERA', category: 'MED' },
    { pattern: 'TARGA', category: 'MED' },
    { pattern: 'CAYMAN', category: 'MED' },
    { pattern: 'BOXSTER', category: 'MED' },
    { pattern: '718', category: 'MED' },
  ],

  VW: [
    // EXTGR
    { pattern: 'MULTIVAN', category: 'EXTGR' },
    { pattern: 'CARAVELLE', category: 'EXTGR' },
    { pattern: 'TRANSPORTER', category: 'EXTGR' },
    { pattern: 'CALIFORNIA', category: 'EXTGR' },
    { pattern: 'CRAFTER', category: 'EXTGR' },
    { pattern: 'CADDY', category: 'EXTGR' },
    { pattern: 'AMAROK', category: 'GR' },
    // GR
    { pattern: 'TOUAREG', category: 'GR' },
    { pattern: 'ARTEON', category: 'GR' },
    { pattern: 'PASSAT', category: 'GR' },
    { pattern: 'ID.7', category: 'GR' },
    // MED
    { pattern: 'TIGUAN', category: 'MED' },
    { pattern: 'TOURAN', category: 'MED' },
    { pattern: 'T-ROC', category: 'MED' },
    { pattern: 'TROC', category: 'MED' },
    { pattern: 'T-CROSS', category: 'MED' },
    { pattern: 'TCROSS', category: 'MED' },
    { pattern: 'GOLF', category: 'MED' },
    { pattern: 'ID.4', category: 'MED' },
    { pattern: 'ID.3', category: 'MED' },
    { pattern: 'ID.5', category: 'MED' },
    { pattern: 'TAIGO', category: 'MED' },
    { pattern: 'EOS', category: 'MED' },
    { pattern: 'SCIROCCO', category: 'MED' },
    { pattern: 'BEATLE', category: 'MED' },
    { pattern: 'BEETLE', category: 'MED' },
    // PEQ
    { pattern: 'POLO', category: 'PEQ' },
    { pattern: 'UP', category: 'PEQ' },
    { pattern: 'E-UP', category: 'PEQ' },
  ],

  VOLKSWAGEN: [
    { pattern: 'GOLF', category: 'MED' },
    { pattern: 'POLO', category: 'PEQ' },
    { pattern: 'TIGUAN', category: 'MED' },
    { pattern: 'TOUAREG', category: 'GR' },
    { pattern: 'PASSAT', category: 'GR' },
  ],

  // ==================== ESPAÑOLAS ====================
  SEAT: [
    { pattern: 'TARRACO', category: 'GR' },
    { pattern: 'ATECA', category: 'MED' },
    { pattern: 'LEON', category: 'MED' },
    { pattern: 'ARONA', category: 'MED' },
    { pattern: 'IBIZA', category: 'PEQ' },
    { pattern: 'MII', category: 'PEQ' },
    { pattern: 'ALTEA', category: 'MED' },
    { pattern: 'ALHAMBRA', category: 'EXTGR' },
    { pattern: 'ARENA', category: 'MED' },
  ],

  CUPRA: [
    { pattern: 'TERRAMAR', category: 'GR' },
    { pattern: 'TAVASCAN', category: 'GR' },
    { pattern: 'FORMENTOR', category: 'MED' },
    { pattern: 'LEON', category: 'MED' },
    { pattern: 'BORN', category: 'MED' },
    { pattern: 'ATECA', category: 'MED' },
  ],

  // ==================== FRANCESAS ====================
  PEUGEOT: [
    // EXTGR
    { pattern: 'TRAVELLER', category: 'EXTGR' },
    { pattern: 'PARTNER', category: 'EXTGR' },
    { pattern: 'RIFTER', category: 'EXTGR' },
    { pattern: 'EXPERT', category: 'EXTGR' },
    // GR
    { pattern: '5008', category: 'GR' },
    { pattern: '508', category: 'GR' },
    // MED
    { pattern: '4008', category: 'MED' },
    { pattern: '3008', category: 'MED' },
    { pattern: '308', category: 'MED' },
    { pattern: '2008', category: 'MED' },
    { pattern: '307', category: 'MED' },
    { pattern: '406', category: 'MED' },
    // PEQ
    { pattern: '208', category: 'PEQ' },
    { pattern: '207', category: 'PEQ' },
    { pattern: '206', category: 'PEQ' },
    { pattern: '108', category: 'PEQ' },
    { pattern: '107', category: 'PEQ' },
  ],

  RENAULT: [
    // EXTGR
    { pattern: 'ESPACE', category: 'EXTGR' },
    { pattern: 'TRAFIC', category: 'EXTGR' },
    { pattern: 'KANGOO', category: 'EXTGR' },
    { pattern: 'SCENIC', category: 'MED' },
    // GR
    { pattern: 'KOLEOS', category: 'GR' },
    { pattern: 'TALISMAN', category: 'GR' },
    // MED
    { pattern: 'KADJAR', category: 'MED' },
    { pattern: 'ARKANA', category: 'MED' },
    { pattern: 'AUSTRAL', category: 'MED' },
    { pattern: 'MEGANE', category: 'MED' },
    { pattern: 'CAPTUR', category: 'MED' },
    { pattern: 'CLIO', category: 'PEQ' },
    { pattern: 'ZOE', category: 'PEQ' },
    { pattern: 'TWINGO', category: 'PEQ' },
    { pattern: 'CABRIO', category: 'MED' },
    { pattern: 'ASTRA', category: 'MED' },
  ],

  CITROEN: [
    // EXTGR
    { pattern: 'SPACETOURER', category: 'EXTGR' },
    { pattern: 'BERLINGO', category: 'EXTGR' },
    { pattern: 'JUMPY', category: 'EXTGR' },
    // GR
    { pattern: 'C5 AIRCROSS', category: 'GR' },
    { pattern: 'C5', category: 'GR' },
    // MED
    { pattern: 'C4', category: 'MED' },
    { pattern: 'C3 AIRCROSS', category: 'MED' },
    { pattern: 'C3', category: 'PEQ' },
    { pattern: 'C2', category: 'PEQ' },
    { pattern: 'C1', category: 'PEQ' },
  ],

  DS: [
    { pattern: 'DS7', category: 'GR' },
    { pattern: '7', category: 'GR' },
    { pattern: 'DS5', category: 'MED' },
    { pattern: 'Ds5', category: 'MED' },
    { pattern: 'DS4', category: 'MED' },
    { pattern: 'DS3', category: 'PEQ' },
  ],

  DACIA: [
    { pattern: 'DUSTER', category: 'MED' },
    { pattern: 'JOGGER', category: 'MED' },
    { pattern: 'SANDERO', category: 'PEQ' },
    { pattern: 'SPRING', category: 'PEQ' },
    { pattern: 'LOGAN', category: 'MED' },
  ],

  // ==================== JAPONESAS ====================
  TOYOTA: [
    // EXTGR
    { pattern: 'PROACE', category: 'EXTGR' },
    // GR
    { pattern: 'LAND CRUISER', category: 'GR' },
    { pattern: 'HIGHLANDER', category: 'GR' },
    // MED
    { pattern: 'RAV4', category: 'MED' },
    { pattern: 'RAV 4', category: 'MED' },
    { pattern: 'C-HR', category: 'MED' },
    { pattern: 'CHR', category: 'MED' },
    { pattern: 'COROLLA', category: 'MED' },
    { pattern: 'CAMRY', category: 'MED' },
    { pattern: 'PRIUS', category: 'MED' },
    { pattern: 'AURIS', category: 'MED' },
    { pattern: 'VERSO', category: 'MED' },
    { pattern: 'YARIS CROSS', category: 'MED' },
    { pattern: 'VXL', category: 'MED' },
    // PEQ
    { pattern: 'YARIS', category: 'PEQ' },
    { pattern: 'AYGO', category: 'PEQ' },
  ],

  NISSAN: [
    // EXTGR
    { pattern: 'NV200', category: 'EXTGR' },
    { pattern: 'NV300', category: 'EXTGR' },
    // GR
    { pattern: 'X-TRAIL', category: 'GR' },
    { pattern: 'PATHFINDER', category: 'GR' },
    { pattern: 'MURANO', category: 'GR' },
    // MED
    { pattern: 'QASHQAI', category: 'MED' },
    { pattern: 'JUKE', category: 'MED' },
    { pattern: 'LEAF', category: 'MED' },
    { pattern: 'PULSAR', category: 'MED' },
    { pattern: 'MICRA', category: 'PEQ' },
    { pattern: 'NOTE', category: 'PEQ' },
  ],

  HONDA: [
    { pattern: 'CR-V', category: 'GR' },
    { pattern: 'CRV', category: 'GR' },
    { pattern: 'CIVIC', category: 'MED' },
    { pattern: 'HR-V', category: 'MED' },
    { pattern: 'HRV', category: 'MED' },
    { pattern: 'JAZZ', category: 'PEQ' },
    { pattern: 'E', category: 'PEQ' },
  ],

  MAZDA: [
    { pattern: 'CX-60', category: 'GR' },
    { pattern: 'CX60', category: 'GR' },
    { pattern: 'CX-5', category: 'MED' },
    { pattern: 'CX5', category: 'MED' },
    { pattern: 'CX-30', category: 'MED' },
    { pattern: 'CX30', category: 'MED' },
    { pattern: 'CX-3', category: 'MED' },
    { pattern: 'CX3', category: 'MED' },
    { pattern: 'MAZDA6', category: 'GR' },
    { pattern: '6', category: 'GR' },
    { pattern: '3', category: 'MED' },
    { pattern: 'MX5', category: 'MED' },
    { pattern: 'MX-5', category: 'MED' },
    { pattern: '2', category: 'PEQ' },
    { pattern: '1', category: 'PEQ' },
  ],

  SUZUKI: [
    { pattern: 'VITARA', category: 'MED' },
    { pattern: 'S-CROSS', category: 'MED' },
    { pattern: 'SWIFT', category: 'PEQ' },
    { pattern: 'IGNIS', category: 'PEQ' },
    { pattern: 'JIMNY', category: 'PEQ' },
  ],

  SUBARU: [
    { pattern: 'OUTBACK', category: 'GR' },
    { pattern: 'FORESTER', category: 'GR' },
    { pattern: 'XV', category: 'MED' },
    { pattern: 'IMPREZA', category: 'MED' },
    { pattern: 'CROSSTREK', category: 'MED' },
  ],

  MITSUBISHI: [
    { pattern: 'OUTLANDER', category: 'GR' },
    { pattern: 'ECLIPSE CROSS', category: 'MED' },
    { pattern: 'ASX', category: 'MED' },
    { pattern: 'SPACE STAR', category: 'PEQ' },
  ],

  LEXUS: [
    { pattern: 'RX', category: 'GR' },
    { pattern: 'NX', category: 'GR' },
    { pattern: 'LX', category: 'GR' },
    { pattern: 'LS', category: 'GR' },
    { pattern: 'ES', category: 'GR' },
    { pattern: 'SPORT', category: 'GR' },
    { pattern: 'IS', category: 'MED' },
    { pattern: 'UX', category: 'MED' },
    { pattern: 'CT', category: 'MED' },
    { pattern: '1', category: 'MED' },
  ],

  // ==================== COREANAS ====================
  HYUNDAI: [
    { pattern: 'SANTA FE', category: 'GR' },
    { pattern: 'PALISADE', category: 'GR' },
    { pattern: 'IONIQ 5', category: 'GR' },
    { pattern: 'IONIQ 6', category: 'GR' },
    { pattern: 'TUCSON', category: 'MED' },
    { pattern: 'KONA', category: 'MED' },
    { pattern: 'I30', category: 'MED' },
    { pattern: 'IONIQ', category: 'MED' },
    { pattern: 'BAYON', category: 'MED' },
    { pattern: 'IX35', category: 'MED' },
    { pattern: 'I20', category: 'PEQ' },
    { pattern: 'I10', category: 'PEQ' },
    { pattern: 'IX10', category: 'PEQ' },
  ],

  // Typo en BD: HYUNDAY
  HYUNDAY: [
    { pattern: 'TUCSON', category: 'MED' },
    { pattern: 'HR-V', category: 'MED' },
    { pattern: 'HRV', category: 'MED' },
    { pattern: 'I30', category: 'MED' },
    { pattern: 'IX35', category: 'MED' },
    { pattern: 'IX10', category: 'PEQ' },
    { pattern: 'LANTRA', category: 'MED' },
    { pattern: 'HYBRID', category: 'MED' },
    { pattern: 'Jazz', category: 'PEQ' },
  ],

  KIA: [
    { pattern: 'SORENTO', category: 'GR' },
    { pattern: 'EV9', category: 'GR' },
    { pattern: 'SPORTAGE', category: 'MED' },
    { pattern: 'NIRO', category: 'MED' },
    { pattern: 'CEED', category: 'MED' },
    { pattern: 'XCEED', category: 'MED' },
    { pattern: 'STONIC', category: 'MED' },
    { pattern: 'EV6', category: 'MED' },
    { pattern: 'RIO', category: 'PEQ' },
    { pattern: 'PICANTO', category: 'PEQ' },
  ],

  // ==================== BRITÁNICAS ====================
  'RANGE ROVER': [
    { pattern: 'VOGUE', category: 'GR' },
    { pattern: 'SPORT', category: 'GR' },
    { pattern: 'VELAR', category: 'GR' },
    { pattern: 'DISCOVERY', category: 'GR' },
    { pattern: 'EVOQUE', category: 'MED' },
  ],

  'LAND ROVER': [
    { pattern: 'DISCOVERY SPORT', category: 'GR' },
    { pattern: 'DISCOVERY', category: 'GR' },
    { pattern: 'DEFENDER', category: 'GR' },
    { pattern: 'SPORT', category: 'GR' },
    { pattern: 'VELAR', category: 'GR' },
    { pattern: 'EVOQUE', category: 'MED' },
  ],

  JAGUAR: [
    { pattern: 'F-PACE', category: 'GR' },
    { pattern: 'I-PACE', category: 'GR' },
    { pattern: 'XF', category: 'GR' },
    { pattern: 'XJ', category: 'GR' },
    { pattern: 'SOVEREIGN', category: 'GR' },
    { pattern: 'E PACE', category: 'MED' },
    { pattern: 'E-PACE', category: 'MED' },
    { pattern: 'XE', category: 'MED' },
    { pattern: 'F-TYPE', category: 'MED' },
  ],

  MINI: [
    { pattern: 'COUNTRYMAN', category: 'MED' },
    { pattern: 'CLUBMAN', category: 'MED' },
    { pattern: 'COOPER S', category: 'PEQ' },
    { pattern: 'COOPERS', category: 'PEQ' },
    { pattern: 'COOPER', category: 'PEQ' },
    { pattern: 'COPER', category: 'PEQ' },
    { pattern: 'CABRIO', category: 'PEQ' },
    { pattern: 'ONE', category: 'PEQ' },
    { pattern: 'One', category: 'PEQ' },
  ],

  'MINI COPER': [
    { pattern: 'COPER', category: 'PEQ' },
  ],

  BENTLEY: [
    { pattern: 'BENTAIGA', category: 'GR' },
    { pattern: 'CONTINENTAL', category: 'GR' },
    { pattern: 'FLYING SPUR', category: 'GR' },
  ],

  'ROLLS ROYCE': [
    { pattern: 'CULLINAN', category: 'GR' },
    { pattern: 'PHANTOM', category: 'GR' },
    { pattern: 'GHOST', category: 'GR' },
    { pattern: 'WRAITH', category: 'GR' },
    { pattern: 'DAWN', category: 'GR' },
  ],

  'ASTON MARTIN': [
    { pattern: 'DBX', category: 'GR' },
    { pattern: 'DB', category: 'MED' },
    { pattern: 'VANTAGE', category: 'MED' },
  ],

  // ==================== ITALIANAS ====================
  FIAT: [
    { pattern: 'DUCATO', category: 'EXTGR' },
    { pattern: 'SCUDO', category: 'EXTGR' },
    { pattern: 'DOBLO', category: 'EXTGR' },
    { pattern: 'TIPO', category: 'MED' },
    { pattern: '500X', category: 'MED' },
    { pattern: '500L', category: 'MED' },
    { pattern: '500', category: 'PEQ' },
    { pattern: 'PANDA', category: 'PEQ' },
    { pattern: 'PUNTO', category: 'PEQ' },
  ],

  ABARTH: [
    { pattern: '595', category: 'PEQ' },
    { pattern: '500', category: 'PEQ' },
    { pattern: '695', category: 'PEQ' },
  ],

  'ALFA ROMEO': [
    { pattern: 'STELVIO', category: 'GR' },
    { pattern: 'GIULIA', category: 'MED' },
    { pattern: 'TONALE', category: 'MED' },
    { pattern: 'GIULIETTA', category: 'MED' },
    { pattern: 'MITO', category: 'PEQ' },
  ],

  MASERATI: [
    { pattern: 'LEVANTE', category: 'GR' },
    { pattern: 'GRECALE', category: 'GR' },
    { pattern: 'QUATTROPORTE', category: 'GR' },
    { pattern: 'QUATROPORTE', category: 'GR' },
    { pattern: 'GHIBLI', category: 'GR' },
    { pattern: 'GRANCABRIO', category: 'MED' },
    { pattern: 'GRANTURISMO', category: 'MED' },
  ],

  FERRARI: [
    { pattern: 'PUROSANGUE', category: 'GR' },
    { pattern: 'SF90', category: 'MED' },
    { pattern: 'F8', category: 'MED' },
    { pattern: 'ROMA', category: 'MED' },
    { pattern: '296', category: 'MED' },
    { pattern: '488', category: 'MED' },
    { pattern: '812', category: 'MED' },
    { pattern: '355', category: 'MED' },
  ],

  LAMBORGHINI: [
    { pattern: 'URUS', category: 'GR' },
    { pattern: 'HURACAN', category: 'MED' },
    { pattern: 'REVUELTO', category: 'MED' },
    { pattern: 'ORUS', category: 'GR' },
  ],

  'LAMBORGHINI ': [
    { pattern: 'URUS', category: 'GR' },
  ],

  // ==================== SUECAS ====================
  VOLVO: [
    { pattern: 'XC90', category: 'GR' },
    { pattern: 'Xc90', category: 'GR' },
    { pattern: 'XC60', category: 'GR' },
    { pattern: 'S90', category: 'GR' },
    { pattern: 'V90', category: 'GR' },
    { pattern: 'XC40', category: 'MED' },
    { pattern: 'CX40', category: 'MED' },
    { pattern: 'XC30', category: 'MED' },
    { pattern: 'S60', category: 'MED' },
    { pattern: 'V60', category: 'MED' },
    { pattern: 'V40', category: 'MED' },
    { pattern: 'C40', category: 'MED' },
    { pattern: 'EX30', category: 'MED' },
    { pattern: 'EX40', category: 'MED' },
    { pattern: 'VOLVO', category: 'MED' },
  ],

  // ==================== AMERICANAS ====================
  TESLA: [
    { pattern: 'MODEL X', category: 'GR' },
    { pattern: 'X', category: 'GR' },
    { pattern: 'MODEL S', category: 'GR' },
    { pattern: 'S', category: 'GR' },
    { pattern: 'CYBERTRUCK', category: 'GR' },
    { pattern: 'MODEL Y', category: 'MED' },
    { pattern: 'Y', category: 'MED' },
    { pattern: 'MODEL 3', category: 'MED' },
    { pattern: 'MODEL3', category: 'MED' },
    { pattern: '3', category: 'MED' },
    { pattern: 'TESLA', category: 'MED' },
  ],

  'TESLA ': [
    { pattern: 'MODEL3', category: 'MED' },
    { pattern: 'MODEL', category: 'MED' },
  ],

  FORD: [
    // EXTGR
    { pattern: 'TRANSIT', category: 'EXTGR' },
    { pattern: 'TOURNEO', category: 'EXTGR' },
    { pattern: 'GALAXY', category: 'EXTGR' },
    { pattern: 'SMAX', category: 'EXTGR' },
    { pattern: 'S-MAX', category: 'EXTGR' },
    { pattern: 'CMAX', category: 'MED' },
    { pattern: 'C-MAX', category: 'MED' },
    // GR
    { pattern: 'EXPLORER', category: 'GR' },
    { pattern: 'EDGE', category: 'GR' },
    { pattern: 'MUSTANG MACH-E', category: 'GR' },
    { pattern: 'MUSTANG', category: 'MED' },
    // MED
    { pattern: 'KUGA', category: 'MED' },
    { pattern: 'FOCUS', category: 'MED' },
    { pattern: 'PUMA', category: 'MED' },
    { pattern: 'FUSION', category: 'MED' },
    { pattern: '325', category: 'MED' },
    // PEQ
    { pattern: 'FIESTA', category: 'PEQ' },
    { pattern: 'KA', category: 'PEQ' },
  ],

  JEEP: [
    { pattern: 'GRAND CHEROKEE', category: 'GR' },
    { pattern: 'COMMANDER', category: 'GR' },
    { pattern: 'WRANGLER', category: 'GR' },
    { pattern: 'RUBICON', category: 'GR' },
    { pattern: 'CHEROKEE', category: 'GR' },
    { pattern: 'COMPASS', category: 'MED' },
    { pattern: 'RENEGADE', category: 'MED' },
    { pattern: 'AVENGER', category: 'MED' },
    { pattern: 'E', category: 'MED' },
  ],

  CHEVROLET: [
    { pattern: 'CAPTIVA', category: 'GR' },
    { pattern: 'LACETTI', category: 'MED' },
    { pattern: 'LACTTI', category: 'MED' },
  ],

  LINCOLN: [
    { pattern: 'MKX', category: 'GR' },
    { pattern: 'NAVIGATOR', category: 'GR' },
    { pattern: 'AVIATOR', category: 'GR' },
  ],

  // ==================== OTRAS ====================
  SKODA: [
    { pattern: 'KODIAQ', category: 'GR' },
    { pattern: 'SUPERB', category: 'GR' },
    { pattern: 'ENYAQ', category: 'GR' },
    { pattern: 'OCTAVIA', category: 'MED' },
    { pattern: 'KAROQ', category: 'MED' },
    { pattern: 'KAMIQ', category: 'MED' },
    { pattern: 'SCALA', category: 'MED' },
    { pattern: 'ELROQ', category: 'MED' },
    { pattern: 'FABIA', category: 'PEQ' },
    { pattern: 'CITIGO', category: 'PEQ' },
  ],

  OPEL: [
    // EXTGR
    { pattern: 'ZAFIRA', category: 'EXTGR' },
    { pattern: 'COMBO', category: 'EXTGR' },
    { pattern: 'VIVARO', category: 'EXTGR' },
    // GR
    { pattern: 'GRANDLAND', category: 'GR' },
    { pattern: 'INSIGNIA', category: 'GR' },
    // MED
    { pattern: 'ASTRA', category: 'MED' },
    { pattern: 'MOKKA', category: 'MED' },
    { pattern: 'CROSSLAND', category: 'MED' },
    // PEQ
    { pattern: 'CORSA', category: 'PEQ' },
    { pattern: 'ADAM', category: 'PEQ' },
  ],

  MG: [
    { pattern: 'HS', category: 'MED' },
    { pattern: 'EHS', category: 'MED' },
    { pattern: 'ZS', category: 'MED' },
    { pattern: 'MG4', category: 'MED' },
    { pattern: 'MG5', category: 'MED' },
    { pattern: '3', category: 'PEQ' },
  ],

  SMART: [
    { pattern: 'FORFOUR', category: 'PEQ' },
    { pattern: 'FOURFOR', category: 'PEQ' },
    { pattern: 'FORTWO', category: 'PEQ' },
    { pattern: '#1', category: 'MED' },
    { pattern: '#3', category: 'MED' },
  ],

  JAECOO: [
    { pattern: '7', category: 'MED' },
  ],

  'BMW ': [
    { pattern: '320', category: 'MED' },
  ],
}

// ============================================================
// FUNCIÓN PRINCIPAL DE DETECCIÓN
// ============================================================

/**
 * Detecta la categoría de un vehículo basándose en su marca y modelo.
 * Usa búsqueda case-insensitive y matching parcial.
 * 
 * @returns La categoría detectada o null si no se encontró
 */
export function detectVehicleCategory(
  marca: string,
  modelo: string
): VehicleCategory | null {
  if (!marca || !modelo) return null

  const marcaClean = marca.trim().toUpperCase()
  const modeloClean = modelo.trim().toUpperCase()

  // Buscar la marca en la base de datos
  // Intentar coincidencia exacta primero, luego con el original (por marcas con espacio al final)
  const brandKeys = Object.keys(VEHICLE_DATABASE)
  
  // Primero: coincidencia exacta con la marca limpia
  let models = VEHICLE_DATABASE[marcaClean]
  
  // Segundo: buscar con la marca tal cual (para cubrir typos como "MERCEDES " con espacio)
  if (!models) {
    models = VEHICLE_DATABASE[marca.trim()]
  }
  
  // Tercero: buscar marcas que contengan el texto (para "MINI COPER" → MINI)
  if (!models) {
    for (const key of brandKeys) {
      if (key.trim().toUpperCase() === marcaClean || 
          marcaClean.startsWith(key.trim().toUpperCase())) {
        models = VEHICLE_DATABASE[key]
        break
      }
    }
  }

  if (!models) return null

  // Buscar el modelo - evaluar en orden (más específico primero)
  for (const entry of models) {
    const pattern = entry.pattern.toUpperCase()
    if (modeloClean.includes(pattern) || modeloClean === pattern) {
      return entry.category
    }
  }

  return null
}

/**
 * Detecta la categoría y devuelve un resultado enriquecido con labels y colores
 */
export function getVehicleCategoryInfo(marca: string, modelo: string) {
  const category = detectVehicleCategory(marca, modelo)
  if (!category) return null

  return {
    category,
    label: CATEGORY_LABELS[category],
    emoji: CATEGORY_EMOJIS[category],
    colors: CATEGORY_COLORS[category],
  }
}

/**
 * Determina el "tag de tamaño" de un servicio a partir de su nombre.
 * Retorna PEQ, MED, GR, EXTGR o null (servicio universal sin tamaño)
 */
export function getServiceSizeTag(serviceName: string): VehicleCategory | null {
  const name = serviceName.toUpperCase()
  // IMPORTANTE: Comprobar EXTGR antes que GR (porque EXTGR contiene GR)
  if (/\bEXTGR\b/.test(name)) return 'EXTGR'
  // GR pero no EXTGR - ya descartado arriba
  if (/\bGR\b/.test(name)) return 'GR'
  if (/\bMED\b/.test(name)) return 'MED'
  if (/\bPEQ\b/.test(name)) return 'PEQ'
  return null
}

/**
 * Filtra servicios según la categoría del vehículo.
 * - Servicios con tag de tamaño: solo muestra los que coinciden con la categoría
 * - Servicios sin tag (extras, combos): siempre se muestran
 */
export function filterServicesByCategory(
  servicios: { id: string; nombre: string; precio: number; duracion: number }[],
  category: VehicleCategory | null
): typeof servicios {
  if (!category) return servicios // Si no hay categoría, mostrar todos

  return servicios.filter(servicio => {
    const tag = getServiceSizeTag(servicio.nombre)
    // Servicio sin tag de tamaño → siempre visible
    if (!tag) return true
    // Servicio con tag → solo si coincide con la categoría del vehículo
    return tag === category
  })
}

// Marcas "limpias" para los desplegables (sin typos ni variantes con espacios)
// IMPORTANTE: Solo las marcas canónicas. Los typos (HYUNDAY, MERCEDEA, etc.)
// siguen funcionando para detección pero NO aparecen en los desplegables.
const CANONICAL_BRANDS: string[] = [
  'ABARTH', 'ALFA ROMEO', 'ASTON MARTIN', 'AUDI',
  'BENTLEY', 'BMW',
  'CHEVROLET', 'CITROEN', 'CUPRA',
  'DACIA', 'DS',
  'FERRARI', 'FIAT', 'FORD',
  'HONDA', 'HYUNDAI',
  'JAECOO', 'JAGUAR', 'JEEP',
  'KIA',
  'LAMBORGHINI', 'LAND ROVER', 'LEXUS', 'LINCOLN',
  'MASERATI', 'MAZDA', 'MERCEDES', 'MG', 'MINI', 'MITSUBISHI',
  'NISSAN',
  'OPEL',
  'PEUGEOT', 'PORSCHE',
  'RANGE ROVER', 'RENAULT', 'ROLLS ROYCE',
  'SEAT', 'SKODA', 'SMART', 'SUBARU', 'SUZUKI',
  'TESLA', 'TOYOTA',
  'VOLKSWAGEN', 'VOLVO', 'VW',
]

/**
 * Obtiene las marcas disponibles para los desplegables.
 * Lista limpia, sin typos ni duplicados.
 */
export function getAvailableBrands(): string[] {
  return [...CANONICAL_BRANDS].sort()
}

/**
 * Obtiene los modelos disponibles para una marca dada.
 * Devuelve modelos únicos (sin duplicados de pattern) ordenados por categoría.
 */
export function getModelsForBrand(marca: string): { modelo: string; category: VehicleCategory }[] {
  const marcaClean = marca.trim().toUpperCase()
  
  // Buscar en todas las variantes de la marca (ej: VW y VOLKSWAGEN)
  const allModels: ModelEntry[] = []
  const seen = new Set<string>()
  
  for (const key of Object.keys(VEHICLE_DATABASE)) {
    if (key.trim().toUpperCase() === marcaClean) {
      for (const m of VEHICLE_DATABASE[key]) {
        const modelUpper = m.pattern.toUpperCase()
        if (!seen.has(modelUpper)) {
          seen.add(modelUpper)
          allModels.push(m)
        }
      }
    }
  }
  
  if (allModels.length === 0) return []
  
  // Ordenar: primero por categoría (PEQ → MED → GR → EXTGR), luego alfabético
  const catOrder: Record<VehicleCategory, number> = { PEQ: 0, MED: 1, GR: 2, EXTGR: 3 }
  
  return allModels
    .map(m => ({ modelo: m.pattern.toUpperCase(), category: m.category }))
    .sort((a, b) => {
      const catDiff = catOrder[a.category] - catOrder[b.category]
      if (catDiff !== 0) return catDiff
      return a.modelo.localeCompare(b.modelo)
    })
}
