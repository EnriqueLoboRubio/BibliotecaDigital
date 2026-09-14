/**
 * Contratos de tipos para el sistema de digitalización asistida por fotografía e IA.
 * Alineado con ARQUITECTURE.md y PROTECT.md.
 */

export interface BoundingBox {
  /** Coordenada X normalizada (0 a 1) de la esquina superior izquierda */
  x: number;
  /** Coordenada Y normalizada (0 a 1) de la esquina superior izquierda */
  y: number;
  /** Ancho normalizado (0 a 1) */
  width: number;
  /** Alto normalizado (0 a 1) */
  height: number;
}

export type CandidateConfidence = "high" | "medium" | "low" | "unrecognized";

export type DetectedObjectType = "book" | "box" | "decoration" | "empty";

export interface SuggestedBookData {
  title: string;
  author: string;
  isbn?: string;
  year?: number;
  genre?: string;
  cover?: string;
  publisher?: string;
}

export interface DigitizationCandidate {
  /** Identificador temporal único para la sesión de confirmación (staging) */
  tempId: string;
  /** Mueble asignado */
  shelfId: string;
  /** Fila del cubo (1-based, 1 = superior) */
  row: number;
  /** Columna del cubo (1-based, 1 = izquierda) */
  column: number;
  /** Profundidad (1 = frente, 2 = fondo) */
  depth: number;
  /** Posición física en el cubo y profundidad (1-based, de izquierda a derecha) */
  position: number;
  /** Región detectada en la fotografía */
  boundingBox?: BoundingBox;
  /** Imagen recortada en base64 del lomo individual (opcional) */
  cropDataUrl?: string;
  /** Texto en bruto detectado por OCR sobre el lomo */
  ocrRawText?: string;
  /** Nivel de certeza de la detección e inferencia */
  confidence: CandidateConfidence;
  /** Tipo de objeto detectado */
  objectType: DetectedObjectType;
  /** Metadatos del libro sugeridos y reconciliados con catálogos bibliográficos */
  suggestedBook: SuggestedBookData;
  /** Estado de validación por parte del usuario */
  confirmed: boolean;
}

export interface ExistingBookSlot {
  shelfId: string;
  row: number;
  column: number;
  depth: number;
  position: number;
}

export interface EnabledCellSlot {
  shelfId: string;
  row: number;
  column: number;
  depthCount: number;
}

export interface DigitizeShelfRequest {
  /** Imagen en base64 o data URL */
  imageBase64: string;
  /** Modo de escaneo: estantería completa o cubo individual */
  mode: "full-shelf" | "single-cube";
  /** Identificador de la estantería objetivo */
  shelfId: string;
  /** Dimensiones de la estantería */
  gridDimensions: {
    rows: number;
    columns: number;
  };
  /** Lista de celdas activas en la estantería para evitar colocar en cubos bloqueados */
  enabledCells: EnabledCellSlot[];
  /** Libros existentes en la estantería para calcular la posición inicial secuencial */
  existingBooks?: ExistingBookSlot[];
  /** Parámetros específicos para modo single-cube */
  targetCell?: {
    row: number;
    column: number;
    depth: number;
  };
}

export interface DigitizeShelfResponse {
  success: boolean;
  candidates: DigitizationCandidate[];
  source: "gemini-vision" | "fallback-simulation" | "local-vision";
  totalDetected: number;
  objectsFiltered?: number;
  message?: string;
}

/** Compatibilidad con la ruta anterior de cubo individual */
export interface DigitizeCubeRequest {
  imageBase64: string;
  shelfId: string;
  row: number;
  column: number;
  depth: number;
  existingCount?: number;
}

export interface DigitizeCubeResponse {
  success: boolean;
  candidates: DigitizationCandidate[];
  source: "gemini-vision" | "fallback-simulation";
  message?: string;
  totalDetected: number;
}
