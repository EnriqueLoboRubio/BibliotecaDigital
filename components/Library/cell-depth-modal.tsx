import { useState, useRef } from "react";
import type { Book, Shelf, ShelfCell } from "@/lib/types";
import { booksAtDepth, depthLabel } from "@/lib/selectors";
import { BookSpine } from "./book-spine";
import { useAuth } from "@/lib/auth/context";

interface CellDepthModalProps {
  cell: ShelfCell | null;
  shelf: Shelf;
  books: Book[];
  selectedBookId?: string;
  highlightedBookId?: string;
  onClose: () => void;
  onSelectBook: (bookId: string) => void;
  onAddBookToCell?: (row: number, column: number, depth: number) => void;
  onDigitizeCell?: (row: number, column: number, depth: number) => void;
  onStartContinuousScan?: (row: number, column: number, depth: number) => void;
  onRelocateBook?: (book: Book) => void;
  onUpdateDepthCount?: (cellId: string, newDepthCount: number) => void;
  onToggleCellEnabled?: (cell: ShelfCell, enabled: boolean) => void;
  onReorderBooks?: (updatedBooks: Book[]) => void;
}

export function CellDepthModal({
  cell,
  shelf,
  books,
  selectedBookId,
  highlightedBookId,
  onClose,
  onSelectBook,
  onAddBookToCell,
  onDigitizeCell,
  onStartContinuousScan,
  onRelocateBook,
  onUpdateDepthCount,
  onToggleCellEnabled,
  onReorderBooks,
}: CellDepthModalProps) {
  const { canEdit, isAdmin } = useAuth();
  const [showConfirmDisable, setShowConfirmDisable] = useState(false);

  // Estados para reordenación visual mediante Drag & Drop y Touch
  const [draggedBookId, setDraggedBookId] = useState<string | null>(null);
  const [draggedDepth, setDraggedDepth] = useState<number | null>(null);
  const [dragOverBookId, setDragOverBookId] = useState<string | null>(null);
  const touchStateRef = useRef<{ bookId: string; depth: number } | null>(null);

  if (!cell) return null;

  const cellBooks = books.filter(
    (b) =>
      b.location.shelfId === cell.shelfId &&
      b.location.row === cell.row &&
      b.location.column === cell.column,
  );

  // Si el cubo está desactivado (sin uso), mostrar vista específica para activarlo
  if (!cell.enabled) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cell-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-2xl bg-[#0f172a] border border-slate-700 shadow-2xl p-6 text-slate-100 flex flex-col gap-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 text-xs">
                <span className="font-semibold text-amber-400">
                  {shelf.name}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300 font-medium">
                  Fila {cell.row}, Columna {cell.column}
                </span>
              </div>
              <h2 id="cell-modal-title" className="text-xl font-bold text-white tracking-tight">
                Compartimento no disponible
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Cerrar ventana"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 pattern-disabled flex flex-col items-center text-center gap-3 py-6">
            <div className="w-12 h-12 rounded-full bg-slate-850 border border-slate-700 flex items-center justify-center text-slate-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Este compartimento está bloqueado</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Actualmente no admite libros. Si lo habilitas, podrás colocar libros tanto al frente como en profundidad.
              </p>
            </div>
            {isAdmin && onToggleCellEnabled && (
              <button
                type="button"
                onClick={() => {
                  onToggleCellEnabled(cell, true);
                  onClose();
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Habilitar compartimento para libros</span>
              </button>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Profundidades ordenadas en planta:
  // Arriba: profundidad mayor (fondo/detrás)
  // Abajo: profundidad 1 (frente)
  const depths = Array.from({ length: cell.depthCount }, (_, i) => cell.depthCount - i);

  const handleStartDisable = () => {
    if (cellBooks.length > 0) {
      setShowConfirmDisable(true);
    } else {
      onToggleCellEnabled?.(cell, false);
      onClose();
    }
  };

  const handleConfirmDisable = () => {
    setShowConfirmDisable(false);
    onToggleCellEnabled?.(cell, false);
    onClose();
  };

  // Reordenar libros dentro de la misma profundidad cambiando su posición secuencial
  const handleReorderInDepth = (sourceId: string, targetId: string, depth: number) => {
    if (!onReorderBooks || sourceId === targetId) return;
    const currentDepthBooks = booksAtDepth(cellBooks, cell, depth);
    const sourceIndex = currentDepthBooks.findIndex((b) => b.id === sourceId);
    const targetIndex = currentDepthBooks.findIndex((b) => b.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const reordered = [...currentDepthBooks];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const updated = reordered.map((b, idx) => ({
      ...b,
      location: {
        ...b.location,
        position: idx + 1,
      },
    }));

    onReorderBooks(updated);
  };

  // Mover libro una posición a la izquierda (-1) o derecha (+1)
  const handleMovePosition = (bookId: string, depth: number, delta: -1 | 1) => {
    if (!onReorderBooks) return;
    const currentDepthBooks = booksAtDepth(cellBooks, cell, depth);
    const currentIndex = currentDepthBooks.findIndex((b) => b.id === bookId);
    if (currentIndex === -1) return;
    const targetIndex = currentIndex + delta;
    if (targetIndex < 0 || targetIndex >= currentDepthBooks.length) return;

    const reordered = [...currentDepthBooks];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const updated = reordered.map((b, idx) => ({
      ...b,
      location: {
        ...b.location,
        position: idx + 1,
      },
    }));

    onReorderBooks(updated);
  };

  // Handlers para Drag & Drop nativo en escritorio
  const handleDragStart = (e: React.DragEvent, bookId: string, depth: number) => {
    setDraggedBookId(bookId);
    setDraggedDepth(depth);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", bookId);
  };

  const handleDragOver = (e: React.DragEvent, targetBookId: string, depth: number) => {
    if (draggedDepth === depth && draggedBookId && draggedBookId !== targetBookId) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverBookId(targetBookId);
    }
  };

  const handleDragEnter = (targetBookId: string, depth: number) => {
    if (draggedDepth === depth && draggedBookId && draggedBookId !== targetBookId) {
      setDragOverBookId(targetBookId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetBookId: string, depth: number) => {
    e.preventDefault();
    if (draggedBookId && draggedDepth === depth) {
      handleReorderInDepth(draggedBookId, targetBookId, depth);
    }
    handleDragEnd();
  };

  const handleDragEnd = () => {
    setDraggedBookId(null);
    setDraggedDepth(null);
    setDragOverBookId(null);
  };

  // Handlers para gestos táctiles en smartphones y tablets
  const handleTouchStart = (e: React.TouchEvent, bookId: string, depth: number) => {
    if (e.touches.length === 1) {
      touchStateRef.current = { bookId, depth };
      setDraggedBookId(bookId);
      setDraggedDepth(depth);
    }
  };

  const handleTouchMove = (e: React.TouchEvent, depth: number) => {
    if (!touchStateRef.current || touchStateRef.current.depth !== depth) return;
    const touch = e.touches[0];
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
    const container = targetEl?.closest("[data-book-id]");
    if (container) {
      const overId = container.getAttribute("data-book-id");
      if (overId && overId !== touchStateRef.current.bookId) {
        setDragOverBookId(overId);
      }
    }
  };

  const handleTouchEnd = (depth: number) => {
    if (touchStateRef.current && dragOverBookId) {
      handleReorderInDepth(touchStateRef.current.bookId, dragOverBookId, depth);
    }
    touchStateRef.current = null;
    handleDragEnd();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cell-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#0f172a] border border-slate-700 shadow-2xl p-4 sm:p-6 text-slate-100 flex flex-col gap-4 sm:gap-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3 sm:pb-4 gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1 text-xs">
              <span className="font-semibold text-amber-400">
                {shelf.name}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 font-medium">
                Fila {cell.row}, Columna {cell.column}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">
                {cell.depthCount} {cell.depthCount === 1 ? "nivel" : "niveles"}
              </span>
            </div>
            <h2 id="cell-modal-title" className="text-lg sm:text-xl font-bold tracking-tight text-white leading-snug">
              Libros en este compartimento
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Vista en profundidad: fondo arriba y primera fila al frente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Cerrar ventana"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Advertencia de confirmación al desactivar el cubo */}
        {showConfirmDisable && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-red-950/80 border border-red-800 text-slate-100 flex flex-col gap-3 animate-in fade-in duration-150">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-900/60 border border-red-700/80 flex items-center justify-center shrink-0 text-red-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-200">
                  ¿Bloquear este compartimento y retirar sus libros?
                </h4>
                <p className="text-xs text-red-300/90 mt-1 leading-relaxed">
                  Este compartimento contiene <strong>{cellBooks.length} {cellBooks.length === 1 ? "libro" : "libros"}</strong>. Al marcarlo como <em>No disponible</em>, todos los libros en su interior serán <strong>retirados</strong> de la estantería física.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-red-900/60">
              <button
                type="button"
                onClick={() => setShowConfirmDisable(false)}
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium min-h-[36px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDisable}
                className="px-3 py-1.5 rounded-lg text-xs bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-semibold shadow-md shadow-red-600/30 transition-all min-h-[36px]"
              >
                Sí, retirar {cellBooks.length} {cellBooks.length === 1 ? "libro" : "libros"} y bloquear
              </button>
            </div>
          </div>
        )}

        {/* Barra de control de estado del compartimento y capacidades */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300 font-medium">Estado:</span>
            <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-950/80 border border-emerald-800/80 text-emerald-300">
              ✓ Disponible
            </span>
            {isAdmin && onToggleCellEnabled && !showConfirmDisable && (
              <button
                type="button"
                onClick={handleStartDisable}
                className="text-xs text-slate-400 hover:text-red-400 hover:underline transition-colors ml-1 cursor-pointer"
                title="Bloquear compartimento para otros usos"
              >
                (Bloquear)
              </button>
            )}
          </div>

          {isAdmin && onUpdateDepthCount && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => onUpdateDepthCount(cell.id, cell.depthCount + 1)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 transition-all flex items-center gap-1.5 shadow-sm min-h-[36px] cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Añadir fila al fondo</span>
              </button>

              {cell.depthCount > 1 && booksAtDepth(cellBooks, cell, cell.depthCount).length === 0 && (
                <button
                  type="button"
                  onClick={() => onUpdateDepthCount(cell.id, cell.depthCount - 1)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-all min-h-[36px] cursor-pointer"
                  title="Eliminar fila vacía del fondo"
                >
                  Quitar fila vacía
                </button>
              )}
            </div>
          )}
        </div>

        {/* Filas de profundidad desplegadas en planta */}
        <div className="flex flex-col gap-4 sm:gap-6 my-1">
          {depths.map((d) => {
            const depthBooks = booksAtDepth(cellBooks, cell, d);
            const isFront = d === 1;
            const label = depthLabel(d);

            return (
              <div
                key={d}
                className={`p-3 sm:p-4 rounded-xl border transition-all ${
                  isFront
                    ? "bg-slate-900/90 border-amber-500/30 shadow-lg shadow-amber-500/5"
                    : "bg-slate-950/70 border-slate-800"
                }`}
              >
                {/* Cabecera de la profundidad */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                        isFront
                          ? "bg-amber-600/90 text-white shadow-sm"
                          : "bg-slate-800/90 text-slate-300 border border-slate-700/80"
                      }`}
                    >
                      {isFront ? "Primera fila (al frente)" : label}
                    </span>
                    <span className="text-xs text-slate-400">
                      {depthBooks.length === 0
                        ? "Sin libros"
                        : `${depthBooks.length} ${depthBooks.length === 1 ? "libro" : "libros"}`}
                    </span>
                    {canEdit && depthBooks.length > 1 && (
                      <span className="text-[10px] text-amber-300/90 bg-amber-950/60 border border-amber-600/40 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium select-none shadow-sm">
                        <span>⠿</span>
                        <span className="hidden sm:inline">Arrastra para reordenar</span>
                        <span className="sm:hidden">Reordenable</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    {canEdit ? (
                      <>
                        {onStartContinuousScan && (
                          <button
                            type="button"
                            onClick={() => onStartContinuousScan(cell.row, cell.column, d)}
                            className="text-xs font-semibold text-sky-300 hover:text-sky-200 bg-sky-950/60 hover:bg-sky-900/70 px-2.5 py-1.5 rounded-xl border border-sky-700/60 transition-colors flex items-center justify-center gap-1 shadow-sm min-h-[36px] cursor-pointer"
                            title="Escanear múltiples códigos de barras de forma continua para este compartimento"
                          >
                            <span>⚡ Modo Ráfaga</span>
                          </button>
                        )}

                        {onDigitizeCell && (
                          <button
                            type="button"
                            onClick={() => onDigitizeCell(cell.row, cell.column, d)}
                            className="text-xs font-medium text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-750 px-2.5 py-1.5 rounded-xl border border-slate-700/80 transition-colors flex items-center justify-center gap-1 shadow-sm min-h-[36px]"
                            title="Digitalizar este compartimento con foto e IA"
                          >
                            <span>📸 Escanear con IA</span>
                          </button>
                        )}

                        {onAddBookToCell && (
                          <button
                            type="button"
                            onClick={() => onAddBookToCell(cell.row, cell.column, d)}
                            className="text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-950/50 hover:bg-amber-900/60 px-3 py-1.5 rounded-xl border border-amber-700/50 transition-colors flex items-center justify-center gap-1.5 shadow-sm min-h-[36px] cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Colocar libro</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">
                        Inicia sesión para colocar libros
                      </span>
                    )}
                  </div>
                </div>

                {/* Balda gráfica con los libros alineados horizontalmente y reordenables */}
                <div className="min-h-[130px] sm:min-h-[140px] rounded-lg bg-black/40 border-b-4 border-amber-950/70 px-3 sm:px-4 py-3 flex items-end justify-start gap-2 overflow-x-auto shadow-inner">
                  {depthBooks.length > 0 ? (
                    depthBooks.map((book, bookIdx) => {
                      const isDraggingThis = draggedBookId === book.id;
                      const isDragOverThis = dragOverBookId === book.id && draggedDepth === d;

                      return (
                        <div
                          key={book.id}
                          data-book-id={book.id}
                          draggable={canEdit && depthBooks.length > 1}
                          onDragStart={(e) => handleDragStart(e, book.id, d)}
                          onDragOver={(e) => handleDragOver(e, book.id, d)}
                          onDragEnter={() => handleDragEnter(book.id, d)}
                          onDrop={(e) => handleDrop(e, book.id, d)}
                          onDragEnd={handleDragEnd}
                          onTouchStart={(e) => handleTouchStart(e, book.id, d)}
                          onTouchMove={(e) => handleTouchMove(e, d)}
                          onTouchEnd={() => handleTouchEnd(d)}
                          className={`group flex flex-col items-center gap-1 shrink-0 select-none transition-all duration-150 relative p-1 rounded-xl ${
                            canEdit && depthBooks.length > 1
                              ? "cursor-grab active:cursor-grabbing hover:bg-slate-800/40"
                              : ""
                          } ${
                            isDraggingThis
                              ? "opacity-30 scale-95 ring-2 ring-amber-400 bg-amber-500/10"
                              : isDragOverThis
                                ? "border-l-4 border-amber-400 pl-2 bg-amber-500/15"
                                : ""
                          }`}
                        >
                          <div className="h-24 sm:h-28 flex items-end">
                            <BookSpine
                              book={book}
                              selected={selectedBookId === book.id}
                              highlighted={highlightedBookId === book.id}
                              dimmed={Boolean(
                                highlightedBookId && highlightedBookId !== book.id,
                              )}
                              locationLabel={`Posición ${book.location.position}`}
                              onSelect={onSelectBook}
                            />
                          </div>

                          <div className="flex items-center gap-0.5 mt-0.5">
                            {canEdit && depthBooks.length > 1 && (
                              <button
                                type="button"
                                disabled={bookIdx === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMovePosition(book.id, d, -1);
                                }}
                                className="w-4 h-4 rounded flex items-center justify-center text-[10px] text-slate-400 hover:text-amber-300 hover:bg-slate-800 disabled:opacity-15 disabled:pointer-events-none cursor-pointer transition-colors"
                                title="Mover una posición a la izquierda"
                                aria-label="Mover a la izquierda"
                              >
                                ◀
                              </button>
                            )}
                            <span
                              className="text-[10px] text-slate-400 font-mono font-medium px-1"
                              title={`Posición ${book.location.position} de ${depthBooks.length}`}
                            >
                              Pos. {book.location.position}
                            </span>
                            {canEdit && depthBooks.length > 1 && (
                              <button
                                type="button"
                                disabled={bookIdx === depthBooks.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMovePosition(book.id, d, 1);
                                }}
                                className="w-4 h-4 rounded flex items-center justify-center text-[10px] text-slate-400 hover:text-amber-300 hover:bg-slate-800 disabled:opacity-15 disabled:pointer-events-none cursor-pointer transition-colors"
                                title="Mover una posición a la derecha"
                                aria-label="Mover a la derecha"
                              >
                                ▶
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="w-full flex flex-col items-center justify-center py-6 text-slate-400">
                      <span className="text-xs font-medium">Fila vacía</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        No hay libros colocados en esta fila
                      </span>
                    </div>
                  )}
                </div>

                {/* Lista táctil adicional en móvil (< sm) para tocar libros fácilmente */}
                {depthBooks.length > 0 && (
                  <div className="sm:hidden mt-3 pt-3 border-t border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Libros en esta fila ({depthBooks.length}):
                      </span>
                      {canEdit && depthBooks.length > 1 && (
                        <span className="text-[10px] text-amber-300/80 flex items-center gap-1">
                          <span>↕</span>
                          <span>Usa las flechas para reordenar</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {depthBooks.map((b, bIdx) => (
                        <div
                          key={b.id}
                          className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 text-left transition-colors min-h-[44px]"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {canEdit && depthBooks.length > 1 && (
                              <div className="flex items-center gap-0.5 shrink-0 bg-slate-950/80 rounded-lg p-0.5 border border-slate-750">
                                <button
                                  type="button"
                                  disabled={bIdx === 0}
                                  onClick={() => handleMovePosition(b.id, d, -1)}
                                  className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-amber-300 disabled:opacity-20 text-[10px] cursor-pointer"
                                  title="Subir posición"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  disabled={bIdx === depthBooks.length - 1}
                                  onClick={() => handleMovePosition(b.id, d, 1)}
                                  className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-amber-300 disabled:opacity-20 text-[10px] cursor-pointer"
                                  title="Bajar posición"
                                >
                                  ▼
                                </button>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => onSelectBook(b.id)}
                              className="min-w-0 flex-1 pr-2 text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono text-amber-400/80 bg-black/40 px-1.5 py-0.2 rounded shrink-0">
                                  #{b.location.position}
                                </span>
                                <span className="text-xs font-bold text-white block truncate">
                                  {b.title}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 block truncate ml-6">
                                {b.author}
                              </span>
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {canEdit && onRelocateBook && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRelocateBook(b);
                                }}
                                className="text-[10px] font-semibold text-sky-300 bg-sky-950/70 hover:bg-sky-900 border border-sky-600/50 px-2 py-1 rounded-lg shrink-0 cursor-pointer"
                                title="Reubicar rápidamente en otro compartimento"
                              >
                                ⇄ Mover
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onSelectBook(b.id)}
                              className="text-[10px] font-semibold text-amber-300 bg-amber-950/70 border border-amber-600/50 px-2 py-1 rounded-lg shrink-0 cursor-pointer"
                            >
                              Ficha →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pie del modal */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3 sm:pt-4 text-xs text-slate-400">
          <span className="truncate pr-2">
            Total: <strong className="text-slate-200">{cellBooks.length === 0 ? "Sin libros" : `${cellBooks.length} ${cellBooks.length === 1 ? "libro" : "libros"}`}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors min-h-[38px] cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
