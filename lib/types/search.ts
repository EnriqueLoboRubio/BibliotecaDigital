import type { Book } from "./entities";
import type { BookLocation } from "./location";

export interface SearchQuery {
  q: string;
}

export interface SearchHit {
  book: Book;
  location: BookLocation;
}
