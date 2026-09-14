import type {
  DigitizationCandidate,
  DigitizeCubeRequest,
  DigitizeCubeResponse,
  SuggestedBookData,
} from "@/lib/types/digitize";

interface GeminiSpineItem {
  horizontal_order: number;
  spine_text: string;
  detected_title: string;
  detected_author: string;
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
 * Consulta la API de búsqueda de Open Library para conciliar texto de lomo con metadatos oficiales.
 */
export async function searchOpenLibraryBySpineText(
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
 * Analiza la fotografía del cubo usando el modelo multimodal Gemini 2.5 Flash / 1.5 Flash.
 */
async function callGeminiVision(
  imageBase64: string,
  apiKey: string,
): Promise<GeminiSpineItem[]> {
  // Limpiar el encabezado data:image/...;base64, si viene incluido
  const pureBase64 = imageBase64.includes("base64,")
    ? imageBase64.split("base64,")[1]
    : imageBase64;

  const mimeType = imageBase64.startsWith("data:image/png")
    ? "image/png"
    : imageBase64.startsWith("data:image/webp")
      ? "image/webp"
      : "image/jpeg";

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const prompt = `Eres un sistema experto en digitalización de bibliotecas físicas.
Analiza con precisión esta fotografía de un compartimento de estantería de libros (vistos de frente o sus lomos).
Detecta cada libro individual colocado físicamente en la balda, ordenados estrictamente de IZQUIERDA A DERECHA.

Para cada libro:
1. horizontal_order: orden numérico secuencial (1 para el más a la izquierda, 2 para el siguiente, etc.)
2. spine_text: texto literal visible en el lomo (incluyendo autor, título o editorial aunque esté en vertical).
3. detected_title: título identificado o inferido del libro (en español o su idioma original).
4. detected_author: nombre del autor o autores identificados.
5. approx_year: año aproximado de publicación si se deduce o conoce (número entero).
6. bounding_box: coordenadas normalizadas 0-1000 del lomo { ymin, xmin, ymax, xmax }.
7. confidence: grado de certeza ("high" si el título es legible, "medium" si es inferido parcialmente, "low" si es dudoso).

Devuelve exclusivamente un JSON con la estructura:
{
  "books": [
    {
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
  const textContent =
    result?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const parsed = JSON.parse(textContent);

  if (Array.isArray(parsed?.books)) {
    return parsed.books as GeminiSpineItem[];
  }
  return [];
}

/**
 * Modo de simulación / demostración cuando no hay clave de API configurada.
 */
function getSimulatedCandidates(
  startPosition: number,
): DigitizationCandidate[] {
  const sampleDetections = [
    {
      title: "El Aleph",
      author: "Jorge Luis Borges",
      year: 1949,
      genre: "Ficción",
      confidence: "high" as const,
      rawText: "JORGE LUIS BORGES - EL ALEPH",
      isbn: "978-8420633121",
    },
    {
      title: "Rayuela",
      author: "Julio Cortázar",
      year: 1963,
      genre: "Novela",
      confidence: "high" as const,
      rawText: "JULIO CORTAZAR RAYUELA ALFAGUARA",
      isbn: "978-8466331821",
    },
    {
      title: "Pedro Páramo",
      author: "Juan Rulfo",
      year: 1955,
      genre: "Realismo Mágico",
      confidence: "high" as const,
      rawText: "JUAN RULFO PEDRO PARAMO",
      isbn: "978-8437604183",
    },
    {
      title: "Libro pendiente de identificar",
      author: "Autor desconocido",
      year: undefined,
      genre: "General",
      confidence: "unrecognized" as const,
      rawText: "LOMO DETERIORADO / NO LEGIBLE",
      isbn: undefined,
    },
  ];

  return sampleDetections.map((item, idx) => {
    const pos = startPosition + idx;
    const xStep = 1 / (sampleDetections.length + 1);
    const x = (idx + 0.5) * xStep;

    return {
      tempId: `candidate-sim-${Date.now()}-${idx}`,
      position: pos,
      boundingBox: {
        x: Math.round(x * 100) / 100,
        y: 0.15,
        width: Math.round(xStep * 0.8 * 100) / 100,
        height: 0.75,
      },
      ocrRawText: item.rawText,
      confidence: item.confidence,
      suggestedBook: {
        title: item.title,
        author: item.author,
        isbn: item.isbn,
        year: item.year,
        genre: item.genre,
        cover: item.isbn
          ? `https://covers.openlibrary.org/b/isbn/${item.isbn}-M.jpg`
          : undefined,
      },
      confirmed: false,
    };
  });
}

/**
 * Función principal que procesa la fotografía del cubo, orquesta la visión
 * y reconcilia los libros con Open Library.
 */
export async function digitizeCubeSpines(
  req: DigitizeCubeRequest,
): Promise<DigitizeCubeResponse> {
  const startPos = (req.existingCount ?? 0) + 1;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Si no hay API key de Gemini configurada, usamos la simulación enriquecida
    const simulated = getSimulatedCandidates(startPos);
    return {
      success: true,
      candidates: simulated,
      source: "fallback-simulation",
      totalDetected: simulated.length,
      message:
        "Digitalización ejecutada en modo demostración. Configura GEMINI_API_KEY en .env.local para activar el reconocimiento visual con IA en tiempo real.",
    };
  }

  try {
    const rawSpines = await callGeminiVision(req.imageBase64, apiKey);

    // Ordenar de izquierda a derecha por coordenada xmin o horizontal_order
    const sortedSpines = [...rawSpines].sort((a, b) => {
      const aX = a.bounding_box?.xmin ?? a.horizontal_order;
      const bX = b.bounding_box?.xmin ?? b.horizontal_order;
      return aX - bX;
    });

    // Enriquecer candidatos en paralelo contra Open Library
    const candidates: DigitizationCandidate[] = await Promise.all(
      sortedSpines.map(async (spine, index) => {
        const position = startPos + index;
        const ocrText = spine.spine_text || `${spine.detected_title} ${spine.detected_author}`;

        // Intentar reconciliar con Open Library para obtener portada e ISBN canónicos
        const enriched = await searchOpenLibraryBySpineText(
          `${spine.detected_title} ${spine.detected_author}`,
        );

        const bbox = spine.bounding_box
          ? {
              x: spine.bounding_box.xmin / 1000,
              y: spine.bounding_box.ymin / 1000,
              width: (spine.bounding_box.xmax - spine.bounding_box.xmin) / 1000,
              height: (spine.bounding_box.ymax - spine.bounding_box.ymin) / 1000,
            }
          : undefined;

        return {
          tempId: `candidate-${Date.now()}-${index}`,
          position,
          boundingBox: bbox,
          ocrRawText: ocrText,
          confidence: spine.confidence,
          suggestedBook: {
            title: enriched?.title || spine.detected_title || "Libro sin identificar",
            author: enriched?.author || spine.detected_author || "Autor desconocido",
            isbn: enriched?.isbn,
            year: enriched?.year || spine.approx_year,
            genre: enriched?.genre || "General",
            cover: enriched?.cover,
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
    };
  } catch (error) {
    console.error("[Digitize Cube] Error analizando con visión:", error);
    // Fallback si falla la llamada
    const fallback = getSimulatedCandidates(startPos);
    return {
      success: true,
      candidates: fallback,
      source: "fallback-simulation",
      totalDetected: fallback.length,
      message: `No se pudo conectar con el servicio de visión (${error instanceof Error ? error.message : "Error desconocido"}). Se cargaron candidatos de muestra para revisión.`,
    };
  }
}
