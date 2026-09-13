# Biblioteca Digital

## Objetivo

Crear una aplicación web para digitalizar una biblioteca física ubicada en una habitación.

La aplicación debe permitir registrar libros y representar visualmente dónde están colocados en las estanterías.

## Objetivo principal

El usuario debe poder:

- visualizar las estanterías de la habitación

- visualizar los cubos y las filas de profundidad

- visualizar los libros

- buscar libros

- localizar visualmente un libro

- conocer estantería, cubo (fila y columna), profundidad (frente/atrás) y posición

- seleccionar un libro

- ver información del libro

## Concepto visual

La biblioteca física está formada por estanterías IKEA. En una pared está una de 4*4 cuadrados. Aunque hay 3 que no se usan, debe existir la posibilidad de elegir cuales no se rellenan de libros. Dentro de cada cubo puede haber varias filas de libros en profundidad (frente y detrás).

La interfaz debe representar las estanterías de forma visual,no únicamente mediante tablas.

## Tecnologías

- Next.js

- React

- TypeScript

- Tailwind CSS

## Principios

- Código TypeScript

- Componentes reutilizables

- Diseño responsive

- Accesibilidad

- No duplicar código

- No inventar datos

- Mantener separada la información de los libros de los componentes visuales

## Documentación

- `ARQUITECTURE.md` — modelo espacial, rutas, capas, decisiones
- `PROTECT.md` — reglas que no se pueden romper
- `lib/types` — contratos TypeScript alineados con la arquitectura

## Importante

La aplicación debe diseñarse pensando en que posteriormentemse sustituirá la biblioteca ficticia por la distribución real de la habitación.

La arquitectura debe permitir añadir:

- nuevas estanterías

- nuevos cubos

- profundidades

- libros

- posiciones

- categorías

- autores

- portadas

- fotografías de las estanterías

## IA

El proyecto se desarrollará utilizando agentes de IA, pero el código debe mantenerse comprensible y mantenible.




<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
