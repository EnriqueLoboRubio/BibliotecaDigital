import type { Book, LibraryCatalog, Room, Shelf, ShelfCell } from "@/lib/types";
import {
  getStoredRooms,
  sanitizeBooksAgainstCells,
  saveBooksToStorage,
  saveCellsToStorage,
  saveRoomsToStorage,
  saveShelvesToStorage,
} from "./index";

export interface LibraryBackupData {
  version: 1;
  exportedAt: string;
  appName: "BibliotecaDigital";
  rooms: Room[];
  shelves: Shelf[];
  cells: ShelfCell[];
  books: Book[];
}

/**
 * Genera y descarga el archivo JSON de copia de seguridad completa
 */
export function downloadCatalogBackupJson(
  catalog: LibraryCatalog,
  roomsList?: Room[],
): void {
  const rooms = roomsList && roomsList.length > 0 ? roomsList : getStoredRooms();
  const backup: LibraryBackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    appName: "BibliotecaDigital",
    rooms,
    shelves: catalog.shelves,
    cells: catalog.cells,
    books: catalog.books,
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `biblioteca_digital_backup_${dateStr}.json`;

  triggerFileDownload(blob, filename);
}

/**
 * Genera y descarga un archivo CSV con el catálogo completo de libros y sus coordenadas físicas
 */
export function downloadBooksCsv(
  catalog: LibraryCatalog,
  roomsList?: Room[],
): void {
  const rooms = roomsList && roomsList.length > 0 ? roomsList : getStoredRooms();
  const roomMap = new Map(rooms.map((r) => [r.id, r.name]));
  const shelfMap = new Map(catalog.shelves.map((s) => [s.id, s.name]));

  const headers = [
    "Título",
    "Autor",
    "ISBN",
    "Año",
    "Género",
    "Estancia",
    "Estantería",
    "Fila",
    "Columna",
    "Fila en Profundidad",
    "Posición",
  ];

  const escapeCsv = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = catalog.books.map((b) => {
    const shelfName = shelfMap.get(b.location.shelfId) || b.location.shelfId;
    const shelfObj = catalog.shelves.find((s) => s.id === b.location.shelfId);
    const roomName = shelfObj?.roomId
      ? roomMap.get(shelfObj.roomId) || "Estudio"
      : catalog.room.name;

    const depthLabel = b.location.depth === 1 ? "Frente (1)" : `Fondo (${b.location.depth})`;

    return [
      escapeCsv(b.title),
      escapeCsv(b.author),
      escapeCsv(b.isbn || ""),
      escapeCsv(b.year || ""),
      escapeCsv(b.genre || ""),
      escapeCsv(roomName),
      escapeCsv(shelfName),
      escapeCsv(b.location.row),
      escapeCsv(b.location.column),
      escapeCsv(depthLabel),
      escapeCsv(b.location.position),
    ].join(",");
  });

  // \uFEFF es el BOM de UTF-8 para que Excel abra acentos en español automáticamente
  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `biblioteca_digital_libros_${dateStr}.csv`;

  triggerFileDownload(blob, filename);
}

/**
 * Valida la estructura y coherencia referencial de un archivo JSON de respaldo
 */
export function validateBackupJson(data: unknown): {
  valid: boolean;
  error?: string;
  backup?: LibraryBackupData;
} {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "El archivo no contiene un objeto JSON válido." };
  }

  const obj = data as Partial<LibraryBackupData>;

  if (!Array.isArray(obj.shelves) || obj.shelves.length === 0) {
    return { valid: false, error: "La copia de seguridad no contiene ninguna estantería válida." };
  }

  if (!Array.isArray(obj.cells) || obj.cells.length === 0) {
    return { valid: false, error: "La copia de seguridad no contiene la cuadrícula de compartimentos." };
  }

  if (!Array.isArray(obj.books)) {
    return { valid: false, error: "La lista de libros del archivo de respaldo no es válida." };
  }

  // Validar campos mínimos de estanterías
  for (const s of obj.shelves) {
    if (!s.id || !s.name || typeof s.columns !== "number" || typeof s.rows !== "number") {
      return { valid: false, error: `Estantería inválida en el respaldo: ${JSON.stringify(s)}` };
    }
  }

  // Validar campos de celdas
  for (const c of obj.cells) {
    if (!c.id || !c.shelfId || typeof c.row !== "number" || typeof c.column !== "number") {
      return { valid: false, error: `Compartimento inválido en el respaldo: ${JSON.stringify(c)}` };
    }
  }

  // Validar libros
  for (const b of obj.books) {
    if (!b.id || !b.title || !b.location || typeof b.location.row !== "number") {
      return { valid: false, error: `Libro inválido en el respaldo: ${b.title || b.id}` };
    }
  }

  const rooms: Room[] = Array.isArray(obj.rooms) && obj.rooms.length > 0
    ? obj.rooms
    : [{ id: "room-1", name: "Estudio Principal", shelfIds: obj.shelves.map((s) => s.id) }];

  const sanitizedBooks = sanitizeBooksAgainstCells(obj.books, obj.cells);

  const backup: LibraryBackupData = {
    version: 1,
    exportedAt: obj.exportedAt || new Date().toISOString(),
    appName: "BibliotecaDigital",
    rooms,
    shelves: obj.shelves,
    cells: obj.cells,
    books: sanitizedBooks,
  };

  return { valid: true, backup };
}

/**
 * Restaura el catálogo de la biblioteca en LocalStorage y notifica a la aplicación
 */
export async function restoreBackupToStorage(
  backup: LibraryBackupData,
): Promise<{ success: boolean; bookCount: number; shelfCount: number; roomCount: number }> {
  try {
    saveRoomsToStorage(backup.rooms);
    saveShelvesToStorage(backup.shelves);
    saveCellsToStorage(backup.cells);
    saveBooksToStorage(backup.books);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"));
    }

    return {
      success: true,
      bookCount: backup.books.length,
      shelfCount: backup.shelves.length,
      roomCount: backup.rooms.length,
    };
  } catch (err) {
    console.error("Error al restaurar copia de seguridad:", err);
    throw err;
  }
}

/**
 * Utilidad privada para activar descarga de archivo en el navegador
 */
function triggerFileDownload(blob: Blob, filename: string): void {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
