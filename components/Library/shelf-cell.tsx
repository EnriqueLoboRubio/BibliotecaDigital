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
          relative min-h-[115px] sm:min-h-[140px] md:min-h-0 md:aspect-square rounded-xl bg-slate-900/40 pattern-disabled border border-slate-800/80
          flex flex-col items-center justify-between select-none cursor-pointer p-2.5 transition-all duration-200 group
          hover:border-slate-700 hover:bg-slate-900/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
          ${isConfigureMode ? "ring-2 ring-emerald-500/60 hover:ring-emerald-400 border-emerald-500/50" : ""}
        `}
      >
        {/* Cabecera sutil: cambia a la coordenada en hover */}
        <div className="w-full flex items-center justify-between text-[10px] text-slate-500 pointer-events-none">
          <span className="group-hover:hidden transition-all duration-200 flex items-center gap-1 opacity-75">
            <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <span>Bloqueado</span>
          </span>
          <span className="hidden group-hover:inline-block text-amber-300/90 font-medium transition-all duration-200">
            Fila {cell.row} · Col. {cell.column}
          </span>
        </div>

        {/* Centro del cubo no disponible */}
        <div className="flex flex-col items-center justify-center my-auto text-center pointer-events-none">
          {isConfigureMode ? (
            <span className="text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 shadow-md">
              + Habilitar cubo
            </span>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 rounded-full bg-slate-850/80 border border-slate-700/60 flex items-center justify-center text-slate-500">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                No disponible
              </span>
            </div>
          )}
        </div>

        {/* Pie vacío equilibrado */}
        <div className="w-full h-2" />
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
        relative min-h-[115px] sm:min-h-[140px] md:min-h-0 md:aspect-square rounded-xl flex flex-col justify-between overflow-hidden cursor-pointer transition-all duration-200
        ${
          isCellActive
            ? "bg-gradient-to-b from-[#181a20] via-[#0c1322] to-[#070b14] ring-2 ring-amber-400 border-amber-400/90 shadow-xl shadow-amber-500/20"
            : "bg-gradient-to-b from-[#0e1626] via-[#090f1c] to-[#060a14] border border-slate-800 hover:border-amber-500/50 shadow-md hover:shadow-black/70"
        }
        ${isConfigureMode ? "ring-1 ring-amber-500/40 hover:ring-2 hover:ring-red-400" : ""}
        group
      `}
    >
      {/* --------------------------------------------------------------------- */}
      {/* CABECERA SUPERIOR: Estados del Cubo y Coordenadas en Hover */}
      {/* --------------------------------------------------------------------- */}
      <div className="flex items-center justify-between px-2 pt-1.5 pb-0.5 z-10 pointer-events-none gap-1">
        {/* Contenido normal: Estado visual */}
        <div className="flex items-center gap-1.5 group-hover:hidden transition-all duration-200 min-w-0">
          {/* ESTADO 3: Cubo Seleccionado */}
          {isCellActive ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-200 bg-amber-950/80 border border-amber-500/60 px-2 py-0.5 rounded-md shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="truncate">
                {isOccupied ? `${totalBooks} ${totalBooks === 1 ? "libro" : "libros"} · Ver cubo` : "Disponible · Ver cubo"}
              </span>
            </span>
          ) : isEmpty ? (
            /* ESTADO 1: Cubo Vacío y Disponible */
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span>Disponible</span>
            </span>
          ) : (
            /* ESTADO 2 y 4: Cubo Ocupado (con o sin profundidad) */
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[10px] font-medium text-slate-200 bg-slate-900/80 border border-slate-700/60 px-2 py-0.5 rounded-md flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                <span>{totalBooks} {totalBooks === 1 ? "libro" : "libros"}</span>
              </span>

              {/* Indicador de ESTADO 4: Varios libros en profundidad */}
              {hasMultipleDepths && (
                <span
                  className="text-[9px] font-semibold text-amber-300 bg-amber-950/80 border border-amber-700/50 px-1.5 py-0.5 rounded-md shadow-sm flex items-center gap-1 shrink-0"
                  title={`${behind} libros colocados en niveles del fondo`}
                >
                  <svg className="w-3 h-3 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="hidden sm:inline">+{behind} fondo</span>
                  <span className="sm:hidden">+{behind}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Contenido en Hover: Muestra la ubicación física natural */}
        <div className="hidden group-hover:flex items-center justify-between w-full transition-all duration-200">
          <span className="text-[10px] font-semibold text-amber-300 bg-slate-900/90 border border-amber-500/40 px-2 py-0.5 rounded-md shadow-sm">
            Fila {cell.row} · Columna {cell.column}
          </span>
          <span className="text-[9px] font-medium text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
            {isCellActive ? "Abierto" : "Examinar →"}
          </span>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* CUERPO DEL CUBO: Libros físicos o ranura disponible */}
      {/* --------------------------------------------------------------------- */}
      <div className="relative flex-1 flex items-end justify-start px-2 sm:px-2.5 pb-1.5 overflow-x-auto no-scrollbar gap-1 sm:gap-1.5 border-b-[5px] border-[#22170f]">
        {/* Simulación física de profundidad de segunda fila si hay libros al fondo */}
        {hasMultipleDepths && (
          <div
            className="absolute inset-x-2.5 bottom-1.5 h-16 bg-slate-950/50 rounded-sm border-t border-slate-700/30 pointer-events-none -z-0 opacity-70"
            aria-hidden="true"
          />
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
          /* Estado visual 1: Cubo Vacío y Disponible */
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 group-hover:text-slate-300 transition-colors select-none py-1">
            <div className="w-7 h-7 rounded-lg border border-dashed border-slate-700/70 group-hover:border-amber-400/60 group-hover:bg-amber-500/5 flex items-center justify-center mb-1 text-slate-600 group-hover:text-amber-400 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 group-hover:text-amber-200 transition-colors">
              Disponible
            </span>
            <span className="text-[8px] sm:text-[9px] text-slate-600 group-hover:text-amber-300/80 transition-colors">
              Poner libros
            </span>
          </div>
        )}
      </div>

      {/* Sombra de repisa inferior para mayor profundidad física */}
      <div className="h-1 bg-gradient-to-t from-black/50 to-transparent w-full pointer-events-none" />
    </div>
  );
}
