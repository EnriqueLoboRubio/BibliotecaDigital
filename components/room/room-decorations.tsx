export function FloorPlant() {
  return (
    <div className="relative w-40 sm:w-56 h-80 sm:h-96 flex flex-col items-center justify-end select-none pointer-events-none drop-shadow-2xl">
      {/* Hojas y tallos de la Monstera */}
      <svg
        viewBox="0 0 200 320"
        className="w-full h-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="leafGrad1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#15803d" />
            <stop offset="50%" stopColor="#166534" />
            <stop offset="100%" stopColor="#14532d" />
          </linearGradient>
          <linearGradient id="leafGrad2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="60%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#0f4422" />
          </linearGradient>
          <linearGradient id="potGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c2410c" />
            <stop offset="100%" stopColor="#7c2d12" />
          </linearGradient>
        </defs>

        {/* Tallos traseros */}
        <path d="M100 240 Q70 180 40 130" stroke="#166534" strokeWidth="4" strokeLinecap="round" />
        <path d="M100 240 Q130 170 160 110" stroke="#166534" strokeWidth="4" strokeLinecap="round" />
        <path d="M100 240 Q90 140 80 70" stroke="#166534" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M100 240 Q120 180 140 170" stroke="#166534" strokeWidth="3.5" strokeLinecap="round" />

        {/* Hoja izquierda baja */}
        <g transform="translate(30, 110) rotate(-25)">
          <path
            d="M0 0 C-40 -10 -50 40 0 60 C50 40 40 -10 0 0 Z"
            fill="url(#leafGrad1)"
          />
          <path d="M0 0 L0 55" stroke="#14532d" strokeWidth="2" />
        </g>

        {/* Hoja derecha media */}
        <g transform="translate(150, 95) rotate(30)">
          <path
            d="M0 0 C-45 -15 -55 50 0 70 C55 50 45 -15 0 0 Z"
            fill="url(#leafGrad2)"
          />
          <path d="M0 0 L0 65" stroke="#14532d" strokeWidth="2" />
        </g>

        {/* Hoja central alta (grande, protagonista con recortes Monstera) */}
        <g transform="translate(80, 50) rotate(-8)">
          <path
            d="M0 0 C-60 -20 -70 65 0 95 C70 65 60 -20 0 0 Z"
            fill="url(#leafGrad2)"
          />
          <path d="M0 0 L0 90" stroke="#14532d" strokeWidth="2.5" />
          {/* Recortes de monstera en hojas */}
          <ellipse cx="-28" cy="40" rx="4" ry="12" transform="rotate(-30 -28 40)" fill="#090d16" />
          <ellipse cx="-32" cy="65" rx="3.5" ry="10" transform="rotate(-45 -32 65)" fill="#090d16" />
          <ellipse cx="28" cy="45" rx="4" ry="12" transform="rotate(30 28 45)" fill="#090d16" />
          <ellipse cx="30" cy="70" rx="3.5" ry="10" transform="rotate(45 30 70)" fill="#090d16" />
        </g>

        {/* Hoja frontal derecha baja */}
        <g transform="translate(130, 160) rotate(45)">
          <path
            d="M0 0 C-30 -10 -40 35 0 50 C40 35 30 -10 0 0 Z"
            fill="url(#leafGrad1)"
          />
          <path d="M0 0 L0 45" stroke="#14532d" strokeWidth="1.5" />
        </g>

        {/* Maceta de terracota */}
        <ellipse cx="100" cy="240" rx="36" ry="7" fill="#54210d" />
        <path
          d="M66 240 L72 300 C74 308 126 308 128 300 L134 240 Z"
          fill="url(#potGrad)"
        />
        <ellipse cx="100" cy="240" rx="34" ry="6" fill="#381a0e" />

        {/* Soporte / patas de madera de la maceta */}
        <path d="M68 280 L62 318" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
        <path d="M132 280 L138 318" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
        <path d="M100 285 L100 320" stroke="#5a270b" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function ShelfDecorations() {
  return (
    <div className="w-full flex items-end justify-between px-6 sm:px-12 mb-[-6px] relative z-20 pointer-events-none select-none">
      {/* Izquierda: Lámpara de diseño nórdico con resplandor cálido */}
      <div className="relative flex flex-col items-center">
        {/* Cono de luz cálida ambiental */}
        <div
          className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full pointer-events-none opacity-40 blur-2xl"
          style={{
            background: "radial-gradient(circle, rgba(251, 191, 36, 0.45) 0%, rgba(245, 158, 11, 0.15) 50%, transparent 75%)",
          }}
        />

        <svg viewBox="0 0 80 80" className="w-16 sm:w-20 h-16 sm:h-20 overflow-visible" fill="none">
          {/* Base de la lámpara */}
          <rect x="25" y="72" width="30" height="4" rx="2" fill="#334155" />
          {/* Brazo metálico curvo */}
          <path d="M40 72 L40 38 Q40 22 55 20" stroke="#64748b" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Pantalla acampanada */}
          <path d="M48 24 L68 24 L74 38 L44 38 Z" fill="#f8fafc" />
          {/* Bombilla cálida encendida */}
          <circle cx="58" cy="38" r="4" fill="#fbbf24" filter="drop-shadow(0 0 6px #f59e0b)" />
        </svg>
      </div>

      {/* Centro: Pequeña escultura geométrica / reloj minimalista */}
      <div className="hidden sm:flex items-end gap-3 pb-1">
        {/* Pila de dos libros decorativos horizontales */}
        <div className="flex flex-col items-center">
          <div className="w-14 h-2 rounded-sm bg-amber-900/90 border-t border-amber-700 shadow-sm" />
          <div className="w-16 h-2.5 rounded-sm bg-slate-800 border-t border-slate-700 shadow" />
        </div>

        {/* Jarrón cerámico esférico */}
        <svg viewBox="0 0 30 35" className="w-7 h-8" fill="none">
          <ellipse cx="15" cy="22" rx="11" ry="12" fill="#475569" />
          <path d="M12 10 L18 10 L18 14 L12 14 Z" fill="#64748b" />
          <ellipse cx="15" cy="10" rx="3.5" ry="1.5" fill="#334155" />
          {/* Ramita seca decorativa */}
          <path d="M15 10 Q14 2 10 -4" stroke="#d97706" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M12 4 Q7 2 5 0" stroke="#d97706" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </div>

      {/* Derecha: Maceta pequeña con potos cuyas hojas caen sobre el mueble */}
      <div className="relative flex flex-col items-center">
        <svg viewBox="0 0 90 70" className="w-20 sm:w-24 h-16 sm:h-18 overflow-visible" fill="none">
          {/* Maceta de cerámica blanca */}
          <ellipse cx="45" cy="32" rx="14" ry="4" fill="#64748b" />
          <path d="M32 32 L35 52 C36 55 54 55 55 52 L58 32 Z" fill="#f1f5f9" />
          <ellipse cx="45" cy="32" rx="13" ry="3" fill="#334155" />

          {/* Hojas del potos que caen suavemente por el lateral */}
          {/* Hojas superiores */}
          <circle cx="40" cy="28" r="6" fill="#16a34a" />
          <circle cx="50" cy="27" r="5.5" fill="#22c55e" />
          <circle cx="46" cy="23" r="5" fill="#15803d" />
          <circle cx="34" cy="26" r="4.5" fill="#4ade80" />

          {/* Guías de enredadera colgando por la repisa */}
          <path d="M35 34 Q28 45 25 62" stroke="#16a34a" strokeWidth="1.5" fill="none" />
          <ellipse cx="27" cy="48" rx="4" ry="2.5" transform="rotate(-30 27 48)" fill="#22c55e" />
          <ellipse cx="24" cy="62" rx="3.5" ry="2" transform="rotate(-20 24 62)" fill="#16a34a" />

          <path d="M54 34 Q58 48 64 66" stroke="#16a34a" strokeWidth="1.5" fill="none" />
          <ellipse cx="60" cy="50" rx="4.5" ry="2.5" transform="rotate(35 60 50)" fill="#4ade80" />
          <ellipse cx="64" cy="66" rx="3.5" ry="2" transform="rotate(25 64 66)" fill="#22c55e" />
        </svg>
      </div>
    </div>
  );
}

export function WallArt() {
  return (
    <div className="hidden sm:flex flex-col items-center select-none pointer-events-none mb-4">
      {/* Marco de cuadro artístico en la pared */}
      <div className="p-2 rounded-lg bg-slate-900 border-2 border-slate-700 shadow-2xl">
        <div className="w-44 h-24 rounded bg-gradient-to-tr from-[#1e1b4b] via-[#312e81] to-[#4338ca] flex items-center justify-center p-3 relative overflow-hidden">
          {/* Arte abstracto geométrico moderno */}
          <div className="w-14 h-14 rounded-full bg-amber-400/90 shadow-lg" />
          <div className="w-16 h-10 rounded-t-full bg-emerald-500/80 absolute bottom-0 left-6 backdrop-blur-sm" />
          <div className="w-10 h-16 rounded-t-full bg-rose-500/80 absolute bottom-0 right-8 backdrop-blur-sm" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      </div>
    </div>
  );
}
