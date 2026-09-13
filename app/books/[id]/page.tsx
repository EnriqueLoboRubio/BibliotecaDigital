"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/chrome";
import { EditBookModal, LocationBreadcrumb } from "@/components/book";
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

export default function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const bookId = resolvedParams.id;

  const [catalog, setCatalog] = useState<LibraryCatalog>({
    room: initialRoom,
    shelves: initialShelves,
    cells: initialCells,
    books: [],
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    getCatalog().then(setCatalog);
  }, []);

  const shelf = catalog.shelves[0] || initialShelves[0];
  const book = catalog.books.find((b) => b.id === bookId);

  if (!book) {
    return (
      <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
        <AppHeader title="Biblioteca Digital — Ficha" />
        <main className="flex-1 max-w-xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center gap-4">
          <div className="text-4xl">🔍</div>
          <h1 className="text-xl font-bold text-white">Libro no encontrado</h1>
          <p className="text-xs text-slate-400">
            El libro solicitado no existe o fue retirado del catálogo.
          </p>
          <Link
            href="/books"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            Volver al catálogo
          </Link>
        </main>
      </div>
    );
  }

  const location = resolveLocation(shelf, book.location);
  const isBehind = book.location.depth > 1;

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
    setIsEditing(false);
  };

  const handleDeleteBook = (idToDelete: string) => {
    deleteBook(idToDelete);
    router.push("/books");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      <AppHeader title="Biblioteca Digital — Ficha de Libro" bookCount={catalog.books.length} />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-400 font-mono mb-1">
            <Link href="/" className="hover:underline">Inicio</Link>
            <span>›</span>
            <Link href="/books" className="hover:underline">Catálogo</Link>
            <span>›</span>
            <span className="truncate max-w-[200px]">{book.title}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Ficha Bibliográfica y Espacial
          </h1>
        </div>

        <article className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-2xl flex flex-col gap-6">
          <div className="flex gap-5 items-start">
            {/* Lomo editorial representativo */}
            <div className="w-24 h-36 rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-500/30 shadow-xl flex flex-col justify-between p-3 shrink-0 select-none">
              <div className="w-full h-1.5 bg-amber-400/60 rounded" />
              <span className="text-xs font-bold text-slate-200 line-clamp-4 text-center leading-tight">
                {book.title}
              </span>
              <span className="text-[9px] text-blue-300 truncate text-center">
                {book.author}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-white leading-snug">
                {book.title}
              </h2>
              <p className="text-sm font-medium text-slate-300 mt-1">
                {book.author}
              </p>

              <div className="flex flex-wrap gap-2 mt-4 text-xs">
                {book.genre && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                    {book.genre}
                  </span>
                )}
                {book.year && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
                    Año {book.year}
                  </span>
                )}
                {book.isbn && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                    ISBN: {book.isbn}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Coordenadas físicas y migas de localización */}
          <div className="border-t border-slate-800 pt-4 flex flex-col gap-3">
            <span className="text-xs font-mono uppercase text-blue-400 font-semibold tracking-wider">
              Localización Física
            </span>
            <LocationBreadcrumb location={location} />

            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 mt-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                Frase canónica:
              </span>
              <p className="text-sm font-medium text-amber-200">
                «{location.phrase}»
              </p>
            </div>

            {isBehind && (
              <div className="rounded-xl bg-amber-950/40 border border-amber-600/40 p-3 flex items-start gap-2.5 text-xs text-amber-200">
                <span className="text-base">⚠️</span>
                <div>
                  <strong className="font-semibold block text-amber-300">Libro en segunda fila</strong>
                  <span>Hay que retirar los libros de la fila delantera para acceder a este ejemplar físicamente.</span>
                </div>
              </div>
            )}
          </div>

          {/* Botones de acción hacia el mapa físico y edición */}
          <div className="border-t border-slate-800 pt-4 flex items-center justify-between flex-wrap gap-3">
            <Link
              href="/books"
              className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              ← Volver al catálogo
            </Link>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <span>✏️ Editar / Reubicar</span>
              </button>

              <Link
                href={`/?book=${book.id}`}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Localizar en estantería</span>
              </Link>
            </div>
          </div>
        </article>
      </main>

      {isEditing && (
        <EditBookModal
          book={book}
          shelves={catalog.shelves}
          cells={catalog.cells}
          onClose={() => setIsEditing(false)}
          onUpdateBook={handleUpdateBook}
          onDeleteBook={handleDeleteBook}
        />
      )}
    </div>
  );
}
