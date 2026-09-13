"use client";

import { useState, useId } from "react";
import type { Book, Shelf, ShelfCell } from "@/lib/types";

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
  const [row, setRow] = useState(initialLocation?.row ?? 1);
  const [column, setColumn] = useState(initialLocation?.column ?? 1);
  const [depth, setDepth] = useState(initialLocation?.depth ?? 1);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      setError("El título y el autor son obligatorios.");
      return;
    }

    if (isCellDisabled) {
      setError(`El cubo Fila ${row} × Columna ${column} está marcado como sin uso físico.`);
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-book-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[#0f172a] border border-slate-700 shadow-2xl p-6 text-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 id="add-book-title" className="text-xl font-bold text-white">
              Registrar Libro en la Biblioteca
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Asigna las coordenadas físicas del libro en la estantería {shelf.name}.
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

        {error && (
          <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200">
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
                placeholder="Ej. Rayuela"
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
                placeholder="Ej. Julio Cortázar"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <div>
              <label htmlFor={isbnId} className="block text-slate-300 font-medium mb-1">
                ISBN (opcional)
              </label>
              <input
                id={isbnId}
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="978-..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 text-xs"
              />
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
                placeholder="Novela, Poesía..."
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

          {/* Coordenadas Físicas Espaciales */}
          <div className="border-t border-slate-800 pt-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2.5">
              Coordenadas físicas en {shelf.name}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor={rowId} className="block text-slate-300 font-medium mb-1">
                  Fila (1-4)
                </label>
                <select
                  id={rowId}
                  value={row}
                  onChange={(e) => setRow(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-xs"
                >
                  {[1, 2, 3, 4].map((r) => (
                    <option key={r} value={r}>
                      Fila {r} ({r === 1 ? "arriba" : r === 4 ? "abajo" : ""})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={columnId} className="block text-slate-300 font-medium mb-1">
                  Columna (1-4)
                </label>
                <select
                  id={columnId}
                  value={column}
                  onChange={(e) => setColumn(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-xs"
                >
                  {[1, 2, 3, 4].map((c) => (
                    <option key={c} value={c}>
                      Columna {c} ({c === 1 ? "izq." : c === 4 ? "der." : ""})
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
                Ubicación asignada: <strong className="text-white">Cubo {row}×{column}, {depth === 1 ? "Frente" : `Profundidad ${depth}`}, Posición #{nextPosition}</strong>
              </span>

              {isCellDisabled ? (
                <span className="text-[10px] font-bold text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-800">
                  Cubo sin uso
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  Cubo disponible
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
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/30 transition-all"
            >
              Guardar y colocar libro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
