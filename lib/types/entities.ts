import type { BookLocation } from "./location";

export interface Room {
  id: string;
  name: string;
  shelfIds: string[];
}

export interface Shelf {
  id: string;
  name: string;
  /** Orden en la habitación, 1-based. */
  position: number;
  columns: number;
  rows: number;
}

/** Un cubo del mueble. Sustituye a ShelfRow. */
export interface ShelfCell {
  id: string;
  shelfId: string;
  /** Fila del cubo; 1 = arriba. */
  row: number;
  /** Columna del cubo; 1 = izquierda. */
  column: number;
  enabled: boolean;
  /** Filas de profundidad posibles; ≥ 1. */
  depthCount: number;
  photo?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  year: number;
  genre: string;
  cover?: string;
  location: BookLocation;
}

export type UserRole = "admin" | "editor";

export interface AppUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
}

export interface AuthSession {
  user: Omit<AppUser, "passwordHash">;
  token: string;
}
