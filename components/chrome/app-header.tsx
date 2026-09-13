"use client";

import { useState } from "react";
import type { AppHeaderProps } from "@/lib/types";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth/context";
import { LoginModal, UserManagementModal } from "@/components/auth";

export function AppHeader({ title, bookCount, onAddBook }: AppHeaderProps) {
  const { user, isAuthenticated, isAdmin, canEdit, logout } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-effect border-b border-slate-800/80 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
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
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 text-xs font-medium">
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

          {/* Acciones, métricas y autenticación */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Estado de conexión en la nube */}
            {isSupabaseConfigured ? (
              <span
                className="inline-flex items-center gap-1.5 text-[10px] text-emerald-300 bg-emerald-950/80 px-2 py-1 rounded-lg border border-emerald-800/70 font-mono shadow-sm"
                title="Base de datos Supabase conectada con sincronización en vivo multidispositivo"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">Nube (En vivo)</span>
                <span className="sm:hidden">Nube</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-950/80 px-2 py-1 rounded-lg border border-amber-800/70 font-mono shadow-sm"
                title="Modo local activo"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Local</span>
              </span>
            )}

            {/* Contador de libros */}
            {typeof bookCount === "number" && (
              <span className="hidden lg:inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <strong>{bookCount}</strong> {bookCount === 1 ? "libro" : "libros"}
              </span>
            )}

            {/* Botón registrar libro (Solo si está autenticado) */}
            {canEdit && onAddBook && (
              <button
                type="button"
                onClick={onAddBook}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 px-3 py-1.5 rounded-xl shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Registrar Libro</span>
                <span className="sm:hidden">+ Libro</span>
              </button>
            )}

            {/* Barra de usuario / Autenticación */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-800">
                {/* Chip con el usuario y rol */}
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs border font-medium ${
                    isAdmin
                      ? "bg-purple-950/70 text-purple-200 border-purple-700/60"
                      : "bg-blue-950/70 text-blue-200 border-blue-700/60"
                  }`}
                >
                  <span>👤</span>
                  <span className="font-semibold">{user.name}</span>
                  <span className="text-[10px] opacity-75 uppercase">
                    ({isAdmin ? "Admin" : "Editor"})
                  </span>
                </div>

                {/* Botón administración de usuarios (Solo Admin) */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsUsersOpen(true)}
                    className="p-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/50 text-purple-200 text-xs transition-colors cursor-pointer"
                    title="Gestionar Usuarios"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </button>
                )}

                {/* Botón cerrar sesión */}
                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-red-400 text-xs transition-colors cursor-pointer"
                  title="Cerrar Sesión"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsLoginOpen(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Acceder</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Modales de Autenticación y Administración */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      {isAdmin && (
        <UserManagementModal isOpen={isUsersOpen} onClose={() => setIsUsersOpen(false)} />
      )}
    </>
  );
}
