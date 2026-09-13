-- ==============================================================================
-- SCHEMA SUPABASE: BIBLIOTECA DIGITAL (Soporte multi-profundidad y cuadrículas)
-- ==============================================================================
-- Copia y pega este script en el SQL Editor de tu proyecto Supabase si necesitas
-- recrear las tablas o desplegar en una nueva base de datos.
-- ==============================================================================

-- 1. TABLA: rooms (Habitaciones o ubicaciones)
CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  shelf_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. TABLA: shelves (Muebles / Estanterías físicas)
CREATE TABLE IF NOT EXISTS public.shelves (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 1,
  columns INTEGER NOT NULL CHECK (columns >= 1 AND columns <= 8),
  rows INTEGER NOT NULL CHECK (rows >= 1 AND rows <= 8),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. TABLA: cells (Cubos físicos de cada estantería)
-- NOTA: Se usa el nombre "columna" para evitar la palabra reservada "column" de PostgreSQL
CREATE TABLE IF NOT EXISTS public.cells (
  id TEXT PRIMARY KEY,
  shelf_id TEXT NOT NULL REFERENCES public.shelves(id) ON DELETE CASCADE,
  row INTEGER NOT NULL CHECK (row >= 1),
  columna INTEGER NOT NULL CHECK (columna >= 1),
  enabled BOOLEAN NOT NULL DEFAULT true,
  depth_count INTEGER NOT NULL DEFAULT 2 CHECK (depth_count >= 1 AND depth_count <= 3),
  photo TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE (shelf_id, row, columna)
);

-- 4. TABLA: books (Libros catalogados y sus coordenadas espaciales exactas)
CREATE TABLE IF NOT EXISTS public.books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT DEFAULT '',
  year INTEGER DEFAULT 0,
  genre TEXT DEFAULT '',
  cover TEXT,
  shelf_id TEXT NOT NULL REFERENCES public.shelves(id) ON DELETE CASCADE,
  row INTEGER NOT NULL CHECK (row >= 1),
  columna INTEGER NOT NULL CHECK (columna >= 1),
  depth INTEGER NOT NULL CHECK (depth >= 1 AND depth <= 3),
  position INTEGER NOT NULL CHECK (position >= 1),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE (shelf_id, row, columna, depth, position)
);

-- 5. TABLA: app_users (Usuarios y roles de la aplicación)
CREATE TABLE IF NOT EXISTS public.app_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor')),
  password_hash TEXT NOT NULL,
  password_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. ÍNDICES DE RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_cells_shelf_id ON public.cells(shelf_id);
CREATE INDEX IF NOT EXISTS idx_books_shelf_id ON public.books(shelf_id);
CREATE INDEX IF NOT EXISTS idx_books_spatial ON public.books(shelf_id, row, columna, depth);
CREATE INDEX IF NOT EXISTS idx_app_users_username ON public.app_users(username);

-- 7. POLÍTICAS DE SEGURIDAD (RLS - Row Level Security)
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Permitir lectura y escritura con la clave anónima pública (anon key)
CREATE POLICY "Permitir todo a anon en rooms" ON public.rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon en shelves" ON public.shelves FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon en cells" ON public.cells FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon en books" ON public.books FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon en app_users" ON public.app_users FOR ALL USING (true) WITH CHECK (true);

-- 8. HABILITAR REALTIME (Sincronización en vivo multidispositivo)
-- Permite que los cambios se envíen instantáneamente a móviles y ordenadores vía WebSockets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'books'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.books, public.cells, public.shelves, public.rooms;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'app_users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_users;
  END IF;
END $$;
