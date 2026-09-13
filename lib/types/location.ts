/**
 * Coordenadas físicas de un libro. Índices 1-based.
 * depth 1 = frente; position se reinicia en cada profundidad.
 */
export interface BookLocation {
  shelfId: string;
  row: number;
  column: number;
  depth: number;
  position: number;
}

/** Localización lista para mostrar. La UI no concatena ids técnicos. */
export interface ResolvedLocation {
  shelfId: string;
  shelfName: string;
  row: number;
  column: number;
  depth: number;
  position: number;
  depthLabel: string;
  phrase: string;
}
