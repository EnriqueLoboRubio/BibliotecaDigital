"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/chrome";
import { EditBookModal } from "@/components/book";
import {
  deleteBook,
  getCatalog,
  initialCells,
  initialRoom,
  initialShelves,
  saveCellsToStorage,
  updateBook,
} from "@/lib/data";
import { resolveLocation } from "@/lib/selectors";
import type { Book, LibraryCatalog, ShelfCell } from "@/lib/types";

export default function BooksIndexPage() {
  const [catalog, setCatalog] = useState<LibraryCatalog>({
    room: initialRoom,
    shelves: initialShelves,
    cells: initialCells,
    books: [],
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  useEffect(() => {
    getCatalog().then(setCatalog);
  }, []);

  const shelf = catalog.shelves[0] || initialShelves[0];

  const filteredBooks = catalog.books.filter((b) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      b.title.toLowerCase().includes(term) ||
      b.author.toLowerCase().includes(term) ||
      b.isbn.toLowerCase().includes(term) ||
      b.genre.toLowerCase().includes(term)
    );
  });

  const handleUpdateBook = (updatedBook: Book, updatedCell?: ShelfCell) => {
    const newBooks = updateBook(updatedBook);
    setCatalog((prev) => ({
      ...prev,
      books: newBooks,
      cells: updatedCell
        ? prev.cells.map((c) => (c.id === updatedCell.id ? updatedCell : c))
        : prev.cells,
    }));
    if (updatedCell) {
      saveCellsToStorage(
        catalog.cells.map((c) => (c.id === updatedCell.id ? updatedCell : c)),
      );
    }
    setEditingBook(null);
  };

  const handleDeleteBook = (bookId: string) => {
    const newBooks = deleteBook(bookId);
    setCatalog((prev) => ({
      ...prev,
      books: newBooks,
    }));
    setEditingBook(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      <AppHeader title="Biblioteca Digital — Catálogo" bookCount={catalog.books.length} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-blue-400 font-mono mb-1">
              <Link href="/" className="hover:underline">Inicio</Link>
              <span>›</span>
              <span>Catálogo Textual</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Catálogo de Libros Registrados
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Vista textual complementaria con índice bibliográfico, edición y localización física.
            </p>
          </div>

          <div className="w-full sm:w-72">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar catálogo..."
              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {catalog.books.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
              📚
            </div>
            <h2 className="text-base font-semibold text-white">
              No hay libros registrados aún
            </h2>
            <p className="text-xs text-slate-400 max-w-md">
              Regresa a la estantería física para colocar tus primeros libros en las coordenadas correspondientes.
            </p>
            <Link
              href="/"
              className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all"
            >
              Ir a la estantería
            </Link>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-8 text-center text-xs text-slate-400">
            No se encontró ningún libro con «{searchTerm}».
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Título y Autor</th>
                  <th className="px-4 py-3.5 hidden sm:table-cell">Género / Año</th>
                  <th className="px-4 py-3.5">Ubicación Física</th>
                  <th className="px-4 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredBooks.map((book) => {
                  const loc = resolveLocation(shelf, book.location);
                  const isBehind = book.location.depth > 1;

                  return (
                    <tr key={book.id} title={loc.phrase} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <Link href={`/books/${book.id}`} className="font-semibold text-white hover:text-blue-400 block">
                          {book.title}
                        </Link>
                        <span className="text-slate-400 text-[11px]">
                          {book.author}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium mr-2">
                          {book.genre}
                        </span>
                        <span className="text-slate-500">
                          {book.year}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                            F{book.location.row} · C{book.location.column}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded font-medium ${
                              isBehind
                                ? "bg-amber-950/80 text-amber-300 border border-amber-700/60"
                                : "bg-blue-950/80 text-blue-300 border border-blue-700/60"
                            }`}
                          >
                            {isBehind ? "Detrás" : "Frente"} #{book.location.position}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingBook(book)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors"
                            title="Editar libro y ubicación"
                          >
                            <span>✏️ Editar</span>
                          </button>

                          <Link
                            href={`/?book=${book.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-medium transition-colors"
                          >
                            <span>Localizar</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {editingBook && (
        <EditBookModal
          book={editingBook}
          shelves={catalog.shelves}
          cells={catalog.cells}
          onClose={() => setEditingBook(null)}
          onUpdateBook={handleUpdateBook}
          onDeleteBook={handleDeleteBook}
        />
      )}
    </div>
  );
}
