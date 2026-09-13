import type { LocationBreadcrumbProps } from "@/lib/types";

export function LocationBreadcrumb({
  location,
  onSelectShelf,
  onSelectCell,
}: LocationBreadcrumbProps) {
  const isBehind = location.depth > 1;

  return (
    <nav aria-label="Localización física" className="flex flex-wrap items-center gap-1.5 text-xs">
      <button
        type="button"
        onClick={() => onSelectShelf?.(location.shelfId)}
        className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700 transition-colors"
      >
        {location.shelfName}
      </button>

      <span className="text-slate-500">›</span>

      <button
        type="button"
        onClick={() => onSelectCell?.(location.row, location.column)}
        className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700 transition-colors"
      >
        Fila {location.row}
      </button>

      <span className="text-slate-500">›</span>

      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium border border-slate-700">
        Columna {location.column}
      </span>

      <span className="text-slate-500">›</span>

      <span
        className={`px-2 py-0.5 rounded-md font-semibold ${
          isBehind
            ? "bg-amber-950/80 text-amber-300 border border-amber-700/60"
            : "bg-blue-950/80 text-blue-300 border border-blue-700/60"
        }`}
      >
        {location.depthLabel}
      </span>

      <span className="text-slate-500">›</span>

      <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-mono font-bold">
        Pos. #{location.position}
      </span>
    </nav>
  );
}
