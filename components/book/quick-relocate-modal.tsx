"use client";

import { useState } from "react";
import type { Book, Shelf, ShelfCell } from "@/lib/types";
import { depthLabel } from "@/lib/selectors";

export interface QuickRelocateModalProps {
  isOpen: boolean;
  book: Book | null;
  shelves: Shelf[];
  cells: ShelfCell[];
  existingBooks: Book[];
  onClose: () => void;
  onConfirmRelocate: (
    book: Book,
    targetLocation: { shelfId: string; row: number; column: number; depth: number },
  ) => void;
}

export function QuickRelocateModal({
  isOpen,
  book,
  shelves,
  cells,
  existingBooks,
  onClose,
  onConfirmRelocate,
}: QuickRelocateModalProps) {
  if (!isOpen || !book) return null;

  return (
    <QuickRelocateDialog
      key={`${book.id}-${book.location.shelfId}-${book.location.row}-${book.location.column}`}
      book={book}
      shelves={shelves}
      cells={cells}
      existingBooks={existingBooks}
      onClose={onClose}
      onConfirmRelocate={onConfirmRelocate}
    />
  );
}

interface QuickRelocateDialogProps {
  book: Book;
  shelves: Shelf[];
  cells: ShelfCell[];
  existingBooks: Book[];
  onClose: () => void;
  onConfirmRelocate: (
    book: Book,
    targetLocation: { shelfId: string; row: number; column: number; depth: number },
  ) => void;
}

function QuickRelocateDialog({
  book,
  shelves,
  cells,
  existingBooks,
  onClose,
  onConfirmRelocate,
}: QuickRelocateDialogProps) {
  const [selectedShelfId, setSelectedShelfId] = useState<string>(book.location.shelfId);
  const [selectedRow, setSelectedRow] = useState<number>(book.location.row);
  const [selectedColumn, setSelectedColumn] = useState<number>(book.location.column);
  const [selectedDepth, setSelectedDepth] = useState<number>(book.location.depth);

  const currentShelf = shelves.find((s) => s.id === selectedShelfId) || shelves[0];
  if (!currentShelf) return null;

  const shelfCells = cells.filter((c) => c.shelfId === currentShelf.id);
  const selectedCell = shelfCells.find(
    (c) => c.row === selectedRow && c.column === selectedColumn,
  );
  const depthCount = selectedCell ? selectedCell.depthCount : 2;

  // Libros en la profundidad destino elegida (excluyendo el propio libro si ya está ahí)
  const booksInDestination = existingBooks.filter(
    (b) =>
      b.id !== book.id &&
      b.location.shelfId === currentShelf.id &&
      b.location.row === selectedRow &&
      b.location.column === selectedColumn &&
      b.location.depth === selectedDepth,
  );

  const isCurrentLocation =
    book.location.shelfId === currentShelf.id &&
    book.location.row === selectedRow &&
    book.location.column === selectedColumn &&
    book.location.depth === selectedDepth;

  const isSelectedCellDisabled = selectedCell ? !selectedCell.enabled : false;

  const handleSelectCell = (row: number, col: number, enabled: boolean) => {
    if (!enabled) return;
    setSelectedRow(row);
    setSelectedColumn(col);

    const targetCell = shelfCells.find((c) => c.row === row && c.column === col);
    const maxDepth = targetCell ? targetCell.depthCount : 2;
    if (selectedDepth > maxDepth) {
      setSelectedDepth(1);
    }
  };

  const handleConfirm = () => {
    if (isCurrentLocation || isSelectedCellDisabled) return;
    onConfirmRelocate(book, {
      shelfId: currentShelf.id,
      row: selectedRow,
      column: selectedColumn,
      depth: selectedDepth,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="relocate-modal-title"
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[#090d16] border border-slate-700 shadow-2xl overflow-hidden flex flex-col text-slate-100 relative max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 id="relocate-modal-title" className="text-sm font-bold text-white">
                Reubicación Rápida
              </h3>
              <p className="text-xs text-slate-300 font-semibold truncate">
                {book.title}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                Ubicación actual: Fila {book.location.row}, Col {book.location.column} · {depthLabel(book.location.depth)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Contenido principal */}
        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
          {/* Selector de estantería (si hay más de 1) */}
          {shelves.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="target-shelf-select" className="text-xs font-semibold text-slate-300">
                Mueble de destino:
              </label>
              <select
                id="target-shelf-select"
                value={selectedShelfId}
                onChange={(e) => {
                  setSelectedShelfId(e.target.value);
                  setSelectedRow(1);
                  setSelectedColumn(1);
                  setSelectedDepth(1);
                }}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                {shelves.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.rows}x{s.columns})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selector Visual: Mini-Grid Kallax */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                1. Toca el compartimento de destino:
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Fila {selectedRow}, Columna {selectedColumn}
              </span>
            </div>

            {/* Grid representativo del mueble */}
            <div
              className="grid gap-2 p-3 bg-slate-950/80 rounded-2xl border border-slate-800 shadow-inner"
              style={{
                gridTemplateColumns: `repeat(${currentShelf.columns}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: currentShelf.rows }, (_, rIdx) => {
                const rowNum = rIdx + 1;
                return Array.from({ length: currentShelf.columns }, (_, cIdx) => {
                  const colNum = cIdx + 1;
                  const cell = shelfCells.find((c) => c.row === rowNum && c.column === colNum);
                  const isEnabled = cell ? cell.enabled : true;
                  const isSelected = selectedRow === rowNum && selectedColumn === colNum;
                  const isCurrent =
                    book.location.shelfId === currentShelf.id &&
                    book.location.row === rowNum &&
                    book.location.column === colNum;

                  const cellBooks = existingBooks.filter(
                    (b) =>
                      b.location.shelfId === currentShelf.id &&
                      b.location.row === rowNum &&
                      b.location.column === colNum,
                  );

                  return (
                    <button
                      key={`${rowNum}-${colNum}`}
                      type="button"
                      disabled={!isEnabled}
                      onClick={() => handleSelectCell(rowNum, colNum, isEnabled)}
                      className={`relative aspect-square rounded-xl p-1.5 flex flex-col items-center justify-between transition-all cursor-pointer ${
                        !isEnabled
                          ? "bg-slate-950 border border-slate-800/50 opacity-35 cursor-not-allowed pattern-disabled"
                          : isSelected
                            ? "bg-sky-950/90 border-2 border-sky-400 shadow-lg shadow-sky-500/20 scale-[1.03] z-10"
                            : isCurrent
                              ? "bg-amber-950/40 border border-amber-500/50 hover:border-amber-400"
                              : "bg-slate-900/90 border border-slate-800 hover:border-slate-600 hover:bg-slate-850"
                      }`}
                      title={
                        !isEnabled
                          ? `Fila ${rowNum}, Columna ${colNum} (Bloqueado)`
                          : `Fila ${rowNum}, Columna ${colNum} (${cellBooks.length} libros)`
                      }
                    >
                      <span className="text-[10px] font-bold font-mono text-slate-400">
                        {rowNum},{colNum}
                      </span>

                      {!isEnabled ? (
                        <span className="text-[10px] text-slate-600">✕</span>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span
                            className={`text-[10px] font-semibold ${
                              cellBooks.length > 0 ? "text-slate-300" : "text-slate-600"
                            }`}
                          >
                            {cellBooks.length} {cellBooks.length === 1 ? "lib." : "libs."}
                          </span>
                        </div>
                      )}

                      {isCurrent ? (
                        <span className="text-[9px] font-bold px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Actual
                        </span>
                      ) : isSelected ? (
                        <span className="text-[9px] font-bold px-1 rounded bg-sky-500/30 text-sky-200 border border-sky-400/40">
                          Destino
                        </span>
                      ) : (
                        <span className="w-1 h-1" />
                      )}
                    </button>
                  );
                });
              })}
            </div>
          </div>

          {/* Selector de Profundidad (Planta) */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-300">
              2. Fila de profundidad:
            </span>

            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: depthCount }, (_, idx) => {
                const d = idx + 1;
                const isDSelected = selectedDepth === d;
                const booksAtD = existingBooks.filter(
                  (b) =>
                    b.id !== book.id &&
                    b.location.shelfId === currentShelf.id &&
                    b.location.row === selectedRow &&
                    b.location.column === selectedColumn &&
                    b.location.depth === d,
                );

                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDepth(d)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      isDSelected
                        ? "bg-sky-950/80 border-sky-500 shadow-md shadow-sky-500/15"
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        {d === 1 ? "Primera fila (Frente)" : d === 2 ? "Segunda fila (Fondo)" : `Fila profunda ${d}`}
                      </span>
                      {isDSelected && (
                        <span className="w-2 h-2 rounded-full bg-sky-400" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {booksAtD.length === 0
                        ? "Fila vacía"
                        : `${booksAtD.length} ${booksAtD.length === 1 ? "libro ya colocado" : "libros ya colocados"}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resumen del traslado */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Posición resultante:</span>
              <span className="font-bold text-sky-300">
                Posición {booksInDestination.length + 1}
              </span>
            </div>
            {isCurrentLocation && (
              <span className="text-amber-400 text-[11px] font-semibold">
                (Misma ubicación actual)
              </span>
            )}
          </div>
        </div>

        {/* Pie del modal */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isCurrentLocation || isSelectedCellDisabled}
            className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              !isCurrentLocation && !isSelectedCellDisabled
                ? "bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-sky-950/40"
                : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Mover libro aquí</span>
          </button>
        </div>
      </div>
    </div>
  );
}
