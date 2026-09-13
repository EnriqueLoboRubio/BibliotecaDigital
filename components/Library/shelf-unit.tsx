"use client";

import { useState } from "react";
import type { ShelfCell, ShelfUnitProps } from "@/lib/types";
import { ShelfCellView } from "./shelf-cell";
import { ShelfDecorations } from "../room/room-decorations";
import { useAuth } from "@/lib/auth/context";

export function ShelfUnit({
  shelf,
  cells,
  books,
  density,
  highlightedBookId,
  selectedBookId,
  selectedCellId,
  onSelectShelf,
  onSelectCell,
  onSelectBook,
  onRenameShelf,
  onToggleCellEnabled,
}: ShelfUnitProps) {
  const { isAdmin } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(shelf.name);
  const [isConfigureMode, setIsConfigureMode] = useState(false);
  const [cellToDisable, setCellToDisable] = useState<{ cell: ShelfCell; count: number } | null>(null);

  const isCellSelected = (cell: ShelfCell) => {
    if (selectedCellId && selectedCellId === cell.id) return true;
    if (selectedBookId) {
      const b = books.find((book) => book.id === selectedBookId);
      if (
        b &&
        b.location.shelfId === cell.shelfId &&
        b.location.row === cell.row &&
        b.location.column === cell.column
      ) {
        return true;
      }
    }
    if (highlightedBookId) {
      const b = books.find((book) => book.id === highlightedBookId);
      if (
        b &&
        b.location.shelfId === cell.shelfId &&
        b.location.row === cell.row &&
        b.location.column === cell.column
      ) {
        return true;
      }
    }
    return false;
  };

  const label = `${shelf.name}, ${shelf.columns} por ${shelf.rows}`;
  const totalBooksInShelf = books.filter(
    (b) => b.location.shelfId === shelf.id,
  ).length;

  const handleSaveName = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (nameInput.trim() && onRenameShelf) {
      onRenameShelf(shelf.id, nameInput.trim());
    }
    setIsEditingName(false);
  };

  const handleCellToggle = (cell: ShelfCell, willEnable: boolean) => {
    if (willEnable) {
      onToggleCellEnabled?.(cell, true);
    } else {
      const cellBooksCount = books.filter(
        (b) =>
          b.location.shelfId === cell.shelfId &&
          b.location.row === cell.row &&
          b.location.column === cell.column,
      ).length;

      if (cellBooksCount > 0) {
        setCellToDisable({ cell, count: cellBooksCount });
      } else {
        onToggleCellEnabled?.(cell, false);
      }
    }
  };

  const totalCubes = shelf.columns * shelf.rows;
  const occupiedCubes = new Set(
    books
      .filter((b) => b.location.shelfId === shelf.id)
      .map((b) => `${b.location.row}-${b.location.column}`),
  ).size;
  const occupancyPercent = totalCubes > 0 ? Math.round((occupiedCubes / totalCubes) * 100) : 0;

  return (
    <div className="w-full mx-auto flex flex-col items-center">
      {/* Cabecera del Mueble con identificación clara y controles sutiles */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5 px-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />

          {isEditingName ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-amber-500 text-xs text-white font-semibold focus:outline-none shadow-sm"
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
                title="Guardar nombre"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => {
                  setNameInput(shelf.name);
                  setIsEditingName(false);
                }}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs"
                title="Cancelar"
              >
                ✕
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 group">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                {shelf.name}
              </h2>
              {isAdmin && onRenameShelf && (
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(shelf.name);
                    setIsEditingName(true);
                  }}
                  className="p-1 text-slate-500 hover:text-amber-400 opacity-60 group-hover:opacity-100 transition-opacity"
                  title="Renombrar estantería"
                  aria-label="Renombrar estantería"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-slate-600">•</span>
            <span>
              {shelf.columns}×{shelf.rows} cubos ({totalCubes} espacios)
            </span>
            <span className="text-slate-600">•</span>
            <span className="font-medium text-slate-300">
              {totalBooksInShelf} {totalBooksInShelf === 1 ? "libro colocado" : "libros colocados"}
            </span>
          </div>
        </div>

        {/* Acciones de configuración del mueble */}
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsConfigureMode(!isConfigureMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm ${
                isConfigureMode
                  ? "bg-amber-600 text-white shadow-amber-600/30"
                  : "bg-slate-800/90 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700/80"
              }`}
            >
              <span>{isConfigureMode ? "✓ Listo" : "⚙️ Configurar cubos"}</span>
            </button>
          )}

          {density === "room" && onSelectShelf && (
            <button
              type="button"
              onClick={() => onSelectShelf(shelf.id)}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium flex items-center gap-1"
            >
              <span>Abrir mueble</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Banner explicativo al estar en modo configuración */}
      {isConfigureMode && (
        <div className="w-full mb-3 p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-base">⚙️</span>
            <span>
              <strong>Modo configuración de cubos:</strong> Haz clic en cualquier cubo para habilitarlo (Disponible) o deshabilitarlo (No disponible). Si desactivas un cubo con libros, se eliminarán.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsConfigureMode(false)}
            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] shrink-0"
          >
            Finalizar
          </button>
        </div>
      )}

      {/* Objetos decorativos sobre la repisa superior del mueble (lámpara cálida, plantas) */}
      {density === "detail" && <ShelfDecorations />}

      {/* Estructura física completa del mueble Kallax con repisa superior y marco grueso */}
      <div className="w-full relative">
        {/* Tapa superior del mueble con bisel */}
        <div className="w-full h-3 sm:h-4 bg-gradient-to-r from-slate-750 via-slate-800 to-slate-750 rounded-t-xl shadow-md border-t border-slate-600/70 relative z-10" />

        {/* Mueble Kallax con sus cuadrículas */}
        <section
          aria-label={label}
          onClick={
            density === "room" && onSelectShelf
              ? () => onSelectShelf(shelf.id)
              : undefined
          }
          className={`
            kallax-outer-frame rounded-b-2xl border-[8px] sm:border-[12px] md:border-[16px] border-[#182030] bg-[#0c121e] p-2 sm:p-3 md:p-4
            transition-all duration-300 relative z-0 overflow-x-auto no-scrollbar
            ${density === "room" ? "cursor-pointer hover:border-slate-700 hover:shadow-2xl" : "shadow-2xl"}
            ${isConfigureMode ? "ring-2 ring-amber-500/60 shadow-amber-500/10" : ""}
          `}
        >
          {/* Guías sutiles de columnas superiores (1 a 4) */}
          <div
            className="grid gap-2 sm:gap-3 md:gap-3.5 mb-1.5 px-0.5 text-center pointer-events-none"
            style={{
              gridTemplateColumns: `repeat(${shelf.columns}, minmax(0, 1fr))`,
              minWidth: shelf.columns >= 4 ? `${shelf.columns * 74}px` : undefined,
            }}
          >
            {Array.from({ length: shelf.columns }, (_, idx) => (
              <span key={`col-head-${idx + 1}`} className="text-[10px] sm:text-[11px] font-semibold text-slate-500/70 uppercase tracking-wider">
                Col. {idx + 1}
              </span>
            ))}
          </div>

          <div
            className="grid gap-2 sm:gap-3 md:gap-3.5"
            style={{
              gridTemplateColumns: `repeat(${shelf.columns}, minmax(0, 1fr))`,
              minWidth: shelf.columns >= 4 ? `${shelf.columns * 74}px` : undefined,
            }}
          >
            {[...cells]
              .sort((a, b) => (a.row !== b.row ? a.row - b.row : a.column - b.column))
              .map((cell) => (
                <ShelfCellView
                  key={cell.id}
                  cell={cell}
                  books={books}
                  highlightedBookId={highlightedBookId}
                  selectedBookId={selectedBookId}
                  selectedCellId={selectedCellId}
                  isSelected={isCellSelected(cell)}
                  isConfigureMode={isConfigureMode}
                  onSelectCell={density === "detail" ? onSelectCell : undefined}
                  onSelectBook={density === "detail" ? onSelectBook : undefined}
                  onToggleCellEnabled={isAdmin ? handleCellToggle : undefined}
                />
              ))}
          </div>
        </section>

        {/* Diálogo de confirmación para eliminar libros al desactivar cubo */}
        {cellToDisable && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          >
            <div className="w-full max-w-md rounded-2xl bg-[#0f172a] border border-red-800 shadow-2xl p-6 text-slate-100 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-900/60 border border-red-700/80 flex items-center justify-center shrink-0 text-red-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-red-200">
                    ¿Desactivar Cubo {cellToDisable.cell.row}×{cellToDisable.cell.column}?
                  </h3>
                  <p className="text-xs text-red-300/90 mt-1 leading-relaxed">
                    Este cubo contiene <strong>{cellToDisable.count} {cellToDisable.count === 1 ? "libro" : "libros"}</strong>. Al marcarlo como <em>No disponible</em>, todos los libros en su interior serán <strong>eliminados permanentemente</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCellToDisable(null)}
                  className="px-3.5 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onToggleCellEnabled?.(cellToDisable.cell, false);
                    setCellToDisable(null);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-semibold shadow-md shadow-red-600/30 transition-all"
                >
                  Sí, eliminar {cellToDisable.count} {cellToDisable.count === 1 ? "libro" : "libros"} y desactivar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Barra de Métricas Limpia de la Estantería (Debajo del mueble) */}
        {density === "detail" && (
          <div className="w-full mt-3 px-3 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-lg text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Total de libros */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-850 border border-slate-750 text-slate-200">
                <span>📚</span>
                <span className="font-semibold text-white">{totalBooksInShelf}</span>
                <span className="text-slate-400">{totalBooksInShelf === 1 ? "libro" : "libros"}</span>
              </div>

              {/* Cubos ocupados */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-850 border border-slate-750 text-slate-200">
                <span>🗄️</span>
                <span className="font-semibold text-white">{occupiedCubes}</span>
                <span className="text-slate-400">de {totalCubes} cubos ocupados</span>
              </div>
            </div>

            {/* Porcentaje de ocupación con barra de progreso */}
            <div className="flex items-center gap-2.5">
              <span className="text-slate-400">Ocupación:</span>
              <div className="w-24 sm:w-32 h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${occupancyPercent}%` }}
                />
              </div>
              <span className="font-bold text-amber-300 text-xs">
                {occupancyPercent}%
              </span>
            </div>
          </div>
        )}

        {/* Patas nórdicas inferiores del mueble */}
        {density === "detail" && (
          <div className="w-full flex justify-between px-8 sm:px-16 relative mt-1 z-[-1] pointer-events-none">
            {/* Pata izquierda */}
            <div className="flex flex-col items-center">
              <div
                className="w-4 h-7 bg-gradient-to-b from-slate-800 to-amber-950 border-r border-l border-slate-900 shadow-xl"
                style={{ transform: "skewX(-8deg)" }}
              />
              <div className="w-6 h-1 rounded-full bg-black/80 blur-[2px]" />
            </div>

            {/* Pata intermedia izquierda */}
            <div className="hidden sm:flex flex-col items-center">
              <div className="w-3.5 h-7 bg-gradient-to-b from-slate-800 to-amber-950 border-r border-l border-slate-900 shadow-xl" />
              <div className="w-5 h-1 rounded-full bg-black/80 blur-[2px]" />
            </div>

            {/* Pata intermedia derecha */}
            <div className="hidden sm:flex flex-col items-center">
              <div className="w-3.5 h-7 bg-gradient-to-b from-slate-800 to-amber-950 border-r border-l border-slate-900 shadow-xl" />
              <div className="w-5 h-1 rounded-full bg-black/80 blur-[2px]" />
            </div>

            {/* Pata derecha */}
            <div className="flex flex-col items-center">
              <div
                className="w-4 h-7 bg-gradient-to-b from-slate-800 to-amber-950 border-r border-l border-slate-900 shadow-xl"
                style={{ transform: "skewX(8deg)" }}
              />
              <div className="w-6 h-1 rounded-full bg-black/80 blur-[2px]" />
            </div>
          </div>
        )}

        {/* Sombra de contacto en el suelo */}
        <div className="w-[96%] mx-auto h-4 bg-black/60 blur-md rounded-full mt-2 pointer-events-none" />
      </div>
    </div>
  );
}
