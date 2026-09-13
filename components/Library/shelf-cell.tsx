import type { ShelfCellProps } from "@/lib/types";
import { booksAtDepth, frontBooks, hiddenBookCount } from "@/lib/selectors";
import { BookSpine } from "./book-spine";

export function ShelfCellView({
  cell,
  books,
  depth,
  highlightedBookId,
  selectedBookId,
  selectedCellId,
  isSelected,
  isConfigureMode,
  onSelectCell,
  onSelectBook,
  onToggleCellEnabled,
}: ShelfCellProps) {
  const visibleBooks =
    depth === undefined ? frontBooks(books, cell) : booksAtDepth(books, cell, depth);

  const behind = depth === undefined ? hiddenBookCount(books, cell) : 0;

  // Todos los libros físicos pertenecientes a este cubo en cualquier profundidad
  const allCellBooks = books.filter(
    (b) =>
      b.location.shelfId === cell.shelfId &&
      b.location.row === cell.row &&
      b.location.column === cell.column,
  );
  const totalBooks = allCellBooks.length;

  // Estados visuales del cubo
  const hasHighlightedBook = books.some(
    (b) =>
      b.id === highlightedBookId &&
      b.location.row === cell.row &&
      b.location.column === cell.column,
  );

  const hasSelectedBook = books.some(
    (b) =>
      b.id === selectedBookId &&
      b.location.row === cell.row &&
      b.location.column === cell.column,
  );

  const isCellActive = Boolean(
    isSelected ||
    (selectedCellId && selectedCellId === cell.id) ||
    hasSelectedBook ||
    hasHighlightedBook,
  );

  const isEmpty = cell.enabled && totalBooks === 0;
  const isOccupied = cell.enabled && totalBooks > 0;
  const hasMultipleDepths = cell.enabled && behind > 0;

  // Etiqueta accesible según el estado
  const accessibleLabel = !cell.enabled
    ? `Cubo fila ${cell.row}, columna ${cell.column}: No disponible.`
    : isCellActive
      ? `Cubo fila ${cell.row}, columna ${cell.column}: Seleccionado, ${totalBooks > 0 ? `${totalBooks} libros` : "disponible"}.`
      : isEmpty
        ? `Cubo fila ${cell.row}, columna ${cell.column}: Disponible, vacío.`
        : `Cubo fila ${cell.row}, columna ${cell.column}: ${totalBooks} libros${hasMultipleDepths ? `, ${behind} en profundidad` : ""}.`;

  // ---------------------------------------------------------------------------
  // ESTADO 5: Cubo no disponible (desactivado / sin uso)
  // ---------------------------------------------------------------------------
  if (!cell.enabled) {
    return (
      <div
        id={`shelf-cell-${cell.row}-${cell.column}`}
        role="button"
        tabIndex={0}
        aria-label={accessibleLabel}
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
          relative min-h-[120px] sm:min-h-[145px] md:min-h-0 md:aspect-square rounded-lg bg-[#0a0f1d] pattern-disabled border border-slate-800/90
          flex flex-col items-center justify-between select-none cursor-pointer p-2 transition-all duration-300 group
          hover:border-slate-700 hover:bg-slate-900/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
          ${isConfigureMode ? "ring-2 ring-emerald-500/60 hover:ring-emerald-400 border-emerald-500/50" : ""}
        `}
      >
        {/* Coordenada sutil en reposo / destacada en hover */}
        <div className="w-full flex items-center justify-between text-[10px] text-slate-500 pointer-events-none">
          <span className="opacity-60 text-[9px] font-mono">
            {cell.row}·{cell.column}
          </span>
          <span className="text-[10px] text-slate-500 group-hover:text-slate-400 transition-colors">
            Bloqueado
          </span>
        </div>

        {/* Centro del compartimento no disponible */}
        <div className="flex flex-col items-center justify-center my-auto text-center pointer-events-none">
          {isConfigureMode ? (
            <span className="text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 shadow-md">
              + Habilitar cubo
            </span>
          ) : (
            <div className="flex flex-col items-center gap-1.5 opacity-60 group-hover:opacity-90 transition-opacity">
              <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="text-[10px] font-medium text-slate-500">
                No disponible
              </span>
            </div>
          )}
        </div>

        {/* Repisa inferior oscura */}
        <div className="w-full h-2 rounded-b bg-slate-950/80 border-t border-slate-800/60" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MANEJADOR DE CLIC EN CUBOS ACTIVOS
  // ---------------------------------------------------------------------------
  const handleClickCell = () => {
    if (isConfigureMode && onToggleCellEnabled) {
      onToggleCellEnabled(cell, false);
    } else {
      onSelectCell?.(cell);
    }
  };

  return (
    <div
      id={`shelf-cell-${cell.row}-${cell.column}`}
      role="region"
      aria-label={accessibleLabel}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClickCell();
        }
      }}
      onClick={handleClickCell}
      className={`
        relative min-h-[125px] sm:min-h-[155px] md:min-h-0 md:aspect-square rounded-lg flex flex-col justify-between overflow-hidden cursor-pointer
        transition-all duration-300 ease-out select-none kallax-compartment-recess
        ${
          hasHighlightedBook
            ? "kallax-locate-beacon ring-2 ring-amber-400 shadow-2xl shadow-amber-500/40 bg-gradient-to-b from-[#1c1917] via-[#10131e] to-[#0a0d16]"
            : isCellActive
              ? "ring-2 ring-amber-400/90 shadow-xl shadow-amber-500/25 bg-gradient-to-b from-[#1a1714] via-[#0f1422] to-[#070b14]"
              : isEmpty
                ? "bg-gradient-to-b from-[#080b12] via-[#06080e] to-[#04060a] border border-slate-850 hover:border-amber-500/40 hover:bg-[#0c101d]"
                : "bg-gradient-to-b from-[#0e1422] via-[#090e18] to-[#050810] border border-slate-800/90 hover:border-amber-500/50 hover:bg-[#101726]"
        }
        ${isConfigureMode ? "ring-1 ring-amber-500/40 hover:ring-2 hover:ring-red-400" : ""}
        group
      `}
    >
      {/* --------------------------------------------------------------------- */}
      {/* 1. CABECERA DEL COMPARTIMENTO (Despejada en reposo / HUD en Hover)    */}
      {/* --------------------------------------------------------------------- */}
      <div className="relative w-full px-2 pt-1.5 pb-1 z-20 pointer-events-none flex items-center justify-between min-h-[22px]">
        {/* Vista en Reposo: Identificación espacial sobria y conteo minimalista */}
        <div className="w-full flex items-center justify-between group-hover:hidden transition-opacity duration-200">
          {/* Identificador discreto de coordenada (esquina superior izquierda) */}
          <span className="text-[9px] font-mono font-medium text-slate-500/80">
            {cell.row}·{cell.column}
          </span>

          {/* Indicador de estado minimalista (solo si está ocupado o seleccionado) */}
          {isCellActive ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-300 bg-amber-950/80 border border-amber-500/50 px-1.5 py-0.2 rounded shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>{isOccupied ? `${totalBooks} ${totalBooks === 1 ? "libro" : "libros"}` : "Abierto"}</span>
            </span>
          ) : isOccupied ? (
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-semibold text-slate-300 bg-slate-900/80 border border-slate-700/60 px-1.5 py-0.2 rounded shadow-sm">
                {totalBooks} {totalBooks === 1 ? "libro" : "libros"}
              </span>
              {hasMultipleDepths && (
                <span
                  className="text-[9px] font-bold text-amber-400 bg-amber-950/90 border border-amber-600/60 px-1 py-0.2 rounded shadow-sm"
                  title={`${behind} libros en el fondo`}
                >
                  +{behind}
                </span>
              )}
            </div>
          ) : null /* Si está vacío, se mantiene totalmente despejado en reposo para máxima sensación física de nicho */}
        </div>

        {/* Vista en Hover: HUD contextual elegante y útil con transición suave */}
        <div className="hidden group-hover:flex items-center justify-between w-full transition-all duration-300 ease-out">
          <span className="text-[10px] font-bold text-amber-300 bg-slate-950/90 border border-amber-500/50 px-2 py-0.5 rounded shadow-md backdrop-blur-sm">
            Fila {cell.row} · Col. {cell.column}
          </span>
          <span className="text-[9px] font-semibold text-slate-200 bg-slate-900/90 border border-slate-700 px-1.5 py-0.5 rounded shadow-sm backdrop-blur-sm">
            {isOccupied ? (hasMultipleDepths ? `${totalBooks} (${behind} fondo)` : `${totalBooks} libros`) : "Disponible"}
          </span>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 2. CUERPO DEL COMPARTIMENTO (Libros físicos o nicho vacío)            */}
      {/* --------------------------------------------------------------------- */}
      <div className="relative flex-1 flex items-end justify-start px-2 sm:px-2.5 overflow-x-auto no-scrollbar gap-1 sm:gap-1.5 z-10">
        {/* Si tiene libros en fondo, mostramos una silueta física visible de segunda fila */}
        {hasMultipleDepths && (
          <div
            className="absolute inset-x-2.5 bottom-0 h-14 sm:h-20 bg-gradient-to-t from-black/80 via-slate-950/60 to-transparent rounded-t border-t border-slate-700/40 pointer-events-none z-0 flex items-end justify-around px-1 pb-1 opacity-70"
            aria-hidden="true"
          >
            <div className="w-full flex items-end justify-around gap-1 opacity-40">
              <div className="w-3 sm:w-4 h-10 sm:h-14 bg-amber-900 rounded-t-sm" />
              <div className="w-3.5 sm:w-5 h-12 sm:h-16 bg-slate-800 rounded-t-sm" />
              <div className="w-3 sm:w-4 h-9 sm:h-12 bg-stone-800 rounded-t-sm" />
              <div className="w-3.5 sm:w-4 h-11 sm:h-15 bg-indigo-950 rounded-t-sm" />
            </div>
          </div>
        )}

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
          /* Estado Físico Vacío: Nicho de madera limpio y preparado */
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500/70 group-hover:text-amber-300/90 transition-all duration-300 py-1">
            <div className="w-8 h-8 rounded-xl border border-dashed border-slate-700/50 group-hover:border-amber-400/70 group-hover:bg-amber-500/10 flex items-center justify-center text-slate-600 group-hover:text-amber-300 transition-all duration-300 transform group-hover:scale-105 shadow-inner">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-[10px] font-medium text-slate-500 group-hover:text-amber-200 mt-1 transition-colors">
              Disponible
            </span>
            <span className="text-[8px] text-slate-600 group-hover:text-slate-400 transition-colors">
              Colocar libros
            </span>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 3. REPISA INFERIOR DE MADERA KALLAX (Base sólida donde apoyan libros) */}
      {/* --------------------------------------------------------------------- */}
      <div className="w-full kallax-wood-shelf h-2.5 sm:h-3.5 shrink-0 relative z-20 flex items-center justify-between px-2 text-[8px] text-amber-200/20 font-mono select-none pointer-events-none">
        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          ▾ Balda {cell.row}
        </span>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          Col. {cell.column}
        </span>
      </div>
    </div>
  );
}
