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
import { BookDetail, AddBookModal, EditBookModal, QuickRelocateModal } from "@/components/book";
import { CreateRoomModal, FloorPlant, RoomSelector, WallArt } from "@/components/room";
import { ShelfDigitizationModal } from "@/components/digitize";
import { LoginModal } from "@/components/auth";
import { BackupModal } from "@/components/backup";
import { BarcodeScannerModal, type ScannedBookBatchItem } from "@/components/scanner";
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
  const [isDigitizeModalOpen, setIsDigitizeModalOpen] = useState(false);
  const [digitizeInitialCell, setDigitizeInitialCell] = useState<{ row: number; column: number; depth: number } | undefined>();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [relocatingBook, setRelocatingBook] = useState<Book | null>(null);
  const [burstScanTarget, setBurstScanTarget] = useState<{
    shelfId: string;
    shelfName: string;
    row: number;
    column: number;
    depth: number;
  } | null>(null);
  const [isBurstScannerOpen, setIsBurstScannerOpen] = useState(false);
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
            setTimeout(() => {
              const cellElement = document.getElementById(
                `shelf-cell-${found.location.row}-${found.location.column}`,
              );
              if (cellElement) {
                cellElement.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                  inline: "center",
                });
              }
            }, 250);
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

  // Navegar a la estantería física y enfocar el libro en pantalla
  const handleShowBookInShelf = (bookId: string) => {
    const targetBook = books.find((b) => b.id === bookId);
    if (!targetBook) return;

    // 1. Cerrar modales que tapan la vista para despejar la estantería
    setSelectedBookId(undefined);
    setInspectingCell(null);
    setSearchQuery({ q: "" });
    setSearchResults([]);

    // 2. Activar iluminación física del libro localizado (baliza visual animada)
    setHighlightedBookId(targetBook.id);

    // 3. Conmutar a la habitación del mueble si es necesario
    const rooms = catalog.rooms && catalog.rooms.length > 0 ? catalog.rooms : [catalog.room];
    const targetShelf = catalog.shelves.find((s) => s.id === targetBook.location.shelfId);
    const roomWithShelf = rooms.find(
      (r) => r.shelfIds?.includes(targetBook.location.shelfId) || targetShelf?.roomId === r.id,
    );
    if (roomWithShelf) {
      setActiveRoomId(roomWithShelf.id);
    }

    // 4. Conmutar a la estantería destino y cambiar a modo estantería
    setActiveShelfId(targetBook.location.shelfId);
    setViewMode("shelf");

    // 5. Desplazar suavemente hasta enfocar el compartimento en el centro de la pantalla
    setTimeout(() => {
      const cellElement = document.getElementById(
        `shelf-cell-${targetBook.location.row}-${targetBook.location.column}`,
      );
      if (cellElement) {
        const prefersReduced =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        cellElement.scrollIntoView({
          behavior: prefersReduced ? "auto" : "smooth",
          block: "center",
          inline: "center",
        });
      }
    }, 150);
  };

  // Selección de resultado de búsqueda ("Ver ubicación")
  const handleSelectHit = (hit: SearchHit) => {
    handleShowBookInShelf(hit.book.id);
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
    if (!canEdit) {
      setIsLoginOpen(true);
      return;
    }
    startTransition(() => {
      const updatedBooks = [...books, newBook];
      setBooks(updatedBooks);
      saveBooksToStorage(updatedBooks);

      const updatedCells = updatedCell
        ? catalog.cells.map((c) => (c.id === updatedCell.id ? updatedCell : c))
        : catalog.cells;
      setCatalog((prev) => ({
        ...prev,
        books: updatedBooks,
        cells: updatedCells,
      }));
      if (updatedCell) {
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

      const updatedCells = updatedCell
        ? catalog.cells.map((c) => (c.id === updatedCell.id ? updatedCell : c))
        : catalog.cells;
      setCatalog((prev) => ({
        ...prev,
        books: updatedBooks,
        cells: updatedCells,
      }));
      if (updatedCell) {
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
      setCatalog((prev) => ({ ...prev, books: updatedBooks }));
      if (selectedBookId === bookId) setSelectedBookId(undefined);
      if (highlightedBookId === bookId) setHighlightedBookId(undefined);
    });
  };

  // Integrar libros confirmados por el usuario desde la digitalización con IA
  const handleConfirmDigitizedBooks = (newBooks: Book[]) => {
    if (!canEdit) {
      setIsLoginOpen(true);
      return;
    }
    startTransition(() => {
      const updatedBooks = [...books, ...newBooks];
      setBooks(updatedBooks);
      saveBooksToStorage(updatedBooks);
      setCatalog((prev) => ({
        ...prev,
        books: updatedBooks,
      }));
      if (newBooks.length > 0) {
        setHighlightedBookId(newBooks[0].id);
      }
    });
  };

  // Reordenar libros dentro de una misma fila de profundidad en un compartimento
  const handleReorderBooksInDepth = (reorderedBooksInDepth: Book[]) => {
    if (!canEdit) {
      setIsLoginOpen(true);
      return;
    }
    startTransition(() => {
      const reorderedMap = new Map(reorderedBooksInDepth.map((b) => [b.id, b]));
      const updatedBooks = books.map((b) => reorderedMap.get(b.id) || b);
      setBooks(updatedBooks);
      saveBooksToStorage(updatedBooks);
      setCatalog((prev) => ({
        ...prev,
        books: updatedBooks,
      }));
    });
  };

  // Iniciar Modo Ráfaga (escaneo continuo con código de barras) para un compartimento y profundidad específicos
  const handleStartBurstScan = (row: number, column: number, depth: number) => {
    if (!canEdit) {
      setIsLoginOpen(true);
      return;
    }
    if (activeShelf) {
      setBurstScanTarget({
        shelfId: activeShelf.id,
        shelfName: activeShelf.name,
        row,
        column,
        depth,
      });
      setIsBurstScannerOpen(true);
      setInspectingCell(null);
    }
  };

  // Guardar en lote los libros leídos en Modo Ráfaga
  const handleBatchAddBooks = (scannedItems: ScannedBookBatchItem[]) => {
    if (!canEdit) {
      setIsLoginOpen(true);
      return;
    }
    if (!burstScanTarget || scannedItems.length === 0) return;

    startTransition(() => {
      const targetBooks = books.filter(
        (b) =>
          b.location.shelfId === burstScanTarget.shelfId &&
          b.location.row === burstScanTarget.row &&
          b.location.column === burstScanTarget.column &&
          b.location.depth === burstScanTarget.depth,
      );
      let nextPos = targetBooks.length + 1;

      const newBooks: Book[] = scannedItems.map((item, idx) => ({
        id: `book-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        title: item.title || `Libro ${item.isbn}`,
        author: item.author || "Autor desconocido",
        isbn: item.isbn,
        year: item.year || new Date().getFullYear(),
        genre: item.genre || "General",
        cover: item.cover,
        location: {
          shelfId: burstScanTarget.shelfId,
          row: burstScanTarget.row,
          column: burstScanTarget.column,
          depth: burstScanTarget.depth,
          position: nextPos++,
        },
      }));

      const updatedBooks = [...books, ...newBooks];
      setBooks(updatedBooks);
      saveBooksToStorage(updatedBooks);

      // Sincronizar profundidad del cubo si se agregaron libros a una profundidad mayor
      const targetCell = catalog.cells.find(
        (c) =>
          c.shelfId === burstScanTarget.shelfId &&
          c.row === burstScanTarget.row &&
          c.column === burstScanTarget.column,
      );
      let updatedCells = catalog.cells;
      if (targetCell && burstScanTarget.depth > targetCell.depthCount) {
        updatedCells = catalog.cells.map((c) =>
          c.id === targetCell.id ? { ...c, depthCount: burstScanTarget.depth } : c,
        );
        saveCellsToStorage(updatedCells);
      }

      setCatalog((prev) => ({
        ...prev,
        cells: updatedCells,
        books: updatedBooks,
      }));
      setIsBurstScannerOpen(false);
      setBurstScanTarget(null);
      if (newBooks.length > 0) {
        setHighlightedBookId(newBooks[0].id);
        setSelectedBookId(newBooks[0].id);
      }
    });
  };

  // Reubicación rápida visual de un libro con selector mini-grid
  const handleQuickRelocateBook = (
    book: Book,
    targetLocation: { shelfId: string; row: number; column: number; depth: number },
  ) => {
    if (!canEdit) {
      setIsLoginOpen(true);
      return;
    }
    startTransition(() => {
      const booksInDestination = books.filter(
        (b) =>
          b.id !== book.id &&
          b.location.shelfId === targetLocation.shelfId &&
          b.location.row === targetLocation.row &&
          b.location.column === targetLocation.column &&
          b.location.depth === targetLocation.depth,
      );
      const nextPosition = booksInDestination.length + 1;

      const updatedBook: Book = {
        ...book,
        location: {
          shelfId: targetLocation.shelfId,
          row: targetLocation.row,
          column: targetLocation.column,
          depth: targetLocation.depth,
          position: nextPosition,
        },
      };

      const updatedBooks = updateBook(updatedBook);
      setBooks(updatedBooks);
      setCatalog((prev) => ({ ...prev, books: updatedBooks }));
      setRelocatingBook(null);
      setSelectedBookId(updatedBook.id);
      setHighlightedBookId(updatedBook.id);
      setActiveShelfId(targetLocation.shelfId);
      setViewMode("shelf");
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

  const highlightedBook = books.find((b) => b.id === highlightedBookId);
  const highlightedBookLocation = highlightedBook && activeShelf
    ? resolveLocation(activeShelf, highlightedBook.location)
    : null;

  // Métricas inmediatas de la estantería y estancia activa (solo compartimentos habilitados)
  const activeShelfEnabledKeys = new Set(
    activeShelfCells.filter((c) => c.enabled).map((c) => `${c.row}-${c.column}`),
  );
  const activeShelfBooks = activeShelf
    ? books.filter(
        (b) =>
          b.location.shelfId === activeShelf.id &&
          activeShelfEnabledKeys.has(`${b.location.row}-${b.location.column}`),
      )
    : [];
  const activeShelfOccupiedCells = activeShelf
    ? new Set(activeShelfBooks.map((b) => `${b.location.row}-${b.location.column}`)).size
    : 0;
  const activeShelfTotalCells = activeShelf ? activeShelf.columns * activeShelf.rows : 0;
  const occupancyPercentage = activeShelfTotalCells > 0
    ? Math.round((activeShelfOccupiedCells / activeShelfTotalCells) * 100)
    : 0;
  const roomBooksCount = books.filter((b) => {
    const isShelfInRoom = displayedShelves.some((s) => s.id === b.location.shelfId);
    if (!isShelfInRoom) return false;
    const targetCell = catalog.cells.find(
      (c) =>
        c.shelfId === b.location.shelfId &&
        c.row === b.location.row &&
        c.column === b.location.column,
    );
    return targetCell ? targetCell.enabled : true;
  }).length;

  return (
    <div className="min-h-screen flex flex-col room-wall-ambient text-slate-100 overflow-x-hidden">
      {/* Cabecera persistente con ubicación física */}
      <AppHeader
        title="Biblioteca Digital"
        currentLocation={activeShelf ? `${activeRoom.name} · ${activeShelf.name}` : activeRoom.name}
        bookCount={books.length}
        onOpenBackup={isAdmin ? () => setIsBackupOpen(true) : undefined}
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
                    : "Haz clic en cualquier compartimento para ver sus libros y filas de profundidad, o busca por título, autor o ISBN."}
              </p>
            </div>

            {/* Métricas clave limpias: Libros, Cubos ocupados, % Ocupación y Botones integrados */}
            {activeShelf && viewMode === "shelf" && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 text-xs">
                {/* Libros */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-850 border border-slate-750 text-slate-200 shadow-sm">
                  <span>📚</span>
                  {activeShelfBooks.length === 0 ? (
                    <span className="text-slate-400">Sin libros</span>
                  ) : (
                    <>
                      <strong className="text-white font-semibold">{activeShelfBooks.length}</strong>
                      <span className="text-slate-400">{activeShelfBooks.length === 1 ? "libro" : "libros"}</span>
                    </>
                  )}
                </div>

                {/* Cubos ocupados */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-850 border border-slate-750 text-slate-200 shadow-sm">
                  <span>🗄️</span>
                  {activeShelfOccupiedCells === 0 ? (
                    <span className="text-slate-400">Todos los huecos libres ({activeShelfTotalCells})</span>
                  ) : (
                    <>
                      <strong className="text-white font-semibold">{activeShelfOccupiedCells}</strong>
                      <span className="text-slate-400">de {activeShelfTotalCells} huecos con libros</span>
                    </>
                  )}
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
                <div className="flex flex-wrap items-center gap-2 ml-auto sm:ml-0 pt-1 sm:pt-0">
                  {canEdit ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setAddLocation(undefined);
                          setIsAddModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 shadow-md shadow-amber-950/40 border border-amber-400/30 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Añadir libro</span>
                      </button>

                      {activeShelf && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              handleStartBurstScan(1, 1, 1);
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-sky-300 hover:text-white bg-slate-800/90 hover:bg-slate-750 border border-sky-500/40 hover:border-sky-400 shadow-md shadow-black/20 transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Escanear múltiples libros seguidos con la cámara y colocarlos en lote"
                          >
                            <span>⚡ Modo Ráfaga</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDigitizeInitialCell(undefined);
                              setIsDigitizeModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-300 hover:text-white bg-slate-800/90 hover:bg-slate-750 border border-amber-500/40 hover:border-amber-400 shadow-md shadow-black/20 transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Digitalizar estantería o compartimento mediante fotografía e IA"
                          >
                            <span>📸 Digitalizar con IA</span>
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsLoginOpen(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-300 hover:text-amber-200 bg-slate-850 hover:bg-slate-800 border border-amber-500/30 hover:border-amber-400/60 shadow-md shadow-black/20 transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Inicia sesión para añadir libros o digitalizar estanterías"
                    >
                      <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>Iniciar sesión para añadir libros</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Buscador de localización espacial con resolución física */}
          <div className="w-full lg:w-[400px] xl:w-[460px] 2xl:w-[500px] shrink-0">
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
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 shadow-md transition-all flex items-center gap-1.5 shrink-0 hover:border-amber-500/40 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Nuevo Mueble</span>
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
                <span>Nuevo Mueble</span>
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
      <footer className="w-full flex flex-col mt-auto z-0">
        <div className="w-full h-4 skirting-board" />
        <div className="w-full parquet-floor shadow-2xl relative px-4 sm:px-8 py-4 sm:py-5 border-t border-black/40">
          <div className="max-w-7xl 2xl:max-w-[1550px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Contenedor principal de la leyenda */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Guía visual de la estantería</span>
                </span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="text-[11px] text-amber-200/70 hidden sm:inline">
                  Significado de los estados y distintivos en cada compartimento
                </span>
              </div>

              {/* Tarjetas explicativas con miniaturas visuales */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                {/* 1. Hueco libre */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/85 border border-slate-750/80 shadow-sm backdrop-blur-sm">
                  <div className="w-5 h-5 rounded-md bg-[#080b12] border border-slate-700/80 flex items-center justify-center shrink-0 shadow-inner" />
                  <div className="leading-tight">
                    <span className="text-xs font-semibold text-slate-200 block">Hueco libre</span>
                    <span className="text-[10px] text-slate-400 block">Listo para colocar libros</span>
                  </div>
                </div>

                {/* 2. Primera fila */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/85 border border-slate-750/80 shadow-sm backdrop-blur-sm">
                  <div className="w-5 h-5 rounded-md bg-[#0e1422] border border-slate-700/80 flex items-end justify-center gap-0.5 pb-0.5 shrink-0 shadow-inner px-0.5">
                    <span className="w-1 h-3.5 bg-blue-500 rounded-t-[1px]" />
                    <span className="w-1 h-4 bg-amber-500 rounded-t-[1px]" />
                    <span className="w-1 h-3 bg-emerald-500 rounded-t-[1px]" />
                  </div>
                  <div className="leading-tight">
                    <span className="text-xs font-semibold text-slate-200 block">Primera fila</span>
                    <span className="text-[10px] text-slate-400 block">Libros visibles al frente</span>
                  </div>
                </div>

                {/* 3. Fila al fondo (+N) */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/85 border border-amber-500/30 shadow-sm backdrop-blur-sm">
                  <span className="text-[9px] font-bold text-amber-300 bg-amber-950/90 border border-amber-600/70 px-1 py-0.5 rounded shadow-sm shrink-0 font-mono">
                    +2
                  </span>
                  <div className="leading-tight">
                    <span className="text-xs font-semibold text-amber-300 block">Fila del fondo (+N)</span>
                    <span className="text-[10px] text-slate-400 block">Libros colocados detrás</span>
                  </div>
                </div>

                {/* 4. Localizado por búsqueda */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/85 border border-amber-400/50 shadow-sm shadow-amber-950/30 backdrop-blur-sm">
                  <div className="w-5 h-5 rounded-md bg-amber-950/50 border border-amber-400 ring-1 ring-amber-400/80 flex items-center justify-center shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  </div>
                  <div className="leading-tight">
                    <span className="text-xs font-semibold text-amber-200 block">Localizado</span>
                    <span className="text-[10px] text-slate-400 block">Resaltado por búsqueda</span>
                  </div>
                </div>

                {/* 5. Bloqueado / No disponible */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/85 border border-slate-750/80 shadow-sm backdrop-blur-sm">
                  <div className="w-5 h-5 rounded-md bg-[#0a0f1d] pattern-disabled border border-slate-800 flex items-center justify-center shrink-0 text-slate-500">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="leading-tight">
                    <span className="text-xs font-semibold text-slate-400 block">Bloqueado</span>
                    <span className="text-[10px] text-slate-500 block">Decoración o sin uso</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones de administración en el pie */}
            {isAdmin && books.length > 0 && (
              <div className="flex items-center self-start lg:self-center shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-amber-950/40">
                <button
                  type="button"
                  onClick={handleClearBooks}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-red-300 hover:text-white bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 transition-all cursor-pointer shadow-sm"
                  title="Eliminar todos los libros del catálogo actual"
                >
                  Vaciar todos los libros
                </button>
              </div>
            )}
          </div>
        </div>
      </footer>

      {/* Banner / HUD flotante de localización física */}
      {highlightedBook && highlightedBookLocation && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[calc(100%-2rem)] bg-slate-900/95 border border-amber-500/40 rounded-2xl p-3 sm:p-3.5 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 text-slate-100 animate-in fade-in slide-in-from-bottom-3 duration-300"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400 shadow-inner">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-amber-300 truncate">
                Localizando: <span className="text-slate-100">{highlightedBook.title}</span>
              </p>
              <p className="text-[11px] sm:text-xs text-slate-300 truncate">
                {activeRoom.name} · {highlightedBookLocation.phrase}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const targetCell = catalog.cells.find(
                  (c) =>
                    c.shelfId === highlightedBook.location.shelfId &&
                    c.row === highlightedBook.location.row &&
                    c.column === highlightedBook.location.column,
                );
                if (targetCell) setInspectingCell(targetCell);
              }}
              className="px-2 sm:px-2.5 py-1 text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg border border-amber-500/30 transition-colors"
              title="Abrir vista en profundidad del compartimento"
            >
              Profundidad
            </button>
            <button
              type="button"
              onClick={() => setSelectedBookId(highlightedBook.id)}
              className="px-2 sm:px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
            >
              Ficha
            </button>
            <button
              type="button"
              onClick={() => setHighlightedBookId(undefined)}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Cerrar localizador"
              aria-label="Cerrar localizador"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </aside>
      )}

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
          if (!canEdit) {
            setIsLoginOpen(true);
            return;
          }
          setAddLocation({ row, column, depth });
          setIsAddModalOpen(true);
        }}
        onDigitizeCell={(row, column, depth) => {
          if (!canEdit) {
            setIsLoginOpen(true);
            return;
          }
          setDigitizeInitialCell({ row, column, depth });
          setIsDigitizeModalOpen(true);
          setInspectingCell(null);
        }}
        onStartContinuousScan={canEdit ? handleStartBurstScan : undefined}
        onRelocateBook={
          canEdit
            ? (b) => {
                setInspectingCell(null);
                setRelocatingBook(b);
              }
            : undefined
        }
        onUpdateDepthCount={isAdmin ? handleUpdateCellDepthCount : undefined}
        onToggleCellEnabled={isAdmin ? handleToggleCellEnabled : undefined}
        onReorderBooks={canEdit ? handleReorderBooksInDepth : undefined}
      />

      {/* Ficha detallada del libro seleccionado */}
      {selectedBook && selectedBookLocation && (
        <BookDetail
          book={selectedBook}
          location={selectedBookLocation}
          onClose={() => setSelectedBookId(undefined)}
          onShowInShelf={() => handleShowBookInShelf(selectedBook.id)}
          onRelocateBook={
            canEdit
              ? (b) => {
                  setSelectedBookId(undefined);
                  setRelocatingBook(b);
                }
              : undefined
          }
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
      {isAddModalOpen && activeShelf && canEdit && (
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

      {/* Modal para digitalización de estantería o cubo con IA */}
      {isDigitizeModalOpen && activeShelf && canEdit && (
        <ShelfDigitizationModal
          isOpen={isDigitizeModalOpen}
          onClose={() => setIsDigitizeModalOpen(false)}
          shelf={activeShelf}
          cells={catalog.cells}
          existingBooks={books}
          initialCell={digitizeInitialCell}
          onConfirmBooks={handleConfirmDigitizedBooks}
        />
      )}

      {/* Modal de Reubicación Rápida con mini-grid visual */}
      <QuickRelocateModal
        isOpen={Boolean(relocatingBook && canEdit)}
        book={relocatingBook}
        shelves={catalog.shelves}
        cells={catalog.cells}
        existingBooks={books}
        onClose={() => setRelocatingBook(null)}
        onConfirmRelocate={handleQuickRelocateBook}
      />

      {/* Modal de Escaneo Continuo por Código de Barras (Modo Ráfaga) */}
      <BarcodeScannerModal
        isOpen={isBurstScannerOpen && Boolean(burstScanTarget) && canEdit}
        mode="continuous"
        onClose={() => {
          setIsBurstScannerOpen(false);
          setBurstScanTarget(null);
        }}
        onBatchConfirm={handleBatchAddBooks}
        batchTargetInfo={
          burstScanTarget
            ? {
                shelfName: burstScanTarget.shelfName,
                row: burstScanTarget.row,
                column: burstScanTarget.column,
                depth: burstScanTarget.depth,
              }
            : undefined
        }
      />

      {/* Modal de Copias de Seguridad (Exportar JSON / CSV y Restaurar) - Solo Admin */}
      {isAdmin && (
        <BackupModal
          isOpen={isBackupOpen && isAdmin}
          onClose={() => setIsBackupOpen(false)}
          catalog={catalog}
          rooms={catalog.rooms && catalog.rooms.length > 0 ? catalog.rooms : [catalog.room]}
          onBackupRestored={(restored) => {
            setCatalog(restored);
            setBooks(restored.books);
            if (restored.rooms && restored.rooms.length > 0) {
              setActiveRoomId(restored.rooms[0].id);
            }
            if (restored.shelves.length > 0) {
              setActiveShelfId(restored.shelves[0].id);
            }
          }}
        />
      )}

      {/* Modal de inicio de sesión cuando se requiera autenticación */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
}
