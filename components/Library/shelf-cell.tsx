import type { ShelfCellProps } from "@/lib/types";
import { booksAtDepth, frontBooks, hiddenBookCount } from "@/lib/selectors";
import { BookSpine } from "./book-spine";

export function ShelfCellView({
  cell,
  books,
  depth,
  highlightedBookId,
  selectedBookId,
  isConfigureMode,
  onSelectCell,
  onSelectBook,
  onToggleCellEnabled,
}: ShelfCellProps) {
  const visibleBooks =
    depth === undefined ? frontBooks(books, cell) : booksAtDepth(books, cell, depth);

  const behind = depth === undefined ? hiddenBookCount(books, cell) : 0;
  const label = cell.enabled
    ? `Cubo fila ${cell.row} columna ${cell.column}, ${visibleBooks.length} libros al frente${behind > 0 ? `, ${behind} detrás` : ""}`
    : `Cubo fila ${cell.row} columna ${cell.column}, sin uso. Haz clic para activar o ver opciones.`;

  // Comprobar si algún libro dentro de esta celda está resaltado
  const hasHighlightedBook = books.some(
    (b) =>
      b.id === highlightedBookId &&
      b.location.row === cell.row &&
      b.location.column === cell.column,
  );

  if (!cell.enabled) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (isConfigureMode && onToggleCellEnabled) {
              onToggleCellEnabled(cell, true);
            } else {
              onSelectCell?.(cell);
            }
          }
        }}
        onClick={() => {
          if (isConfigureMode && onToggleCellEnabled) {
            onToggleCellEnabled(cell, true);
          } else {
            onSelectCell?.(cell);
          }
        }}
        className={`
          relative min-h-[110px] sm:min-h-[135px] md:min-h-0 md:aspect-square rounded bg-slate-900/60 pattern-disabled border border-slate-800/90
          flex flex-col items-center justify-center select-none cursor-pointer p-1.5 sm:p-2 transition-all group
          hover:border-slate-600 hover:bg-slate-900/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
          ${isConfigureMode ? "ring-2 ring-emerald-500/40 hover:ring-emerald-400 border-emerald-500/30" : ""}
        `}
      >
        <span
          className={`text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded border shadow transition-colors ${
            isConfigureMode
              ? "bg-emerald-950/90 text-emerald-300 border-emerald-700/60"
              : "text-slate-400 bg-slate-900/90 border-slate-700/50 group-hover:text-slate-200 group-hover:border-slate-600"
          }`}
        >
          {isConfigureMode ? "+ Activar" : "Sin uso"}
        </span>
        <span className="text-[8px] sm:text-[9px] text-slate-500 mt-1 font-mono">
          {cell.row}×{cell.column}
        </span>
      </div>
    );
  }

  const handleClickCell = () => {
    if (isConfigureMode && onToggleCellEnabled) {
      onToggleCellEnabled(cell, false);
    } else {
      onSelectCell?.(cell);
    }
  };

  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClickCell();
        }
      }}
      onClick={handleClickCell}
      className={`
        relative min-h-[110px] sm:min-h-[135px] md:min-h-0 md:aspect-square rounded flex flex-col justify-between overflow-hidden cursor-pointer transition-all duration-200
        bg-gradient-to-b from-[#0e1626] to-[#0a0f1d] border border-slate-700/80 hover:border-blue-400/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
        group shadow-inner
        ${hasHighlightedBook ? "ring-2 ring-amber-400 border-amber-400 shadow-lg shadow-amber-500/20" : ""}
        ${isConfigureMode ? "ring-1 ring-amber-500/30 hover:ring-2 hover:ring-red-400" : ""}
      `}
    >
      {/* Cabecera del cubo: coordenadas e indicador de libros detrás */}
      <div className="flex items-center justify-between p-1 sm:p-1.5 z-10 pointer-events-none gap-1">
        <span className="text-[9px] sm:text-[10px] font-mono font-medium text-slate-400 bg-slate-900/85 px-1 sm:px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
          F{cell.row}·C{cell.column}
        </span>

        {behind > 0 ? (
          <span className="text-[8px] sm:text-[10px] font-medium text-amber-300 bg-amber-950/80 border border-amber-700/60 px-1 sm:px-1.5 py-0.5 rounded shadow flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="hidden sm:inline">{behind} detrás{cell.depthCount > 2 ? ` (${cell.depthCount}p)` : ""}</span>
            <span className="sm:hidden">+{behind}</span>
          </span>
        ) : cell.depthCount > 2 ? (
          <span className="text-[8px] sm:text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1 py-0.5 rounded shrink-0">
            {cell.depthCount}p
          </span>
        ) : null}
      </div>

      {/* Interior del cubo: Balda inferior con los lomos de libros */}
      <div className="relative flex-1 flex items-end justify-start px-1.5 sm:px-2.5 pb-1.5 sm:pb-2 pt-1 overflow-x-auto no-scrollbar gap-1 sm:gap-1.5 border-b-4 border-amber-950/50">
        {visibleBooks.length > 0 ? (
          visibleBooks.map((book) => (
            <BookSpine
              key={book.id}
              book={book}
              selected={selectedBookId === book.id}
              highlighted={highlightedBookId === book.id}
              dimmed={Boolean(
                highlightedBookId && highlightedBookId !== book.id,
              )}
              locationLabel={`Fila ${cell.row}, Columna ${cell.column}`}
              onSelect={onSelectBook}
            />
          ))
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 group-hover:text-slate-300 transition-colors">
            <span className="text-[10px] sm:text-xs font-medium">0 libros</span>
            <span className="text-[8px] sm:text-[9px] text-slate-500 group-hover:text-blue-400 mt-0.5 transition-colors">
              + Ver cubo
            </span>
          </div>
        )}
      </div>

      {/* Sombra de repisa inferior para mayor profundidad */}
      <div className="h-1.5 bg-gradient-to-t from-black/40 to-transparent w-full pointer-events-none" />
    </div>
  );
}
