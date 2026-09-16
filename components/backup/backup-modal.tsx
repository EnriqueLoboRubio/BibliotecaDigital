"use client";

import { useRef, useState } from "react";
import type { LibraryCatalog, Room } from "@/lib/types";
import { useAuth } from "@/lib/auth/context";
import {
  downloadCatalogBackupJson,
  downloadBooksCsv,
  validateBackupJson,
  restoreBackupToStorage,
  type LibraryBackupData,
} from "@/lib/data/backup";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: LibraryCatalog;
  rooms: Room[];
  onBackupRestored?: (restoredCatalog: LibraryCatalog) => void;
}

export function BackupModal({
  isOpen,
  onClose,
  catalog,
  rooms,
  onBackupRestored,
}: BackupModalProps) {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<"export" | "restore">("export");
  const [dragOver, setDragOver] = useState(false);
  const [previewBackup, setPreviewBackup] = useState<LibraryBackupData | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !isAdmin) return null;

  const handleProcessFile = (file: File) => {
    setValidationError(null);
    setRestoreSuccess(null);
    setPreviewBackup(null);

    if (!file.name.endsWith(".json")) {
      setValidationError("Por favor, selecciona un archivo de copia de seguridad con extensión .json.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        const result = validateBackupJson(parsed);

        if (!result.valid || !result.backup) {
          setValidationError(result.error || "El archivo no contiene un formato de respaldo compatible.");
        } else {
          setPreviewBackup(result.backup);
        }
      } catch {
        setValidationError("Error al leer el archivo. Asegúrate de que es un archivo JSON válido.");
      }
    };
    reader.onerror = () => {
      setValidationError("Ocurrió un error al cargar el archivo desde el dispositivo.");
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!previewBackup) return;
    setIsRestoring(true);
    setValidationError(null);

    try {
      const res = await restoreBackupToStorage(previewBackup);
      setIsRestoring(false);
      setRestoreSuccess(
        `Biblioteca restaurada con éxito: ${res.bookCount} libros, ${res.shelfCount} estanterías y ${res.roomCount} estancias.`,
      );
      if (onBackupRestored) {
        onBackupRestored({
          room: previewBackup.rooms[0] || catalog.room,
          rooms: previewBackup.rooms,
          shelves: previewBackup.shelves,
          cells: previewBackup.cells,
          books: previewBackup.books,
        });
      }
      setPreviewBackup(null);
    } catch {
      setIsRestoring(false);
      setValidationError("No se pudo restaurar la copia de seguridad en el almacenamiento.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-750 shadow-2xl flex flex-col text-slate-100 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-md">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="backup-modal-title" className="text-base font-bold text-white tracking-tight">
                  Copias de Seguridad
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-950/80 border border-purple-700/60 text-purple-300 uppercase">
                  Solo Administrador
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Exporta o restaura todo el catálogo y distribución de tu biblioteca física
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Cerrar modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Selector de Pestañas */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab("export");
              setValidationError(null);
              setRestoreSuccess(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "export"
                ? "bg-slate-800 text-white shadow-sm border border-slate-700"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Exportar Copia</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("restore");
              setValidationError(null);
              setRestoreSuccess(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "restore"
                ? "bg-slate-800 text-white shadow-sm border border-slate-700"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Restaurar Copia</span>
          </button>
        </div>

        {/* Contenido de la pestaña */}
        <div className="p-5 flex flex-col gap-4">
          {restoreSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 text-xs flex items-center gap-2.5">
              <span className="text-base shrink-0">✓</span>
              <span>{restoreSuccess}</span>
            </div>
          )}

          {validationError && (
            <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-800/80 text-red-200 text-xs flex items-center gap-2.5">
              <span className="text-base shrink-0">⚠️</span>
              <span>{validationError}</span>
            </div>
          )}

          {activeTab === "export" ? (
            /* PESTAÑA: EXPORTAR */
            <div className="flex flex-col gap-3.5">
              <p className="text-xs text-slate-300 leading-relaxed">
                Descarga una copia completa de tus datos para tener la tranquilidad de que nunca perderás la información de tu biblioteca física.
              </p>

              {/* Opción 1: Respaldo JSON completo */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-blue-500/40 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Respaldo Completo (JSON)</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-700/60">
                      Recomendado
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Incluye estancias, estanterías, compartimentos, profundidades y todos tus libros con sus posiciones.
                  </p>
                  <span className="text-[10px] font-mono text-slate-500 block">
                    {catalog.books.length} libros • {catalog.shelves.length} estanterías
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => downloadCatalogBackupJson(catalog, rooms)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Descargar JSON</span>
                </button>
              </div>

              {/* Opción 2: Exportar a CSV / Excel */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-emerald-500/40 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Catálogo de Libros (CSV / Excel)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Archivo en hoja de cálculo con título, autor, ISBN, año, género y coordenadas físicas exactas.
                  </p>
                  <span className="text-[10px] font-mono text-slate-500 block">
                    Compatible con Excel, Numbers y Google Sheets
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => downloadBooksCsv(catalog, rooms)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 border border-emerald-500/40 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Descargar CSV</span>
                </button>
              </div>
            </div>
          ) : (
            /* PESTAÑA: RESTAURAR */
            <div className="flex flex-col gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProcessFile(file);
                }}
              />

              {!previewBackup ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleProcessFile(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all ${
                    dragOver
                      ? "border-amber-400 bg-amber-950/20"
                      : "border-slate-700 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/70"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-850 border border-slate-750 flex items-center justify-center text-amber-400 shadow-inner">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Arrastra tu archivo JSON de copia de seguridad aquí
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      o haz clic para examinar desde tus archivos
                    </span>
                  </div>
                </div>
              ) : (
                /* Vista previa de los datos a restaurar */
                <div className="p-4 rounded-xl bg-slate-950/90 border border-amber-500/40 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-amber-300">
                      Respaldo verificado listo para restaurar
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewBackup(null)}
                      className="text-[11px] text-slate-400 hover:text-white"
                    >
                      Cambiar archivo
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-lg font-bold text-white block">{previewBackup.books.length}</span>
                      <span className="text-[10px] text-slate-400">Libros</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-lg font-bold text-white block">{previewBackup.shelves.length}</span>
                      <span className="text-[10px] text-slate-400">Estanterías</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-lg font-bold text-white block">{previewBackup.rooms.length}</span>
                      <span className="text-[10px] text-slate-400">Estancias</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-amber-200/80 leading-relaxed bg-amber-950/40 p-2.5 rounded-lg border border-amber-600/30">
                    ⚠️ <strong>Atención:</strong> Al restaurar, se sustituirá el catálogo local actual con el contenido de este respaldo.
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPreviewBackup(null)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isRestoring}
                      onClick={handleConfirmRestore}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 active:bg-amber-700 shadow-md shadow-amber-950/50 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isRestoring ? (
                        <span>Restaurando...</span>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Confirmar y Restaurar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <span className="text-slate-500">Biblioteca Digital • Copias y Restauración</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
