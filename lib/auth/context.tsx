"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AppUser, AuthSession, UserRole } from "@/lib/types";
import {
  createNewUser,
  deleteUser,
  getActiveSession,
  getUsers,
  login as authLogin,
  logout as authLogout,
  subscribeToUsers,
  updateUserPassword,
} from "./index";

interface AuthContextType {
  session: AuthSession | null;
  user: AuthSession["user"] | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  users: AppUser[];
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  createUser: (params: { username: string; name: string; password: string; role: UserRole }) => Promise<{ success: boolean; error?: string }>;
  removeUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (targetUserId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);

  const refreshUsers = async () => {
    try {
      const list = await getUsers();
      setUsers(list);
    } catch (err) {
      console.warn("Error al cargar lista de usuarios:", err);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Sincronizar sesión inicial tras el montaje en el cliente
    Promise.resolve().then(() => {
      if (mounted) {
        setSession(getActiveSession());
        void refreshUsers();
      }
    });

    // Suscripción en tiempo real a cambios de usuarios (Supabase + LocalStorage)
    const unsubscribeRealtime = subscribeToUsers((freshUsers) => {
      if (mounted) {
        setUsers(freshUsers);
        setSession(getActiveSession());
      }
    });

    return () => {
      mounted = false;
      unsubscribeRealtime();
    };
  }, []);

  const login = async (username: string, password: string) => {
    const res = await authLogin(username, password);
    if (res.success) {
      setSession(getActiveSession());
      await refreshUsers();
    }
    return res;
  };

  const logout = () => {
    authLogout();
    setSession(null);
  };

  const createUser = async (params: { username: string; name: string; password: string; role: UserRole }) => {
    if (!session?.user) {
      return { success: false, error: "Debes iniciar sesión como administrador." };
    }
    const res = await createNewUser(session.user, params);
    if (res.success) {
      await refreshUsers();
    }
    return res;
  };

  const removeUser = async (userId: string) => {
    if (!session?.user) {
      return { success: false, error: "Debes iniciar sesión como administrador." };
    }
    const res = await deleteUser(session.user, userId);
    if (res.success) {
      await refreshUsers();
    }
    return res;
  };

  const updatePassword = async (targetUserId: string, newPassword: string) => {
    if (!session?.user) {
      return { success: false, error: "Debes iniciar sesión como administrador." };
    }
    const res = await updateUserPassword(session.user, targetUserId, newPassword);
    if (res.success) {
      await refreshUsers();
      setSession(getActiveSession());
    }
    return res;
  };

  const user = session?.user || null;
  const isAuthenticated = Boolean(user);
  const isAdmin = user?.role === "admin";
  const canEdit = isAuthenticated; // Cualquier usuario autenticado (editor o admin) puede editar

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isAuthenticated,
        isAdmin,
        canEdit,
        users,
        login,
        logout,
        createUser,
        removeUser,
        updatePassword,
        refreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
