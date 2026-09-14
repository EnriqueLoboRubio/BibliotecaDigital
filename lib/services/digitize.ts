import type {
  CandidateConfidence,
  DetectedObjectType,
  DigitizationCandidate,
  DigitizeCubeRequest,
  DigitizeCubeResponse,
  DigitizeShelfRequest,
  DigitizeShelfResponse,
  SuggestedBookData,
} from "@/lib/types/digitize";

interface GeminiDetectionItem {
  horizontal_order: number;
  row?: number;
  column?: number;
  object_type?: "book" | "box" | "decoration" | "empty";
  spine_text?: string;
  detected_title?: string;
  detected_author?: string;
  approx_year?: number;
  bounding_box?: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  };
  confidence: "high" | "medium" | "low";
}

/**
 * Consulta la API de Google Books para reconciliar el texto de lomo con metadatos oficiales en español.
 */
export async function searchGoogleBooks(
  query: string,
): Promise<SuggestedBookData | null> {
  const cleanQuery = query.replace(/[^\w\s\u00C0-\u017F]/gi, " ").trim();
  if (!cleanQuery || cleanQuery.length < 3) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(cleanQuery)}&maxResults=1&langRestrict=es`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items) && data.items.length > 0) {
        const item = data.items[0]?.volumeInfo;
        if (item?.title) {
          const isbnObj = item.industryIdentifiers?.find(
            (id: { type: string; identifier: string }) =>
              id.type === "ISBN_13" || id.type === "ISBN_10",
          );
          const rawYear = item.publishedDate ? parseInt(item.publishedDate.slice(0, 4), 10) : undefined;
          const cover = item.imageLinks?.thumbnail
            ? item.imageLinks.thumbnail.replace("http://", "https://")
            : undefined;

          return {
            title: item.title,
            author: Array.isArray(item.authors) ? item.authors.join(", ") : "Autor desconocido",
            isbn: isbnObj?.identifier,
            year: isNaN(rawYear as number) ? undefined : rawYear,
            genre: Array.isArray(item.categories) ? item.categories[0] : undefined,
            cover,
            publisher: item.publisher,
          };
        }
      }
    }
  } catch (err) {
    console.warn("[Digitize Search] Error consultando Google Books:", err);
  }

  return null;
}

/**
 * Consulta la API de búsqueda de Open Library para conciliar texto de lomo con metadatos y portadas.
 */
export async function searchOpenLibrary(
  query: string,
): Promise<SuggestedBookData | null> {
  const cleanQuery = query.replace(/[^\w\s\u00C0-\u017F]/gi, " ").trim();
  if (!cleanQuery || cleanQuery.length < 3) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(cleanQuery)}&limit=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.docs) && data.docs.length > 0) {
        const doc = data.docs[0];
        const title = doc.title;
        const author = Array.isArray(doc.author_name)
          ? doc.author_name.join(", ")
          : "Autor desconocido";
        const isbn = Array.isArray(doc.isbn) ? doc.isbn[0] : undefined;
        const year =
          doc.first_publish_year ||
          (Array.isArray(doc.publish_year) ? doc.publish_year[0] : undefined);
        const coverId = doc.cover_i;
        const cover = coverId
          ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
          : isbn
            ? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`
            : undefined;
        const genre = Array.isArray(doc.subject)
          ? doc.subject.slice(0, 2).join(", ")
          : undefined;

        return {
          title,
          author,
          isbn,
          year,
          genre,
          cover,
        };
      }
    }
  } catch (err) {
    console.warn("[Digitize Search] Error conciliando con Open Library:", err);
  }

  return null;
}

/**
 * Reconciliación bibliográfica con estrategia de cascada (Google Books -> Open Library).
 */
export async function resolveBookMetadata(
  query: string,
): Promise<SuggestedBookData | null> {
  const gb = await searchGoogleBooks(query);
  if (gb && gb.title) return gb;
  return searchOpenLibrary(query);
}

/**
 * Invocación a modelo de visión multimodal (Gemini 2.5 Flash / 1.5 Flash).
 */
async function callGeminiVision(
  imageBase64: string,
  mode: "full-shelf" | "single-cube",
  gridDimensions: { rows: number; columns: number },
  apiKey: string,
): Promise<GeminiDetectionItem[]> {
  const pureBase64 = imageBase64.includes("base64,")
    ? imageBase64.split("base64,")[1]
    : imageBase64;

  const mimeType = imageBase64.startsWith("data:image/png")
    ? "image/png"
    : imageBase64.startsWith("data:image/webp")
      ? "image/webp"
      : "image/jpeg";

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const fullShelfPrompt = `Eres un sistema experto en visión por computador y digitalización de bibliotecas físicas.
Analiza con rigor esta fotografía de una estantería física tipo cuadrícula (mueble con ${gridDimensions.rows} filas y ${gridDimensions.columns} columnas).

OBJETIVO:
1. Detecta todos los libros individuales colocados físicamente en los compartimentos.
2. IMPORTANTE: Separa y descarta otros objetos no-libro (plantas, figuras decorativas, altavoces, cajas de almacenamiento tipo IKEA Dröna o huecos vacíos).
3. Para cada libro, identifica en qué compartimento (fila de 1 a ${gridDimensions.rows}, columna de 1 a ${gridDimensions.columns}) se encuentra físicamente. Fila 1 es la superior; Columna 1 es la de la izquierda.
4. Para cada libro, lee el texto del lomo (frecuentemente vertical) e infiere título, autor y año aproximado.
5. Ordena los libros horizontalmente de izquierda a derecha (horizontal_order).
6. Genera la caja delimitadora normalizada (0 a 1000) { ymin, xmin, ymax, xmax } para cada libro.

Devuelve EXCLUSIVAMENTE un JSON con esta estructura exacta:
{
  "detections": [
    {
      "object_type": "book",
      "row": 1,
      "column": 1,
      "horizontal_order": 1,
      "spine_text": "BORGES EL ALEPH",
      "detected_title": "El Aleph",
      "detected_author": "Jorge Luis Borges",
      "approx_year": 1949,
      "confidence": "high",
      "bounding_box": { "ymin": 150, "xmin": 80, "ymax": 380, "xmax": 120 }
    },
    {
      "object_type": "decoration",
      "row": 2,
      "column": 3,
      "horizontal_order": 1,
      "spine_text": "",
      "detected_title": "Planta decorativa",
      "detected_author": "",
      "confidence": "high",
      "bounding_box": { "ymin": 420, "xmin": 550, "ymax": 620, "xmax": 720 }
    }
  ]
}`;

  const singleCubePrompt = `Eres un sistema experto en digitalización de bibliotecas físicas.
Analiza con precisión esta fotografía de un único compartimento de estantería de libros.
Detecta cada libro individual colocado físicamente en la balda, ordenados estrictamente de IZQUIERDA A DERECHA.
Separa y excluye objetos que no sean libros (figuras, adornos).

Para cada libro:
1. horizontal_order: orden numérico secuencial (1 para el más a la izquierda, 2 para el siguiente, etc.)
2. spine_text: texto literal visible en el lomo (vertical u horizontal).
3. detected_title: título identificado o inferido del libro.
4. detected_author: nombre del autor o autores identificados.
5. approx_year: año aproximado de publicación si se deduce.
6. bounding_box: coordenadas normalizadas 0-1000 { ymin, xmin, ymax, xmax }.
7. confidence: grado de certeza ("high" si es legible, "medium" si es inferido parcialmente, "low" si es dudoso).

Devuelve exclusivamente un JSON:
{
  "detections": [
    {
      "object_type": "book",
      "horizontal_order": 1,
      "spine_text": "...",
      "detected_title": "...",
      "detected_author": "...",
      "approx_year": 1980,
      "confidence": "high",
      "bounding_box": { "ymin": 150, "xmin": 50, "ymax": 920, "xmax": 120 }
    }
  ]
}`;

  const prompt = mode === "full-shelf" ? fullShelfPrompt : singleCubePrompt;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: pureBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      response_mime_type: "application/json",
      temperature: 0.1,
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error en API de Gemini (${response.status}): ${errorBody}`);
  }

  const result = await response.json();
  const textContent = result?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const parsed = JSON.parse(textContent);

  if (Array.isArray(parsed?.detections)) {
    return parsed.detections as GeminiDetectionItem[];
  }
  if (Array.isArray(parsed?.books)) {
    return parsed.books as GeminiDetectionItem[];
  }
  return [];
}

/**
 * Genera candidatos de muestra realistas para modo de desarrollo o demostración sin API key.
 */
function getSimulatedShelfCandidates(
  req: DigitizeShelfRequest,
): DigitizationCandidate[] {
  const isSingleCube = req.mode === "single-cube" && req.targetCell;
  const targetRow = isSingleCube ? req.targetCell!.row : 1;
  const targetCol = isSingleCube ? req.targetCell!.column : 1;
  const targetDepth = isSingleCube ? req.targetCell!.depth : 1;

  const sampleLibrary = [
    {
      title: "El Aleph",
      author: "Jorge Luis Borges",
      year: 1949,
      genre: "Ficción",
      confidence: "high" as const,
      rawText: "BORGES EL ALEPH",
      isbn: "978-8420633121",
      cover: "https://covers.openlibrary.org/b/isbn/9788420633121-M.jpg",
      row: targetRow,
      column: targetCol,
    },
    {
      title: "Rayuela",
      author: "Julio Cortázar",
      year: 1963,
      genre: "Novela",
      confidence: "high" as const,
      rawText: "JULIO CORTAZAR RAYUELA ALFAGUARA",
      isbn: "978-8466331821",
      cover: "https://covers.openlibrary.org/b/isbn/9788466331821-M.jpg",
      row: targetRow,
      column: targetCol,
    },
    {
      title: "Cien años de soledad",
      author: "Gabriel García Márquez",
      year: 1967,
      genre: "Realismo Mágico",
      confidence: "high" as const,
      rawText: "GARCIA MARQUEZ CIEN ANOS DE SOLEDAD",
      isbn: "978-8439728368",
      cover: "https://covers.openlibrary.org/b/isbn/9788439728368-M.jpg",
      row: isSingleCube ? targetRow : (req.gridDimensions.rows >= 2 ? 2 : targetRow),
      column: isSingleCube ? targetCol : (req.gridDimensions.columns >= 2 ? 2 : targetCol),
    },
    {
      title: "Pedro Páramo",
      author: "Juan Rulfo",
      year: 1955,
      genre: "Ficción",
      confidence: "high" as const,
      rawText: "JUAN RULFO PEDRO PARAMO",
      isbn: "978-8437604183",
      cover: "https://covers.openlibrary.org/b/isbn/9788437604183-M.jpg",
      row: isSingleCube ? targetRow : (req.gridDimensions.rows >= 2 ? 2 : targetRow),
      column: isSingleCube ? targetCol : (req.gridDimensions.columns >= 2 ? 2 : targetCol),
    },
    {
      title: "Ficciones",
      author: "Jorge Luis Borges",
      year: 1944,
      genre: "Cuentos",
      confidence: "medium" as const,
      rawText: "BORGES FICCIONES SUR",
      isbn: "978-8420658797",
      cover: "https://covers.openlibrary.org/b/isbn/9788420658797-M.jpg",
      row: isSingleCube ? targetRow : 1,
      column: isSingleCube ? targetCol : (req.gridDimensions.columns >= 2 ? 2 : 1),
    },
  ];

  // Agrupar por celda y asignar posición correlativa respetando libros existentes
  const result: DigitizationCandidate[] = [];
  const groupPositions = new Map<string, number>();

  // Contabilizar libros existentes por celda
  if (Array.isArray(req.existingBooks)) {
    for (const eb of req.existingBooks) {
      if (eb.shelfId === req.shelfId) {
        const key = `${eb.row}-${eb.column}-${eb.depth}`;
        const curr = groupPositions.get(key) || 0;
        if (eb.position > curr) {
          groupPositions.set(key, eb.position);
        }
      }
    }
  }

  sampleLibrary.forEach((book, idx) => {
    const r = book.row;
    const c = book.column;
    const depth = targetDepth;
    const key = `${r}-${c}-${depth}`;
    const nextPos = (groupPositions.get(key) || 0) + 1;
    groupPositions.set(key, nextPos);

    const xBase = (idx * 0.18 + 0.08) % 0.8;
    result.push({
      tempId: `candidate-sim-${Date.now()}-${idx}`,
      shelfId: req.shelfId,
      row: r,
      column: c,
      depth,
      position: nextPos,
      boundingBox: {
        x: Math.round(xBase * 100) / 100,
        y: 0.2,
        width: 0.12,
        height: 0.65,
      },
      ocrRawText: book.rawText,
      confidence: book.confidence,
      objectType: "book",
      suggestedBook: {
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        year: book.year,
        genre: book.genre,
        cover: book.cover,
      },
      confirmed: false,
    });
  });

  return result;
}

/**
 * Función central de digitalización de estantería.
 * Soporta estantería completa y cubos individuales, separación de objetos y reconciliación bibliográfica.
 */
export async function digitizeShelfSpines(
  req: DigitizeShelfRequest,
): Promise<DigitizeShelfResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const simulated = getSimulatedShelfCandidates(req);
    return {
      success: true,
      candidates: simulated,
      source: "fallback-simulation",
      totalDetected: simulated.length,
      objectsFiltered: 2,
      message:
        "Digitalización en modo demostración. Configura GEMINI_API_KEY en .env.local para activar el reconocimiento visual con IA en tiempo real.",
    };
  }

  try {
    const rawDetections = await callGeminiVision(
      req.imageBase64,
      req.mode,
      req.gridDimensions,
      apiKey,
    );

    // Separar objetos que no sean libros (figuras, cajas, plantas)
    const bookDetections = rawDetections.filter(
      (d) => !d.object_type || d.object_type === "book",
    );
    const objectsFiltered = rawDetections.length - bookDetections.length;

    // Obtener conjunto de celdas válidas (activas)
    const validCells = new Set(
      req.enabledCells.map((c) => `${c.row}-${c.column}`),
    );

    // Calcular mapa de posiciones existentes
    const cellPositions = new Map<string, number>();
    if (Array.isArray(req.existingBooks)) {
      for (const eb of req.existingBooks) {
        if (eb.shelfId === req.shelfId) {
          const key = `${eb.row}-${eb.column}-${eb.depth}`;
          const curr = cellPositions.get(key) || 0;
          if (eb.position > curr) {
            cellPositions.set(key, eb.position);
          }
        }
      }
    }

    // Ordenar de izquierda a derecha
    const sorted = [...bookDetections].sort((a, b) => {
      const aX = a.bounding_box?.xmin ?? a.horizontal_order;
      const bX = b.bounding_box?.xmin ?? b.horizontal_order;
      return aX - bX;
    });

    const isSingleCube = req.mode === "single-cube" && req.targetCell;

    // Enriquecer candidatos en paralelo
    const candidates: DigitizationCandidate[] = await Promise.all(
      sorted.map(async (item, idx) => {
        let r = isSingleCube ? req.targetCell!.row : (item.row || 1);
        let c = isSingleCube ? req.targetCell!.column : (item.column || 1);
        const depth = isSingleCube ? req.targetCell!.depth : 1;

        // Limitar dentro del rango del mueble
        r = Math.max(1, Math.min(req.gridDimensions.rows, r));
        c = Math.max(1, Math.min(req.gridDimensions.columns, c));

        // Si la celda detectada está bloqueada, buscar la primera celda activa
        if (!validCells.has(`${r}-${c}`) && req.enabledCells.length > 0) {
          r = req.enabledCells[0].row;
          c = req.enabledCells[0].column;
        }

        const cellKey = `${r}-${c}-${depth}`;
        const nextPos = (cellPositions.get(cellKey) || 0) + 1;
        cellPositions.set(cellKey, nextPos);

        const queryTerm = item.detected_title
          ? `${item.detected_title} ${item.detected_author || ""}`
          : item.spine_text || "";

        const enriched = await resolveBookMetadata(queryTerm);

        const bbox = item.bounding_box
          ? {
              x: item.bounding_box.xmin / 1000,
              y: item.bounding_box.ymin / 1000,
              width: (item.bounding_box.xmax - item.bounding_box.xmin) / 1000,
              height: (item.bounding_box.ymax - item.bounding_box.ymin) / 1000,
            }
          : undefined;

        return {
          tempId: `candidate-${Date.now()}-${idx}`,
          shelfId: req.shelfId,
          row: r,
          column: c,
          depth,
          position: nextPos,
          boundingBox: bbox,
          ocrRawText: item.spine_text || queryTerm,
          confidence: (item.confidence || "medium") as CandidateConfidence,
          objectType: (item.object_type || "book") as DetectedObjectType,
          suggestedBook: {
            title: enriched?.title || item.detected_title || "Libro sin identificar",
            author: enriched?.author || item.detected_author || "Autor desconocido",
            isbn: enriched?.isbn,
            year: enriched?.year || item.approx_year,
            genre: enriched?.genre || "General",
            cover: enriched?.cover,
            publisher: enriched?.publisher,
          },
          confirmed: false,
        };
      }),
    );

    return {
      success: true,
      candidates,
      source: "gemini-vision",
      totalDetected: candidates.length,
      objectsFiltered,
    };
  } catch (err) {
    console.error("[Digitize Shelf] Error en análisis multimodal:", err);
    const fallback = getSimulatedShelfCandidates(req);
    return {
      success: true,
      candidates: fallback,
      source: "fallback-simulation",
      totalDetected: fallback.length,
      message: `No se pudo conectar con el servicio de visión en la nube (${err instanceof Error ? err.message : "Error desconocido"}). Se cargaron candidatos de prueba para revisión.`,
    };
  }
}

/**
 * Mantiene compatibilidad con la ruta anterior de cubo individual
 */
export async function digitizeCubeSpines(
  req: DigitizeCubeRequest,
): Promise<DigitizeCubeResponse> {
  const shelfReq: DigitizeShelfRequest = {
    imageBase64: req.imageBase64,
    mode: "single-cube",
    shelfId: req.shelfId,
    gridDimensions: { rows: 4, columns: 4 },
    enabledCells: [{ shelfId: req.shelfId, row: req.row, column: req.column, depthCount: 2 }],
    targetCell: {
      row: req.row,
      column: req.column,
      depth: req.depth,
    },
    existingBooks: [
      {
        shelfId: req.shelfId,
        row: req.row,
        column: req.column,
        depth: req.depth,
        position: req.existingCount || 0,
      },
    ],
  };

  const res = await digitizeShelfSpines(shelfReq);
  return {
    success: res.success,
    candidates: res.candidates,
    source: res.source === "gemini-vision" ? "gemini-vision" : "fallback-simulation",
    totalDetected: res.totalDetected,
    message: res.message,
  };
}
