"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/chrome";
import { ShelfUnit, CellDepthModal } from "@/components/Library";
import { BookDetail, AddBookModal, EditBookModal } from "@/components/book";
import {
  deleteBook,
  getCatalog,
  initialCells,
  initialRoom,
  initialShelves,
  saveBooksToStorage,
  saveCellsToStorage,
  toggleCellEnabled,
  updateBook,
  updateShelfName,
} from "@/lib/data";
import { resolveLocation } from "@/lib/selectors";
import type { Book, LibraryCatalog, ShelfCell } from "@/lib/types";

export default function ShelfDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const shelfId = resolvedParams.id;

  const [catalog, setCatalog] = useState<LibraryCatalog>({
    room: initialRoom,
    shelves: initialShelves,
    cells: initialCells,
    books: [],
  });

  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | undefined>();
  const [inspectingCell, setInspectingCell] = useState<ShelfCell | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [addLocation, setAddLocation] = useState<{ row: number; column: number; depth: number } | undefined>();

  useEffect(() => {
    getCatalog().then((data) => {
      setCatalog(data);
      setBooks(data.books);
    });
  }, []);

  const shelf = catalog.shelves.find((s) => s.id === shelfId) || catalog.shelves[0];
  const shelfCells = catalog.cells.filter((c) => c.shelfId === shelf.id);

  const selectedBook = books.find((b) => b.id === selectedBookId);
  const selectedBookLocation = selectedBook
    ? resolveLocation(shelf, selectedBook.location)
    : null;

  const handleUpdateCellDepthCount = (cellId: string, newDepthCount: number) => {
    const updatedCells = catalog.cells.map((c) =>
      c.id === cellId ? { ...c, depthCount: newDepthCount } : c,
    );
    setCatalog((prev) => ({ ...prev, cells: updatedCells }));
    saveCellsToStorage(updatedCells);

    if (inspectingCell && inspectingCell.id === cellId) {
      setInspectingCell({ ...inspectingCell, depthCount: newDepthCount });
    }
  };

  const handleSaveBook = (newBook: Book, updatedCell?: ShelfCell) => {
    const updated = [...books, newBook];
    setBooks(updated);
    saveBooksToStorage(updated);

    if (updatedCell) {
      const updatedCells = catalog.cells.map((c) =>
        c.id === updatedCell.id ? updatedCell : c,
      );
      setCatalog((prev) => ({ ...prev, cells: updatedCells }));
      saveCellsToStorage(updatedCells);
    }

    setSelectedBookId(newBook.id);
  };

  const handleUpdateBook = (updatedBook: Book, updatedCell?: ShelfCell) => {
    const updated = updateBook(updatedBook);
    setBooks(updated);
    if (updatedCell) {
      const updatedCells = catalog.cells.map((c) =>
        c.id === updatedCell.id ? updatedCell : c,
      );
      setCatalog((prev) => ({ ...prev, cells: updatedCells }));
      saveCellsToStorage(updatedCells);
    }
    setIsEditModalOpen(false);
  };

  const handleDeleteBook = (idToDelete: string) => {
    const updated = deleteBook(idToDelete);
    setBooks(updated);
    setSelectedBookId(undefined);
    setIsEditModalOpen(false);
  };

  const handleRenameShelf = (targetShelfId: string, newName: string) => {
    const updated = updateShelfName(targetShelfId, newName);
    setCatalog((prev) => ({
      ...prev,
      shelves: updated,
    }));
  };

  const handleToggleCellEnabled = (cell: ShelfCell, enabled: boolean) => {
    const { updatedCells, updatedBooks } = toggleCellEnabled(
      cell.shelfId,
      cell.row,
      cell.column,
      enabled,
    );

    setCatalog((prev) => ({
      ...prev,
      cells: updatedCells,
      books: updatedBooks,
    }));
    setBooks(updatedBooks);

    if (!enabled && selectedBook) {
      if (
        selectedBook.location.shelfId === cell.shelfId &&
        selectedBook.location.row === cell.row &&
        selectedBook.location.column === cell.column
      ) {
        setSelectedBookId(undefined);
      }
    }

    if (inspectingCell && inspectingCell.id === cell.id) {
      setInspectingCell({ ...inspectingCell, enabled });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      <AppHeader
        title={`Biblioteca Digital — ${shelf.name}`}
        bookCount={books.length}
        onAddBook={() => {
          setAddLocation(undefined);
          setIsAddModalOpen(true);
        }}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-blue-400 font-mono mb-1">
              <Link href="/" className="hover:underline">Inicio</Link>
              <span>›</span>
              <Link href="/shelves" className="hover:underline">Muebles</Link>
              <span>›</span>
              <span>{shelf.name}</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Vista Detallada: {shelf.name}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Rejilla física Kallax ({shelf.columns}×{shelf.rows} cubos). Haz clic en un cubo para desplegar la profundidad.
            </p>
          </div>

          <Link
            href="/"
            className="text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
          >
            ← Volver al mapa general
          </Link>
        </div>

        <section className="flex justify-center py-4">
          <ShelfUnit
            shelf={shelf}
            cells={shelfCells}
            books={books}
            density="detail"
            selectedBookId={selectedBookId}
            onSelectCell={(cell) => setInspectingCell(cell)}
            onSelectBook={(bookId) => setSelectedBookId(bookId)}
            onRenameShelf={handleRenameShelf}
            onToggleCellEnabled={handleToggleCellEnabled}
          />
        </section>
      </main>

      <CellDepthModal
        cell={inspectingCell}
        shelf={shelf}
        books={books}
        selectedBookId={selectedBookId}
        onClose={() => setInspectingCell(null)}
        onSelectBook={(bookId) => setSelectedBookId(bookId)}
        onAddBookToCell={(row, column, depth) => {
          setAddLocation({ row, column, depth });
          setIsAddModalOpen(true);
        }}
        onUpdateDepthCount={handleUpdateCellDepthCount}
        onToggleCellEnabled={handleToggleCellEnabled}
      />

      {selectedBook && selectedBookLocation && (
        <BookDetail
          book={selectedBook}
          location={selectedBookLocation}
          onClose={() => setSelectedBookId(undefined)}
          onShowInShelf={() => {}}
          onEditBook={() => setIsEditModalOpen(true)}
        />
      )}

      {isAddModalOpen && (
        <AddBookModal
          shelf={shelf}
          cells={shelfCells}
          existingBooks={books}
          initialLocation={addLocation}
          onClose={() => setIsAddModalOpen(false)}
          onSaveBook={handleSaveBook}
        />
      )}

      {isEditModalOpen && selectedBook && (
        <EditBookModal
          book={selectedBook}
          shelves={catalog.shelves}
          cells={catalog.cells}
          onClose={() => setIsEditModalOpen(false)}
          onUpdateBook={handleUpdateBook}
          onDeleteBook={handleDeleteBook}
        />
      )}
    </div>
  );
}
