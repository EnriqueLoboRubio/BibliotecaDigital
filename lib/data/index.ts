import type { Book, LibraryCatalog, Room, Shelf, ShelfCell } from "@/lib/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { fetchBookCover } from "@/lib/services/open-library";

export const initialRoom: Room = {
  id: "room-1",
  name: "Estudio Principal",
  shelfIds: ["shelf-A"],
};

export const initialShelves: Shelf[] = [
  {
    id: "shelf-A",
    name: "Kallax 4×4 Principal",
    position: 1,
    columns: 4,
    rows: 4,
  },
];

// Generar los 16 cubos de la estantería inicial Kallax 4x4
// Conforme a AGENTS.md: 3 cubos no se usan (enabled: false)
const disabledCellPositions = new Set(["1:4", "3:1", "4:4"]);

export const initialCells: ShelfCell[] = [];

for (let row = 1; row <= 4; row++) {
  for (let col = 1; col <= 4; col++) {
    const key = `${row}:${col}`;
    const enabled = !disabledCellPositions.has(key);
    initialCells.push({
      id: `cell-shelf-A-${row}-${col}`,
      shelfId: "shelf-A",
      row,
      column: col,
      enabled,
      depthCount: 2, // Frente y detrás por defecto
    });
  }
}

const STORAGE_KEY = "biblioteca_digital_books_v1";
const STORAGE_CELLS_KEY = "biblioteca_digital_cells_v1";
const STORAGE_SHELVES_KEY = "biblioteca_digital_shelves_v1";
const STORAGE_ROOMS_KEY = "biblioteca_digital_rooms_v1";

/**
 * Garantiza la invariante de ARQUITECTURE.md:
 * Ningún libro puede pertenecer a un cubo desactivado o inexistente.
 */
export function sanitizeBooksAgainstCells(books: Book[], cells: ShelfCell[]): Book[] {
  const enabledCellKeys = new Set(
    cells.filter((c) => c.enabled).map((c) => `${c.shelfId}:${c.row}:${c.column}`),
  );
  return books.filter((b) =>
    enabledCellKeys.has(`${b.location.shelfId}:${b.location.row}:${b.location.column}`),
  );
}

export function getStoredBooks(): Book[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const books = JSON.parse(raw) as Book[];
    if (!Array.isArray(books)) return [];

    // Garantizar que no haya libros huérfanos en cubos bloqueados
    const cells = getStoredCells();
    const validBooks = sanitizeBooksAgainstCells(books, cells);
    if (validBooks.length !== books.length) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validBooks));
      } catch {
        // Ignorar errores de cuota local
      }
    }
    return validBooks;
  } catch {
    return [];
  }
}

async function syncSaveBooksToSupabase(books: Book[]) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    if (books.length === 0) {
      await supabase.from("books").delete().neq("id", "none");
    } else {
      await supabase.from("books").upsert(
        books.map((b) => ({
          id: b.id,
          title: b.title,
          author: b.author,
          isbn: b.isbn,
          year: b.year,
          genre: b.genre,
          cover: b.cover || null,
          shelf_id: b.location.shelfId,
          row: b.location.row,
          columna: b.location.column,
          depth: b.location.depth,
          position: b.location.position,
        })),
      );
    }
  } catch (err) {
    console.warn("Error al sincronizar libros con Supabase:", err);
  }
}

export function saveBooksToStorage(books: Book[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  } catch (err) {
    console.error("Error al guardar libros en almacenamiento local:", err);
  }

  void syncSaveBooksToSupabase(books);
}

export function getStoredCells(): ShelfCell[] {
  if (typeof window === "undefined") {
    return initialCells;
  }
  try {
    const raw = localStorage.getItem(STORAGE_CELLS_KEY);
    if (!raw) return initialCells;
    const stored = JSON.parse(raw) as ShelfCell[];
    if (!Array.isArray(stored) || stored.length === 0) return initialCells;
    return stored;
  } catch {
    return initialCells;
  }
}

export function saveCellsToStorage(cells: ShelfCell[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_CELLS_KEY, JSON.stringify(cells));
  } catch (err) {
    console.error("Error al guardar celdas en almacenamiento local:", err);
  }
}

export function getStoredShelves(): Shelf[] {
  if (typeof window === "undefined") {
    return initialShelves;
  }
  try {
    const raw = localStorage.getItem(STORAGE_SHELVES_KEY);
    if (!raw) return initialShelves;
    const stored = JSON.parse(raw) as Shelf[];
    if (!Array.isArray(stored) || stored.length === 0) return initialShelves;
    return stored;
  } catch {
    return initialShelves;
  }
}

export function saveShelvesToStorage(shelves: Shelf[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_SHELVES_KEY, JSON.stringify(shelves));
  } catch (err) {
    console.error("Error al guardar estanterías en almacenamiento local:", err);
  }
}

export function getStoredRooms(): Room[] {
  if (typeof window === "undefined") {
    return [initialRoom];
  }
  try {
    const raw = localStorage.getItem(STORAGE_ROOMS_KEY);
    if (!raw) return [initialRoom];
    const stored = JSON.parse(raw) as Room[];
    if (!Array.isArray(stored) || stored.length === 0) return [initialRoom];
    return stored;
  } catch {
    return [initialRoom];
  }
}

export function saveRoomsToStorage(rooms: Room[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_ROOMS_KEY, JSON.stringify(rooms));
  } catch (err) {
    console.error("Error al guardar habitaciones en almacenamiento local:", err);
  }
}

// Sincronización asíncrona secuencial con Supabase
async function syncShelfToSupabase(shelf: Shelf, cells: ShelfCell[], rooms: Room[]) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    // 1. Guardar primero el mueble y esperar a que esté confirmado para que la clave foránea en cells exista
    const { error: shelfErr } = await supabase.from("shelves").upsert({
      id: shelf.id,
      name: shelf.name,
      position: shelf.position,
      columns: shelf.columns,
      rows: shelf.rows,
    });
    if (shelfErr) {
      console.error("Error al guardar estantería en Supabase:", shelfErr);
      return;
    }

    // 2. Guardar las celdas y habitaciones una vez que el mueble ya está comprometido
    await Promise.all([
      supabase.from("cells").upsert(
        cells.map((c) => ({
          id: c.id,
          shelf_id: c.shelfId,
          row: c.row,
          columna: c.column,
          enabled: c.enabled,
          depth_count: c.depthCount,
        })),
      ),
      supabase.from("rooms").upsert(
        rooms.map((r) => ({
          id: r.id,
          name: r.name,
          shelf_ids: r.shelfIds,
        })),
      ),
    ]);
  } catch (err) {
    console.warn("Error al sincronizar nuevo mueble con Supabase:", err);
  }
}

async function syncDeleteShelfFromSupabase(shelfId: string, rooms: Room[]) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await Promise.all([
      supabase.from("shelves").delete().eq("id", shelfId),
      supabase.from("rooms").upsert(
        rooms.map((r) => ({
          id: r.id,
          name: r.name,
          shelf_ids: r.shelfIds,
        })),
      ),
    ]);
  } catch (err) {
    console.warn("Error al eliminar mueble en Supabase:", err);
  }
}

async function syncToggleCellToSupabase(
  shelfId: string,
  row: number,
  column: number,
  enabled: boolean,
) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase
      .from("cells")
      .update({ enabled })
      .eq("shelf_id", shelfId)
      .eq("row", row)
      .eq("columna", column);

    if (!enabled) {
      await supabase
        .from("books")
        .delete()
        .eq("shelf_id", shelfId)
        .eq("row", row)
        .eq("columna", column);
    }
  } catch (err) {
    console.warn("Error al alternar estado de cubo en Supabase:", err);
  }
}

async function syncBookToSupabase(book: Book) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from("books").upsert({
      id: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      year: book.year,
      genre: book.genre,
      cover: book.cover || null,
      shelf_id: book.location.shelfId,
      row: book.location.row,
      columna: book.location.column,
      depth: book.location.depth,
      position: book.location.position,
    });
  } catch (err) {
    console.warn("Error al sincronizar libro con Supabase:", err);
  }
}

async function syncDeleteBookFromSupabase(bookId: string) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from("books").delete().eq("id", bookId);
  } catch (err) {
    console.warn("Error al eliminar libro en Supabase:", err);
  }
}

async function syncShelfName(shelfId: string, newName: string) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from("shelves").update({ name: newName.trim() }).eq("id", shelfId);
  } catch (err) {
    console.warn("Error al actualizar nombre en Supabase:", err);
  }
}

async function syncCellDepth(cellId: string, depthCount: number) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from("cells").update({ depth_count: depthCount }).eq("id", cellId);
  } catch (err) {
    console.warn("Error al actualizar profundidad en Supabase:", err);
  }
}

/**
 * Crea un nuevo mueble personalizado con sus celdas físicas
 * conforme a ARQUITECTURE.md
 */
export function createCustomShelf(
  name: string,
  columns: number,
  rows: number,
  roomId: string = "room-1",
  disabledCellKeys?: string[] | Set<string>,
): { shelf: Shelf; cells: ShelfCell[] } {
  const shelfId = `shelf-${Date.now().toString(36)}`;
  const existingShelves = getStoredShelves();
  const newPosition = existingShelves.length + 1;

  const newShelf: Shelf = {
    id: shelfId,
    name: name.trim(),
    position: newPosition,
    columns: Math.max(1, Math.min(columns, 8)),
    rows: Math.max(1, Math.min(rows, 8)),
    roomId: roomId,
  };

  const disabledSet = new Set(disabledCellKeys ? Array.from(disabledCellKeys) : []);

  const newCells: ShelfCell[] = [];
  for (let r = 1; r <= newShelf.rows; r++) {
    for (let c = 1; c <= newShelf.columns; c++) {
      const key = `${r}:${c}`;
      const enabled = !disabledSet.has(key);
      newCells.push({
        id: `cell-${shelfId}-${r}-${c}`,
        shelfId,
        row: r,
        column: c,
        enabled,
        depthCount: 2,
      });
    }
  }

  // Actualizar shelves
  const updatedShelves = [...existingShelves, newShelf];
  saveShelvesToStorage(updatedShelves);

  // Actualizar cells
  const existingCells = getStoredCells();
  const updatedCells = [...existingCells, ...newCells];
  saveCellsToStorage(updatedCells);

  // Actualizar room
  const rooms = getStoredRooms();
  const targetRoom = rooms.find((rm) => rm.id === roomId) || rooms[0] || initialRoom;
  const updatedRooms = rooms.some((rm) => rm.id === targetRoom.id)
    ? rooms.map((rm) =>
        rm.id === targetRoom.id
          ? { ...rm, shelfIds: Array.from(new Set([...rm.shelfIds, shelfId])) }
          : rm,
      )
    : [...rooms, { ...targetRoom, shelfIds: [shelfId] }];
  saveRoomsToStorage(updatedRooms);

  // Sincronizar en la nube
  void syncShelfToSupabase(newShelf, newCells, updatedRooms);

  return { shelf: newShelf, cells: newCells };
}

/**
 * Crea una nueva habitación
 */
export function createRoom(name: string): Room {
  const cleanName = name.trim() || "Nueva Estancia";
  const roomId = `room-${Date.now().toString(36)}`;
  const newRoom: Room = {
    id: roomId,
    name: cleanName,
    shelfIds: [],
  };

  const existingRooms = getStoredRooms();
  const updatedRooms = [...existingRooms, newRoom];
  saveRoomsToStorage(updatedRooms);

  if (isSupabaseConfigured && supabase) {
    void supabase.from("rooms").upsert({
      id: newRoom.id,
      name: newRoom.name,
      shelf_ids: newRoom.shelfIds,
    });
  }

  return newRoom;
}

/**
 * Renombra una habitación existente
 */
export function renameRoom(roomId: string, newName: string): Room[] {
  const cleanName = newName.trim();
  const rooms = getStoredRooms();
  const updatedRooms = rooms.map((r) =>
    r.id === roomId ? { ...r, name: cleanName || r.name } : r,
  );
  saveRoomsToStorage(updatedRooms);

  if (isSupabaseConfigured && supabase) {
    void supabase
      .from("rooms")
      .update({ name: cleanName })
      .eq("id", roomId);
  }

  return updatedRooms;
}

/**
 * Elimina una habitación (No se permite si es la única restante)
 */
export function deleteRoom(roomId: string): { success: boolean; error?: string; remainingRooms?: Room[] } {
  const rooms = getStoredRooms();
  if (rooms.length <= 1) {
    return { success: false, error: "No se puede eliminar la única habitación existente." };
  }

  const targetRoom = rooms.find((r) => r.id === roomId);
  if (!targetRoom) {
    return { success: false, error: "La habitación no existe." };
  }

  const updatedRooms = rooms.filter((r) => r.id !== roomId);
  const destinationRoom = updatedRooms[0];
  const combinedShelfIds = Array.from(new Set([...destinationRoom.shelfIds, ...targetRoom.shelfIds]));
  destinationRoom.shelfIds = combinedShelfIds;

  saveRoomsToStorage(updatedRooms);

  if (isSupabaseConfigured && supabase) {
    void Promise.all([
      supabase.from("rooms").delete().eq("id", roomId),
      supabase.from("rooms").upsert({
        id: destinationRoom.id,
        name: destinationRoom.name,
        shelf_ids: destinationRoom.shelfIds,
      }),
    ]);
  }

  return { success: true, remainingRooms: updatedRooms };
}

/**
 * Alterna el estado de un cubo entre útil (enabled: true) y sin uso (enabled: false).
 * Si un cubo pasa a sin uso (enabled: false), se eliminan en cascada todos los libros
 * contenidos en él, garantizando la invariante de PROTECT.md.
 */
export function toggleCellEnabled(
  shelfId: string,
  row: number,
  column: number,
  enabled: boolean,
): { updatedCells: ShelfCell[]; updatedBooks: Book[]; deletedBookCount: number } {
  const cells = getStoredCells();
  const updatedCells = cells
    .map((cell) => {
      if (cell.shelfId === shelfId && cell.row === row && cell.column === column) {
        return { ...cell, enabled };
      }
      return cell;
    })
    .sort((a, b) => (a.row !== b.row ? a.row - b.row : a.column - b.column));
  saveCellsToStorage(updatedCells);

  let books = getStoredBooks();
  let deletedBookCount = 0;

  if (!enabled) {
    const remainingBooks = books.filter((book) => {
      const match =
        book.location.shelfId === shelfId &&
        book.location.row === row &&
        book.location.column === column;
      if (match) {
        deletedBookCount++;
        return false;
      }
      return true;
    });
    books = remainingBooks;
    saveBooksToStorage(books);
  }

  // Sincronizar en la nube
  syncToggleCellToSupabase(shelfId, row, column, enabled);

  return { updatedCells, updatedBooks: books, deletedBookCount };
}

/**
 * Elimina un mueble, sus celdas y los libros asociados
 */
export function deleteCustomShelf(shelfId: string): void {
  const shelves = getStoredShelves().filter((s) => s.id !== shelfId);
  saveShelvesToStorage(shelves);

  const cells = getStoredCells().filter((c) => c.shelfId !== shelfId);
  saveCellsToStorage(cells);

  const books = getStoredBooks().filter((b) => b.location.shelfId !== shelfId);
  saveBooksToStorage(books);

  const rooms = getStoredRooms().map((rm) => ({
    ...rm,
    shelfIds: rm.shelfIds.filter((id) => id !== shelfId),
  }));
  saveRoomsToStorage(rooms);

  // Sincronizar en la nube
  syncDeleteShelfFromSupabase(shelfId, rooms);
}

/**
 * Actualiza el nombre de una estantería existente
 */
export function updateShelfName(shelfId: string, newName: string): Shelf[] {
  const shelves = getStoredShelves().map((s) =>
    s.id === shelfId ? { ...s, name: newName.trim() } : s,
  );
  saveShelvesToStorage(shelves);
  void syncShelfName(shelfId, newName.trim());
  return shelves;
}

/**
 * Actualiza o guarda un libro (metadatos y reubicación)
 */
export function updateBook(updatedBook: Book): Book[] {
  const books = getStoredBooks();
  const exists = books.some((b) => b.id === updatedBook.id);
  const nextBooks = exists
    ? books.map((b) => (b.id === updatedBook.id ? updatedBook : b))
    : [...books, updatedBook];

  saveBooksToStorage(nextBooks);
  void syncBookToSupabase(updatedBook);
  return nextBooks;
}

/**
 * Elimina un libro individual
 */
export function deleteBook(bookId: string): Book[] {
  const books = getStoredBooks().filter((b) => b.id !== bookId);
  saveBooksToStorage(books);
  void syncDeleteBookFromSupabase(bookId);
  return books;
}

/**
 * Actualiza la cantidad de profundidades físicas de un cubo
 */
export function updateCellDepthCount(cellId: string, newDepthCount: number): ShelfCell[] {
  const cells = getStoredCells().map((c) =>
    c.id === cellId ? { ...c, depthCount: newDepthCount } : c,
  );
  saveCellsToStorage(cells);
  void syncCellDepth(cellId, newDepthCount);
  return cells;
}

/**
 * Catálogo base: consulta Supabase con fallback a localStorage
 */
export async function getCatalog(): Promise<LibraryCatalog> {
  if (isSupabaseConfigured && supabase) {
    try {
      const [roomsRes, shelvesRes, cellsRes, booksRes] = await Promise.all([
        supabase.from("rooms").select("*"),
        supabase.from("shelves").select("*").order("position", { ascending: true }),
        supabase
          .from("cells")
          .select("*")
          .order("row", { ascending: true })
          .order("columna", { ascending: true }),
        supabase.from("books").select("*"),
      ]);

      if (!roomsRes.error && !shelvesRes.error && !cellsRes.error && !booksRes.error) {
        let rooms: Room[] = (roomsRes.data || []).map((r) => ({
          id: r.id,
          name: r.name,
          shelfIds: r.shelf_ids || [],
        }));
        let shelves: Shelf[] = (shelvesRes.data || []).map((s) => ({
          id: s.id,
          name: s.name,
          position: s.position,
          columns: s.columns,
          rows: s.rows,
        }));
        let cells: ShelfCell[] = (cellsRes.data || [])
          .map((c) => ({
            id: c.id,
            shelfId: c.shelf_id,
            row: c.row,
            column: c.columna ?? c.column,
            enabled: c.enabled,
            depthCount: c.depth_count || 2,
            photo: c.photo || undefined,
          }))
          .sort((a, b) => (a.row !== b.row ? a.row - b.row : a.column - b.column));
        const books: Book[] = (booksRes.data || []).map((b) => ({
          id: b.id,
          title: b.title,
          author: b.author,
          isbn: b.isbn || "",
          year: b.year || 0,
          genre: b.genre || "",
          cover: b.cover || undefined,
          location: {
            shelfId: b.shelf_id,
            row: b.row,
            column: b.columna ?? b.column,
            depth: b.depth,
            position: b.position,
          },
        }));

        // Sincronizar automáticamente la profundidad de los cubos según los libros que albergan
        cells = cells.map((cell) => {
          const booksInCell = books.filter(
            (b) =>
              b.location.shelfId === cell.shelfId &&
              b.location.row === cell.row &&
              b.location.column === cell.column,
          );
          const maxBookDepth =
            booksInCell.length > 0
              ? Math.max(...booksInCell.map((b) => b.location.depth))
              : 1;
          const targetDepth = Math.max(cell.depthCount || 2, maxBookDepth);
          if (targetDepth > (cell.depthCount || 2)) {
            if (isSupabaseConfigured && supabase) {
              void supabase
                .from("cells")
                .update({ depth_count: targetDepth })
                .eq("id", cell.id);
            }
            return { ...cell, depthCount: targetDepth };
          }
          return cell;
        });

        // Si la base de datos en Supabase está vacía, sembrar la estantería inicial
        if (shelves.length === 0) {
          await Promise.all([
            supabase.from("rooms").upsert({
              id: initialRoom.id,
              name: initialRoom.name,
              shelf_ids: initialRoom.shelfIds,
            }),
            supabase.from("shelves").upsert(
              initialShelves.map((s) => ({
                id: s.id,
                name: s.name,
                position: s.position,
                columns: s.columns,
                rows: s.rows,
              })),
            ),
            supabase.from("cells").upsert(
              initialCells.map((c) => ({
                id: c.id,
                shelf_id: c.shelfId,
                row: c.row,
                columna: c.column,
                enabled: c.enabled,
                depth_count: c.depthCount,
              })),
            ),
          ]);
          rooms = [initialRoom];
          shelves = initialShelves;
          cells = initialCells;
        }

        // Auto-reparación de celdas faltantes en cualquier estantería
        const missingCellsShelves = shelves.filter(
          (s) => !cells.some((c) => c.shelfId === s.id),
        );
        if (missingCellsShelves.length > 0) {
          const generatedCells: ShelfCell[] = [];
          for (const s of missingCellsShelves) {
            for (let r = 1; r <= s.rows; r++) {
              for (let c = 1; c <= s.columns; c++) {
                generatedCells.push({
                  id: `cell-${s.id}-${r}-${c}`,
                  shelfId: s.id,
                  row: r,
                  column: c,
                  enabled: true,
                  depthCount: 2,
                });
              }
            }
          }
          cells = [...cells, ...generatedCells];
          if (isSupabaseConfigured && supabase) {
            void supabase.from("cells").upsert(
              generatedCells.map((c) => ({
                id: c.id,
                shelf_id: c.shelfId,
                row: c.row,
                columna: c.column,
                enabled: c.enabled,
                depth_count: c.depthCount,
              })),
            );
          }
        }

        // Invariante ARQUITECTURE.md: solo libros en cubos activos
        const validBooks = sanitizeBooksAgainstCells(books, cells);
        if (validBooks.length !== books.length && isSupabaseConfigured && supabase) {
          const enabledCellKeys = new Set(
            cells.filter((c) => c.enabled).map((c) => `${c.shelfId}:${c.row}:${c.column}`),
          );
          const orphanedIds = books
            .filter((b) => !enabledCellKeys.has(`${b.location.shelfId}:${b.location.row}:${b.location.column}`))
            .map((b) => b.id);
          if (orphanedIds.length > 0) {
            void supabase.from("books").delete().in("id", orphanedIds);
          }
        }

        // Cache local
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_ROOMS_KEY, JSON.stringify(rooms));
            localStorage.setItem(STORAGE_SHELVES_KEY, JSON.stringify(shelves));
            localStorage.setItem(STORAGE_CELLS_KEY, JSON.stringify(cells));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(validBooks));
          } catch {
            // Ignorar errores de cuota local
          }
        }

        // Disparar enriquecimiento automático de portadas en segundo plano
        if (typeof window !== "undefined") {
          void enrichBooksWithCovers(validBooks);
        }

        return {
          room: rooms[0] || initialRoom,
          rooms: rooms.length > 0 ? rooms : [initialRoom],
          shelves,
          cells,
          books: validBooks,
        };
      }
    } catch (err) {
      console.warn("Fallo de conexión con Supabase, usando respaldo local:", err);
    }
  }

  // Respaldo local
  const rawCells = getStoredCells().sort((a, b) =>
    a.row !== b.row ? a.row - b.row : a.column - b.column,
  );
  const shelves = getStoredShelves();
  const rooms = getStoredRooms();

  // Auto-reparación local de celdas faltantes
  const missingCellsShelves = shelves.filter(
    (s) => !rawCells.some((c) => c.shelfId === s.id),
  );
  let cells = rawCells;
  if (missingCellsShelves.length > 0) {
    const generatedCells: ShelfCell[] = [];
    for (const s of missingCellsShelves) {
      for (let r = 1; r <= s.rows; r++) {
        for (let c = 1; c <= s.columns; c++) {
          generatedCells.push({
            id: `cell-${s.id}-${r}-${c}`,
            shelfId: s.id,
            row: r,
            column: c,
            enabled: true,
            depthCount: 2,
          });
        }
      }
    }
    cells = [...rawCells, ...generatedCells];
    saveCellsToStorage(cells);
  }

  // Obtener libros saneados según celdas activas
  const rawBooks = getStoredBooks();
  const books = sanitizeBooksAgainstCells(rawBooks, cells);
  if (books.length !== rawBooks.length && typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    } catch {
      // Ignorar errores
    }
  }

  return {
    room: rooms[0] || initialRoom,
    rooms: rooms.length > 0 ? rooms : [initialRoom],
    shelves,
    cells,
    books,
  };
}

/**
 * Suscribe a cambios en tiempo real provenientes de otros dispositivos (Supabase Realtime)
 * y de otras pestañas en el mismo navegador (StorageEvent).
 * Permite que cualquier dispositivo conectado refleje los cambios al instante.
 */
export function subscribeToLibraryChanges(
  onSync: (catalog: LibraryCatalog) => void,
): () => void {
  let isSubscribed = true;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const triggerReload = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (!isSubscribed) return;
      try {
        const fresh = await getCatalog();
        if (isSubscribed) {
          onSync(fresh);
        }
      } catch (err) {
        console.warn("Error al sincronizar en tiempo real:", err);
      }
    }, 250);
  };

  // 1. Sincronización entre pestañas en el mismo dispositivo
  const handleStorage = (event: StorageEvent) => {
    if (
      event.key &&
      (event.key.includes("biblioteca_digital_books") ||
        event.key.includes("biblioteca_digital_cells") ||
        event.key.includes("biblioteca_digital_shelves") ||
        event.key.includes("biblioteca_digital_rooms"))
    ) {
      triggerReload();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }

  // 2. Sincronización en vivo entre cualquier dispositivo (Supabase Realtime)
  let channel: RealtimeChannel | null = null;

  if (isSupabaseConfigured && supabase) {
    const channelId = `library-realtime-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "books" },
        () => triggerReload(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cells" },
        () => triggerReload(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shelves" },
        () => triggerReload(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms" },
        () => triggerReload(),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.info("⚡ Supabase Realtime activo para sincronización multidispositivo.");
        }
      });
  }

  // Desuscripción limpia
  return () => {
    isSubscribed = false;
    if (debounceTimer) clearTimeout(debounceTimer);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
    if (channel && supabase) {
      void supabase.removeChannel(channel);
    }
  };
}

/**
 * Libros de ejemplo basados en obras reales con portadas oficiales
 */
export const SAMPLE_BOOKS: Book[] = [
  {
    id: "book-1",
    title: "Don Quijote de la Mancha",
    author: "Miguel de Cervantes",
    isbn: "978-8420412146",
    year: 1605,
    genre: "Clásico",
    cover: "https://covers.openlibrary.org/b/id/12817454-L.jpg",
    location: {
      shelfId: "shelf-A",
      row: 1,
      column: 1,
      depth: 1,
      position: 1,
    },
  },
  {
    id: "book-2",
    title: "Cien años de soledad",
    author: "Gabriel García Márquez",
    isbn: "978-0307474728",
    year: 1967,
    genre: "Realismo Mágico",
    cover: "https://covers.openlibrary.org/b/id/8315182-L.jpg",
    location: {
      shelfId: "shelf-A",
      row: 1,
      column: 1,
      depth: 1,
      position: 2,
    },
  },
  {
    id: "book-3",
    title: "El laberinto de la soledad",
    author: "Octavio Paz",
    isbn: "978-9681603014",
    year: 1950,
    genre: "Ensayo",
    cover: "https://covers.openlibrary.org/b/id/8231999-L.jpg",
    location: {
      shelfId: "shelf-A",
      row: 1,
      column: 1,
      depth: 2,
      position: 1,
    },
  },
  {
    id: "book-4",
    title: "Ficciones",
    author: "Jorge Luis Borges",
    isbn: "978-8420633114",
    year: 1944,
    genre: "Ficción",
    cover: "https://covers.openlibrary.org/b/id/8235116-L.jpg",
    location: {
      shelfId: "shelf-A",
      row: 2,
      column: 3,
      depth: 1,
      position: 1,
    },
  },
  {
    id: "book-5",
    title: "El Aleph",
    author: "Jorge Luis Borges",
    isbn: "978-8420633121",
    year: 1949,
    genre: "Ficción",
    cover: "https://covers.openlibrary.org/b/id/9052951-L.jpg",
    location: {
      shelfId: "shelf-A",
      row: 2,
      column: 3,
      depth: 2,
      position: 1,
    },
  },
  {
    id: "book-6",
    title: "Rayuela",
    author: "Julio Cortázar",
    isbn: "978-8466331821",
    year: 1963,
    genre: "Novela",
    cover: "https://covers.openlibrary.org/b/id/8227092-L.jpg",
    location: {
      shelfId: "shelf-A",
      row: 3,
      column: 2,
      depth: 1,
      position: 1,
    },
  },
];

let isEnrichingCovers = false;

/**
 * Enriquecer libros almacenados sin portada buscando automáticamente en Open Library.
 * Guarda en localStorage y sincroniza con Supabase.
 */
export async function enrichBooksWithCovers(
  books: Book[],
  onUpdate?: (updated: Book[]) => void,
): Promise<Book[]> {
  const needsCover = books.filter(
    (b) =>
      (!b.cover || b.cover.includes("/b/isbn/")) &&
      (b.isbn || (b.title && !b.title.startsWith("Libro ("))),
  );
  if (needsCover.length === 0 || isEnrichingCovers) {
    return books;
  }

  isEnrichingCovers = true;
  try {
    let hasChanges = false;
    const updatedBooks = [...books];

    for (const book of needsCover) {
      try {
        const cover = await fetchBookCover(book.isbn, book.title, book.author);
        if (cover) {
          const idx = updatedBooks.findIndex((b) => b.id === book.id);
          if (idx !== -1) {
            updatedBooks[idx] = { ...updatedBooks[idx], cover };
            hasChanges = true;
          }
        }
      } catch (err) {
        console.warn(`[enrichBooks] Error resolviendo portada para ${book.title}:`, err);
      }
    }

    if (hasChanges) {
      saveBooksToStorage(updatedBooks);
      void syncSaveBooksToSupabase(updatedBooks);
      onUpdate?.(updatedBooks);
    }
    return updatedBooks;
  } finally {
    isEnrichingCovers = false;
  }
}

