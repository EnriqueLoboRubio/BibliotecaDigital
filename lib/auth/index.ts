import type { AppUser, AuthSession, UserRole } from "@/lib/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

const STORAGE_USERS_KEY = "biblioteca_digital_users_v1";
const STORAGE_SESSION_KEY = "biblioteca_digital_session_v1";
const SALT = "_salt_biblioteca_2026_";

/**
 * Genera un hash SHA-256 para la contraseña
 */
export async function hashPassword(password: string): Promise<string> {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + SALT);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      // Fallback
    }
  }

  // Fallback simple determinista
  let h = 0x811c9dc5;
  const str = password + SALT;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `h_${(h >>> 0).toString(16)}`;
}

/**
 * Obtiene los usuarios almacenados en localStorage
 */
function getLocalUsers(): AppUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AppUser[]) : [];
  } catch {
    return [];
  }
}

/**
 * Guarda los usuarios en localStorage
 */
function saveLocalUsers(users: AppUser[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error("Error al guardar usuarios en localStorage:", err);
  }
}

/**
 * Sincroniza un usuario con Supabase
 */
async function syncUserToSupabase(user: AppUser) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from("app_users").upsert({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      password_hash: user.passwordHash,
      password_text: user.password || "",
      created_at: user.createdAt,
    });
  } catch (err) {
    console.warn("Error al sincronizar usuario con Supabase:", err);
  }
}

/**
 * Elimina un usuario de Supabase
 */
async function syncDeleteUserFromSupabase(userId: string) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from("app_users").delete().eq("id", userId);
  } catch (err) {
    console.warn("Error al eliminar usuario en Supabase:", err);
  }
}

/**
 * Inicializa y obtiene la lista completa de usuarios registrados.
 * Si no existe ningún usuario, siembra automáticamente el usuario "admin" inicial.
 */
export async function getUsers(): Promise<AppUser[]> {
  let users: AppUser[] = [];

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from("app_users").select("*");
      if (!error && Array.isArray(data) && data.length > 0) {
        users = data.map((u) => ({
          id: u.id,
          username: u.username,
          name: u.name,
          role: u.role as UserRole,
          passwordHash: u.password_hash,
          password: u.password_text || (u.username === "admin" ? "admin123" : ""),
          createdAt: u.created_at,
        }));
        saveLocalUsers(users);
        return users;
      }
    } catch {
      // Continuar con respaldo local
    }
  }

  users = getLocalUsers();

  // Si no hay usuarios en ninguna parte, sembramos el usuario admin inicial
  if (users.length === 0) {
    const adminHash = await hashPassword("admin123");
    const initialAdmin: AppUser = {
      id: "user-admin-root",
      username: "admin",
      name: "Administrador",
      role: "admin",
      passwordHash: adminHash,
      password: "admin123",
      createdAt: new Date().toISOString(),
    };
    users = [initialAdmin];
    saveLocalUsers(users);
    void syncUserToSupabase(initialAdmin);
  }

  return users;
}

/**
 * Inicia sesión con usuario y contraseña
 */
export async function login(username: string, password: string): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  const cleanUsername = username.trim().toLowerCase();
  const users = await getUsers();
  const foundUser = users.find((u) => u.username.toLowerCase() === cleanUsername);

  if (!foundUser) {
    return { success: false, error: "Usuario o contraseña incorrectos." };
  }

  const inputHash = await hashPassword(password);
  if (foundUser.passwordHash !== inputHash) {
    return { success: false, error: "Usuario o contraseña incorrectos." };
  }

  const session: AuthSession = {
    user: {
      id: foundUser.id,
      username: foundUser.username,
      name: foundUser.name,
      role: foundUser.role,
      createdAt: foundUser.createdAt,
    },
    token: `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
      window.dispatchEvent(new Event("library_auth_change"));
    } catch (err) {
      console.error("Error al guardar sesión:", err);
    }
  }

  return { success: true, user: foundUser };
}

/**
 * Cierra la sesión activa
 */
export function logout(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    window.dispatchEvent(new Event("library_auth_change"));
  } catch (err) {
    console.error("Error al cerrar sesión:", err);
  }
}

/**
 * Recupera la sesión activa actual
 */
export function getActiveSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

/**
 * Crea un nuevo usuario (Solo permitido para administradores)
 */
export async function createNewUser(
  creatorUser: { role: UserRole },
  params: { username: string; name: string; password: string; role: UserRole },
): Promise<{ success: boolean; error?: string; user?: AppUser }> {
  if (creatorUser.role !== "admin") {
    return { success: false, error: "Solo los administradores pueden crear nuevos usuarios." };
  }

  const cleanUsername = params.username.trim().toLowerCase();
  if (!cleanUsername || cleanUsername.length < 3) {
    return { success: false, error: "El nombre de usuario debe tener al menos 3 caracteres." };
  }

  if (!params.password || params.password.length < 4) {
    return { success: false, error: "La contraseña debe tener al menos 4 caracteres." };
  }

  const users = await getUsers();
  const exists = users.some((u) => u.username.toLowerCase() === cleanUsername);
  if (exists) {
    return { success: false, error: `El usuario "${cleanUsername}" ya existe.` };
  }

  const hash = await hashPassword(params.password);
  const newUser: AppUser = {
    id: `user-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    username: cleanUsername,
    name: params.name.trim() || cleanUsername,
    role: params.role,
    passwordHash: hash,
    password: params.password,
    createdAt: new Date().toISOString(),
  };

  const nextUsers = [...users, newUser];
  saveLocalUsers(nextUsers);
  void syncUserToSupabase(newUser);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("library_auth_change"));
  }

  return { success: true, user: newUser };
}

/**
 * Elimina un usuario (Solo permitido para administradores)
 */
export async function deleteUser(
  currentUser: { id: string; role: UserRole },
  targetUserId: string,
): Promise<{ success: boolean; error?: string }> {
  if (currentUser.role !== "admin") {
    return { success: false, error: "Solo los administradores pueden eliminar usuarios." };
  }

  if (currentUser.id === targetUserId) {
    return { success: false, error: "No puedes eliminar tu propia cuenta mientras estés conectado con ella." };
  }

  const users = await getUsers();
  const admins = users.filter((u) => u.role === "admin");
  const target = users.find((u) => u.id === targetUserId);

  if (!target) {
    return { success: false, error: "El usuario no existe." };
  }

  if (target.role === "admin" && admins.length <= 1) {
    return { success: false, error: "No se puede eliminar el único administrador del sistema." };
  }

  const nextUsers = users.filter((u) => u.id !== targetUserId);
  saveLocalUsers(nextUsers);
  void syncDeleteUserFromSupabase(targetUserId);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("library_auth_change"));
  }

  return { success: true };
}

/**
 * Modifica la contraseña de un usuario existente (Permitido para administradores)
 */
export async function updateUserPassword(
  currentUser: { id: string; role: UserRole },
  targetUserId: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  if (currentUser.role !== "admin") {
    return { success: false, error: "Solo los administradores pueden modificar contraseñas." };
  }

  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: "La nueva contraseña debe tener al menos 4 caracteres." };
  }

  const users = await getUsers();
  const targetIndex = users.findIndex((u) => u.id === targetUserId);
  if (targetIndex === -1) {
    return { success: false, error: "El usuario no existe." };
  }

  const newHash = await hashPassword(newPassword);
  const updatedUser: AppUser = {
    ...users[targetIndex],
    passwordHash: newHash,
    password: newPassword,
  };

  const nextUsers = [...users];
  nextUsers[targetIndex] = updatedUser;
  saveLocalUsers(nextUsers);
  void syncUserToSupabase(updatedUser);

  // Si el usuario objetivo es el usuario activo actual, actualizar la sesión
  const active = getActiveSession();
  if (active && active.user.id === targetUserId) {
    const updatedSession: AuthSession = {
      ...active,
      user: {
        ...active.user,
        name: updatedUser.name,
        role: updatedUser.role,
      },
    };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(updatedSession));
      } catch (err) {
        console.error("Error al actualizar sesión activa:", err);
      }
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("library_auth_change"));
  }

  return { success: true };
}

/**
 * Suscripción en tiempo real a cambios de usuarios (Supabase Realtime + Storage local)
 */
export function subscribeToUsers(
  onUpdate: (users: AppUser[]) => void,
): () => void {
  let isSubscribed = true;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const triggerReload = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (!isSubscribed) return;
      try {
        const fresh = await getUsers();
        if (isSubscribed) {
          onUpdate(fresh);
        }
      } catch (err) {
        console.warn("Error al sincronizar usuarios en tiempo real:", err);
      }
    }, 250);
  };

  // Sincronización entre pestañas en el mismo navegador
  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key.includes(STORAGE_USERS_KEY)) {
      triggerReload();
    }
  };

  const handleCustomEvent = () => {
    triggerReload();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
    window.addEventListener("library_auth_change", handleCustomEvent);
  }

  // Sincronización en vivo multidispositivo mediante Supabase Realtime
  let channel: RealtimeChannel | null = null;
  if (isSupabaseConfigured && supabase) {
    const channelId = `users-realtime-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_users" },
        () => triggerReload(),
      )
      .subscribe();
  }

  return () => {
    isSubscribed = false;
    if (debounceTimer) clearTimeout(debounceTimer);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("library_auth_change", handleCustomEvent);
    }
    if (channel && supabase) {
      void supabase.removeChannel(channel);
    }
  };
}
