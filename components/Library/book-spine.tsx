import type { BookSpineProps } from "@/lib/types";

// Paleta editorial de colores elegantes para lomos físicos
const SPINE_PALETTE = [
  { bg: "bg-amber-800", border: "border-amber-950", text: "text-amber-100", accent: "border-amber-400/40" },
  { bg: "bg-blue-900", border: "border-blue-950", text: "text-blue-100", accent: "border-blue-300/40" },
  { bg: "bg-emerald-800", border: "border-emerald-950", text: "text-emerald-100", accent: "border-emerald-300/40" },
  { bg: "bg-rose-900", border: "border-rose-950", text: "text-rose-100", accent: "border-rose-300/40" },
  { bg: "bg-indigo-900", border: "border-indigo-950", text: "text-indigo-100", accent: "border-indigo-300/40" },
  { bg: "bg-stone-800", border: "border-stone-950", text: "text-stone-100", accent: "border-stone-400/40" },
  { bg: "bg-teal-800", border: "border-teal-950", text: "text-teal-100", accent: "border-teal-300/40" },
  { bg: "bg-purple-900", border: "border-purple-950", text: "text-purple-100", accent: "border-purple-300/40" },
];

function getSpineStyle(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const color = SPINE_PALETTE[hash % SPINE_PALETTE.length];
  // Variación sutil de altura entre 82% y 96%
  const heightPercent = 82 + (hash % 15);
  // Ancho del lomo entre 20px y 30px
  const widthPx = 20 + ((hash >> 4) % 11);
  return { color, heightPercent, widthPx };
}

export function BookSpine({
  book,
  selected,
  highlighted,
  dimmed,
  locationLabel,
  onSelect,
}: BookSpineProps) {
  const { color, heightPercent, widthPx } = getSpineStyle(book.id);

  const state = [
    selected ? "seleccionado" : null,
    highlighted ? "encontrado" : null,
    dimmed ? "atenuado" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      type="button"
      aria-label={`${book.title}, ${book.author}, ${locationLabel}${state ? `, ${state}` : ""}`}
      aria-pressed={selected}
      onClick={() => onSelect?.(book.id)}
      style={{
        height: `${heightPercent}%`,
        width: `${widthPx}px`,
      }}
      className={`
        relative group flex flex-col justify-between items-center rounded-sm transition-all duration-200
        cursor-pointer shrink-0 select-none book-spine-shadow border-r border-l ${color.bg} ${color.border}
        ${dimmed ? "opacity-25 grayscale hover:opacity-75 hover:grayscale-0" : "opacity-100"}
        ${highlighted ? "ring-2 ring-amber-400 scale-105 z-20 shadow-lg shadow-amber-400/30" : ""}
        ${selected ? "ring-2 ring-blue-400 -translate-y-2 z-20 shadow-xl" : "hover:-translate-y-1 hover:z-10"}
      `}
    >
      {/* Detalle de costilla superior del lomo */}
      <div className={`w-full h-1.5 border-t border-b ${color.accent} mt-1`} />

      {/* Título en vertical */}
      <div className="flex-1 overflow-hidden flex items-center justify-center py-1">
        <span
          className={`text-[9px] font-medium leading-none tracking-tight ${color.text} whitespace-nowrap overflow-hidden text-ellipsis`}
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            maxHeight: "90%",
          }}
        >
          {book.title}
        </span>
      </div>

      {/* Detalle de costilla inferior */}
      <div className={`w-full h-1 border-t border-b ${color.accent} mb-1`} />

      {/* Tooltip con información rápida */}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center px-2 py-1 bg-slate-950/95 text-slate-100 text-[10px] rounded shadow-xl whitespace-nowrap z-30 pointer-events-none border border-slate-700">
        <span className="font-semibold text-amber-300">{book.title}</span>
        <span className="text-slate-400 text-[9px]">{book.author}</span>
      </span>
    </button>
  );
}
