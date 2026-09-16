/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const iconsDir = path.join(__dirname, "..", "public", "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// SVG para icono estándar (sin padding excesivo)
const standardSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0b1120" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="kallaxGrad" x1="60" y1="60" x2="452" y2="452" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#818cf8" stop-opacity="0.8" />
    </linearGradient>
    <linearGradient id="bookAmber" x1="160" y1="180" x2="360" y2="380" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <linearGradient id="bookSpine" x1="150" y1="180" x2="190" y2="380" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Fondo con esquinas redondeadas -->
  <rect width="512" height="512" rx="108" fill="url(#bgGrad)" />
  <rect x="8" y="8" width="496" height="496" rx="100" stroke="#1e293b" stroke-width="4" fill="none" />

  <!-- Estructura de Estantería Kallax (2x2 compartimentos estilizados) -->
  <g filter="url(#glow)">
    <rect x="96" y="96" width="320" height="320" rx="28" stroke="url(#kallaxGrad)" stroke-width="12" fill="none" opacity="0.6" />
    <!-- Divisores central horizontal y vertical -->
    <line x1="96" y1="256" x2="416" y2="256" stroke="url(#kallaxGrad)" stroke-width="10" stroke-linecap="round" opacity="0.6" />
    <line x1="256" y1="96" x2="256" y2="416" stroke="url(#kallaxGrad)" stroke-width="10" stroke-linecap="round" opacity="0.6" />
  </g>

  <!-- Libros estilizados en el compartimento superior izquierdo -->
  <rect x="132" y="140" width="22" height="84" rx="4" fill="#38bdf8" opacity="0.85" />
  <rect x="160" y="130" width="26" height="94" rx="4" fill="#818cf8" opacity="0.85" />
  <rect x="192" y="150" width="20" height="74" rx="4" fill="#34d399" opacity="0.85" />

  <!-- Libro emblemático central/principal de la Biblioteca Digital -->
  <g filter="url(#glow)">
    <!-- Libro abierto con perspectiva -->
    <path d="M190 286C224 274 252 274 256 276C260 274 288 274 322 286V378C288 366 260 366 256 368C252 366 224 366 190 378V286Z" fill="#fef3c7" />
    <path d="M190 286C224 274 252 274 256 276V368C252 366 224 366 190 378V286Z" fill="#fde68a" />
    
    <!-- Cubierta del libro -->
    <path d="M184 288C220 276 252 276 256 278C260 276 292 276 328 288V384C292 372 260 372 256 374C252 372 220 372 184 384V288Z" stroke="url(#bookAmber)" stroke-width="8" stroke-linejoin="round" fill="none" />
    <line x1="256" y1="278" x2="256" y2="374" stroke="#d97706" stroke-width="4" stroke-linecap="round" />
  </g>

  <!-- Destello de Digitalización / IA espacial -->
  <circle cx="340" cy="180" r="16" fill="#f59e0b" filter="url(#glow)" />
  <path d="M340 162V198M322 180H358" stroke="#fde68a" stroke-width="4" stroke-linecap="round" />
</svg>
`;

// SVG para icono Maskable (con safe zone del 20% en bordes para Android Adaptive Icons)
const maskableSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradMask" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0b1120" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="kallaxGradMask" x1="100" y1="100" x2="412" y2="412" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#818cf8" />
    </linearGradient>
    <linearGradient id="bookAmberMask" x1="200" y1="200" x2="340" y2="340" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
  </defs>

  <!-- Fondo completo cuadrado para soportar cualquier recorte de Android -->
  <rect width="512" height="512" fill="url(#bgGradMask)" />

  <!-- Grupo escalado al 80% centrado en la zona segura (safe-zone de 51.2px de padding) -->
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <!-- Estantería Kallax -->
    <rect x="96" y="96" width="320" height="320" rx="28" stroke="url(#kallaxGradMask)" stroke-width="12" fill="none" opacity="0.6" />
    <line x1="96" y1="256" x2="416" y2="256" stroke="url(#kallaxGradMask)" stroke-width="10" stroke-linecap="round" opacity="0.6" />
    <line x1="256" y1="96" x2="256" y2="416" stroke="url(#kallaxGradMask)" stroke-width="10" stroke-linecap="round" opacity="0.6" />

    <!-- Libros en el compartimento superior izquierdo -->
    <rect x="132" y="140" width="22" height="84" rx="4" fill="#38bdf8" opacity="0.85" />
    <rect x="160" y="130" width="26" height="94" rx="4" fill="#818cf8" opacity="0.85" />
    <rect x="192" y="150" width="20" height="74" rx="4" fill="#34d399" opacity="0.85" />

    <!-- Libro emblemático central -->
    <path d="M190 286C224 274 252 274 256 276C260 274 288 274 322 286V378C288 366 260 366 256 368C252 366 224 366 190 378V286Z" fill="#fef3c7" />
    <path d="M190 286C224 274 252 274 256 276V368C252 366 224 366 190 378V286Z" fill="#fde68a" />
    <path d="M184 288C220 276 252 276 256 278C260 276 292 276 328 288V384C292 372 260 372 256 374C252 372 220 372 184 384V288Z" stroke="url(#bookAmberMask)" stroke-width="8" stroke-linejoin="round" fill="none" />
    <line x1="256" y1="278" x2="256" y2="374" stroke="#d97706" stroke-width="4" stroke-linecap="round" />

    <!-- Destello -->
    <circle cx="340" cy="180" r="16" fill="#f59e0b" />
    <path d="M340 162V198M322 180H358" stroke="#fde68a" stroke-width="4" stroke-linecap="round" />
  </g>
</svg>
`;

async function generateIcons() {
  console.log("Generando iconos de PWA para Android...");

  const standardBuffer = Buffer.from(standardSvg);
  const maskableBuffer = Buffer.from(maskableSvg);

  // 1. icon-192x192.png
  await sharp(standardBuffer)
    .resize(192, 192)
    .png({ quality: 95 })
    .toFile(path.join(iconsDir, "icon-192x192.png"));
  console.log("✓ Generado icon-192x192.png");

  // 2. icon-512x512.png
  await sharp(standardBuffer)
    .resize(512, 512)
    .png({ quality: 95 })
    .toFile(path.join(iconsDir, "icon-512x512.png"));
  console.log("✓ Generado icon-512x512.png");

  // 3. maskable-icon-512x512.png
  await sharp(maskableBuffer)
    .resize(512, 512)
    .png({ quality: 95 })
    .toFile(path.join(iconsDir, "maskable-icon-512x512.png"));
  console.log("✓ Generado maskable-icon-512x512.png");

  // 4. Copia favicon/icon para navegador general
  await sharp(standardBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(__dirname, "..", "public", "icon.png"));
  console.log("✓ Generado public/icon.png");

  console.log("¡Iconos PWA para Android creados con éxito!");
}

generateIcons().catch((err) => {
  console.error("Error al generar iconos:", err);
  process.exit(1);
});
