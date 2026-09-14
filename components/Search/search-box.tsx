"use client";

import { useState, useRef, useEffect } from "react";
import type { SearchBoxProps, SearchHit } from "@/lib/types";

export function SearchBox({
  query,
  results,
  isLoading = false,
  resolveLocationInfo,
  onQueryChange,
  onSelectHit,
}: SearchBoxProps) {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSearching = Boolean(query.q.trim());
  const showDropdown = isFocused || isSearching;

  // Cerrar resultados al hacer clic fuera del componente
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (hit: SearchHit) => {
    onSelectHit(hit);
    setIsFocused(false);
  };

  const handleSuggestionClick = (term: string) => {
    onQueryChange({ q: term });
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl mx-auto z-40">
      {/* Campo de búsqueda combobox refinado */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-slate-400 pointer-events-none">
          {isLoading ? (
            <svg className="w-4 h-4 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-amber-400/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>

        <input
          type="search"
          value={query.q}
          placeholder="Buscar por título, autor o ISBN (ej. Borges, Quijote)..."
          onFocus={() => setIsFocused(true)}
          onChange={(e) => onQueryChange({ q: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onQueryChange({ q: "" });
              setIsFocused(false);
            }
          }}
          className="w-full pl-10 pr-12 py-2.5 bg-slate-900/95 hover:bg-slate-900 text-slate-100 placeholder:text-slate-400 text-sm rounded-xl border border-slate-700/80 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:outline-none transition-all shadow-lg backdrop-blur-md"
        />

        {isSearching ? (
          <button
            type="button"
            onClick={() => {
              onQueryChange({ q: "" });
              setIsFocused(false);
            }}
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

      {/* Menú flotante de resultados y estados */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-[#0b0f19]/95 border border-slate-700/90 shadow-2xl backdrop-blur-xl overflow-hidden z-50 divide-y divide-slate-800 animate-in fade-in zoom-in-95 duration-150">
          {/* ----------------------------------------------------------------- */}
          {/* ESTADO 1: Entrada vacía con foco (sugerencias y guía)              */}
          {/* ----------------------------------------------------------------- */}
          {!isSearching ? (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs text-amber-300 font-medium">
                <span>🔍</span>
                <span>Búsqueda espacial en la biblioteca</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Escribe el título de la obra, el nombre del autor o el código ISBN. El localizador te indicará en qué habitación, estantería, fila, columna y nivel de profundidad se encuentra físicamente.
              </p>
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-500 font-medium block mb-1.5">
                  Búsquedas de ejemplo sugeridas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {["Borges", "García Márquez", "Quijote", "Asimov", "Ciencia Ficción"].map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => handleSuggestionClick(term)}
                      className="px-2.5 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs border border-slate-750 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : isLoading ? (
            /* --------------------------------------------------------------- */
            /* ESTADO 2: Cargando resultados                                  */
            /* --------------------------------------------------------------- */
            <div className="p-6 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <span>Buscando en la colección física...</span>
            </div>
          ) : results.length === 0 ? (
            /* --------------------------------------------------------------- */
            /* ESTADO 3: Sin resultados                                       */
            /* --------------------------------------------------------------- */
            <div className="p-5 text-center text-xs text-slate-400 space-y-1.5">
              <div className="text-slate-500 text-lg">📖</div>
              <p className="font-semibold text-slate-200">
                Ningún libro coincide con «{query.q}»
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                Comprueba si el título, autor o los 10/13 dígitos del ISBN están bien escritos, o pulsa en cualquier cubo para registrarlo.
              </p>
            </div>
          ) : (
            /* --------------------------------------------------------------- */
            /* ESTADO 4: Con resultados (Ubicación física completa y Ver)      */
            /* --------------------------------------------------------------- */
            <div>
              <div className="px-4 py-2 bg-slate-900/70 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  <strong>{results.length}</strong> {results.length === 1 ? "libro encontrado" : "libros encontrados"}
                </span>
                <span className="text-[10px] text-slate-500">
                  Ubicación física exacta
                </span>
              </div>

              <ul className="max-h-84 overflow-y-auto divide-y divide-slate-800/80" role="listbox">
                {results.map((hit) => {
                  const loc = resolveLocationInfo
                    ? resolveLocationInfo(hit)
                    : {
                        roomName: "Estudio Principal",
                        shelfName: "Kallax 4x4",
                        row: hit.location.row,
                        column: hit.location.column,
                        depth: hit.location.depth,
                        position: hit.location.position,
                      };

                  const isBehind = loc.depth > 1;

                  return (
                    <li key={hit.book.id} role="option" aria-selected={false}>
                      <div className="p-4 hover:bg-slate-850/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group border-l-2 border-transparent hover:border-amber-400">
                        {/* Datos bibliográficos y Ubicación */}
                        <div className="min-w-0 flex-1 space-y-2">
                          <div>
                            <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                              {hit.book.title}
                            </h4>
                            <p className="text-xs text-slate-300 mt-0.5">
                              {hit.book.author}
                            </p>
                            {hit.book.isbn && (
                              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                                ISBN: <span className="text-slate-300">{hit.book.isbn}</span>
                              </p>
                            )}
                          </div>

                          {/* Bloque estructurado de Ubicación Física */}
                          <div className="pt-2 border-t border-slate-800/80">
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                              Ubicación:
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 font-medium">
                                📍 {loc.roomName}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 font-medium">
                                🗄️ {loc.shelfName}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-amber-950/90 text-amber-200 border border-amber-600/60 font-semibold">
                                Fila {loc.row} · Columna {loc.column}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md font-semibold border ${
                                  isBehind
                                    ? "bg-amber-950 text-amber-300 border-amber-700/60"
                                    : "bg-slate-800/90 text-slate-300 border-slate-700"
                                }`}
                              >
                                Profundidad {loc.depth} ({isBehind ? "Fondo" : "Frente"})
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Botón de acción: Ver ubicación */}
                        <div className="shrink-0 flex items-center">
                          <button
                            type="button"
                            onClick={() => handleSelect(hit)}
                            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-950/70 hover:bg-amber-600 hover:text-white border border-amber-500/60 shadow-md shadow-amber-950/40 transition-all flex items-center justify-center gap-2 group/btn cursor-pointer active:scale-95"
                          >
                            <span>Ver ubicación</span>
                            <span className="transform group-hover/btn:translate-x-1 transition-transform">→</span>
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
