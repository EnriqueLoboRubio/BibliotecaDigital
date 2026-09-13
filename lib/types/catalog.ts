import type { Book, Room, Shelf, ShelfCell } from "./entities";

/** Catálogo completo. Sin JSX. Sin registros inventados en código. */
export interface LibraryCatalog {
  room: Room;
  rooms?: Room[];
  shelves: Shelf[];
  cells: ShelfCell[];
  books: Book[];
}
