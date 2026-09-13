"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/chrome";
import { AddShelfModal } from "@/components/Library";
import {
  createCustomShelf,
  deleteCustomShelf,
  getCatalog,
  initialCells,
  initialRoom,
  initialShelves,
  subscribeToLibraryChanges,
  updateShelfName,
} from "@/lib/data";
import type { LibraryCatalog } from "@/lib/types";
import { useAuth } from "@/lib/auth/context";

export default function ShelvesIndexPage() {
  const { canEdit } = useAuth();
  const [catalog, setCatalog] = useState<LibraryCatalog>({
    room: initialRoom,
    shelves: initialShelves,
    cells: initialCells,
    books: [],
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [renamingShelfId, setRenamingShelfId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState("");

  useEffect(() => {
    getCatalog().then(setCatalog);

    const unsubscribe = subscribeToLibraryChanges((freshCatalog) => {
      setCatalog(freshCatalog);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleCreateCustomShelf = (
    name: string,
    cols: number,
    rows: number,
    disabledCellKeys?: string[],
  ) => {
    const { shelf, cells } = createCustomShelf(
      name,
      cols,
      rows,
      catalog.room.id,
      disabledCellKeys,
    );
    setCatalog((prev) => ({
      ...prev,
      shelves: [...prev.shelves, shelf],
      cells: [...prev.cells, ...cells],
    }));
  };

  const handleSaveRename = (shelfId: string) => {
    if (!renamingName.trim()) {
      setRenamingShelfId(null);
      return;
    }
    const updated = updateShelfName(shelfId, renamingName.trim());
    setCatalog((prev) => ({
      ...prev,
      shelves: updated,
    }));
    setRenamingShelfId(null);
  };

  const handleDeleteShelf = (shelfId: string) => {
    if (catalog.shelves.length <= 1) return;
    deleteCustomShelf(shelfId);
    setCatalog((prev) => {
      const remainingShelves = prev.shelves.filter((s) => s.id !== shelfId);
      const remainingCells = prev.cells.filter((c) => c.shelfId !== shelfId);
      const remainingBooks = prev.books.filter((b) => b.location.shelfId !== shelfId);
      return {
        ...prev,
        shelves: remainingShelves,
        cells: remainingCells,
        books: remainingBooks,
      };
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      <AppHeader title="Biblioteca Digital — Muebles" bookCount={catalog.books.length} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-blue-400 font-mono mb-1">
              <Link href="/" className="hover:underline">Inicio</Link>
              <span>›</span>
              <span>Índice de Muebles</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Muebles de la Habitación ({catalog.room.name})
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Catálogo de estanterías físicas configuradas en la habitación. Renombra o agrega nuevos muebles modulares.
            </p>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 self-start sm:self-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Añadir Mueble Personalizado</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {catalog.shelves.map((shelf) => {
            const shelfCells = catalog.cells.filter((c) => c.shelfId === shelf.id);
            const enabledCells = shelfCells.filter((c) => c.enabled).length;
            const disabledCells = shelfCells.filter((c) => !c.enabled).length;
            const booksInShelf = catalog.books.filter(
              (b) => b.location.shelfId === shelf.id,
            ).length;
            const isEditing = renamingShelfId === shelf.id;

            return (
              <article
                key={shelf.id}
                className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 flex flex-col justify-between gap-6 shadow-xl hover:border-slate-700 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      ID: {shelf.id}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Posición #{shelf.position}
                    </span>
                  </div>

                  {isEditing ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveRename(shelf.id);
                      }}
                      className="flex items-center gap-2 my-1"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={renamingName}
                        onChange={(e) => setRenamingName(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-blue-500 text-sm font-bold text-white focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                        title="Guardar nuevo nombre"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingShelfId(null)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs"
                        title="Cancelar"
                      >
                        ✕
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
                        {shelf.name}
                      </h2>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingShelfId(shelf.id);
                            setRenamingName(shelf.name);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-colors"
                          title="Renombrar este mueble"
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-slate-400 mt-1">
                    Estantería modular de {shelf.columns} columnas × {shelf.rows} filas ({shelf.columns * shelf.rows} cubos).
                  </p>

                  {/* Métricas del mueble */}
                  <div className="grid grid-cols-3 gap-2 mt-5 text-center">
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-lg font-bold text-white block">
                        {booksInShelf}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                        Libros
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-lg font-bold text-emerald-400 block">
                        {enabledCells}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                        Cubos Útiles
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-lg font-bold text-amber-400 block">
                        {disabledCells}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                        Sin Uso
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                  <Link
                    href={`/shelves/${shelf.id}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold text-center shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Abrir en detalle</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>

                  {canEdit && catalog.shelves.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteShelf(shelf.id)}
                      className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-red-400 hover:bg-red-950/40 border border-slate-800 transition-colors"
                      title="Eliminar mueble"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </main>

      {isAddModalOpen && (
        <AddShelfModal
          roomName={catalog.room.name}
          onClose={() => setIsAddModalOpen(false)}
          onCreateShelf={handleCreateCustomShelf}
        />
      )}
    </div>
  );
}
