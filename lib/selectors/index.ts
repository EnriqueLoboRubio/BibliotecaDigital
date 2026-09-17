import type { Book, Shelf, ShelfCell } from "@/lib/types";
import type { BookLocation, ResolvedLocation } from "@/lib/types";

export function cellKey(shelfId: string, row: number, column: number): string {
  return `${shelfId}:${row}:${column}`;
}

export function booksInCell(books: Book[], cell: ShelfCell): Book[] {
  return books.filter(
    (book) =>
      book.location.shelfId === cell.shelfId &&
      book.location.row === cell.row &&
      book.location.column === cell.column,
  );
}

export function booksAtDepth(books: Book[], cell: ShelfCell, depth: number): Book[] {
  return booksInCell(books, cell)
    .filter((book) => book.location.depth === depth)
    .slice()
    .sort((a, b) => a.location.position - b.location.position);
}

export function frontBooks(books: Book[], cell: ShelfCell): Book[] {
  return booksAtDepth(books, cell, 1);
}

export function hiddenBookCount(books: Book[], cell: ShelfCell): number {
  return booksInCell(books, cell).filter((book) => book.location.depth > 1)
    .length;
}

export function findCell(
  cells: ShelfCell[],
  location: Pick<BookLocation, "shelfId" | "row" | "column">,
): ShelfCell | undefined {
  return cells.find(
    (cell) =>
      cell.shelfId === location.shelfId &&
      cell.row === location.row &&
      cell.column === location.column,
  );
}

export function depthLabel(depth: number): string {
  if (depth === 1) return "Primera fila (al frente)";
  if (depth === 2) return "Segunda fila (detrás)";
  return `Fila ${depth} (fondo)`;
}

export function resolveLocation(
  shelf: Shelf,
  location: BookLocation,
): ResolvedLocation {
  const label = depthLabel(location.depth);
  return {
    shelfId: shelf.id,
    shelfName: shelf.name,
    row: location.row,
    column: location.column,
    depth: location.depth,
    position: location.position,
    depthLabel: label,
    phrase: `${shelf.name}, Fila ${location.row}, Columna ${location.column} · ${label.toLowerCase()}, posición ${location.position}`,
  };
}
