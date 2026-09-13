import type { AppHeaderProps } from "@/lib/types";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase";

export function AppHeader({ title, bookCount, onAddBook }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full glass-effect border-b border-slate-800/80 shadow-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Marca y Título */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white block leading-tight">
                {title}
              </span>
              <span className="text-[10px] text-blue-400 font-medium tracking-wide uppercase">
                Localizador Físico
              </span>
            </div>
          </Link>
        </div>

        {/* Navegación Principal */}
        <nav className="hidden sm:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 text-xs font-medium">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Estantería
          </Link>
          <Link
            href="/shelves"
            className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Muebles
          </Link>
          <Link
            href="/books"
            className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Catálogo
          </Link>
        </nav>

        {/* Acciones y métricas */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isSupabaseConfigured && (
            <span
              className="hidden sm:inline-flex items-center gap-1.5 text-[10px] text-emerald-300 bg-emerald-950/80 px-2 py-1 rounded-lg border border-emerald-800/70 font-mono shadow-sm"
              title="Base de datos Supabase conectada en la nube"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Nube</span>
            </span>
          )}

          {typeof bookCount === "number" && (
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <strong>{bookCount}</strong> {bookCount === 1 ? "libro" : "libros"}
            </span>
          )}

          {onAddBook && (
            <button
              type="button"
              onClick={onAddBook}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 px-3.5 py-2 rounded-xl shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Registrar Libro</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
