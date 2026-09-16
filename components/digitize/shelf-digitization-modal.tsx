import { useState, useRef, useMemo, useEffect } from "react";
import type {
  Book,
  CandidateConfidence,
  DigitizationCandidate,
  DigitizeShelfRequest,
  DigitizeShelfResponse,
  Shelf,
  ShelfCell,
} from "@/lib/types";

interface ShelfDigitizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  shelf: Shelf;
  cells: ShelfCell[];
  existingBooks: Book[];
  initialCell?: { row: number; column: number; depth: number };
  onConfirmBooks: (books: Book[]) => void;
}

export function ShelfDigitizationModal({
  isOpen,
  onClose,
  shelf,
  cells,
  existingBooks,
  initialCell,
  onConfirmBooks,
}: ShelfDigitizationModalProps) {
  const [mode, setMode] = useState<"full-shelf" | "single-cube">(
    initialCell ? "single-cube" : "full-shelf",
  );
  const [selectedCell, setSelectedCell] = useState<{ row: number; column: number; depth: number }>(
    initialCell || { row: 1, column: 1, depth: 1 },
  );
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<DigitizationCandidate[]>([]);
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null);
  const [filteredObjectsCount, setFilteredObjectsCount] = useState<number>(0);

  // Estados y referencias para la cámara en directo
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraFileInputRef = useRef<HTMLInputElement>(null);

  // Celdas habilitadas del mueble actual
  const enabledCells = useMemo(
    () => cells.filter((c) => c.shelfId === shelf.id && c.enabled),
    [cells, shelf.id],
  );

  const enabledCellKeys = useMemo(
    () => new Set(enabledCells.map((c) => `${c.row}-${c.column}`)),
    [enabledCells],
  );

  // Detener la cámara web de forma limpia
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Iniciar la transmisión de la cámara web
  const startCamera = async (facing: "environment" | "user" = cameraFacing) => {
    stopCamera();
    setErrorMessage(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        cameraFileInputRef.current?.click();
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.warn("[Camera] Error accediendo a getUserMedia:", err);
      // Fallback a selector de cámara nativo
      cameraFileInputRef.current?.click();
    }
  };

  // Alternar entre cámara trasera y delantera
  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(nextFacing);
    if (isCameraActive) {
      void startCamera(nextFacing);
    }
  };

  // Capturar fotograma actual de la cámara web
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL("image/jpeg", 0.92);
    stopCamera();
    setImagePreview(base64);
    setErrorMessage(null);
    setCandidates([]);
    processImage(base64);
  };

  // Limpiar stream al desmontar el componente
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  // Manejar subida de archivo fotográfico
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      setErrorMessage(null);
      setCandidates([]);
      processImage(base64);
    };
    reader.onerror = () => {
      setErrorMessage("Ocurrió un error al leer el archivo de imagen.");
    };
    reader.readAsDataURL(file);
  };

  // Generar imagen de prueba para demostración instantánea
  const handleLoadSampleImage = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fondo del mueble estilo madera Kallax
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, 800, 800);

    // Dibujar cuadrícula 4x4
    const cellW = 800 / 4;
    const cellH = 800 / 4;
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 14;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        ctx.strokeRect(c * cellW, r * cellH, cellW, cellH);
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(c * cellW + 7, r * cellH + 7, cellW - 14, cellH - 14);
      }
    }

    // Dibujar lomos en Fila 1 Columna 1
    const spineColors = ["#b91c1c", "#1d4ed8", "#047857", "#b45309", "#6d28d9"];
    spineColors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(20 + i * 32, 40, 26, 140);
      ctx.fillStyle = "#ffffff";
      ctx.font = "10px sans-serif";
      ctx.fillText(`LIBRO ${i + 1}`, 22 + i * 32, 100);
    });

    // Dibujar planta en Fila 2 Columna 3 (objeto no-libro para demostrar filtro)
    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.arc(2 * cellW + 100, 1 * cellH + 110, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#78350f";
    ctx.fillRect(2 * cellW + 80, 1 * cellH + 130, 40, 40);

    const sampleBase64 = canvas.toDataURL("image/jpeg", 0.9);
    setImagePreview(sampleBase64);
    setErrorMessage(null);
    setCandidates([]);
    processImage(sampleBase64);
  };

  // Enviar imagen a la API de análisis multimodal
  const processImage = async (base64Data: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const payload: DigitizeShelfRequest = {
        imageBase64: base64Data,
        mode,
        shelfId: shelf.id,
        gridDimensions: { rows: shelf.rows, columns: shelf.columns },
        enabledCells: enabledCells.map((c) => ({
          shelfId: c.shelfId,
          row: c.row,
          column: c.column,
          depthCount: c.depthCount,
        })),
        existingBooks: existingBooks.map((b) => ({
          shelfId: b.location.shelfId,
          row: b.location.row,
          column: b.location.column,
          depth: b.location.depth,
          position: b.location.position,
        })),
        targetCell: mode === "single-cube" ? selectedCell : undefined,
      };

      const res = await fetch("/api/digitize/shelf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as DigitizeShelfResponse;

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Error analizando la fotografía.");
      }

      setCandidates(data.candidates || []);
      setFilteredObjectsCount(data.objectsFiltered || 0);

      if (data.message) {
        setInfoMessage(data.message);
      }
    } catch (err) {
      console.error("[Shelf Digitization] Error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "No se pudo procesar la imagen con IA.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Actualizar metadatos de un candidato
  const updateCandidate = (tempId: string, updates: Partial<DigitizationCandidate>) => {
    setCandidates((prev) =>
      prev.map((c) => (c.tempId === tempId ? { ...c, ...updates } : c)),
    );
  };

  // Descartar candidato
  const removeCandidate = (tempId: string) => {
    setCandidates((prev) => prev.filter((c) => c.tempId !== tempId));
  };

  // Añadir un libro adicional manualmente al lote de staging
  const handleAddManualCandidate = () => {
    const nextRow = enabledCells[0]?.row || 1;
    const nextCol = enabledCells[0]?.column || 1;
    const nextDepth = 1;

    // Calcular posición siguiente
    const currentMax = candidates
      .filter((c) => c.row === nextRow && c.column === nextCol && c.depth === nextDepth)
      .reduce((max, c) => Math.max(max, c.position), 0);

    const newCandidate: DigitizationCandidate = {
      tempId: `candidate-manual-${Date.now()}`,
      shelfId: shelf.id,
      row: nextRow,
      column: nextCol,
      depth: nextDepth,
      position: currentMax + 1,
      confidence: "medium",
      objectType: "book",
      suggestedBook: {
        title: "Nuevo libro",
        author: "Autor",
      },
      confirmed: true,
    };

    setCandidates((prev) => [...prev, newCandidate]);
    setActiveCandidateId(newCandidate.tempId);
  };

  // Confirmar y guardar todos los libros aprobados
  const handleConfirmAll = () => {
    if (candidates.length === 0) return;

    // Invariante: verificar que ninguna celda esté bloqueada
    const hasInvalidCell = candidates.some((c) => !enabledCellKeys.has(`${c.row}-${c.column}`));
    if (hasInvalidCell) {
      setErrorMessage(
        "Uno o más libros están asignados a compartimentos bloqueados o no disponibles. Por favor corrígelos antes de guardar.",
      );
      return;
    }

    const finalBooks: Book[] = candidates.map((c, index) => ({
      id: `book-digitized-${Date.now()}-${index}`,
      title: c.suggestedBook.title.trim() || "Libro sin título",
      author: c.suggestedBook.author.trim() || "Autor desconocido",
      isbn: c.suggestedBook.isbn || "",
      year: c.suggestedBook.year || new Date().getFullYear(),
      genre: c.suggestedBook.genre || "General",
      cover: c.suggestedBook.cover,
      location: {
        shelfId: shelf.id,
        row: c.row,
        column: c.column,
        depth: c.depth,
        position: c.position,
      },
    }));

    onConfirmBooks(finalBooks);
    onClose();
  };

  const getConfidenceBadge = (confidence: CandidateConfidence) => {
    switch (confidence) {
      case "high":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Certeza alta
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Certeza media
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-700/60">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Revisar
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="digitize-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={() => {
        stopCamera();
        onClose();
      }}
    >
      <div
        className="w-full max-w-5xl rounded-2xl bg-slate-900 border border-slate-750 shadow-2xl flex flex-col max-h-[94vh] text-slate-100 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/30 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="digitize-modal-title" className="text-lg font-bold text-white tracking-tight">
                  Digitalización Inteligente con IA
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-600/50">
                  {shelf.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Reconocimiento visual de libros, separación de objetos y colocación física en la estantería.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Cerrar ventana"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Controles de Configuración del Escaneo */}
        <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          {/* Selector de Modo */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode("full-shelf");
                if (imagePreview) processImage(imagePreview);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                mode === "full-shelf"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Estantería Completa ({shelf.columns}×{shelf.rows})
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("single-cube");
                if (imagePreview) processImage(imagePreview);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                mode === "single-cube"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Compartimento Individual (Cubo)
            </button>
          </div>

          {/* Opciones específicas de modo Cubo */}
          {mode === "single-cube" && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Ubicación del cubo:</span>
              <select
                value={`${selectedCell.row}-${selectedCell.column}`}
                onChange={(e) => {
                  const [r, c] = e.target.value.split("-").map(Number);
                  setSelectedCell((prev) => ({ ...prev, row: r, column: c }));
                }}
                className="bg-slate-900 border border-slate-700 text-white px-2.5 py-1 rounded-lg text-xs"
              >
                {enabledCells.map((c) => (
                  <option key={`${c.row}-${c.column}`} value={`${c.row}-${c.column}`}>
                    Fila {c.row}, Columna {c.column}
                  </option>
                ))}
              </select>

              <select
                value={selectedCell.depth}
                onChange={(e) =>
                  setSelectedCell((prev) => ({ ...prev, depth: Number(e.target.value) }))
                }
                className="bg-slate-900 border border-slate-700 text-white px-2.5 py-1 rounded-lg text-xs"
              >
                <option value={1}>Fila Frontal (Depth 1)</option>
                <option value={2}>Fila Trasera (Depth 2)</option>
              </select>
            </div>
          )}

          {/* Inputs ocultos para selección de archivo y cámara nativa */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={cameraFileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Mensajes de Estado o Advertencia */}
        {errorMessage && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-red-950/80 border border-red-800 text-xs text-red-200 flex items-center justify-between gap-2">
            <span>⚠️ {errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {infoMessage && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-blue-950/80 border border-blue-800 text-xs text-blue-200 flex items-center justify-between gap-2">
            <span>ℹ️ {infoMessage}</span>
            <button
              type="button"
              onClick={() => setInfoMessage(null)}
              className="text-blue-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Cuerpo Principal del Modal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {!imagePreview ? (
            isCameraActive ? (
              /* Visor de Cámara en Directo */
              <div className="relative rounded-2xl overflow-hidden border-2 border-amber-500/40 bg-black flex flex-col items-center justify-center min-h-[380px] max-h-[500px] shadow-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover max-h-[480px] rounded-xl"
                />

                {/* Guía visual de encuadre */}
                <div className="absolute inset-3 sm:inset-6 border-2 border-dashed border-amber-400/50 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                  <div className="text-[11px] font-semibold text-amber-200 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full self-center border border-amber-500/40 shadow-lg">
                    <span>Enfoca la estantería o balda con los libros de frente</span>
                  </div>

                  {/* Rejilla suave de encuadre */}
                  <div className="grid grid-cols-4 grid-rows-4 w-full h-full opacity-20 my-2 border border-amber-300 pointer-events-none">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className="border border-amber-300" />
                    ))}
                  </div>
                </div>

                {/* Barra de control de captura inferior */}
                <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 z-20 px-4">
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="p-3 rounded-full bg-slate-900/85 hover:bg-slate-800 text-amber-300 border border-slate-700 shadow-xl backdrop-blur-md cursor-pointer transition-transform active:scale-95"
                    title="Girar cámara (trasera / frontal)"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold text-sm shadow-xl shadow-amber-950/80 border-2 border-white/90 flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-white animate-pulse" />
                    <span>Capturar estantería</span>
                  </button>

                  <button
                    type="button"
                    onClick={stopCamera}
                    className="p-3 rounded-full bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 shadow-xl backdrop-blur-md cursor-pointer transition-transform active:scale-95"
                    title="Cerrar cámara"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              /* Estado Inicial: Zona de Arrastre */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-750 hover:border-amber-500/60 rounded-2xl p-8 sm:p-10 flex flex-col items-center justify-center text-center gap-4 bg-slate-950/40 hover:bg-slate-950/70 transition-all cursor-pointer min-h-[350px]"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-850 border border-slate-700 flex items-center justify-center text-amber-400 shadow-xl">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="max-w-md">
                  <h3 className="text-base font-bold text-white">
                    Fotografía tu estantería física o sube una imagen
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Usa la cámara directamente o selecciona un archivo. La IA detectará los lomos, descartará plantas u objetos decorativos y te permitirá confirmar antes de guardar.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startCamera();
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-amber-950/40 border border-amber-400/40 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <svg className="w-4 h-4 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Abrir Cámara</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>Subir archivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadSampleImage();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-750 cursor-pointer"
                  >
                    Foto de muestra
                  </button>
                </div>
              </div>
            )
          ) : isLoading ? (
            /* Estado de Carga con Radar de Visión */
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 animate-ping" />
                <div className="absolute inset-2 rounded-full border-4 border-amber-400/40 animate-pulse" />
                <div className="absolute inset-0 rounded-full border-2 border-amber-400 flex items-center justify-center text-amber-400">
                  <svg className="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Analizando estantería física con IA...</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Detectando lomos verticales, descartando objetos no bibliográficos y reconciliando títulos con bases de datos.
                </p>
              </div>
            </div>
          ) : (
            /* Interfaz de Staging y Revisión */
            <div className="flex flex-col gap-4">
              {/* Barra de Resumen de Detección */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-white">
                    📚 {candidates.length} {candidates.length === 1 ? "libro detectado" : "libros detectados"}
                  </span>
                  {filteredObjectsCount > 0 && (
                    <span className="text-slate-400">
                      🪴 {filteredObjectsCount} {filteredObjectsCount === 1 ? "objeto no bibliográfico filtrado" : "objetos no bibliográficos filtrados"}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddManualCandidate}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Añadir libro manual</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setCandidates([]);
                      startCamera();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>📸 Nueva foto con cámara</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium border border-slate-700 transition-colors"
                  >
                    Cambiar archivo
                  </button>
                </div>
              </div>

              {/* Contenedor Dividido: Foto con Bounding Boxes + Lista de Revisión */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Columna Izquierda: Visor de Imagen con Cajas Interactivas */}
                <div className="lg:col-span-6 flex flex-col gap-2">
                  <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Fotografía con detección espacial</span>
                    <span className="text-[11px] text-slate-500">Haz clic en un lomo para editarlo</span>
                  </div>
                  <div className="relative rounded-xl overflow-hidden border border-slate-750 bg-black max-h-[460px] flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Estantería analizada"
                      className="max-h-[460px] w-full object-contain"
                    />

                    {/* Cajas Delimitadoras Superpuestas */}
                    {candidates.map((cand) => {
                      if (!cand.boundingBox) return null;
                      const isSelected = activeCandidateId === cand.tempId;

                      const borderColor =
                        cand.confidence === "high"
                          ? "border-emerald-400 bg-emerald-500/20"
                          : cand.confidence === "medium"
                            ? "border-amber-400 bg-amber-500/20"
                            : "border-rose-400 bg-rose-500/20";

                      return (
                        <button
                          key={cand.tempId}
                          type="button"
                          onClick={() => setActiveCandidateId(cand.tempId)}
                          style={{
                            left: `${cand.boundingBox.x * 100}%`,
                            top: `${cand.boundingBox.y * 100}%`,
                            width: `${cand.boundingBox.width * 100}%`,
                            height: `${cand.boundingBox.height * 100}%`,
                          }}
                          className={`absolute border-2 rounded transition-all cursor-pointer group ${borderColor} ${
                            isSelected ? "ring-2 ring-white z-20 scale-105" : "hover:border-white z-10"
                          }`}
                          title={`${cand.suggestedBook.title} (${cand.suggestedBook.author})`}
                        >
                          <span className="absolute -top-5 left-0 px-1 py-0.5 rounded bg-black/80 text-[9px] font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            F{cand.row}·C{cand.column} #{cand.position}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Columna Derecha: Tarjetas de Libros para Revisión (Staging) */}
                <div className="lg:col-span-6 flex flex-col gap-2 max-h-[490px] overflow-y-auto pr-1">
                  <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Libros a colocar ({candidates.length})</span>
                    <span className="text-[11px] text-slate-500">Revisa y ajusta antes de guardar</span>
                  </div>

                  {candidates.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
                      No se detectaron libros en esta imagen. Puedes pulsar &quot;+ Añadir libro manualmente&quot; o subir otra toma.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {candidates.map((cand, idx) => {
                        const isSelected = activeCandidateId === cand.tempId;

                        return (
                          <div
                            key={cand.tempId}
                            onClick={() => setActiveCandidateId(cand.tempId)}
                            className={`p-3 rounded-xl border transition-all text-xs flex flex-col gap-2.5 ${
                              isSelected
                                ? "bg-slate-800/95 border-amber-500 shadow-md ring-1 ring-amber-500/50"
                                : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            {/* Cabecera de la tarjeta: Título + Estado de Confianza */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0">
                                  {idx + 1}
                                </span>
                                {getConfidenceBadge(cand.confidence)}
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeCandidate(cand.tempId);
                                }}
                                className="text-slate-500 hover:text-rose-400 p-1 rounded-lg transition-colors"
                                title="Descartar este libro"
                              >
                                ✕
                              </button>
                            </div>

                            {/* Campos editables principales */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-0.5">Título</label>
                                <input
                                  type="text"
                                  value={cand.suggestedBook.title}
                                  onChange={(e) =>
                                    updateCandidate(cand.tempId, {
                                      suggestedBook: {
                                        ...cand.suggestedBook,
                                        title: e.target.value,
                                      },
                                    })
                                  }
                                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:border-amber-500 focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] text-slate-400 block mb-0.5">Autor</label>
                                <input
                                  type="text"
                                  value={cand.suggestedBook.author}
                                  onChange={(e) =>
                                    updateCandidate(cand.tempId, {
                                      suggestedBook: {
                                        ...cand.suggestedBook,
                                        author: e.target.value,
                                      },
                                    })
                                  }
                                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:border-amber-500 focus:outline-none"
                                />
                              </div>
                            </div>

                            {/* Asignación física (Fila, Columna, Profundidad, Posición) */}
                            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
                              <span className="text-slate-400">Ubicación:</span>

                              {/* Fila */}
                              <select
                                value={cand.row}
                                onChange={(e) =>
                                  updateCandidate(cand.tempId, { row: Number(e.target.value) })
                                }
                                className="bg-slate-950 border border-slate-750 text-slate-200 px-2 py-0.5 rounded text-[11px]"
                              >
                                {Array.from({ length: shelf.rows }).map((_, rIdx) => (
                                  <option key={rIdx + 1} value={rIdx + 1}>
                                    Fila {rIdx + 1}
                                  </option>
                                ))}
                              </select>

                              {/* Columna */}
                              <select
                                value={cand.column}
                                onChange={(e) =>
                                  updateCandidate(cand.tempId, { column: Number(e.target.value) })
                                }
                                className="bg-slate-950 border border-slate-750 text-slate-200 px-2 py-0.5 rounded text-[11px]"
                              >
                                {Array.from({ length: shelf.columns }).map((_, cIdx) => (
                                  <option key={cIdx + 1} value={cIdx + 1}>
                                    Columna {cIdx + 1}
                                  </option>
                                ))}
                              </select>

                              {/* Profundidad */}
                              <select
                                value={cand.depth}
                                onChange={(e) =>
                                  updateCandidate(cand.tempId, { depth: Number(e.target.value) })
                                }
                                className="bg-slate-950 border border-slate-750 text-slate-200 px-2 py-0.5 rounded text-[11px]"
                              >
                                <option value={1}>Frente (D1)</option>
                                <option value={2}>Fondo (D2)</option>
                              </select>

                              {/* Posición correlativa */}
                              <span className="text-slate-400 ml-auto">
                                Posición: <strong className="text-amber-300">#{cand.position}</strong>
                              </span>
                            </div>

                            {/* Indicador si el cubo está deshabilitado */}
                            {!enabledCellKeys.has(`${cand.row}-${cand.column}`) && (
                              <div className="text-[10px] text-rose-400 bg-rose-950/60 p-1.5 rounded border border-rose-800/60">
                                ⚠️ El compartimento (Fila {cand.row}, Columna {cand.column}) está bloqueado. Asígnalo a otro compartimento activo para poder guardarlo.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal con Acciones Finales */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800 bg-slate-950/90 shrink-0">
          <div className="text-xs text-slate-400">
            {candidates.length > 0 ? (
              <span>
                Se colocarán <strong>{candidates.length}</strong> {candidates.length === 1 ? "libro" : "libros"} en{" "}
                <strong className="text-amber-400">{shelf.name}</strong>.
              </span>
            ) : (
              <span>Sube una foto para iniciar la detección asistida.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={candidates.length === 0 || isLoading}
              onClick={handleConfirmAll}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-amber-950/40 border border-amber-400/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Confirmar y colocar {candidates.length > 0 ? `(${candidates.length})` : ""}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
