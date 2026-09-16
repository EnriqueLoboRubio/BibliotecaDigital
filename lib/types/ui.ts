import type { Book, Shelf, ShelfCell } from "./entities";
import type { ResolvedLocation } from "./location";
import type { SearchHit, SearchQuery } from "./search";

export type ShelfDensity = "room" | "detail";

export interface RoomPlanProps {
  shelves: Shelf[];
  cells: ShelfCell[];
  books: Book[];
  highlightedBookId?: string;
  selectedBookId?: string;
  onSelectShelf: (shelfId: string) => void;
}

export interface ShelfUnitProps {
  shelf: Shelf;
  cells: ShelfCell[];
  books: Book[];
  density: ShelfDensity;
  highlightedBookId?: string;
  selectedBookId?: string;
  selectedCellId?: string;
  onSelectShelf?: (shelfId: string) => void;
  onSelectCell?: (cell: ShelfCell) => void;
  onSelectBook?: (bookId: string) => void;
  onRenameShelf?: (shelfId: string, newName: string) => void;
  onToggleCellEnabled?: (cell: ShelfCell, enabled: boolean) => void;
}


export interface ShelfCellProps {
  cell: ShelfCell;
  books: Book[];
  /** Si se omite, la celda en densidad de mueble muestra solo depth 1. */
  depth?: number;
  highlightedBookId?: string;
  selectedBookId?: string;
  selectedCellId?: string;
  isSelected?: boolean;
  isConfigureMode?: boolean;
  onSelectCell?: (cell: ShelfCell) => void;
  onSelectBook?: (bookId: string) => void;
  onToggleCellEnabled?: (cell: ShelfCell, enabled: boolean) => void;
}

export interface BookSpineProps {
  book: Book;
  selected: boolean;
  highlighted: boolean;
  dimmed: boolean;
  locationLabel: string;
  onSelect?: (bookId: string) => void;
}

export interface BookDetailProps {
  book: Book;
  location: ResolvedLocation;
  onClose: () => void;
  onShowInShelf: (bookId: string) => void;
  onEditBook?: (book: Book) => void;
  onRelocateBook?: (book: Book) => void;
}


export interface LocationBreadcrumbProps {
  location: ResolvedLocation;
  onSelectShelf?: (shelfId: string) => void;
  onSelectCell?: (row: number, column: number) => void;
}

export interface SearchBoxProps {
  query: SearchQuery;
  results: SearchHit[];
  isLoading?: boolean;
  resolveLocationInfo?: (hit: SearchHit) => {
    roomName: string;
    shelfName: string;
    row: number;
    column: number;
    depth: number;
    position: number;
  };
  onQueryChange: (query: SearchQuery) => void;
  onSelectHit: (hit: SearchHit) => void;
}

export interface AppHeaderProps {
  title: string;
  currentLocation?: string;
  bookCount?: number;
  onAddBook?: () => void;
  onOpenBackup?: () => void;
}

