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
  const { canEdit, isAdmin } = useAuth();
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

  // Resolver ubicación física legible (estancia, mueble, coordenadas, profundidad)
  const resolveLocationInfo = (hit: SearchHit) => {
    const shelf = catalog.shelves.find((s) => s.id === hit.location.shelfId);
    const rooms = catalog.rooms && catalog.rooms.length > 0 ? catalog.rooms : [catalog.room];
    const room = rooms.find(
      (r) => r.shelfIds?.includes(hit.location.shelfId) || (shelf && shelf.roomId === r.id),
    );
    return {
      roomName: room?.name || "Estudio Principal",
      shelfName: shelf?.name || "Kallax 4x4",
      row: hit.location.row,
      column: hit.location.column,
      depth: hit.location.depth,
      position: hit.location.position,
    };
  };

  // Selección de resultado de búsqueda ("Ver ubicación")
  const handleSelectHit = (hit: SearchHit) => {
    setHighlightedBookId(hit.book.id);
    setSelectedBookId(hit.book.id);

    // Conmutar a la habitación que contiene este mueble
    const rooms = catalog.rooms && catalog.rooms.length > 0 ? catalog.rooms : [catalog.room];
    const roomWithShelf = rooms.find(
      (r) => r.shelfIds?.includes(hit.location.shelfId) || catalog.shelves.find((s) => s.id === hit.location.shelfId)?.roomId === r.id,
    );
    if (roomWithShelf) {
      setActiveRoomId(roomWithShelf.id);
    }

    setActiveShelfId(hit.location.shelfId);
    setViewMode("shelf");

    // 1. Llevar visualmente al usuario hasta el cubo correspondiente con desplazamiento suave
    setTimeout(() => {
      const cellElement = document.getElementById(`shelf-cell-${hit.location.row}-${hit.location.column}`);
      if (cellElement) {
        cellElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 80);

    // 2. Resaltar el cubo y abrir automáticamente la información de profundidad
    const cell = catalog.cells.find(
      (c) =>
        c.shelfId === hit.location.shelfId &&
        c.row === hit.location.row &&
        c.column === hit.location.column,
    );
    if (cell) {
      setTimeout(() => {
        setInspectingCell(cell);
      }, 550);
    }
  };

  // Añadir o actualizar profundidad física de un cubo (solo admin)
  const handleUpdateCellDepthCount = (cellId: string, newDepthCount: number) => {
    if (!isAdmin) return;
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

  // Renombrar una estantería existente (solo admin)
  const handleRenameShelf = (shelfId: string, newName: string) => {
    if (!isAdmin) return;
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

  // Crear una nueva habitación (solo admin)
  const handleCreateRoom = (roomName: string) => {
    if (!isAdmin) return;
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

  // Renombrar habitación (solo admin)
  const handleRenameRoom = (roomId: string, newName: string) => {
    if (!isAdmin) return;
    const updatedRooms = renameRoom(roomId, newName);
    setCatalog((prev) => ({
      ...prev,
      rooms: updatedRooms,
      room: prev.room.id === roomId ? { ...prev.room, name: newName } : prev.room,
    }));
  };

  // Eliminar habitación (solo admin)
  const handleDeleteRoom = (roomId: string) => {
    if (!isAdmin) return;
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

  // Crear un nuevo mueble personalizado en la habitación activa (solo admin)
  const handleCreateCustomShelf = (
    name: string,
    cols: number,
    rows: number,
    disabledCellKeys?: string[],
  ) => {
    if (!isAdmin) return;
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

  // Alternar si un cubo es útil o sin uso, con borrado en cascada (solo admin)
  const handleToggleCellEnabled = (cell: ShelfCell, enabled: boolean) => {
    if (!isAdmin) return;
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

  // Eliminar un mueble personalizado (solo admin)
  const handleDeleteShelf = (shelfId: string) => {
    if (!isAdmin || catalog.shelves.length <= 1) return;
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

  // Vaciar estantería (solo admin)
  const handleClearBooks = () => {
    if (!isAdmin) return;
    setBooks([]);
    saveBooksToStorage([]);
    setSelectedBookId(undefined);
    setHighlightedBookId(undefined);
  };

  // Resolución de habitaciones y muebles
  const roomsList = catalog.rooms && catalog.rooms.length > 0 ? catalog.rooms : [catalog.room || initialRoom];
  const activeRoom = roomsList.find((r) => r.id === activeRoomId) || roomsList[0];

  // Filtrar ESTRICTAMENTE los muebles de la estancia activa (no mostrar muebles de otras habitaciones)
  const displayedShelves = catalog.shelves.filter((s) => {
    if (activeRoom.shelfIds?.includes(s.id) || s.roomId === activeRoom.id) {
      return true;
    }
    const isAssigned = roomsList.some(
      (r) => r.shelfIds?.includes(s.id) || s.roomId === r.id,
    );
    if (!isAssigned && activeRoom.id === roomsList[0]?.id) {
      return true;
    }
    return false;
  });

  const activeShelf =
    displayedShelves.find((s) => s.id === activeShelfId) ||
    displayedShelves[0] ||
    null;

  const activeShelfCells = activeShelf
    ? catalog.cells.filter((c) => c.shelfId === activeShelf.id)
    : [];

  const selectedBook = books.find((b) => b.id === selectedBookId);
  const selectedBookLocation = selectedBook && activeShelf
    ? resolveLocation(activeShelf, selectedBook.location)
    : null;

  // Métricas inmediatas de la estantería y estancia activa
  const activeShelfBooks = activeShelf
    ? books.filter((b) => b.location.shelfId === activeShelf.id)
    : [];
  const activeShelfOccupiedCells = activeShelf
    ? new Set(activeShelfBooks.map((b) => `${b.location.row}-${b.location.column}`)).size
    : 0;
  const activeShelfTotalCells = activeShelf ? activeShelf.columns * activeShelf.rows : 0;
  const occupancyPercentage = activeShelfTotalCells > 0
    ? Math.round((activeShelfOccupiedCells / activeShelfTotalCells) * 100)
    : 0;
  const roomBooksCount = books.filter((b) =>
    displayedShelves.some((s) => s.id === b.location.shelfId),
  ).length;

  return (
    <div className="min-h-screen flex flex-col room-wall-ambient text-slate-100 overflow-x-hidden">
      {/* Cabecera persistente con ubicación física */}
      <AppHeader
        title="Biblioteca Digital"
        currentLocation={activeShelf ? `${activeRoom.name} · ${activeShelf.name}` : activeRoom.name}
        bookCount={books.length}
        onAddBook={
          canEdit
            ? () => {
                if (displayedShelves.length === 0) {
                  setIsAddShelfModalOpen(true);
                } else {
                  setAddLocation(undefined);
                  setIsAddModalOpen(true);
                }
              }
            : undefined
        }
      />

      <main className="flex-1 w-full max-w-7xl 2xl:max-w-[1550px] mx-auto px-3 sm:px-6 pt-4 pb-2 flex flex-col gap-4 relative">
        {/* Dashboard de Estado y Navegación Espacial */}
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 z-30 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80 backdrop-blur-md shadow-xl">
          <div className="flex-1 min-w-0 space-y-2.5">
            {/* Jerarquía de migas espaciales */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="text-amber-400 font-semibold">Biblioteca</span>
              <span className="text-slate-600">›</span>
              <span className="text-slate-200 font-medium">{activeRoom.name}</span>
              {activeShelf && (
                <>
                  <span className="text-slate-600">›</span>
                  <span className="text-amber-300 font-medium">{activeShelf.name}</span>
                </>
              )}
            </div>

            {/* Título Principal y Estado */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex flex-wrap items-center gap-2.5">
                <span>{activeShelf ? activeShelf.name : activeRoom.name}</span>
                {books.length === 0 && (
                  <span className="text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-600/50 shadow-sm">
                    Listo para catalogar
                  </span>
                )}
              </h1>

              {/* Mensaje de orientación conciso */}
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                {books.length === 0
                  ? "Tu biblioteca física está lista. Haz clic en cualquier compartimento para colocar libros o utiliza los botones de acción para comenzar."
                  : viewMode === "room"
                    ? "Distribución espacial de muebles en la estancia. Pulsa en cualquier estantería para enfocarla."
                    : "Haz clic en cualquier cubo para ver sus libros y niveles de profundidad, o busca abajo por título, autor o ISBN."}
              </p>
            </div>

            {/* Métricas clave limpias: Libros, Cubos ocupados, % Ocupación y Botones integrados */}
            {activeShelf && viewMode === "shelf" && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 text-xs">
                {/* Libros */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-850 border border-slate-750 text-slate-200 shadow-sm">
                  <span>📚</span>
                  <strong className="text-white font-semibold">{activeShelfBooks.length}</strong>
                  <span className="text-slate-400">{activeShelfBooks.length === 1 ? "libro" : "libros"}</span>
                </div>

                {/* Cubos ocupados */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-850 border border-slate-750 text-slate-200 shadow-sm">
                  <span>🗄️</span>
                  <strong className="text-white font-semibold">{activeShelfOccupiedCells}</strong>
                  <span className="text-slate-400">de {activeShelfTotalCells} cubos ocupados</span>
                </div>

                {/* Porcentaje de ocupación con barra de progreso */}
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-850 border border-slate-750 text-slate-200 shadow-sm">
                  <span className="text-slate-400">Ocupación:</span>
                  <div className="w-16 sm:w-20 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${occupancyPercentage}%` }}
                    />
                  </div>
                  <strong className="text-amber-300 font-bold">{occupancyPercentage}%</strong>
                </div>

                {displayedShelves.length > 1 && (
                  <span className="hidden xl:inline-flex text-[11px] text-slate-500 items-center gap-1">
                    · {roomBooksCount} en total en {activeRoom.name}
                  </span>
                )}

                {/* Botones de acción integrados directamente en el dashboard */}
                <div className="flex items-center gap-2 ml-auto sm:ml-0 pt-1 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => {
                      setAddLocation(undefined);
                      setIsAddModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 shadow-md shadow-amber-950/40 border border-amber-400/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>+ Añadir libro</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadSamples}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-750 border border-slate-700/80 transition-colors"
                  >
                    {books.length === 0 ? "Cargar ejemplos" : "Cargar ejemplos"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Buscador de localización espacial con resolución física */}
          <div className="w-full lg:w-96 shrink-0">
            <SearchBox
              query={searchQuery}
              results={searchResults}
              resolveLocationInfo={resolveLocationInfo}
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
            isAdmin={isAdmin}
            onSelectRoom={(roomId) => {
              setActiveRoomId(roomId);
              const targetRoom = roomsList.find((r) => r.id === roomId);
              if (targetRoom) {
                const targetShelves = catalog.shelves.filter((s) => {
                  if (targetRoom.shelfIds?.includes(s.id) || s.roomId === targetRoom.id) {
                    return true;
                  }
                  const isAssigned = roomsList.some(
                    (r) => r.shelfIds?.includes(s.id) || s.roomId === r.id,
                  );
                  if (!isAssigned && targetRoom.id === roomsList[0]?.id) {
                    return true;
                  }
                  return false;
                });
                if (targetShelves.length > 0) {
                  setActiveShelfId(targetShelves[0].id);
                  setViewMode("shelf");
                } else {
                  setActiveShelfId("");
                  setViewMode("shelf");
                }
              }
            }}
            onOpenCreateModal={() => setIsCreateRoomModalOpen(true)}
            onRenameRoom={handleRenameRoom}
            onDeleteRoom={handleDeleteRoom}
          />
        </section>

        {/* Selector de Muebles de la Habitación Activa */}
        {displayedShelves.length > 0 && (
          <section className="w-full flex items-center justify-between gap-3 overflow-x-auto pb-1 z-20">
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-md">
              {displayedShelves.map((shelf) => {
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
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                      isActive
                        ? "bg-slate-800 text-white shadow-md border border-amber-500/40"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-amber-400" : "bg-slate-600"}`} />
                    <span>{shelf.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-black/30 rounded-full font-mono text-slate-400">
                      {shelf.columns}×{shelf.rows}
                    </span>
                    {count > 0 && (
                      <span className={`text-[10px] font-semibold ${isActive ? "text-amber-300" : "text-emerald-400"}`}>
                        • {count}
                      </span>
                    )}
                  </button>
                );
              })}

              {displayedShelves.length > 1 && (
                <button
                  type="button"
                  onClick={() => setViewMode("room")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    viewMode === "room"
                      ? "bg-slate-800 text-white shadow-md border border-amber-500/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                  }`}
                >
                  <span>Plano General</span>
                </button>
              )}
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsAddShelfModalOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 shadow-md transition-all flex items-center gap-1.5 shrink-0 hover:border-amber-500/40"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>+ Nuevo Mueble</span>
              </button>
            )}
          </section>
        )}



        {/* Cuadro artístico abstracto en la pared */}
        <WallArt />

        {/* Escenario de la habitación según el estado y modo de vista */}
        {displayedShelves.length === 0 ? (
          /* Estado Vacío de la Habitación: Botón de + Nuevo Mueble centrado en la pantalla */
          <section className="flex-1 w-full min-h-[48vh] sm:min-h-[55vh] flex flex-col items-center justify-center py-10 sm:py-16 px-4 my-auto text-center z-10 animate-fade-in">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/80 shadow-2xl flex items-center justify-center text-emerald-400">
                <svg className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Habitación sin muebles
            </h2>
            <p className="text-sm text-slate-400 max-w-md mb-8">
              Aún no hay ningún mueble en <span className="font-semibold text-slate-200">&ldquo;{activeRoom.name}&rdquo;</span>. Añade tu primera estantería para empezar a colocar libros en esta estancia.
            </p>

            {isAdmin ? (
              <button
                type="button"
                onClick={() => setIsAddShelfModalOpen(true)}
                className="group px-7 py-4 rounded-2xl text-sm sm:text-base font-bold text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-2xl shadow-emerald-950/60 border border-emerald-400/40 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 cursor-pointer"
              >
                <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span>+ Nuevo Mueble</span>
              </button>
            ) : (
              <p className="text-xs text-slate-500 italic bg-slate-900/60 px-4 py-2.5 rounded-xl border border-slate-800">
                Solo el administrador puede añadir o configurar muebles en esta estancia.
              </p>
            )}
          </section>
        ) : viewMode === "room" ? (
          <section className="py-4 z-10">
            <RoomPlan
              shelves={displayedShelves}
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
        ) : activeShelf ? (
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
                selectedCellId={inspectingCell?.id}
                onSelectCell={(cell) => setInspectingCell(cell)}
                onSelectBook={(bookId) => setSelectedBookId(bookId)}
                onRenameShelf={isAdmin ? handleRenameShelf : undefined}
                onToggleCellEnabled={isAdmin ? handleToggleCellEnabled : undefined}
              />

              {isAdmin && displayedShelves.length > 1 && (
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
        ) : null}
      </main>

      {/* Suelo de la habitación: Rodapié y Parquet de madera */}
      <div className="w-full flex flex-col mt-auto z-0">
        <div className="w-full h-4 skirting-board" />
        <div className="w-full h-24 sm:h-28 parquet-floor shadow-2xl relative px-4 sm:px-8 py-3 flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-4 text-xs text-amber-200/80">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0e1626] border border-slate-700 inline-block" />
              <span>Disponible</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm pattern-disabled border border-slate-800 inline-block" />
              <span>No disponible</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-950 border border-amber-600 inline-block" />
              <span>Con libros al fondo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-800 border border-slate-600 inline-block" />
              <span>Múltiples profundidades</span>
            </div>
          </div>

          {isAdmin && books.length > 0 && (
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
        onUpdateDepthCount={isAdmin ? handleUpdateCellDepthCount : undefined}
        onToggleCellEnabled={isAdmin ? handleToggleCellEnabled : undefined}
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
      {isAddModalOpen && activeShelf && (
        <AddBookModal
          shelf={activeShelf}
          cells={activeShelfCells}
          existingBooks={books}
          initialLocation={addLocation}
          onClose={() => setIsAddModalOpen(false)}
          onSaveBook={handleSaveBook}
        />
      )}

      {/* Modal para añadir un nuevo mueble personalizado (solo admin) */}
      {isAddShelfModalOpen && isAdmin && (
        <AddShelfModal
          roomName={activeRoom.name}
          onClose={() => setIsAddShelfModalOpen(false)}
          onCreateShelf={handleCreateCustomShelf}
        />
      )}

      {/* Modal para crear una nueva habitación (solo admin) */}
      <CreateRoomModal
        isOpen={isCreateRoomModalOpen && isAdmin}
        onClose={() => setIsCreateRoomModalOpen(false)}
        onCreateRoom={handleCreateRoom}
      />
    </div>
  );
}
