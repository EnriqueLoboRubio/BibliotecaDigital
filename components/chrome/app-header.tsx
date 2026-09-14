"use client";

import { useState } from "react";
import type { AppHeaderProps } from "@/lib/types";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth/context";
import { LoginModal, UserManagementModal } from "@/components/auth";

export function AppHeader({ title, currentLocation, bookCount, onAddBook }: AppHeaderProps) {
  const { user, isAuthenticated, isAdmin, canEdit, logout } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-effect border-b border-slate-800/80 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Marca Principal y Ubicación Física */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-3 group min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-black/40 group-hover:border-amber-400/60 transition-all shrink-0">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-bold tracking-tight text-white group-hover:text-amber-100 transition-colors truncate">
                    Biblioteca Digital
                  </span>
                  {currentLocation && (
                    <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-300 bg-amber-950/60 border border-amber-700/50 px-2.5 py-0.5 rounded-full shrink-0 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span className="truncate max-w-[220px]">{currentLocation}</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  {currentLocation ? (
                    <span className="md:hidden text-amber-300/90 font-medium truncate max-w-[160px]">
                      📍 {currentLocation}
                    </span>
                  ) : (
                    <span className="truncate text-slate-400">{title}</span>
                  )}
                  {typeof bookCount === "number" && (
                    <>
                      <span className="hidden sm:inline text-slate-600">•</span>
                      <span className="hidden sm:inline text-slate-400">
                        {bookCount === 0 ? (
                          "Sin libros aún"
                        ) : (
                          <>
                            <strong className="text-slate-200">{bookCount}</strong> {bookCount === 1 ? "libro" : "libros"}
                          </>
                        )}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          </div>

          {/* Navegación Principal Estilizada */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800/80 text-xs font-medium">
            <Link
              href="/"
              className="px-3.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              Estantería
            </Link>
            <Link
              href="/shelves"
              className="px-3.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              Muebles
            </Link>
            <Link
              href="/books"
              className="px-3.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              Catálogo
            </Link>
          </nav>

          {/* Acciones y Autenticación con Jerarquía Clara */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Estado de sincronización en nube */}
            {isSupabaseConfigured ? (
              <span
                className="inline-flex items-center gap-1.5 text-[10px] text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/60 font-medium shadow-sm"
                title="Sincronización en vivo multidispositivo activa"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">En vivo</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-800/60 font-medium shadow-sm"
                title="Modo local"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="hidden sm:inline">Local</span>
              </span>
            )}

            {/* Acción Primaria: Registrar Libro (Solo autenticados) */}
            {canEdit && onAddBook && (
              <button
                type="button"
                onClick={onAddBook}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:from-amber-700 active:to-amber-800 px-3.5 py-1.5 rounded-xl shadow-lg shadow-amber-950/40 border border-amber-400/30 transition-all cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Registrar Libro</span>
                <span className="sm:hidden">+ Libro</span>
              </button>
            )}

            {/* Estado de usuario / Autenticación */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-800">
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs border font-medium ${
                    isAdmin
                      ? "bg-purple-950/60 text-purple-200 border-purple-700/50"
                      : "bg-slate-900/80 text-slate-200 border-slate-700/60"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                  <span className="font-semibold max-w-[90px] truncate">{user.name}</span>
                  <span className="text-[10px] opacity-75 uppercase">
                    ({isAdmin ? "Admin" : "Editor"})
                  </span>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsUsersOpen(true)}
                    className="p-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/50 text-purple-200 text-xs transition-colors cursor-pointer"
                    title="Gestionar Usuarios"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </button>
                )}

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
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-750 border border-slate-700/80 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
