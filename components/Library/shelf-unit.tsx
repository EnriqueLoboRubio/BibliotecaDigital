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
  onSelectShelf,
  onSelectCell,
  onSelectBook,
  onRenameShelf,
  onToggleCellEnabled,
}: ShelfUnitProps) {
  const { canEdit } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(shelf.name);
  const [isConfigureMode, setIsConfigureMode] = useState(false);
  const [cellToDisable, setCellToDisable] = useState<{ cell: ShelfCell; count: number } | null>(null);

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

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      {/* Etiqueta / Información superior con opción de renombrar */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 px-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />

          {isEditingName ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="px-2 py-0.5 rounded bg-slate-900 border border-blue-500 text-xs text-white font-semibold focus:outline-none"
              />
              <button
                type="submit"
                className="p-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs"
                title="Guardar nombre"
              >
                ✓
              </button>
              <button
                type="button"
                onClick={() => {
                  setNameInput(shelf.name);
                  setIsEditingName(false);
                }}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs"
                title="Cancelar"
              >
                ✕
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-1.5 group">
              <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
                {shelf.name}
              </h2>
              {canEdit && onRenameShelf && (
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(shelf.name);
                    setIsEditingName(true);
                  }}
                  className="p-1 text-slate-500 hover:text-blue-400 opacity-60 group-hover:opacity-100 transition-opacity"
                  title="Editar nombre de la estantería"
                  aria-label="Editar nombre de la estantería"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>
          )}

          <span className="text-xs text-slate-400 font-mono">
            ({shelf.columns}×{shelf.rows} cubos)
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 self-end sm:self-auto">
          {canEdit && density === "detail" && onToggleCellEnabled && (
            <button
              type="button"
              onClick={() => setIsConfigureMode(!isConfigureMode)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                isConfigureMode
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/20"
                  : "bg-slate-900/90 text-slate-300 hover:text-white border-slate-700/80 hover:bg-slate-800"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{isConfigureMode ? "Listo" : "Editar cubos"}</span>
            </button>
          )}

          <span className="bg-slate-900/90 px-3 py-1 rounded-full border border-slate-700/80 font-medium shadow-sm">
            {totalBooksInShelf} {totalBooksInShelf === 1 ? "libro" : "libros"} colocados
          </span>
        </div>
      </div>

      {/* Aviso informativo en modo configuración de cubos */}
      {isConfigureMode && (
        <div className="w-full mb-3 p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-base">⚙️</span>
            <span>
              <strong>Modo configuración de cubos:</strong> Haz clic en cualquier cubo para activarlo (Útil) o desactivarlo (Sin uso). Si desactivas un cubo con libros, se eliminarán.
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
        {/* Tapa superior del mueble (tablero voladizo) */}
        <div className="w-[101.5%] -ml-[0.75%] h-3.5 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 rounded-t-md shadow-md border-t border-slate-600/80 relative z-10" />

        {/* Mueble Kallax con sus cuadrículas */}
        <section
          aria-label={label}
          onClick={
            density === "room" && onSelectShelf
              ? () => onSelectShelf(shelf.id)
              : undefined
          }
          className={`
            kallax-outer-frame rounded-b-xl border-[10px] md:border-[16px] border-slate-800 bg-[#070b14] p-2 md:p-3
            transition-all duration-300 relative z-0
            ${density === "room" ? "cursor-pointer hover:border-slate-700 hover:shadow-2xl" : "shadow-2xl"}
            ${isConfigureMode ? "ring-2 ring-amber-500/60 shadow-amber-500/10" : ""}
          `}
        >
          <div
            className="grid gap-2 md:gap-3"
            style={{
              gridTemplateColumns: `repeat(${shelf.columns}, minmax(0, 1fr))`,
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
                  isConfigureMode={isConfigureMode}
                  onSelectCell={density === "detail" ? onSelectCell : undefined}
                  onSelectBook={density === "detail" ? onSelectBook : undefined}
                  onToggleCellEnabled={canEdit ? handleCellToggle : undefined}
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
                    Este cubo contiene <strong>{cellToDisable.count} {cellToDisable.count === 1 ? "libro" : "libros"}</strong>. Al marcarlo como <em>Sin uso</em>, todos los libros en su interior serán <strong>eliminados permanentemente</strong>.
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

        {/* Patas nórdicas inferiores del mueble */}
        {density === "detail" && (
          <div className="w-full flex justify-between px-8 sm:px-16 relative -mt-1 z-[-1] pointer-events-none">
            {/* Pata izquierda */}
            <div className="flex flex-col items-center">
              <div
                className="w-4 h-8 bg-gradient-to-b from-slate-800 to-amber-950 border-r border-l border-slate-900 shadow-xl"
                style={{ transform: "skewX(-8deg)" }}
              />
              <div className="w-6 h-1 rounded-full bg-black/80 blur-[2px]" />
            </div>

            {/* Pata intermedia izquierda */}
            <div className="hidden sm:flex flex-col items-center">
              <div className="w-3.5 h-8 bg-gradient-to-b from-slate-800 to-amber-950 border-r border-l border-slate-900 shadow-xl" />
              <div className="w-5 h-1 rounded-full bg-black/80 blur-[2px]" />
            </div>

            {/* Pata intermedia derecha */}
            <div className="hidden sm:flex flex-col items-center">
              <div className="w-3.5 h-8 bg-gradient-to-b from-slate-800 to-amber-950 border-r border-l border-slate-900 shadow-xl" />
              <div className="w-5 h-1 rounded-full bg-black/80 blur-[2px]" />
            </div>

            {/* Pata derecha */}
            <div className="flex flex-col items-center">
              <div
                className="w-4 h-8 bg-gradient-to-b from-slate-800 to-amber-950 border-r border-l border-slate-900 shadow-xl"
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
