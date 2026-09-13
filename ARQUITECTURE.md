# Arquitectura

Documento de verdad del modelo espacial, las rutas, las capas y los contratos de tipos. El código en `lib/types` debe coincidir con este archivo. Las reglas que los agentes no pueden romper están en `PROTECT.md`.

## Objetivo

Representar una biblioteca física en una habitación: estanterías IKEA tipo Kallax (cuadrícula de cubos), libros en cada cubo y localización visual al buscar.

La interfaz es un mapa espacial, no un catálogo con tablas como vista principal.

## Decisiones cerradas

1. **Habitación → estantería → cubo → profundidad → posición.** Ese es el único eje de localización.
2. **`ShelfRow` se sustituye por `ShelfCell`.** Un cubo del Kallax no es una balda lineal de todo el mueble. El cubo tiene `row`, `column` y `enabled`.
3. **Los cubos no usados son dato, no UI.** `ShelfCell.enabled === false`. No se hardcodea cuáles de los 16 están vacíos.
4. **4×4 no es el tipo del sistema.** Es una instancia (`columns: 4`, `rows: 4`). La habitación real podrá añadir muebles con otras medidas.
5. **Profundidad dentro del cubo.** Varias filas de libros de frente hacia atrás. Campo `depth` en el libro; `depthCount` en el cubo. `depth` 1 = frente. `position` se numera otra vez en cada profundidad (izquierda → derecha).
6. **No existe la entidad `ShelfDepth`.** Agrupar por `(shelfId, row, column, depth)` es un selector.
7. **El libro guarda `location` anidada**, no cinco campos sueltos mezclados con el metadato bibliográfico.
8. **Datos y componentes visuales no se mezclan.** Los componentes no cargan catálogo ni inventan libros.
9. **La búsqueda es un localizador.** No es una página. Enfoca estantería, cubo y lomo. Si el hallazgo tiene `depth > 1`, hay que abrir el cubo.
10. **Home:** si solo hay un `Shelf`, `/` puede mostrar esa estantería a tamaño útil. El plano de habitación aparece cuando hay más de un mueble.
11. **Vista 4×4:** solo lomos de `depth === 1`. Indicador si hay libros detrás. Detalle del cubo: profundidades desplegadas en planta (fondo arriba, frente abajo).
12. **Índices 1-based** en todos los ejes espaciales (`row`, `column`, `depth`, `position`, `Shelf.position`).
13. **Fila 1 del mueble = fila superior. Columna 1 = izquierda.**
14. **Fotos de estantería:** opcionales, por cubo (`photo`), como fondo futuro, no como sustituto de los lomos.
15. **No inventar registros.** Hasta que exista catálogo real o un fichero de datos explícito, no se rellenan estanterías ni libros de ejemplo en el código.

## Entidades

### Room

Contenedor de muebles. Permite crecer a varias estanterías sin cambiar componentes.

| Campo | Tipo | Significado |
| --- | --- | --- |
| `id` | string | Identificador |
| `name` | string | Nombre de la habitación / biblioteca |
| `shelfIds` | string[] | Orden de pintura en el plano |

### Shelf

Un mueble (p. ej. Kallax).

| Campo | Tipo | Significado |
| --- | --- | --- |
| `id` | string | Identificador (`shelf-A`) |
| `name` | string | Nombre visible |
| `position` | number | Orden en la habitación (1-based) |
| `columns` | number | Cubos en horizontal |
| `rows` | number | Cubos en vertical |

### ShelfCell

Un cuadrado del mueble. Sustituye a `ShelfRow`.

| Campo | Tipo | Significado |
| --- | --- | --- |
| `id` | string | Identificador |
| `shelfId` | string | Mueble |
| `row` | number | Fila del cubo (1 = arriba) |
| `column` | number | Columna del cubo (1 = izquierda) |
| `enabled` | boolean | Si admite libros |
| `depthCount` | number | Filas de profundidad posibles (≥ 1) |
| `photo` | string? | Foto futura del cubo real |

Un cubo desactivado se dibuja (el mueble es real) y no admite libros. Si un cubo pasa de útil a desactivado (`enabled: false`), se eliminan en cascada todos los libros que contenga en cualquiera de sus profundidades y posiciones, garantizando la invariante de que ningún libro apunta a un cubo desactivado.

### Book

Metadato bibliográfico + localización. La localización no se calcula en la UI.

| Campo | Tipo | Significado |
| --- | --- | --- |
| `id` | string | Identificador |
| `title` | string | Título |
| `author` | string | Autor |
| `isbn` | string | ISBN |
| `year` | number | Año |
| `genre` | string | Género |
| `cover` | string? | Portada (ficha, no lomo del 4×4) |
| `location` | `BookLocation` | Sitio físico |

### BookLocation

| Campo | Significado | Convención |
| --- | --- | --- |
| `shelfId` | Mueble | Debe existir |
| `row` | Cubo, fila | 1-based, arriba → abajo |
| `column` | Cubo, columna | 1-based, izquierda → derecha |
| `depth` | Fila de profundidad | 1 = frente, 2 = detrás, … ≤ `depthCount` |
| `position` | Orden en esa profundidad | 1-based, izquierda → derecha; **se reinicia en cada `depth`** |

Ejemplo: séptimo libro de la fila de atrás, cubo fila 3 columna 2 de la estantería A:

```
shelf-A / row 3 / column 2 / depth 2 / position 7
```

Frase humana: **Estantería A, cubo 3×2, detrás, posición 7.**

Invariantes:

- El cubo `(shelfId, row, column)` existe.
- `enabled` es `true`.
- `1 ≤ depth ≤ depthCount`.
- `position ≥ 1`.
- No hay dos libros con la misma localización completa.

## Localización en UI

Tres capas, misma información:

1. **Código** — los cinco campos de `BookLocation`.
2. **Frase** — `ResolvedLocation.phrase`.
3. **Migas** — `Estantería` → `Fila` → `Columna` → `Frente|Detrás` → `#posición`.

Etiquetas de profundidad: `1` = Frente, `2` = Detrás, `n > 2` = Fila de profundidad n.

La UI no concatena ids técnicos (`shelf-A`) como texto principal.

## Capas de código

1. **Tipos** — `lib/types`. Única fuente tipada del modelo.
2. **Datos** — `lib/data`. Catálogo. Sin JSX. Sin registros inventados.
3. **Selectores** — `lib/selectors`. Agrupar libros por cubo o profundidad, resolver etiquetas.
4. **Búsqueda** — `lib/search`. Función pura sobre `Book[]`. La misma regla sirve al localizador y a `/books`.
5. **Componentes visuales** — `components/library`. Reciben props ya resueltas.
6. **Componentes de información** — `components/book`, `components/search`, `components/chrome`.
7. **Páginas** — `app`. Solo composición y rutas.

```
Room → Shelf → ShelfCell → (depth 1..n) → Book[]
```

## Rutas

| Ruta | Función |
| --- | --- |
| `/` | Habitación; o la única estantería a tamaño útil |
| `/shelves` | Índice de estanterías (útil cuando hay varias) |
| `/shelves/[id]` | Una estantería (rejilla de cubos) |
| `/books` | Catálogo textual (secundario) |
| `/books/[id]` | Ficha; en escritorio puede ser panel sobre la estantería |

Búsqueda: chrome persistente. Resultado elegido navega a la estantería con `book` (y `q`) en la URL.

## Componentes visuales

| Componente | Responsabilidad | No hace |
| --- | --- | --- |
| `RoomPlan` | Plano de muebles | Buscar, cargar datos |
| `ShelfUnit` | Mueble `columns × rows` | Filtrar, decidir cubos vacíos |
| `ShelfCell` | Un cubo; en detalle, una profundidad | Conocer el resto del mueble |
| `BookSpine` | Lomo | Calcular la ubicación |
| `BookDetail` | Ficha | Pintar la estantería |
| `LocationBreadcrumb` | Migas de localización | Parsear ids a mano si ya hay `ResolvedLocation` |
| `SearchBox` | Localizador | Poseer el catálogo (recibe resultados) |
| `AppHeader` | Chrome: título, búsqueda, catálogo | Lógica de estantería |

Densidad de `ShelfUnit`: `room` (miniatura, clic al mueble) | `detail` (cubos interactivos).

### Estantería 4×4

- CSS Grid según `columns` y `rows`.
- Miniatura / detalle de mueble: solo `depth === 1`.
- Si existe algún libro con `depth > 1` en ese cubo: indicador de fila oculta (recuento real, no inventado).
- Cubo `enabled: false`: mismo marco, interior vacío, sin lomos.

### Detalle de cubo (profundidad)

Profundidades **desplegadas en planta**, no isométrico:

- Arriba: `depth` mayor (fondo).
- Abajo: `depth` 1 (frente).

Cada profundidad es una fila horizontal de lomos. Así no hay oclusión y se puede enfocar un libro de atrás.

### Búsqueda y resaltado

1. Atenuar el resto; no ocultar el contexto.
2. Anillo en el cubo.
3. Si `depth > 1`, abrir el cubo y resaltar el lomo de esa profundidad.
4. Varios hits: anillos secundarios; uno activo con ficha.
5. `prefers-reduced-motion`: sin pan; salto + anillo estático.

### Móvil

- 4×4 compacto (lomos como barras, sin título).
- Tap en cubo → vista desplegada de profundidades.
- Ficha en hoja inferior.
- Búsqueda sticky arriba; Habitación / Catálogo abajo.

## Estructura de carpetas

```
biblioteca/
  AGENTS.md
  ARQUITECTURE.md
  PROTECT.md
  app/
    page.tsx
    shelves/page.tsx
    shelves/[id]/page.tsx
    books/page.tsx
    books/[id]/page.tsx
  components/
    chrome/          AppHeader
    library/         RoomPlan, ShelfUnit, ShelfCell, BookSpine
    book/            BookDetail, LocationBreadcrumb
    search/          SearchBox
  lib/
    types/           Modelo e interfaces de UI
    data/            Catálogo (sin datos inventados)
    selectors/       Consultas puras sobre el catálogo
    search/          Matching de búsqueda
```

## Crecimiento futuro

Añadir estanterías, cubos, profundidades, libros, géneros, autores, portadas y fotografías **solo como datos** (o campos opcionales ya previstos). No ramificar componentes por cada mueble nuevo.
