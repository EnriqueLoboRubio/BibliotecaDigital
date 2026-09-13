import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://cqyyhjdexxhgtbjqghbo.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_Fmk7TahCHx21GvXmvpUwwQ_aOIB7uyg";

function cleanEnvValue(val: string | undefined): string {
  if (!val) return "";
  let clean = val.trim();
  if (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'"))
  ) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

function getCleanSupabaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;
  let url = cleanEnvValue(raw);
  url = url.replace(/\/rest\/v1\/?$/, "");
  return url || DEFAULT_SUPABASE_URL;
}

function getCleanSupabaseAnonKey(): string {
  const raw =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;
  const clean = cleanEnvValue(raw);
  return clean || DEFAULT_SUPABASE_ANON_KEY;
}

export const supabaseUrl = getCleanSupabaseUrl();
export const supabaseAnonKey = getCleanSupabaseAnonKey();

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
      "[Supabase] ⚠️ Sin conexión en la nube. Las variables de Supabase no están disponibles en esta compilación. Se usará el almacenamiento local.",
    );
  } else {
    console.info("[Supabase] 🟢 Conectado exitosamente en:", supabaseUrl);
  }
}
