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
    : `Cubo fila ${cell.row} columna ${cell.column}, sin uso físico.`;

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
          relative min-h-[115px] sm:min-h-[140px] md:min-h-0 md:aspect-square rounded-xl bg-slate-900/40 pattern-disabled border border-slate-800/70
          flex flex-col items-center justify-center select-none cursor-pointer p-2 transition-all duration-200 group
          hover:border-slate-700 hover:bg-slate-900/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
          ${isConfigureMode ? "ring-2 ring-emerald-500/50 hover:ring-emerald-400 border-emerald-500/40" : ""}
        `}
      >
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-lg border transition-colors ${
            isConfigureMode
              ? "bg-emerald-950/90 text-emerald-300 border-emerald-700/60"
              : "text-slate-500 bg-slate-950/80 border-slate-800/80 group-hover:text-slate-300 group-hover:border-slate-700"
          }`}
        >
          {isConfigureMode ? "+ Activar" : "Sin uso"}
        </span>
        <span className="text-[9px] text-slate-600 mt-1 font-mono select-none">
          {cell.row} · {cell.column}
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
        relative min-h-[115px] sm:min-h-[140px] md:min-h-0 md:aspect-square rounded-xl flex flex-col justify-between overflow-hidden cursor-pointer transition-all duration-200
        bg-gradient-to-b from-[#0e1626] via-[#090f1c] to-[#060a14] border border-slate-800 hover:border-amber-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
        group shadow-lg hover:shadow-black/60
        ${hasHighlightedBook ? "ring-2 ring-amber-400 border-amber-400 shadow-xl shadow-amber-500/20" : ""}
        ${isConfigureMode ? "ring-1 ring-amber-500/40 hover:ring-2 hover:ring-red-400" : ""}
      `}
    >
      {/* Cabecera del cubo: coordenada discreta y estado de fondo */}
      <div className="flex items-center justify-between px-2 pt-1.5 pb-0.5 z-10 pointer-events-none gap-1">
        {/* Coordenada sutil no invasiva */}
        <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium tracking-wider opacity-60 group-hover:opacity-100 transition-opacity shrink-0 select-none">
          {cell.row} · {cell.column}
        </span>

        {behind > 0 ? (
          <span className="text-[9px] sm:text-[10px] font-medium text-amber-300 bg-amber-950/70 border border-amber-700/50 px-1.5 py-0.5 rounded-md shadow-sm flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="hidden sm:inline">+{behind} al fondo</span>
            <span className="sm:hidden">+{behind}</span>
          </span>
        ) : cell.depthCount > 2 ? (
          <span className="text-[8px] sm:text-[9px] text-slate-500 bg-slate-900/60 border border-slate-800/60 px-1.5 py-0.5 rounded shrink-0">
            {cell.depthCount} niveles
          </span>
        ) : null}
      </div>

      {/* Interior del cubo: Balda inferior con los lomos de libros */}
      <div className="relative flex-1 flex items-end justify-start px-2 sm:px-2.5 pb-1.5 overflow-x-auto no-scrollbar gap-1 sm:gap-1.5 border-b-[5px] border-[#22170f]">
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
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 group-hover:text-slate-300 transition-colors select-none py-1">
            <div className="w-6 h-6 rounded-lg border border-dashed border-slate-700/70 group-hover:border-amber-400/50 flex items-center justify-center mb-1 text-slate-600 group-hover:text-amber-400 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
              Hueco libre
            </span>
            <span className="text-[8px] sm:text-[9px] text-slate-600 group-hover:text-amber-300/80 transition-colors">
              Explorar cubo
            </span>
          </div>
        )}
      </div>

      {/* Sombra de repisa inferior para mayor profundidad física */}
      <div className="h-1 bg-gradient-to-t from-black/50 to-transparent w-full pointer-events-none" />
    </div>
  );
}
