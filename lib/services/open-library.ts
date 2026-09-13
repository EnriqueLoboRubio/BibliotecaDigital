/**
 * Servicio de extracción de metadatos de libros mediante la API gratuita de Open Library.
 */

export interface FetchedBookMetadata {
  title: string;
  author: string;
  isbn: string;
  year?: number;
  genre?: string;
  cover?: string;
  publisher?: string;
}

/**
 * Limpia y normaliza un código ISBN o de barras eliminando caracteres no alfanuméricos.
 */
export function cleanISBN(raw: string): string {
  return raw.replace(/[^0-9X]/gi, "").toUpperCase();
}

/**
 * Consulta la API gratuita de Open Library para obtener los metadatos de un libro a partir de su ISBN.
 * Implementa timeout automático y fallback a búsqueda interna de Open Library.
 */
export async function fetchBookByISBN(rawIsbn: string): Promise<FetchedBookMetadata | null> {
  const isbn = cleanISBN(rawIsbn);
  if (!isbn || (isbn.length !== 10 && isbn.length !== 13)) {
    return null;
  }

  // 1. Consultar Open Library Books API (jscmd=data)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const entry = data[`ISBN:${isbn}`];
      if (entry && entry.title) {
        // Extraer autores
        const authors = Array.isArray(entry.authors)
          ? entry.authors.map((a: { name?: string }) => a.name).filter(Boolean).join(", ")
          : "";

        // Extraer año
        let year: number | undefined;
        if (entry.publish_date) {
          const match = String(entry.publish_date).match(/\b(18|19|20)\d{2}\b/);
          if (match) {
            year = parseInt(match[0], 10);
          }
        }

        // Extraer género o tema principal
        let genre: string | undefined;
        if (Array.isArray(entry.subjects) && entry.subjects.length > 0) {
          genre = entry.subjects
            .slice(0, 2)
            .map((s: { name?: string }) => s.name)
            .filter(Boolean)
            .join(", ");
        }

        // Extraer portada
        let cover: string | undefined;
        if (entry.cover?.large) {
          cover = entry.cover.large;
        } else if (entry.cover?.medium) {
          cover = entry.cover.medium;
        } else if (entry.cover?.small) {
          cover = entry.cover.small;
        } else {
          cover = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
        }

        const publisher =
          Array.isArray(entry.publishers) && entry.publishers.length > 0
            ? entry.publishers[0].name
            : undefined;

        return {
          title: entry.title,
          author: authors || "Autor desconocido",
          isbn,
          year: year || new Date().getFullYear(),
          genre: genre || "General",
          cover,
          publisher,
        };
      }
    }
  } catch (err) {
    console.warn("[OpenLibrary] Error al consultar datos:", err);
  }

  // 2. Fallback: Open Library Search API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const searchUrl = `https://openlibrary.org/search.json?isbn=${isbn}&limit=1`;
    const res = await fetch(searchUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.docs) && data.docs.length > 0) {
        const doc = data.docs[0];
        const title = doc.title;
        const author = Array.isArray(doc.author_name)
          ? doc.author_name.join(", ")
          : "Autor desconocido";
        const year =
          doc.first_publish_year ||
          (Array.isArray(doc.publish_year) ? doc.publish_year[0] : undefined);
        const coverId = doc.cover_i;
        const cover = coverId
          ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
          : `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
        const genre = Array.isArray(doc.subject) ? doc.subject.slice(0, 2).join(", ") : undefined;

        return {
          title,
          author,
          isbn,
          year,
          genre: genre || "General",
          cover,
        };
      }
    }
  } catch (err) {
    console.warn("[OpenLibrary Search] Error en fallback:", err);
  }

  return null;
}
