/**
 * Contratos de tipos para el sistema de digitalización asistida por fotografía.
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
  /** Identificador temporal único para la sesión de confirmación */
  tempId: string;
  /** Posición física estimada en el cubo (1-based, ordenada de izquierda a derecha) */
  position: number;
  /** Región detectada en la fotografía del cubo */
  boundingBox?: BoundingBox;
  /** Imagen recortada en base64 del lomo individual */
  cropDataUrl?: string;
  /** Texto en bruto detectado por OCR sobre el lomo */
  ocrRawText?: string;
  /** Nivel de confianza de la detección */
  confidence: CandidateConfidence;
  /** Metadatos del libro sugeridos y reconciliados con el catálogo */
  suggestedBook: SuggestedBookData;
  /** Si el usuario ya ha validado este candidato */
  confirmed: boolean;
}

export interface DigitizeCubeRequest {
  /** Imagen del compartimento Kallax en formato base64 o data URL */
  imageBase64: string;
  shelfId: string;
  row: number;
  column: number;
  depth: number;
  /** Cantidad de libros que ya existen en esta profundidad (para ajustar la posición inicial) */
  existingCount?: number;
}

export interface DigitizeCubeResponse {
  success: boolean;
  candidates: DigitizationCandidate[];
  source: "gemini-vision" | "fallback-simulation";
  message?: string;
  totalDetected: number;
}
