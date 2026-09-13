import type { Book, SearchHit, SearchQuery } from "@/lib/types";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** Misma regla para el localizador y para /books. No inventa coincidencias. */
export function searchBooks(books: Book[], query: SearchQuery): SearchHit[] {
  const needle = normalize(query.q);
  if (!needle) return [];

  return books
    .filter((book) => {
      const isbn = normalize(book.isbn).replace(/[-\s]/g, "");
      const needleIsbn = needle.replace(/[-\s]/g, "");
      return (
        normalize(book.title).includes(needle) ||
        normalize(book.author).includes(needle) ||
        isbn.includes(needleIsbn)
      );
    })
    .map((book) => ({ book, location: book.location }));
}
