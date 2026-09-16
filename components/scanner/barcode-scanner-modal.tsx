"use client";

import { useEffect, useRef, useState, useId } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { cleanISBN, fetchBookByISBN } from "@/lib/services/open-library";

export interface ScannedBookBatchItem {
  id: string;
  isbn: string;
  scannedAt: number;
  status: "loading" | "ready" | "not_found";
  title: string;
  author: string;
  year?: number;
  genre?: string;
  cover?: string;
}

export interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (scannedCode: string) => void;
  mode?: "single" | "continuous";
  onBatchConfirm?: (books: ScannedBookBatchItem[]) => void;
  batchTargetInfo?: {
    shelfName?: string;
    row?: number;
    column?: number;
    depth?: number;
  };
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  mode = "single",
  onBatchConfirm,
  batchTargetInfo,
}: BarcodeScannerModalProps) {
  const containerId = useId().replace(/:/g, "-");
  const scannerElementId = `reader-${containerId}`;

  const [userModeOverride, setUserModeOverride] = useState<"single" | "continuous" | null>(null);
  const currentMode = userModeOverride ?? mode;
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"camera" | "upload">("camera");

  // Cola de libros escaneados en Modo Ráfaga
  const [batchQueue, setBatchQueue] = useState<ScannedBookBatchItem[]>([]);
  const [lastScannedNotice, setLastScannedNotice] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef(false);
  // Mapa de anti-rebote para evitar re-escanear el mismo código en menos de 3.5 segundos
  const recentScansRef = useRef<Map<string, number>>(new Map());

  // Reproducir un pitido breve de confirmación de lectura mediante AudioContext nativo
  const playBeep = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(920, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio no permitido o silenciado
    }
  };

  // Detener el escáner de forma segura
  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning && !isStoppingRef.current) {
      isStoppingRef.current = true;
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.warn("Error al detener escáner:", err);
      } finally {
        isStoppingRef.current = false;
        setIsScanning(false);
      }
    }
  };

  // Procesar código detectado
  const handleDecodedCode = (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed) return;

    const normalizedIsbn = cleanISBN(trimmed) || trimmed;

    // Modo Lectura Individual
    if (currentMode === "single") {
      playBeep();
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(100);
      }
      void stopScanner();
      onScanSuccess?.(normalizedIsbn);
      onClose();
      return;
    }

    // Modo Ráfaga (Continuo)
    const now = Date.now();
    const lastTime = recentScansRef.current.get(normalizedIsbn) || 0;
    if (now - lastTime < 3500) {
      // Ignorar lectura repetida inmediata
      return;
    }
    recentScansRef.current.set(normalizedIsbn, now);

    playBeep();
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    const newItemId = `burst-${now}-${Math.random().toString(36).substring(2, 6)}`;
    const newItem: ScannedBookBatchItem = {
      id: newItemId,
      isbn: normalizedIsbn,
      scannedAt: now,
      status: "loading",
      title: `ISBN ${normalizedIsbn}`,
      author: "Consultando datos...",
    };

    setBatchQueue((prev) => [newItem, ...prev]);
    setLastScannedNotice(`✓ Escaneado: ${normalizedIsbn}`);
    setTimeout(() => setLastScannedNotice(null), 2500);

    // Búsqueda asíncrona de metadatos en Open Library
    void fetchBookByISBN(normalizedIsbn).then((meta) => {
      setBatchQueue((prev) =>
        prev.map((item) => {
          if (item.id !== newItemId) return item;
          if (meta && meta.title) {
            return {
              ...item,
              status: "ready",
              title: meta.title,
              author: meta.author || "Autor desconocido",
              year: meta.year,
              genre: meta.genre || "General",
              cover: meta.cover,
            };
          } else {
            return {
              ...item,
              status: "not_found",
              title: `Libro (${normalizedIsbn})`,
              author: "Sin metadatos automáticos",
              genre: "General",
            };
          }
        }),
      );
    });
  };

  // Iniciar la cámara
  const startScanning = async (cameraIdOrFacingMode: string | { facingMode: string }) => {
    try {
      setScannerError(null);
      await stopScanner();

      const element = document.getElementById(scannerElementId);
      if (!element) return;

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.QR_CODE,
      ];

      const html5QrCode = new Html5Qrcode(scannerElementId, {
        formatsToSupport,
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const width = Math.min(viewfinderWidth * 0.82, 280);
          const height = Math.min(viewfinderHeight * 0.55, 170);
          return { width, height };
        },
        aspectRatio: 1.333333,
      };

      await html5QrCode.start(
        cameraIdOrFacingMode,
        config,
        (decodedText) => {
          handleDecodedCode(decodedText);
        },
        () => {
          // Frame sin código detectado
        },
      );

      setIsScanning(true);
    } catch (err: unknown) {
      console.error("Error al iniciar cámara:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
        setScannerError(
          "Permiso de cámara denegado. Permite el acceso a la cámara en los permisos de tu navegador o sube una imagen.",
        );
      } else {
        setScannerError("No se pudo iniciar la cámara seleccionada. Prueba con otra cámara o sube una imagen.");
      }
      setIsScanning(false);
    }
  };

  // Cargar lista de cámaras disponibles al abrir el modal
  useEffect(() => {
    if (!isOpen) {
      void stopScanner();
      return;
    }

    let isMounted = true;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!isMounted) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find((c) =>
            c.label.toLowerCase().includes("back") ||
            c.label.toLowerCase().includes("trasera") ||
            c.label.toLowerCase().includes("environment"),
          );
          const defaultCamId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(defaultCamId);
          void startScanning(defaultCamId);
        } else {
          void startScanning({ facingMode: "environment" });
        }
      })
      .catch(() => {
        if (!isMounted) return;
        void startScanning({ facingMode: "environment" });
      });

    return () => {
      isMounted = false;
      void stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Manejar cambio de cámara en el selector
  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    if (newId) {
      void startScanning(newId);
    }
  };

  // Manejar carga de imagen con código de barras
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScannerError(null);
      await stopScanner();

      const html5QrCode = new Html5Qrcode(scannerElementId);
      const decodedText = await html5QrCode.scanFile(file, true);

      handleDecodedCode(decodedText);
    } catch {
      setScannerError("No se detectó ningún código de barras legible en la imagen. Prueba con otra fotografía más clara.");
    }
  };

  // Eliminar un elemento de la cola de ráfaga
  const handleRemoveBatchItem = (id: string) => {
    setBatchQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // Confirmar y volcar libros escaneados en lote
  const handleConfirmBatch = () => {
    if (batchQueue.length === 0) return;
    void stopScanner();
    onBatchConfirm?.(batchQueue);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => {
        void stopScanner();
        onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[#090d16] border border-slate-700 shadow-2xl overflow-hidden flex flex-col text-slate-100 relative max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Escáner */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              {currentMode === "continuous" ? (
                <span className="text-base">⚡</span>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  {currentMode === "continuous" ? "Modo Ráfaga (Escaneo Continuo)" : "Escanear Código / ISBN"}
                </h3>
                {currentMode === "continuous" && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                    Ráfaga
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {currentMode === "continuous"
                  ? batchTargetInfo?.shelfName
                    ? `Destino: ${batchTargetInfo.shelfName} · Fila ${batchTargetInfo.row}, Col ${batchTargetInfo.column}`
                    : "Escanea varios códigos seguidos sin cerrar la cámara"
                  : "Enfoca el código de barras en la parte trasera del libro"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              void stopScanner();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar escáner"
          >
            ✕
          </button>
        </div>

        {/* Selector de Modo (Individual vs Ráfaga) */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-950/90 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setUserModeOverride("single")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                currentMode === "single"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Individual
            </button>
            <button
              type="button"
              onClick={() => setUserModeOverride("continuous")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                currentMode === "continuous"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>⚡</span>
              <span>Modo Ráfaga</span>
            </button>
          </div>

          {/* Pestañas Cámara vs Subir */}
          <div className="flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setActiveTab("camera");
                if (selectedCameraId) void startScanning(selectedCameraId);
              }}
              className={`px-2 py-1 rounded-md transition-colors ${
                activeTab === "camera"
                  ? "text-blue-400 bg-blue-950/40 border border-blue-800/50"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              📷 Cámara
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("upload");
                void stopScanner();
              }}
              className={`px-2 py-1 rounded-md transition-colors ${
                activeTab === "upload"
                  ? "text-blue-400 bg-blue-950/40 border border-blue-800/50"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🖼️ Foto
            </button>
          </div>
        </div>

        {/* Visor de cámara y contenido principal */}
        <div className="p-3 sm:p-4 flex flex-col items-center gap-3 overflow-y-auto">
          {activeTab === "camera" ? (
            <div className="w-full flex flex-col items-center gap-2.5">
              <div className="relative w-full aspect-4/3 max-h-[260px] bg-black rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
                <div id={scannerElementId} className="w-full h-full" />

                {/* Retícula visual / Viewfinder */}
                {isScanning && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div
                      className={`w-[80%] h-[55%] border-2 rounded-xl relative transition-all duration-300 ${
                        currentMode === "continuous"
                          ? "border-amber-400/80 shadow-lg shadow-amber-500/20"
                          : "border-emerald-400/70 shadow-lg shadow-emerald-500/20"
                      }`}
                    >
                      <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-amber-300" />
                      <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-amber-300" />
                      <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-amber-300" />
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-amber-300" />

                      <div
                        className={`w-full h-0.5 bg-gradient-to-r from-transparent to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse ${
                          currentMode === "continuous" ? "via-amber-400" : "via-emerald-400"
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Notificación flotante de lectura en ráfaga */}
                {lastScannedNotice && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-emerald-500/90 text-white text-xs font-bold shadow-lg animate-in fade-in slide-in-from-top-2 duration-150 flex items-center gap-1.5 pointer-events-none z-10">
                    <span>⚡</span>
                    <span>{lastScannedNotice}</span>
                  </div>
                )}

                {!isScanning && !scannerError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span>Iniciando cámara...</span>
                  </div>
                )}
              </div>

              {/* Selector de cámara si hay más de 1 */}
              {cameras.length > 1 && (
                <div className="w-full flex items-center justify-between gap-2 text-xs">
                  <label htmlFor="camera-select" className="text-slate-400 shrink-0">
                    Cámara:
                  </label>
                  <select
                    id="camera-select"
                    value={selectedCameraId}
                    onChange={handleCameraChange}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {cameras.map((c, idx) => (
                      <option key={c.id} value={c.id}>
                        {c.label || `Cámara ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/40 text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Selecciona una foto del código de barras</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Formatos compatibles: JPG, PNG, WEBP</p>
              </div>
              <label className="cursor-pointer px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold shadow-md transition-all">
                <span>Elegir archivo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {scannerError && (
            <div className="w-full p-2.5 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300 text-center">
              {scannerError}
            </div>
          )}

          {/* Cola de libros en Modo Ráfaga */}
          {currentMode === "continuous" && (
            <div className="w-full flex flex-col gap-2 pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">Cola de escaneo:</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/30">
                    {batchQueue.length} {batchQueue.length === 1 ? "libro" : "libros"}
                  </span>
                </div>
                {batchQueue.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setBatchQueue([])}
                    className="text-[11px] text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    Vaciar lista
                  </button>
                )}
              </div>

              {batchQueue.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-dashed border-slate-800 text-center text-xs text-slate-400 flex flex-col items-center gap-1">
                  <span>Enfoca consecutivamente el código de barras de cada libro.</span>
                  <span className="text-[11px] text-slate-500">
                    Se irán agregando aquí en tiempo real sin detener la cámara.
                  </span>
                </div>
              ) : (
                <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                  {batchQueue.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-7 h-10 rounded bg-slate-800 border border-slate-700 shrink-0 overflow-hidden flex items-center justify-center">
                          {item.cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.cover} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-slate-500">📖</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white truncate text-xs">{item.title}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
                            <span>{item.author}</span>
                            <span className="text-slate-600">•</span>
                            <span className="font-mono text-[10px]">{item.isbn}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.status === "loading" && (
                          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                        )}
                        {item.status === "ready" && (
                          <span className="text-emerald-400 text-xs font-bold" title="Metadatos listos">
                            ✓
                          </span>
                        )}
                        {item.status === "not_found" && (
                          <span className="text-amber-400 text-xs" title="Datos manuales">
                            ⚠️
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveBatchItem(item.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
                          title="Eliminar de la cola"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between gap-2">
          {currentMode === "continuous" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  void stopScanner();
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmBatch}
                disabled={batchQueue.length === 0}
                className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  batchQueue.length > 0
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/40"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                }`}
              >
                <span>⚡</span>
                <span>Colocar {batchQueue.length} {batchQueue.length === 1 ? "libro" : "libros"}</span>
              </button>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={() => {
                  void stopScanner();
                  onClose();
                }}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
