"use client";

import { useState, useId } from "react";
import Image from "next/image";
import type { Book, Shelf, ShelfCell } from "@/lib/types";
import { BarcodeScannerModal } from "@/components/scanner";
import { fetchBookByISBN, cleanISBN } from "@/lib/services/open-library";

interface AddBookModalProps {
  shelf: Shelf;
  cells: ShelfCell[];
  existingBooks: Book[];
  initialLocation?: {
    row: number;
    column: number;
    depth: number;
  };
  onClose: () => void;
  onSaveBook: (book: Book, updatedCell?: ShelfCell) => void;
}

export function AddBookModal({
  shelf,
  cells,
  existingBooks,
  initialLocation,
  onClose,
  onSaveBook,
}: AddBookModalProps) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [genre, setGenre] = useState("Narrativa");
  const [cover, setCover] = useState<string | undefined>(undefined);
  const [row, setRow] = useState(initialLocation?.row ?? 1);
  const [column, setColumn] = useState(initialLocation?.column ?? 1);
  const [depth, setDepth] = useState(initialLocation?.depth ?? 1);
  const [error, setError] = useState<string | null>(null);

  // Estados de escáner y consulta a Open Library
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [metadataFeedback, setMetadataFeedback] = useState<{
    type: "success" | "warning" | "info";
    text: string;
  } | null>(null);

  // Generar IDs únicos para accesibilidad en inputs
  const titleId = useId();
  const authorId = useId();
  const isbnId = useId();
  const yearId = useId();
  const genreId = useId();
  const rowId = useId();
  const columnId = useId();
  const depthId = useId();

  // Comprobar si el cubo elegido está habilitado
  const selectedCell = cells.find(
    (c) => c.shelfId === shelf.id && c.row === row && c.column === column,
  );

  const isCellDisabled = selectedCell ? !selectedCell.enabled : false;
  const currentDepthCount = selectedCell ? selectedCell.depthCount : 2;

  // Calcular la siguiente posición disponible en esa profundidad
  const booksInTargetDepth = existingBooks.filter(
    (b) =>
      b.location.shelfId === shelf.id &&
      b.location.row === row &&
      b.location.column === column &&
      b.location.depth === depth,
  );
  const nextPosition = booksInTargetDepth.length + 1;

  // Consultar metadatos en Open Library
  const handleFetchMetadata = async (rawCode: string) => {
    const clean = cleanISBN(rawCode);
    if (!clean) return;

    setIsbn(clean);
    setIsFetchingMetadata(true);
    setMetadataFeedback(null);
    setError(null);

    try {
      const data = await fetchBookByISBN(clean);
      if (data) {
        if (data.title) setTitle(data.title);
        if (data.author) setAuthor(data.author);
        if (data.year) setYear(data.year);
        if (data.genre) setGenre(data.genre);
        if (data.cover) setCover(data.cover);

        setMetadataFeedback({
          type: "success",
          text: `¡Metadatos obtenidos de Open Library! "${data.title}" (${data.author})`,
        });
      } else {
        setMetadataFeedback({
          type: "warning",
          text: `Código ${clean} asignado. No se encontraron datos en Open Library; puedes completar el título y autor manualmente.`,
        });
      }
    } catch {
      setMetadataFeedback({
        type: "warning",
        text: `Código ${clean} asignado. Completa los datos manualmente.`,
      });
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  const handleScanSuccess = (scannedCode: string) => {
    void handleFetchMetadata(scannedCode);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      setError("El título y el autor son obligatorios.");
      return;
    }

    if (isCellDisabled) {
      setError(`El compartimento en la fila ${row}, columna ${column} no está disponible para colocar libros.`);
      return;
    }

    let updatedCell: ShelfCell | undefined;
    if (selectedCell && depth > selectedCell.depthCount) {
      updatedCell = {
        ...selectedCell,
        depthCount: depth,
      };
    }

    const newBook: Book = {
      id: `book-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      author: author.trim(),
      isbn: isbn.trim() || "S/N",
      year: Number(year) || new Date().getFullYear(),
      genre: genre.trim() || "General",
      cover: cover || undefined,
      location: {
        shelfId: shelf.id,
        row,
        column,
        depth,
        position: nextPosition,
      },
    };

    onSaveBook(newBook, updatedCell);
    onClose();
  };

  // Opciones de profundidad (existentes + opción de crear nueva)
  const depthOptions: { value: number; label: string }[] = [];
  for (let d = 1; d <= currentDepthCount; d++) {
    depthOptions.push({
      value: d,
      label: d === 1 ? "Frente (Profundidad 1)" : d === 2 ? "Detrás (Profundidad 2)" : `Fila de profundidad ${d}`,
    });
  }
  // Opción para expandir profundidad
  depthOptions.push({
    value: currentDepthCount + 1,
    label: `+ Crear nueva fila de profundidad (${currentDepthCount + 1})`,
  });

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-book-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg rounded-2xl bg-[#0f172a] border border-slate-700 shadow-2xl p-5 sm:p-6 text-slate-100 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabecera del modal */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-3.5">
            <div>
              <h2 id="add-book-title" className="text-lg sm:text-xl font-bold text-white">
                Registrar Libro en la Biblioteca
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ubica el libro en <strong className="text-slate-200">{shelf.name}</strong> o escanea su código de barras.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tarjeta destacada: Escáner con cámara */}
          <div className="rounded-xl bg-gradient-to-r from-blue-950/70 via-indigo-950/60 to-slate-900 border border-blue-500/40 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Escáner de Código de Barras (ISBN)</h4>
                <p className="text-[11px] text-slate-300">Autocompleta título, autor y portada con Open Library</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <span>📷</span>
              <span>Abrir Cámara</span>
            </button>
          </div>

          {/* Feedback de Open Library */}
          {isFetchingMetadata && (
            <div className="p-3 rounded-xl bg-blue-950/80 border border-blue-500/50 text-xs text-blue-200 flex items-center gap-2.5 animate-pulse">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
              <span>Extrayendo metadatos desde Open Library API...</span>
            </div>
          )}

          {metadataFeedback && !isFetchingMetadata && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2.5 ${
                metadataFeedback.type === "success"
                  ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-200"
                  : "bg-amber-950/80 border-amber-500/50 text-amber-200"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm">
                  {metadataFeedback.type === "success" ? "✓" : "ℹ️"}
                </span>
                <span>{metadataFeedback.text}</span>
              </div>
              {cover && (
                <div className="relative w-8 h-11 shrink-0 rounded overflow-hidden border border-slate-700 shadow">
                  <Image
                    src={cover}
                    alt="Portada"
                    fill
                    sizes="32px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
            {/* Metadatos del libro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor={titleId} className="block text-slate-300 font-medium mb-1">
                  Título del libro *
                </label>
                <input
                  id={titleId}
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Cien años de soledad"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label htmlFor={authorId} className="block text-slate-300 font-medium mb-1">
                  Autor *
                </label>
                <input
                  id={authorId}
                  type="text"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Ej. Gabriel García Márquez"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              {/* Campo ISBN con botón de búsqueda manual */}
              <div>
                <label htmlFor={isbnId} className="block text-slate-300 font-medium mb-1">
                  ISBN / Código de barras
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id={isbnId}
                    type="text"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleFetchMetadata(isbn);
                      }
                    }}
                    placeholder="978-..."
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 text-xs font-mono"
                  />
                  <button
                    type="button"
                    disabled={isFetchingMetadata || !isbn.trim()}
                    onClick={() => handleFetchMetadata(isbn)}
                    className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors shrink-0"
                    title="Buscar metadatos en Open Library por este ISBN"
                  >
                    🔍 Buscar
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor={genreId} className="block text-slate-300 font-medium mb-1">
                  Género
                </label>
                <input
                  id={genreId}
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="Novela, Ficción, Ensayo..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label htmlFor={yearId} className="block text-slate-300 font-medium mb-1">
                  Año de publicación
                </label>
                <input
                  id={yearId}
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>
            </div>

            {/* Coordenadas Físicas Espaciales adaptadas al tamaño real del mueble */}
            <div className="border-t border-slate-800 pt-3">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2.5">
                Coordenadas físicas en {shelf.name}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor={rowId} className="block text-slate-300 font-medium mb-1">
                    Fila (1-{shelf.rows})
                  </label>
                  <select
                    id={rowId}
                    value={row}
                    onChange={(e) => setRow(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-xs"
                  >
                    {Array.from({ length: shelf.rows }, (_, i) => i + 1).map((r) => (
                      <option key={r} value={r}>
                        Fila {r} {r === 1 ? "(arriba)" : r === shelf.rows ? "(abajo)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={columnId} className="block text-slate-300 font-medium mb-1">
                    Columna (1-{shelf.columns})
                  </label>
                  <select
                    id={columnId}
                    value={column}
                    onChange={(e) => setColumn(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-xs"
                  >
                    {Array.from({ length: shelf.columns }, (_, i) => i + 1).map((c) => (
                      <option key={c} value={c}>
                        Columna {c} {c === 1 ? "(izq.)" : c === shelf.columns ? "(der.)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={depthId} className="block text-slate-300 font-medium mb-1">
                    Profundidad
                  </label>
                  <select
                    id={depthId}
                    value={depth}
                    onChange={(e) => setDepth(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-xs font-medium text-emerald-300"
                  >
                    {depthOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Validación visual de la celda elegida */}
              <div className="mt-3 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">
                  Ubicación: <strong className="text-white">Fila {row}, Columna {column} · {depth === 1 ? "Primera fila (frente)" : `Fila del fondo (${depth})`} · Posición {nextPosition}</strong>
                </span>

                {isCellDisabled ? (
                  <span className="text-[10px] font-bold text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-800">
                    No disponible
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    Disponible
                  </span>
                )}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isCellDisabled}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                Guardar y colocar libro
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Escáner de Código de Barras */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </>
  );
}
