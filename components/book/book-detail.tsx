import type { BookDetailProps } from "@/lib/types";
import { LocationBreadcrumb } from "./location-breadcrumb";
import { useAuth } from "@/lib/auth/context";

export function BookDetail({
  book,
  location,
  onClose,
  onShowInShelf,
  onEditBook,
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
        className="w-full max-w-lg rounded-2xl bg-[#0f172a] border border-slate-700 shadow-2xl p-6 text-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra superior con migas y botón de cerrar */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex-1">
            <span className="text-[10px] font-mono uppercase text-blue-400 font-semibold tracking-wider block mb-1.5">
              Localización Física
            </span>
            <LocationBreadcrumb location={location} />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Cerrar ficha"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Portada decorativa y metadatos */}
        <div className="flex gap-4 items-start">
          {/* Lomo / Portada simulada elegante */}
          <div className="w-20 h-28 rounded-lg bg-gradient-to-br from-blue-900 to-indigo-950 border border-blue-500/30 shadow-lg flex flex-col justify-between p-2 shrink-0 select-none">
            <div className="w-full h-1 bg-amber-400/50 rounded" />
            <span className="text-[10px] font-bold text-slate-200 line-clamp-3 text-center leading-tight">
              {book.title}
            </span>
            <span className="text-[8px] text-blue-300 truncate text-center">
              {book.author}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white leading-snug">
              {book.title}
            </h2>
            <p className="text-sm font-medium text-slate-300 mt-1">
              {book.author}
            </p>

            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              {book.genre && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                  {book.genre}
                </span>
              )}
              {book.year && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  Año {book.year}
                </span>
              )}
              {book.isbn && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono text-[11px]">
                  ISBN: {book.isbn}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Frase canónica obligatoria según ARQUITECTURE.md */}
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3.5 flex flex-col gap-1.5">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Instrucción de ubicación física:
          </span>
          <p className="text-sm font-medium text-amber-200">
            «{location.phrase}»
          </p>
        </div>

        {/* Advertencia física si está en segunda fila */}
        {isBehind && (
          <div className="rounded-xl bg-amber-950/40 border border-amber-600/40 p-3 flex items-start gap-2.5 text-xs text-amber-200">
            <span className="text-base">⚠️</span>
            <div>
              <strong className="font-semibold block text-amber-300">Libro en segunda fila (detrás)</strong>
              <span>Para acceder a este libro es necesario retirar temporalmente los libros situados en la fila delantera del cubo.</span>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <div>
            {canEdit && onEditBook && (
              <button
                type="button"
                onClick={() => onEditBook(book)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-700/60 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Editar / Trasladar</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => onShowInShelf(book.id)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5"
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
