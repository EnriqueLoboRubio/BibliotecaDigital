import type { RoomPlanProps } from "@/lib/types";
import { ShelfUnit } from "./shelf-unit";

export function RoomPlan({
  shelves,
  cells,
  books,
  highlightedBookId,
  selectedBookId,
  onSelectShelf,
}: RoomPlanProps) {
  return (
    <section aria-label="Plano de la habitación" className="w-full flex flex-col gap-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Plano de Distribución de la Habitación</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Vista general de los {shelves.length} {shelves.length === 1 ? "mueble colocado" : "muebles colocados"} en la estancia. Haz clic en cualquiera para enfocarlo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start justify-items-center">
        {shelves.map((shelf) => {
          const shelfCells = cells.filter((cell) => cell.shelfId === shelf.id);
          const shelfBooks = books.filter((book) => book.location.shelfId === shelf.id);

          return (
            <div
              key={shelf.id}
              onClick={() => onSelectShelf(shelf.id)}
              className="w-full flex flex-col items-center group cursor-pointer p-4 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/80 transition-all shadow-xl"
            >
              <div className="w-full flex items-center justify-between mb-3 px-2">
                <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                  {shelf.name}
                </span>
                <span className="text-[11px] text-blue-400 font-medium group-hover:underline">
                  Abrir mueble →
                </span>
              </div>

              <div className="w-full pointer-events-none">
                <ShelfUnit
                  shelf={shelf}
                  cells={shelfCells}
                  books={shelfBooks}
                  density="room"
                  highlightedBookId={highlightedBookId}
                  selectedBookId={selectedBookId}
                  onSelectShelf={onSelectShelf}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
