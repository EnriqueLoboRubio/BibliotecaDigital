import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function cleanEnvValue(val: string | undefined): string {
  if (!val) return "";
  let clean = val.trim();
  // Quitar comillas accidentales si se pegaron en el panel de Vercel
  if (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'"))
  ) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

function getCleanSupabaseUrl(): string {
  let url = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  url = url.replace(/\/rest\/v1\/?$/, "");
  return url;
}

const supabaseUrl = getCleanSupabaseUrl();
const supabaseAnonKey = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith("http") &&
    supabaseAnonKey !== "tu-clave-anon-aqui",
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (typeof window !== "undefined") {
  if (!isSupabaseConfigured) {
    console.warn(
      "[Supabase] ⚠️ Sin conexión en la nube. Las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY no están configuradas en esta versión. Se usará el almacenamiento local.",
    );
  } else {
    console.info("[Supabase] 🟢 Conectado exitosamente en:", supabaseUrl);
  }
}
