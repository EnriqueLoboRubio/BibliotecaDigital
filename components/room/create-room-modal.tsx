"use client";

import { useState } from "react";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (name: string) => void;
}

const PRESET_ROOMS = [
  { name: "Salón Principal", icon: "🛋️" },
  { name: "Despacho / Estudio", icon: "💼" },
  { name: "Dormitorio", icon: "🛏️" },
  { name: "Sótano / Archivo", icon: "📦" },
  { name: "Pasillo / Distribuidor", icon: "🚪" },
  { name: "Buhardilla", icon: "✨" },
];

export function CreateRoomModal({ isOpen, onClose, onCreateRoom }: CreateRoomModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre de la habitación no puede estar vacío.");
      return;
    }
    onCreateRoom(name.trim());
    setName("");
    setError(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#0f172a] border border-slate-700 shadow-2xl p-6 text-slate-100 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <span className="text-lg">🏠</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Nueva Habitación / Estancia</h2>
              <p className="text-xs text-slate-400">Crea un espacio independiente para organizar tus muebles</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Sugerencias rápidas */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Sugerencias rápidas
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_ROOMS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  setName(preset.name);
                  setError(null);
                }}
                className={`px-3 py-2 rounded-xl text-xs text-left border transition-all flex items-center gap-2 ${
                  name === preset.name
                    ? "bg-indigo-950/80 text-indigo-300 border-indigo-500/60 shadow"
                    : "bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80"
                }`}
              >
                <span>{preset.icon}</span>
                <span className="font-medium truncate">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre de la habitación *
            </label>
            <input
              type="text"
              autoFocus
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ej: Salón de Lectura, Dormitorio Principal..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
            >
              Crear Habitación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
