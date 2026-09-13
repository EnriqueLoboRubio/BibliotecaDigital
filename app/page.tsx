"use client";

import { useEffect, useState, useTransition } from "react";
import type { Book, LibraryCatalog, SearchHit, SearchQuery, ShelfCell } from "@/lib/types";
import {
  createCustomShelf,
  createRoom,
  deleteCustomShelf,
  deleteBook,
  deleteRoom,
  getCatalog,
  initialCells,
  initialRoom,
  initialShelves,
  renameRoom,
  SAMPLE_BOOKS,
  saveBooksToStorage,
  saveCellsToStorage,
  subscribeToLibraryChanges,
  toggleCellEnabled,
  updateBook,
  updateShelfName,
} from "@/lib/data";
import { resolveLocation } from "@/lib/selectors";
import { searchBooks } from "@/lib/search";
import { ShelfUnit, RoomPlan, CellDepthModal, AddShelfModal } from "@/components/Library";
import { AppHeader } from "@/components/chrome";
import { SearchBox } from "@/components/Search";
import { BookDetail, AddBookModal, EditBookModal } from "@/components/book";
import { CreateRoomModal, FloorPlant, RoomSelector, WallArt } from "@/components/room";
import { useAuth } from "@/lib/auth/context";

export default function HomePage() {
  const { canEdit } = useAuth();
  const [catalog, setCatalog] = useState<LibraryCatalog>({
    room: initialRoom,
    rooms: [initialRoom],
    shelves: initialShelves,
    cells: initialCells,
    books: [],
  });

  const [activeRoomId, setActiveRoomId] = useState<string>("room-1");
  const [activeShelfId, setActiveShelfId] = useState<string>("shelf-A");
  const [viewMode, setViewMode] = useState<"shelf" | "room">("shelf");
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState<SearchQuery>({ q: "" });
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | undefined>();
  const [highlightedBookId, setHighlightedBookId] = useState<string | undefined>();
  const [inspectingCell, setInspectingCell] = useState<ShelfCell | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddShelfModalOpen, setIsAddShelfModalOpen] = useState(false);
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [addLocation, setAddLocation] = useState<{ row: number; column: number; depth: number } | undefined>();
  const [, startTransition] = useTransition();

  // Carga inicial del catálogo y detección de ?book= en URL
  useEffect(() => {
    getCatalog().then((data) => {
      setCatalog(data);
      setBooks(data.books);
      if (data.rooms && data.rooms.length > 0) {
        setActiveRoomId(data.rooms[0].id);
      }
      if (data.shelves.length > 0) {
        setActiveShelfId(data.shelves[0].id);
      }

      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const bookParam = params.get("book");
        if (bookParam) {
          setSelectedBookId(bookParam);
          setHighlightedBookId(bookParam);
          const found = data.books.find((b) => b.id === bookParam);
          if (found) {
            setActiveShelfId(found.location.shelfId);
            setViewMode("shelf");
            if (found.location.depth > 1) {
              const cell = data.cells.find(
                (c) =>
                  c.shelfId === found.location.shelfId &&
                  c.row === found.location.row &&
                  c.column === found.location.column,
              );
              if (cell) setInspectingCell(cell);
            }
          }
        }
      }
    });

    // Suscripción en tiempo real (Supabase Realtime + StorageEvent multidispositivo)
    const unsubscribe = subscribeToLibraryChanges((freshCatalog) => {
      setCatalog(freshCatalog);
      setBooks(freshCatalog.books);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Actualizar búsqueda en tiempo real
  const handleQueryChange = (query: SearchQuery) => {
    setSearchQuery(query);
    if (!query.q.trim()) {
      setSearchResults([]);
      setHighlightedBookId(undefined);
      return;
    }
    const hits = searchBooks(books, query);
    setSearchResults(hits);
  };

  // Selección de resultado de búsqueda
  const handleSelectHit = (hit: SearchHit) => {
    setHighlightedBookId(hit.book.id);
    setSelectedBookId(hit.book.id);

    // Conmutar a la habitación que contiene este mueble
    const rooms = catalog.rooms && catalog.rooms.length > 0 ? catalog.rooms : [catalog.room];
    const roomWithShelf = rooms.find(
      (r) => r.shelfIds?.includes(hit.location.shelfId),
    );
    if (roomWithShelf) {
      setActiveRoomId(roomWithShelf.id);
    }

    setActiveShelfId(hit.location.shelfId);
    setViewMode("shelf");

    // Si el libro está en el fondo (depth > 1), abrimos el cubo automáticamente
    if (hit.location.depth > 1) {
      const cell = catalog.cells.find(
        (c) =>
          c.shelfId === hit.location.shelfId &&
          c.row === hit.location.row &&
          c.column === hit.location.column,
      );
      if (cell) {
        setInspectingCell(cell);
      }
    }
  };

  // Añadir o actualizar profundidad física de un cubo
  const handleUpdateCellDepthCount = (cellId: string, newDepthCount: number) => {
    startTransition(() => {
      const updatedCells = catalog.cells.map((c) =>
        c.id === cellId ? { ...c, depthCount: newDepthCount } : c,
      );
      setCatalog((prev) => ({ ...prev, cells: updatedCells }));
      saveCellsToStorage(updatedCells);

      if (inspectingCell && inspectingCell.id === cellId) {
        setInspectingCell({ ...inspectingCell, depthCount: newDepthCount });
      }
    });
  };

  // Renombrar una estantería existente
  const handleRenameShelf = (shelfId: string, newName: string) => {
    startTransition(() => {
      const updatedShelves = updateShelfName(shelfId, newName);
      setCatalog((prev) => ({ ...prev, shelves: updatedShelves }));
    });
  };

  // Guardar nuevo libro y actualizar celda si tiene nueva profundidad
  const handleSaveBook = (newBook: Book, updatedCell?: ShelfCell) => {
    startTransition(() => {
      const updatedBooks = [...books, newBook];
      setBooks(updatedBooks);
      saveBooksToStorage(updatedBooks);

      if (updatedCell) {
        const updatedCells = catalog.cells.map((c) =>
          c.id === updatedCell.id ? updatedCell : c,
        );
        setCatalog((prev) => ({ ...prev, cells: updatedCells }));
        saveCellsToStorage(updatedCells);
      }

      setSelectedBookId(newBook.id);
      setHighlightedBookId(newBook.id);
    });
  };

  // Modificar libro existente (metadatos o reubicación)
  const handleUpdateBook = (updatedBook: Book, updatedCell?: ShelfCell) => {
    startTransition(() => {
      const updatedBooks = updateBook(updatedBook);
      setBooks(updatedBooks);

      if (updatedCell) {
        const updatedCells = catalog.cells.map((c) =>
          c.id === updatedCell.id ? updatedCell : c,
        );
        setCatalog((prev) => ({ ...prev, cells: updatedCells }));
        saveCellsToStorage(updatedCells);
      }

      setSelectedBookId(updatedBook.id);
      setHighlightedBookId(updatedBook.id);
    });
  };

  // Eliminar libro individual
  const handleDeleteBook = (bookId: string) => {
    startTransition(() => {
      const updatedBooks = deleteBook(bookId);
      setBooks(updatedBooks);
      if (selectedBookId === bookId) setSelectedBookId(undefined);
      if (highlightedBookId === bookId) setHighlightedBookId(undefined);
    });
  };

  // Crear una nueva habitación
  const handleCreateRoom = (roomName: string) => {
    const newRoom = createRoom(roomName);
    setCatalog((prev) => {
      const existingRooms = prev.rooms && prev.rooms.length > 0 ? prev.rooms : [prev.room];
      return {
        ...prev,
        rooms: [...existingRooms, newRoom],
      };
    });
    setActiveRoomId(newRoom.id);
  };

  // Renombrar habitación
  const handleRenameRoom = (roomId: string, newName: string) => {
    const updatedRooms = renameRoom(roomId, newName);
    setCatalog((prev) => ({
      ...prev,
      rooms: updatedRooms,
      room: prev.room.id === roomId ? { ...prev.room, name: newName } : prev.room,
    }));
  };

  // Eliminar habitación
  const handleDeleteRoom = (roomId: string) => {
    const res = deleteRoom(roomId);
    if (res.success && res.remainingRooms && res.remainingRooms.length > 0) {
      const remaining = res.remainingRooms;
      setCatalog((prev) => ({
        ...prev,
        rooms: remaining,
        room: remaining[0],
      }));
      if (activeRoomId === roomId) {
        setActiveRoomId(remaining[0].id);
      }
    }
  };

  // Crear un nuevo mueble personalizado en la habitación activa
  const handleCreateCustomShelf = (
    name: string,
    cols: number,
    rows: number,
    disabledCellKeys?: string[],
  ) => {
    startTransition(() => {
      const { shelf, cells } = createCustomShelf(
        name,
        cols,
        rows,
        activeRoom.id,
        disabledCellKeys,
      );
      setCatalog((prev) => {
        const existingRooms = prev.rooms && prev.rooms.length > 0 ? prev.rooms : [prev.room];
        const updatedRooms = existingRooms.map((r) =>
          r.id === activeRoom.id
            ? { ...r, shelfIds: Array.from(new Set([...(r.shelfIds || []), shelf.id])) }
            : r,
        );
        return {
          ...prev,
          rooms: updatedRooms,
          shelves: [...prev.shelves, shelf],
          cells: [...prev.cells, ...cells],
        };
      });
      setActiveShelfId(shelf.id);
      setViewMode("shelf");
    });
  };

  // Alternar si un cubo es útil o sin uso, con borrado en cascada
  const handleToggleCellEnabled = (cell: ShelfCell, enabled: boolean) => {
    startTransition(() => {
      const { updatedCells, updatedBooks } = toggleCellEnabled(
        cell.shelfId,
        cell.row,
        cell.column,
        enabled,
      );

      setCatalog((prev) => ({
        ...prev,
        cells: updatedCells,
        books: updatedBooks,
      }));
      setBooks(updatedBooks);

      // Si el libro seleccionado o resaltado estaba en esa celda y se desactivó, limpiarlo
      if (!enabled) {
        if (
          selectedBook &&
          selectedBook.location.shelfId === cell.shelfId &&
          selectedBook.location.row === cell.row &&
          selectedBook.location.column === cell.column
        ) {
          setSelectedBookId(undefined);
        }
        if (
          highlightedBookId &&
          books.some(
            (b) =>
              b.id === highlightedBookId &&
              b.location.shelfId === cell.shelfId &&
              b.location.row === cell.row &&
              b.location.column === cell.column,
          )
        ) {
          setHighlightedBookId(undefined);
        }
      }

      if (inspectingCell && inspectingCell.id === cell.id) {
        setInspectingCell({ ...inspectingCell, enabled });
      }
    });
  };

  // Eliminar un mueble personalizado (si hay más de 1)
  const handleDeleteShelf = (shelfId: string) => {
    if (catalog.shelves.length <= 1) return;
    deleteCustomShelf(shelfId);
    setCatalog((prev) => {
      const remainingShelves = prev.shelves.filter((s) => s.id !== shelfId);
      const remainingCells = prev.cells.filter((c) => c.shelfId !== shelfId);
      const remainingBooks = prev.books.filter((b) => b.location.shelfId !== shelfId);
      const existingRooms = prev.rooms && prev.rooms.length > 0 ? prev.rooms : [prev.room];
      const updatedRooms = existingRooms.map((r) => ({
        ...r,
        shelfIds: (r.shelfIds || []).filter((id) => id !== shelfId),
      }));
      return {
        ...prev,
        rooms: updatedRooms,
        shelves: remainingShelves,
        cells: remainingCells,
        books: remainingBooks,
      };
    });
    setBooks((prev) => prev.filter((b) => b.location.shelfId !== shelfId));
    const nextShelf = displayedShelves.find((s) => s.id !== shelfId) || catalog.shelves.find((s) => s.id !== shelfId);
    setActiveShelfId(nextShelf?.id || "shelf-A");
  };

  // Cargar libros de demostración
  const handleLoadSamples = () => {
    setBooks(SAMPLE_BOOKS);
    saveBooksToStorage(SAMPLE_BOOKS);
  };

  // Vaciar estantería
  const handleClearBooks = () => {
    setBooks([]);
    saveBooksToStorage([]);
    setSelectedBookId(undefined);
    setHighlightedBookId(undefined);
  };

  // Resolución de habitaciones y muebles
  const roomsList = catalog.rooms && catalog.rooms.length > 0 ? catalog.rooms : [catalog.room || initialRoom];
  const activeRoom = roomsList.find((r) => r.id === activeRoomId) || roomsList[0];
  const activeRoomShelves = catalog.shelves.filter(
    (s) => activeRoom.shelfIds?.includes(s.id) || s.roomId === activeRoom.id,
  );
  const displayedShelves = activeRoomShelves.length > 0 ? activeRoomShelves : catalog.shelves;
  const activeShelf =
    displayedShelves.find((s) => s.id === activeShelfId) ||
    displayedShelves[0] ||
    catalog.shelves[0] ||
    initialShelves[0];

  const activeShelfCells = catalog.cells.filter(
    (c) => c.shelfId === activeShelf.id,
  );

  const selectedBook = books.find((b) => b.id === selectedBookId);
  const selectedBookLocation = selectedBook
    ? resolveLocation(activeShelf, selectedBook.location)
    : null;

  return (
    <div className="min-h-screen flex flex-col room-wall-ambient text-slate-100 overflow-x-hidden">
      {/* Cabecera persistente */}
      <AppHeader
        title="Biblioteca Digital"
        bookCount={books.length}
        onAddBook={
          canEdit
            ? () => {
                setAddLocation(undefined);
                setIsAddModalOpen(true);
              }
            : undefined
        }
      />

      <main className="flex-1 w-full max-w-7xl 2xl:max-w-[1550px] mx-auto px-3 sm:px-6 pt-6 pb-2 flex flex-col gap-6 relative">
        {/* Barra superior de localización espacial y buscador combobox */}
        <section className="flex flex-col sm:flex-row items-center justify-between gap-4 z-30">
          <div className="w-full sm:w-auto">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-semibold">
                {catalog.room.name}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ({catalog.shelves.length} {catalog.shelves.length === 1 ? "mueble" : "muebles"})
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>{catalog.room.name}</span>
              <span className="text-slate-500 font-normal">/</span>
              <span className="text-blue-400 font-semibold text-lg sm:text-xl">
                {viewMode === "room" ? "Plano General" : activeShelf.name}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {viewMode === "room"
                ? "Distribución de muebles en la estancia. Haz clic en cualquiera para enfocarlo."
                : `Estantería de ${activeShelf.columns}×${activeShelf.rows} cubos. Haz clic en un cubo para desplegar la profundidad.`}
            </p>
          </div>

          <div className="w-full sm:w-80 md:w-96">
            <SearchBox
              query={searchQuery}
              results={searchResults}
              onQueryChange={handleQueryChange}
              onSelectHit={handleSelectHit}
            />
          </div>
        </section>

        {/* Selector de Habitación / Estancia */}
        <section className="w-full z-30">
          <RoomSelector
            rooms={roomsList}
            activeRoomId={activeRoom.id}
            shelves={catalog.shelves}
            books={books}
            canEdit={canEdit}
            onSelectRoom={(roomId) => {
              setActiveRoomId(roomId);
              const targetRoom = roomsList.find((r) => r.id === roomId);
              if (targetRoom) {
                const targetShelves = catalog.shelves.filter(
                  (s) => targetRoom.shelfIds?.includes(s.id) || s.roomId === targetRoom.id,
                );
                if (targetShelves.length > 0) {
                  setActiveShelfId(targetShelves[0].id);
                }
              }
            }}
            onOpenCreateModal={() => setIsCreateRoomModalOpen(true)}
            onRenameRoom={handleRenameRoom}
            onDeleteRoom={handleDeleteRoom}
          />
        </section>

        {/* Selector de Muebles de la Habitación Activa y botón para añadir más */}
        <section className="w-full flex items-center justify-between gap-3 overflow-x-auto pb-1 z-20">
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 shadow-md">
            {displayedShelves.length === 0 ? (
              <span className="text-xs text-slate-400 py-1 px-3 italic">
                No hay muebles en esta estancia todavía.
              </span>
            ) : (
              displayedShelves.map((shelf) => {
                const isActive = viewMode === "shelf" && activeShelfId === shelf.id;
                const count = books.filter((b) => b.location.shelfId === shelf.id).length;
                return (
                  <button
                    key={shelf.id}
                    type="button"
                    onClick={() => {
                      setActiveShelfId(shelf.id);
                      setViewMode("shelf");
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                      isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <span>{shelf.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-black/30 rounded-full font-mono">
                      {shelf.columns}×{shelf.rows}
                    </span>
                    {count > 0 && (
                      <span className="text-[10px] font-bold text-emerald-400">
                        • {count}
                      </span>
                    )}
                  </button>
                );
              })
            )}

            {displayedShelves.length > 1 && (
              <button
                type="button"
                onClick={() => setViewMode("room")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === "room"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <span>Plano de la Estancia</span>
              </button>
            )}
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => setIsAddShelfModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/70 border border-emerald-700/60 shadow-md transition-all flex items-center gap-1.5 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Nuevo Mueble</span>
            </button>
          )}
        </section>

        {/* Estado Vacío / Onboarding guiado */}
        {books.length === 0 && (
          <div className="rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900/80 to-slate-900/60 border border-blue-500/30 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-2xl backdrop-blur-md z-20">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">
                  La biblioteca física está lista
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                  Selecciona cualquier cubo para colocar libros, añade nuevos muebles personalizados o carga ejemplos para explorar.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleLoadSamples}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                Cargar libros de ejemplo
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddLocation(undefined);
                  setIsAddModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/25 transition-all"
              >
                + Registrar libro
              </button>
            </div>
          </div>
        )}

        {/* Cuadro artístico abstracto en la pared */}
        <WallArt />

        {/* Escenario de la habitación según el modo de vista */}
        {viewMode === "room" ? (
          <section className="py-4 z-10">
            <RoomPlan
              shelves={catalog.shelves}
              cells={catalog.cells}
              books={books}
              highlightedBookId={highlightedBookId}
              selectedBookId={selectedBookId}
              onSelectShelf={(shelfId) => {
                setActiveShelfId(shelfId);
                setViewMode("shelf");
              }}
            />
          </section>
        ) : (
          <section className="relative flex flex-col md:flex-row items-center md:items-end justify-center gap-4 lg:gap-8 pt-2 pb-0">
            {/* Mueble Kallax activo centrado con repisa superior y patas */}
            <div className="w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl flex-1 z-10">
              <ShelfUnit
                shelf={activeShelf}
                cells={activeShelfCells}
                books={books}
                density="detail"
                highlightedBookId={highlightedBookId}
                selectedBookId={selectedBookId}
                onSelectCell={(cell) => setInspectingCell(cell)}
                onSelectBook={(bookId) => setSelectedBookId(bookId)}
                onRenameShelf={handleRenameShelf}
                onToggleCellEnabled={handleToggleCellEnabled}
              />

              {canEdit && catalog.shelves.length > 1 && (
                <div className="w-full flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteShelf(activeShelf.id)}
                    className="text-[11px] text-slate-500 hover:text-red-400 transition-colors"
                  >
                    Eliminar este mueble ({activeShelf.name})
                  </button>
                </div>
              )}
            </div>

            {/* Gran planta de interior (Monstera) */}
            <div className="hidden lg:flex shrink-0 -mb-2 z-10">
              <FloorPlant />
            </div>
          </section>
        )}
      </main>

      {/* Suelo de la habitación: Rodapié y Parquet de madera */}
      <div className="w-full flex flex-col mt-auto z-0">
        <div className="w-full h-4 skirting-board" />
        <div className="w-full h-24 sm:h-28 parquet-floor shadow-2xl relative px-4 sm:px-8 py-3 flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-4 text-xs text-amber-200/70">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#0e1626] border border-slate-700 inline-block" />
              <span>Cubo útil</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded pattern-disabled border border-slate-800 inline-block" />
              <span>Sin uso físico</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-900 border border-amber-700 inline-block" />
              <span>Con libros en profundidad</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-900 border border-emerald-700 inline-block" />
              <span>Profundidades dinámicas</span>
            </div>
          </div>

          {canEdit && books.length > 0 && (
            <button
              type="button"
              onClick={handleClearBooks}
              className="text-xs text-amber-300/60 hover:text-red-400 transition-colors"
            >
              Vaciar todos los libros
            </button>
          )}
        </div>
      </div>

      {/* Modal de inspección de profundidad en planta */}
      <CellDepthModal
        cell={inspectingCell}
        shelf={activeShelf}
        books={books}
        selectedBookId={selectedBookId}
        highlightedBookId={highlightedBookId}
        onClose={() => setInspectingCell(null)}
        onSelectBook={(bookId) => setSelectedBookId(bookId)}
        onAddBookToCell={(row, column, depth) => {
          setAddLocation({ row, column, depth });
          setIsAddModalOpen(true);
        }}
        onUpdateDepthCount={handleUpdateCellDepthCount}
        onToggleCellEnabled={handleToggleCellEnabled}
      />

      {/* Ficha detallada del libro seleccionado */}
      {selectedBook && selectedBookLocation && (
        <BookDetail
          book={selectedBook}
          location={selectedBookLocation}
          onClose={() => setSelectedBookId(undefined)}
          onShowInShelf={() => {
            setHighlightedBookId(selectedBook.id);
          }}
          onEditBook={(b) => setEditingBook(b)}
        />
      )}

      {/* Modal para editar un libro existente */}
      {editingBook && (
        <EditBookModal
          book={editingBook}
          shelves={catalog.shelves}
          cells={catalog.cells}
          onClose={() => setEditingBook(null)}
          onUpdateBook={handleUpdateBook}
          onDeleteBook={handleDeleteBook}
        />
      )}

      {/* Modal para registrar un nuevo libro */}
      {isAddModalOpen && (
        <AddBookModal
          shelf={activeShelf}
          cells={activeShelfCells}
          existingBooks={books}
          initialLocation={addLocation}
          onClose={() => setIsAddModalOpen(false)}
          onSaveBook={handleSaveBook}
        />
      )}

      {/* Modal para añadir un nuevo mueble personalizado */}
      {isAddShelfModalOpen && (
        <AddShelfModal
          roomName={activeRoom.name}
          onClose={() => setIsAddShelfModalOpen(false)}
          onCreateShelf={handleCreateCustomShelf}
        />
      )}

      {/* Modal para crear una nueva habitación */}
      <CreateRoomModal
        isOpen={isCreateRoomModalOpen}
        onClose={() => setIsCreateRoomModalOpen(false)}
        onCreateRoom={handleCreateRoom}
      />
    </div>
  );
}
