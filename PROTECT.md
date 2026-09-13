# Protección

Reglas para humanos y agentes de IA. Si un cambio contradice este archivo, no se hace. Hay que actualizar **juntos** `PROTECT.md`, `ARQUITECTURE.md` y `lib/types`.

## Fuentes de verdad

| Qué | Dónde |
| --- | --- |
| Objetivo del producto | `AGENTS.md` |
| Modelo espacial, rutas, capas, decisiones | `ARQUITECTURE.md` |
| Contratos TypeScript | `lib/types` |
| Este archivo | Lo que no se puede romper en código |

No se reintroduce `ShelfRow`. No se localiza un libro solo con `shelfId + row + position`.

## Datos

- No inventar habitaciones, estanterías, cubos, libros, portadas, fotos ni coincidencias de búsqueda.
- No hardcodear cuáles cubos del 4×4 están vacíos. Eso es `ShelfCell.enabled`.
- No hardcodear `columns: 4` y `rows: 4` en componentes. Van en el `Shelf`.
- No meter catálogo dentro de componentes visuales.
- `lib/data` no se rellena con ejemplos ficticios “para que se vea”.
- Un libro no apunta a un cubo `enabled: false`.
- Un libro no usa `depth` fuera de `1…depthCount`.
- No aplanar la profundidad en `position` (ni zigzag dentro del cubo).
- No duplicar un libro en frente y atrás.

## Localización

Ejes obligatorios, 1-based:

`shelfId` · `row` · `column` · `depth` · `position`

- `depth` 1 = frente (lo único visible en la rejilla del mueble).
- `position` se reinicia en cada profundidad.
- Fila 1 = arriba del mueble. Columna 1 = izquierda.
- La UI muestra frase y migas, no ids técnicos como texto principal.
- Si un resultado de búsqueda tiene `depth > 1`, hay que abrir el cubo. No se da por encontrado un lomo que no está al frente.

## Componentes y capas

- Páginas solo componen. No duplicar la rejilla entre `/` y `/shelves/[id]`.
- `ShelfUnit` / `ShelfCell` / `BookSpine` no buscan, no filtran el catálogo y no deciden cubos vacíos.
- Una sola función de matching de búsqueda para el localizador y `/books`.
- No pintar un cubo isométrico como vista principal de profundidad.
- No sustituir lomos por portadas en la rejilla 4×4.
- No crear una entidad `ShelfDepth` salvo cambio explícito de arquitectura.

## Producto

- Vista principal espacial, no tabla.
- Diseño responsive y accesible (nombres, foco, no solo color).
- Respetar `prefers-reduced-motion` en el resaltado.
- Código TypeScript, componentes reutilizables, sin duplicar.

## Archivos sensibles

Cambios en estos archivos requieren alinear documentación y tipos:

- `AGENTS.md`
- `ARQUITECTURE.md`
- `PROTECT.md`
- `lib/types/**`

No borrar este archivo. No relajar “no inventar datos” para rellenar la UI.
