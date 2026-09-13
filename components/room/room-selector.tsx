"use client";

import { useState } from "react";
import type { Book, Room, Shelf } from "@/lib/types";

interface RoomSelectorProps {
  rooms: Room[];
  activeRoomId: string;
  shelves: Shelf[];
  books: Book[];
  canEdit: boolean;
  onSelectRoom: (roomId: string) => void;
  onOpenCreateModal: () => void;
  onRenameRoom?: (roomId: string, newName: string) => void;
  onDeleteRoom?: (roomId: string) => void;
}

export function RoomSelector({
  rooms,
  activeRoomId,
  shelves,
  books,
  canEdit,
  onSelectRoom,
  onOpenCreateModal,
  onRenameRoom,
  onDeleteRoom,
}: RoomSelectorProps) {
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);

  const handleStartRename = (room: Room) => {
    setEditingRoomId(room.id);
    setEditingName(room.name);
  };

  const handleSaveRename = (roomId: string) => {
    if (editingName.trim() && onRenameRoom) {
      onRenameRoom(roomId, editingName.trim());
    }
    setEditingRoomId(null);
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Lista horizontal de pestañas de habitación */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-md overflow-x-auto max-w-full">
          {rooms.map((room) => {
            const isActive = room.id === activeRoomId;
            const isEditing = editingRoomId === room.id;

            // Muebles que pertenecen a esta habitación
            const roomShelves = shelves.filter(
              (s) => room.shelfIds?.includes(s.id) || s.roomId === room.id,
            );
            const shelfIdsSet = new Set(roomShelves.map((s) => s.id));
            const roomBooksCount = books.filter((b) =>
              shelfIdsSet.has(b.location.shelfId),
            ).length;

            if (isEditing) {
              return (
                <div
                  key={room.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-800 border border-indigo-500"
                >
                  <input
                    type="text"
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveRename(room.id);
                      if (e.key === "Escape") setEditingRoomId(null);
                    }}
                    className="px-2 py-0.5 rounded bg-slate-950 text-xs text-white border border-slate-700 focus:outline-none w-32"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveRename(room.id)}
                    className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px]"
                    title="Guardar"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRoomId(null)}
                    className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px]"
                    title="Cancelar"
                  >
                    ✕
                  </button>
                </div>
              );
            }

            return (
              <div
                key={room.id}
                className={`group relative flex items-center rounded-xl transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectRoom(room.id)}
                  className="px-3.5 py-1.5 text-xs font-semibold flex items-center gap-2"
                >
                  <span className="text-sm">🚪</span>
                  <span>{room.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? "bg-black/30 text-indigo-100" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {roomShelves.length} {roomShelves.length === 1 ? "mueble" : "muebles"}
                  </span>
                  {roomBooksCount > 0 && (
                    <span
                      className={`text-[10px] font-bold ${
                        isActive ? "text-amber-300" : "text-emerald-400"
                      }`}
                    >
                      • {roomBooksCount}
                    </span>
                  )}
                </button>

                {/* Acciones de gestión de la habitación (si está autenticado) */}
                {canEdit && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center pr-1.5 gap-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartRename(room);
                      }}
                      className="p-1 rounded text-slate-300 hover:text-white hover:bg-black/20"
                      title="Renombrar habitación"
                    >
                      ✏️
                    </button>
                    {rooms.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoomToDelete(room);
                        }}
                        className="p-1 rounded text-red-300 hover:text-red-100 hover:bg-black/20"
                        title="Eliminar habitación"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Botón para añadir nueva estancia */}
        {canEdit && (
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-950/70 hover:bg-indigo-900/70 border border-indigo-700/60 shadow-md transition-all flex items-center gap-1.5 shrink-0"
          >
            <span>+</span>
            <span>Nueva Habitación</span>
          </button>
        )}
      </div>

      {/* Diálogo de confirmación para eliminar habitación */}
      {roomToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-[#0f172a] border border-red-800 p-5 text-slate-100 flex flex-col gap-3 shadow-2xl">
            <h4 className="text-sm font-bold text-red-200">
              ¿Eliminar la habitación &ldquo;{roomToDelete.name}&rdquo;?
            </h4>
            <p className="text-xs text-red-300/90 leading-relaxed">
              Los muebles ubicados en esta estancia no se perderán: se moverán automáticamente a la habitación principal.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRoomToDelete(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteRoom?.(roomToDelete.id);
                  setRoomToDelete(null);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
