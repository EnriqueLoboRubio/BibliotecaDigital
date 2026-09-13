"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/context";
import type { UserRole } from "@/lib/types";

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserManagementModal({ isOpen, onClose }: UserManagementModalProps) {
  const { user: currentUser, users, createUser, removeUser, updatePassword } = useAuth();

  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("editor");

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  // Estados para visualizar y cambiar contraseñas
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [userToEditPassword, setUserToEditPassword] = useState<{ id: string; username: string; name: string } | null>(null);
  const [editPasswordInput, setEditPasswordInput] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  if (!isOpen) return null;

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!newUsername.trim() || newUsername.trim().length < 3) {
      setError("El nombre de usuario debe tener al menos 3 caracteres.");
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres.");
      return;
    }

    setIsCreating(true);
    const res = await createUser({
      name: newName.trim() || newUsername.trim(),
      username: newUsername.trim(),
      password: newPassword,
      role: newRole,
    });
    setIsCreating(false);

    if (res.success) {
      setSuccessMsg(`Usuario "${newUsername.trim()}" creado correctamente con rol ${newRole}.`);
      setNewName("");
      setNewUsername("");
      setNewPassword("");
      setNewRole("editor");
    } else {
      setError(res.error || "Error al crear el usuario.");
    }
  };

  const handleConfirmPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEditPassword) return;
    setError(null);
    setSuccessMsg(null);

    if (!editPasswordInput || editPasswordInput.length < 4) {
      setError("La nueva contraseña debe tener al menos 4 caracteres.");
      return;
    }

    setIsChangingPassword(true);
    const res = await updatePassword(userToEditPassword.id, editPasswordInput);
    setIsChangingPassword(false);

    if (res.success) {
      setSuccessMsg(`Contraseña de "${userToEditPassword.username}" actualizada correctamente.`);
      setUserToEditPassword(null);
      setEditPasswordInput("");
    } else {
      setError(res.error || "Error al modificar la contraseña.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setError(null);
    setSuccessMsg(null);

    const res = await removeUser(userToDelete.id);
    if (res.success) {
      setSuccessMsg(`Usuario "${userToDelete.name}" eliminado.`);
      setUserToDelete(null);
    } else {
      setError(res.error || "No se pudo eliminar el usuario.");
      setUserToDelete(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#0f172a] border border-slate-700 shadow-2xl p-6 text-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-md shadow-purple-500/10">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Gestión de Usuarios</h2>
              <p className="text-xs text-slate-400">Control de acceso y permisos de edición (Exclusivo Administrador)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Notificaciones */}
        {error && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-200 flex items-center gap-2">
            <span>✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Sección: Crear Nuevo Usuario */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
            <span>+</span>
            <span>Crear Nuevo Usuario</span>
          </h3>

          <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Carlos Gómez"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Nombre de Usuario (Login) *
              </label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Ej: carlos"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Contraseña Inicial *
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Rol del Usuario
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="editor">Editor (Puede añadir y editar todo)</option>
                <option value="admin">Administrador (Puede editar y gestionar usuarios)</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex justify-end pt-1">
              <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 active:bg-purple-700 shadow-md shadow-purple-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {isCreating ? "Creando..." : "+ Dar de Alta Usuario"}
              </button>
            </div>
          </form>
        </div>

        {/* Sección: Lista de Usuarios Registrados */}
        <div className="flex flex-col gap-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Usuarios Registrados ({users.length})
          </h3>

          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-[11px] text-slate-400 font-semibold border-b border-slate-700/80">
                <tr>
                  <th className="px-3.5 py-2">Usuario</th>
                  <th className="px-3.5 py-2">Nombre</th>
                  <th className="px-3.5 py-2">Rol</th>
                  <th className="px-3.5 py-2">Contraseña</th>
                  <th className="px-3.5 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {users.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isAdminRole = u.role === "admin";
                  const isPassVisible = visiblePasswords[u.id];

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-3.5 py-2.5 font-mono font-medium text-slate-200">
                        {u.username}
                        {isCurrent && (
                          <span className="ml-2 text-[10px] text-blue-400 font-sans font-normal">(tú)</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-300">{u.name}</td>
                      <td className="px-3.5 py-2.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${
                            isAdminRole
                              ? "bg-purple-950/80 text-purple-300 border border-purple-700/70"
                              : "bg-blue-950/80 text-blue-300 border border-blue-700/70"
                          }`}
                        >
                          {isAdminRole ? "Administrador" : "Editor"}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-mono">
                        <div className="inline-flex items-center gap-1.5 bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
                          <span className="text-slate-300 tracking-wider">
                            {isPassVisible ? (u.password || "admin123") : "••••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(u.id)}
                            className="p-0.5 text-slate-400 hover:text-white transition-colors"
                            title={isPassVisible ? "Ocultar contraseña" : "Ver contraseña"}
                          >
                            {isPassVisible ? "🙈" : "👁️"}
                          </button>
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setUserToEditPassword({ id: u.id, username: u.username, name: u.name });
                              setEditPasswordInput(u.password || "");
                            }}
                            className="px-2 py-1 rounded text-[11px] font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-950/50 transition-colors"
                            title="Cambiar contraseña de este usuario"
                          >
                            🔑 Cambiar
                          </button>
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => setUserToDelete({ id: u.id, name: u.username })}
                              className="px-2 py-1 rounded text-[11px] font-medium text-red-400 hover:text-red-300 hover:bg-red-950/50 transition-colors"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Diálogo para cambiar contraseña de un usuario */}
        {userToEditPassword && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-2xl bg-[#0f172a] border border-amber-500/50 p-5 text-slate-100 flex flex-col gap-3 shadow-2xl">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔑</span>
                <h4 className="text-sm font-bold text-amber-300">
                  Cambiar contraseña de &ldquo;{userToEditPassword.username}&rdquo;
                </h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Introduce la nueva contraseña para este usuario. Podrá utilizarla de inmediato.
              </p>
              <form onSubmit={handleConfirmPasswordChange} className="flex flex-col gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Nueva contraseña *
                  </label>
                  <input
                    type="text"
                    autoFocus
                    required
                    value={editPasswordInput}
                    onChange={(e) => setEditPasswordInput(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setUserToEditPassword(null)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 transition-colors shadow"
                  >
                    {isChangingPassword ? "Guardando..." : "Guardar contraseña"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Diálogo de confirmación para eliminar usuario */}
        {userToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-[#0f172a] border border-red-800 p-5 text-slate-100 flex flex-col gap-3 shadow-2xl">
              <h4 className="text-sm font-bold text-red-200">
                ¿Eliminar usuario &ldquo;{userToDelete.name}&rdquo;?
              </h4>
              <p className="text-xs text-red-300/90 leading-relaxed">
                Este usuario perderá acceso inmediato a la edición de la biblioteca.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
