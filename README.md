# 📚 Biblioteca Digital

Sistema web interactivo y visual para gestionar y localizar libros en estanterías físicas reales (como IKEA Kallax y muebles a medida), con soporte para **profundidades múltiples** (delante, en medio, detrás), **cubos con/sin uso**, y sincronización automática híbrida con **Supabase** y almacenamiento local offline.

---

## ✨ Características Principales

- 🗄️ **Cuadrícula Física Realista**: Visualización 2.5D de estanterías con relieve de madera y proporciones reales.
- 🧊 **Gestión de Cubos Útiles y Sin Uso**:
  - Posibilidad de marcar qué cubos están en uso o sin uso (decoración, altavoces, cestas) tanto al crear el mueble como en cualquier momento después.
  - Al desactivar un cubo, se eliminan en cascada sus libros de forma segura previa confirmación.
- 📦 **Multi-Profundidad (Doble / Triple Fondo)**: Organiza libros situados en primera fila (Frente), fila intermedia (Centro) y fondo (Atrás).
- ☁️ **Sincronización Híbrida Cloud (Supabase)**:
  - Todo cambio (libros, estanterías, cubos) se sincroniza en tiempo real con tu base de datos en la nube de Supabase.
  - Si estás sin conexión o sin configurar Supabase, la app funciona de manera instantánea mediante `localStorage`.
  - Indicador visual del estado de sincronización (**Nube** / **Local**) en la cabecera.
- 📱 **Diseño Responsive Moderno**: Compatible con móviles, tablets y ordenadores con soporte Dark Mode y animaciones fluidas.

---

## 🚀 Inicio Rápido

### 1. Requisitos
- [Node.js](https://nodejs.org/) v18 o superior instalado.
- Gestor de paquetes `npm`.

### 2. Instalación de Dependencias
```bash
npm install
```

### 3. Configuración de Variables de Entorno
Crea o revisa el archivo `.env.local` en la raíz de `biblioteca/` con tus credenciales de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-publica
```
*(Puedes tomar como referencia [.env.example](.env.example))*.

### 4. Ejecución en Local
Para abrir la aplicación en tu ordenador:
```bash
npm run dev
```
Accede a [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 📱 Acceso desde tu Móvil o Tablet (Red Local / Wi-Fi)

Si quieres usar la app desde tu móvil o tablet en casa mientras colocas libros en la estantería:

1. Ejecuta el comando de red:
   ```bash
   npm run dev:lan
   ```
2. Mira tu IP local (en Windows ejecuta `ipconfig` en otra terminal, por ejemplo `192.168.1.50`).
3. Abre en el navegador del móvil: `http://192.168.1.50:3000`.

---

## 🌐 Publicar en Internet Gratis (Vercel)

Para tener una URL pública accesible desde cualquier lugar (ej: `https://mi-biblioteca.vercel.app`):

1. Sube este repositorio a tu cuenta de **GitHub**.
2. Entra en [vercel.com](https://vercel.com) e inicia sesión con GitHub.
3. Haz clic en **"Add New Project"** e importa el repositorio de la biblioteca.
4. En la sección **Environment Variables**, añade:
   - `NEXT_PUBLIC_SUPABASE_URL` = (tu URL de Supabase)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (tu anon key de Supabase)
5. Haz clic en **Deploy**. En menos de 2 minutos tu biblioteca estará online y conectada a tu base de datos Supabase.

---

## 🗄️ Estructura de la Base de Datos (Supabase)

Si necesitas recrear la base de datos o configurar un nuevo proyecto de Supabase, ejecuta el archivo SQL incluido:

- 📄 [`supabase_schema.sql`](supabase_schema.sql)

Tablas gestionadas:
- `rooms`: Habitaciones o zonas (ej: Estudio Principal).
- `shelves`: Estanterías con sus dimensiones de filas y columnas.
- `cells`: Cada cubo individual de la estantería (`row`, `columna`, `enabled`, `depth_count`).
- `books`: Libros catalogados y sus coordenadas espaciales (`shelf_id`, `row`, `columna`, `depth`, `position`).

---

## 🛠️ Scripts Disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo en `localhost:3000` |
| `npm run dev:lan` | Inicia el servidor accesible desde cualquier dispositivo en la misma red Wi-Fi |
| `npm run build` | Compila la aplicación para producción |
| `npm run start` | Inicia el servidor de producción compilado |
| `npm run lint` | Ejecuta el linter ESLint para comprobar la calidad del código |

---

## 📐 Invariantes y Reglas del Sistema

Consulta [`PROTECT.md`](PROTECT.md) y [`ARQUITECTURE.md`](ARQUITECTURE.md) para detalles sobre el modelo de datos y las garantías de integridad (coordenadas espaciales estrictas, eliminación en cascada al inhabilitar cubos, indexación 1-based).
