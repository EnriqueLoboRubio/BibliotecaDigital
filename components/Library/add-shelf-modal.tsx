"use client";

import { useState, useId } from "react";

interface AddShelfModalProps {
  roomName: string;
  onClose: () => void;
  onCreateShelf: (
    name: string,
    columns: number,
    rows: number,
    disabledCellKeys?: string[],
  ) => void;
}

const PRESETS = [
  { name: "Kallax 2×4", cols: 2, rows: 4 },
  { name: "Kallax 4×2", cols: 4, rows: 2 },
  { name: "Kallax 2×2", cols: 2, rows: 2 },
  { name: "Kallax 3×3", cols: 3, rows: 3 },
  { name: "Kallax 1×4", cols: 1, rows: 4 },
  { name: "Kallax 5×5", cols: 5, rows: 5 },
];

export function AddShelfModal({
  roomName,
  onClose,
  onCreateShelf,
}: AddShelfModalProps) {
  const [name, setName] = useState("Kallax 2×4 Auxiliar");
  const [columns, setColumns] = useState(2);
  const [rows, setRows] = useState(4);
  const [disabledKeys, setDisabledKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const nameId = useId();
  const colsId = useId();
  const rowsId = useId();

  const handleApplyPreset = (preset: { name: string; cols: number; rows: number }) => {
    setName(preset.name);
    setColumns(preset.cols);
    setRows(preset.rows);
    // Limpiar cubos desactivados fuera de los nuevos límites
    setDisabledKeys((prev) => {
      const next = new Set<string>();
      prev.forEach((k) => {
        const [r, c] = k.split(":").map(Number);
        if (r <= preset.rows && c <= preset.cols) next.add(k);
      });
      return next;
    });
  };

  const toggleCell = (r: number, c: number) => {
    const key = `${r}:${c}`;
    setDisabledKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSetAllUseful = () => {
    setDisabledKeys(new Set());
  };

  const handleInvertSelection = () => {
    setDisabledKeys((prev) => {
      const next = new Set<string>();
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= columns; c++) {
          const key = `${r}:${c}`;
          if (!prev.has(key)) next.add(key);
        }
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre del mueble es obligatorio.");
      return;
    }
    if (columns < 1 || columns > 8 || rows < 1 || rows > 8) {
      setError("Las columnas y filas deben estar entre 1 y 8.");
      return;
    }

    onCreateShelf(name.trim(), columns, rows, Array.from(disabledKeys));
    onClose();
  };

  const totalCubes = columns * rows;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-shelf-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-[#0f172a] border border-slate-700 shadow-2xl p-6 text-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase text-blue-400 font-semibold tracking-wider block mb-1">
              Habitación: {roomName}
            </span>
            <h2 id="add-shelf-title" className="text-xl font-bold text-white">
              Añadir Mueble Personalizado
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Diseña una nueva estantería indicando sus dimensiones exactas de cubos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200">
            {error}
          </div>
        )}

        {/* Plantillas / Presets rápidos */}
        <div>
          <span className="text-[11px] text-slate-400 font-medium block mb-2">
            Plantillas habituales de estanterías IKEA Kallax:
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  columns === p.cols && rows === p.rows
                    ? "bg-blue-600/30 text-blue-300 border-blue-500"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          <div>
            <label htmlFor={nameId} className="block text-slate-300 font-medium mb-1">
              Nombre identificador del mueble *
            </label>
            <input
              id={nameId}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Kallax 2×4 Salón"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor={colsId} className="block text-slate-300 font-medium mb-1">
                Columnas de cubos ({columns})
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={colsId}
                  type="range"
                  min={1}
                  max={6}
                  value={columns}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setColumns(val);
                    setDisabledKeys((prev) => {
                      const next = new Set<string>();
                      prev.forEach((k) => {
                        const [r, c] = k.split(":").map(Number);
                        if (r <= rows && c <= val) next.add(k);
                      });
                      return next;
                    });
                  }}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <span className="font-mono text-sm font-bold text-blue-400 w-5 text-center">
                  {columns}
                </span>
              </div>
            </div>

            <div>
              <label htmlFor={rowsId} className="block text-slate-300 font-medium mb-1">
                Filas de cubos ({rows})
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={rowsId}
                  type="range"
                  min={1}
                  max={6}
                  value={rows}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setRows(val);
                    setDisabledKeys((prev) => {
                      const next = new Set<string>();
                      prev.forEach((k) => {
                        const [r, c] = k.split(":").map(Number);
                        if (r <= val && c <= columns) next.add(k);
                      });
                      return next;
                    });
                  }}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <span className="font-mono text-sm font-bold text-blue-400 w-5 text-center">
                  {rows}
                </span>
              </div>
            </div>
          </div>

          {/* Configuración interactiva de compartimentos disponibles y bloqueados */}
          <div className="border border-slate-800 rounded-xl bg-slate-950/80 p-4 flex flex-col gap-3">
            <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-slate-200 font-semibold block">Distribución de compartimentos:</span>
                <span className="text-[11px] text-slate-400">
                  Haz clic en cualquier hueco para marcarlo como <strong>Disponible</strong> o <strong>Bloqueado</strong> (para cajas, adornos u objetos).
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 text-[11px] font-medium">
                  {totalCubes - disabledKeys.size} disponibles
                </span>
                {disabledKeys.size > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-700/60 text-amber-300 text-[11px] font-medium">
                    {disabledKeys.size} bloqueados
                  </span>
                )}
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-900 text-[11px]">
              <span className="text-slate-500">
                {columns} columnas × {rows} filas ({totalCubes} compartimentos)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSetAllUseful}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                >
                  Habilitar todos
                </button>
                <button
                  type="button"
                  onClick={handleInvertSelection}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                >
                  Invertir
                </button>
              </div>
            </div>

            {/* Cuadrícula interactiva con selección de cubos */}
            <div className="w-full flex justify-center py-2">
              <div
                className="kallax-outer-frame rounded-md border-4 border-slate-700 bg-slate-900 p-2 shadow-xl max-w-[340px] w-full"
              >
                <div
                  className="grid gap-1.5"
                  style={{
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: totalCubes }).map((_, idx) => {
                    const r = Math.floor(idx / columns) + 1;
                    const c = (idx % columns) + 1;
                    const key = `${r}:${c}`;
                    const isDisabled = disabledKeys.has(key);

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleCell(r, c)}
                        title={`Fila ${r}, Columna ${c}: ${isDisabled ? "Bloqueado (haz clic para habilitar)" : "Disponible (haz clic para bloquear)"}`}
                        className={`aspect-square rounded p-1 flex flex-col items-center justify-center text-center transition-all cursor-pointer shadow-inner select-none ${
                          isDisabled
                            ? "bg-slate-900/80 pattern-disabled border border-slate-800 opacity-70 hover:opacity-100 hover:border-slate-600"
                            : "bg-gradient-to-b from-[#0e1626] to-[#0a0f1d] border border-emerald-500/40 hover:border-emerald-400 shadow-md shadow-emerald-950/20"
                        }`}
                      >
                        <span
                          className={`text-[9px] font-mono font-bold leading-none ${
                            isDisabled ? "text-slate-400" : "text-emerald-400"
                          }`}
                        >
                          {r}·{c}
                        </span>
                        <span
                          className={`text-[8px] font-semibold mt-0.5 uppercase tracking-tighter leading-none ${
                            isDisabled ? "text-slate-400" : "text-emerald-300"
                          }`}
                        >
                          {isDisabled ? "Bloqueado" : "Libre"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Crear estantería en la habitación</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
