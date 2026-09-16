import type { BookDetailProps } from "@/lib/types";
import { LocationBreadcrumb } from "./location-breadcrumb";
import { useAuth } from "@/lib/auth/context";

export function BookDetail({
  book,
  location,
  onClose,
  onShowInShelf,
  onEditBook,
  onRelocateBook,
}: BookDetailProps) {
  const { canEdit } = useAuth();
  const isBehind = location.depth > 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ficha del libro: ${book.title}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <article
        className="w-full max-w-lg rounded-2xl bg-[#0f172a] border border-slate-700 shadow-2xl p-4 sm:p-6 text-slate-100 flex flex-col gap-4 sm:gap-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra superior con migas y botón de cerrar */}
        <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3 sm:pb-4">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono uppercase text-blue-400 font-semibold tracking-wider block mb-1">
              Localización Física
            </span>
            <LocationBreadcrumb location={location} />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Cerrar ficha"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Portada decorativa y metadatos */}
        <div className="flex gap-3 sm:gap-4 items-start">
          {/* Lomo / Portada simulada elegante */}
          <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg bg-gradient-to-br from-blue-900 to-indigo-950 border border-blue-500/30 shadow-lg flex flex-col justify-between p-1.5 sm:p-2 shrink-0 select-none">
            <div className="w-full h-1 bg-amber-400/50 rounded" />
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-200 line-clamp-3 text-center leading-tight">
              {book.title}
            </span>
            <span className="text-[7px] sm:text-[8px] text-blue-300 truncate text-center">
              {book.author}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-xl font-bold text-white leading-snug">
              {book.title}
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-300 mt-0.5 sm:mt-1">
              {book.author}
            </p>

            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3 text-xs">
              {book.genre && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium text-[11px] sm:text-xs">
                  {book.genre}
                </span>
              )}
              {book.year && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[11px] sm:text-xs">
                  Año {book.year}
                </span>
              )}
              {book.isbn && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono text-[10px] sm:text-[11px]">
                  ISBN: {book.isbn}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Frase canónica obligatoria según ARQUITECTURE.md */}
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 sm:p-3.5 flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Ubicación física:
          </span>
          <p className="text-xs sm:text-sm font-medium text-amber-200 leading-relaxed">
            «{location.phrase}»
          </p>
        </div>

        {/* Advertencia física si está en segunda fila */}
        {isBehind && (
          <div className="rounded-xl bg-amber-950/40 border border-amber-600/40 p-2.5 sm:p-3 flex items-start gap-2 sm:gap-2.5 text-xs text-amber-200">
            <span className="text-base">⚠️</span>
            <div>
              <strong className="font-semibold block text-amber-300">Libro en segunda fila (fondo)</strong>
              <span className="leading-relaxed">Para acceder a este libro es necesario retirar temporalmente los libros situados en la fila delantera del compartimento.</span>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && onRelocateBook && (
              <button
                type="button"
                onClick={() => onRelocateBook(book)}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-semibold text-sky-300 bg-sky-950/60 hover:bg-sky-900/60 border border-sky-700/60 transition-colors flex items-center justify-center gap-1.5 min-h-[38px] cursor-pointer"
                title="Reubicar rápidamente en otro compartimento"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>⇄ Reubicar</span>
              </button>
            )}

            {canEdit && onEditBook && (
              <button
                type="button"
                onClick={() => onEditBook(book)}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-700/60 transition-colors flex items-center justify-center gap-1.5 min-h-[38px] cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Editar ficha</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors min-h-[38px] cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => onShowInShelf(book.id)}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:from-amber-700 active:to-amber-800 shadow-lg shadow-amber-950/40 border border-amber-400/30 transition-all flex items-center justify-center gap-1.5 min-h-[38px] cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Ver en estantería</span>
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}
