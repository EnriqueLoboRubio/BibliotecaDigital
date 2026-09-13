"use client";

import { useState, useId } from "react";
import type { Book, Shelf, ShelfCell } from "@/lib/types";

interface EditBookModalProps {
  book: Book;
  shelves: Shelf[];
  cells: ShelfCell[];
  onClose: () => void;
  onUpdateBook: (book: Book, updatedCell?: ShelfCell) => void;
  onDeleteBook: (bookId: string) => void;
}

export function EditBookModal({
  book,
  shelves,
  cells,
  onClose,
  onUpdateBook,
  onDeleteBook,
}: EditBookModalProps) {
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [isbn, setIsbn] = useState(book.isbn);
  const [year, setYear] = useState(book.year);
  const [genre, setGenre] = useState(book.genre);
  const [shelfId, setShelfId] = useState(book.location.shelfId);
  const [row, setRow] = useState(book.location.row);
  const [column, setColumn] = useState(book.location.column);
  const [depth, setDepth] = useState(book.location.depth);
  const [position, setPosition] = useState(book.location.position);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const titleId = useId();
  const authorId = useId();
  const isbnId = useId();
  const yearId = useId();
  const genreId = useId();
  const shelfSelectId = useId();
  const rowId = useId();
  const columnId = useId();
  const depthId = useId();
  const positionId = useId();

  const selectedShelf = shelves.find((s) => s.id === shelfId) || shelves[0];

  const selectedCell = cells.find(
    (c) => c.shelfId === shelfId && c.row === row && c.column === column,
  );

  const isCellDisabled = selectedCell ? !selectedCell.enabled : false;
  const currentDepthCount = selectedCell ? selectedCell.depthCount : 2;

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

    const updatedBook: Book = {
      ...book,
      title: title.trim(),
      author: author.trim(),
      isbn: isbn.trim() || "S/N",
      year: Number(year) || new Date().getFullYear(),
      genre: genre.trim() || "General",
      location: {
        shelfId,
        row,
        column,
        depth,
        position: Math.max(1, Number(position) || 1),
      },
    };

    onUpdateBook(updatedBook, updatedCell);
    onClose();
  };

  const depthOptions: { value: number; label: string }[] = [];
  for (let d = 1; d <= currentDepthCount; d++) {
    depthOptions.push({
      value: d,
      label: d === 1 ? "Frente (Profundidad 1)" : d === 2 ? "Detrás (Profundidad 2)" : `Fila de profundidad ${d}`,
    });
  }
  depthOptions.push({
    value: currentDepthCount + 1,
    label: `+ Crear nueva fila de profundidad (${currentDepthCount + 1})`,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-book-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[#0f172a] border border-slate-700 shadow-2xl p-6 text-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 id="edit-book-title" className="text-xl font-bold text-white">
              Editar Libro / Reubicar
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Modifica los metadatos o traslada el libro a otra estantería, cubo o profundidad.
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
          {/* Metadatos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor={titleId} className="block text-slate-300 font-medium mb-1">
                Título *
              </label>
              <input
                id={titleId}
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-xs"
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
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <div>
              <label htmlFor={isbnId} className="block text-slate-300 font-medium mb-1">
                ISBN
              </label>
              <input
                id={isbnId}
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-xs"
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
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <div>
              <label htmlFor={yearId} className="block text-slate-300 font-medium mb-1">
                Año
              </label>
              <input
                id={yearId}
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>
          </div>

          {/* Reubicación Física */}
          <div className="border-t border-slate-800 pt-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2.5">
              Ubicación física del libro
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="sm:col-span-2">
                <label htmlFor={shelfSelectId} className="block text-slate-300 font-medium mb-1">
                  Estantería destino
                </label>
                <select
                  id={shelfSelectId}
                  value={shelfId}
                  onChange={(e) => {
                    setShelfId(e.target.value);
                    setRow(1);
                    setColumn(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-xs"
                >
                  {shelves.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.columns}×{s.rows} cubos)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={rowId} className="block text-slate-300 font-medium mb-1">
                  Fila (1-{selectedShelf.rows})
                </label>
                <select
                  id={rowId}
                  value={row}
                  onChange={(e) => setRow(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-xs"
                >
                  {Array.from({ length: selectedShelf.rows }, (_, i) => i + 1).map((r) => (
                    <option key={r} value={r}>
                      Fila {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={columnId} className="block text-slate-300 font-medium mb-1">
                  Columna (1-{selectedShelf.columns})
                </label>
                <select
                  id={columnId}
                  value={column}
                  onChange={(e) => setColumn(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-xs"
                >
                  {Array.from({ length: selectedShelf.columns }, (_, i) => i + 1).map((c) => (
                    <option key={c} value={c}>
                      Columna {c}
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

              <div>
                <label htmlFor={positionId} className="block text-slate-300 font-medium mb-1">
                  Posición / Orden
                </label>
                <input
                  id={positionId}
                  type="number"
                  min={1}
                  value={position}
                  onChange={(e) => setPosition(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 text-xs font-mono"
                />
              </div>
            </div>

            {/* Validación visual de celda */}
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">
                Ubicación: <strong className="text-white">{selectedShelf.name}, Cubo {row}×{column}, Prof. {depth}, #{position}</strong>
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
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-300 font-medium">¿Seguro?</span>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteBook(book.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow"
                >
                  Sí, eliminar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors"
              >
                Eliminar este libro
              </button>
            )}

            <div className="flex items-center gap-2">
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
                Guardar cambios
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
