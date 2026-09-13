import type { SearchBoxProps } from "@/lib/types";

export function SearchBox({
  query,
  results,
  onQueryChange,
  onSelectHit,
}: SearchBoxProps) {
  const isSearching = Boolean(query.q.trim());

  return (
    <div className="relative w-full max-w-xl mx-auto z-30">
      {/* Campo de búsqueda estilo combobox refinado */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-slate-400 pointer-events-none">
          <svg className="w-4 h-4 text-amber-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <input
          type="search"
          value={query.q}
          placeholder="Buscar por título, autor o ISBN (ej. Borges, Quijote)..."
          onChange={(e) => onQueryChange({ q: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onQueryChange({ q: "" });
            }
          }}
          className="w-full pl-10 pr-12 py-2.5 bg-slate-900/90 hover:bg-slate-900 text-slate-100 placeholder:text-slate-400 text-sm rounded-xl border border-slate-700/80 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:outline-none transition-all shadow-lg backdrop-blur-md"
        />

        {isSearching ? (
          <button
            type="button"
            onClick={() => onQueryChange({ q: "" })}
            className="absolute right-3 p-1 text-slate-400 hover:text-slate-200 rounded-md transition-colors"
            title="Limpiar búsqueda (Esc)"
            aria-label="Limpiar búsqueda"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <kbd className="hidden sm:inline-block absolute right-3 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-slate-800/80 border border-slate-700 rounded select-none pointer-events-none">
            /
          </kbd>
        )}
      </div>

      {/* Resultados de búsqueda flotantes */}
      {isSearching && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-[#0f172a]/95 border border-slate-700 shadow-2xl backdrop-blur-md overflow-hidden z-50 divide-y divide-slate-800">
          {results.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              Ningún libro coincide con «<strong className="text-slate-200">{query.q}</strong>». Prueba con el título, autor o código ISBN.
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1.5 divide-y divide-slate-800/60" role="listbox">
              {results.map((hit) => {
                const isBehind = hit.location.depth > 1;
                return (
                  <li key={hit.book.id} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onClick={() => onSelectHit(hit)}
                      className="w-full text-left px-4 py-2.5 hover:bg-amber-500/10 focus:bg-amber-500/15 focus:outline-none flex items-center justify-between gap-3 group transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-100 group-hover:text-amber-300 truncate">
                          {hit.book.title}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {hit.book.author} {hit.book.isbn ? `· ISBN ${hit.book.isbn}` : ""}
                        </p>
                      </div>

                      {/* Ubicación física compacta */}
                      <div className="shrink-0 flex items-center gap-1.5">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700/80">
                          Fila {hit.location.row} · Col. {hit.location.column}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                            isBehind
                              ? "bg-amber-950/80 text-amber-300 border border-amber-700/60"
                              : "bg-slate-800 text-slate-300 border border-slate-700"
                          }`}
                        >
                          {isBehind ? "Al fondo" : "Al frente"} #{hit.location.position}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
