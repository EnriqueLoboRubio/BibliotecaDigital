"use client";

import { useEffect, useRef, useState, useId } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedCode: string) => void;
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: BarcodeScannerModalProps) {
  const containerId = useId().replace(/:/g, "-");
  const scannerElementId = `reader-${containerId}`;

  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"camera" | "upload">("camera");

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef(false);

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
          playBeep();
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(100);
          }
          void stopScanner();
          onScanSuccess(decodedText.trim());
          onClose();
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
          // Preferir cámara trasera (environment / back) en móviles
          const backCam = devices.find((c) =>
            c.label.toLowerCase().includes("back") ||
            c.label.toLowerCase().includes("trasera") ||
            c.label.toLowerCase().includes("environment"),
          );
          const defaultCamId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(defaultCamId);
          void startScanning(defaultCamId);
        } else {
          // Intentar con facingMode environment genérico
          void startScanning({ facingMode: "environment" });
        }
      })
      .catch(() => {
        if (!isMounted) return;
        // Fallback genérico para móviles
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

      playBeep();
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(100);
      }
      onScanSuccess(decodedText.trim());
      onClose();
    } catch {
      setScannerError("No se detectó ningún código de barras legible en la imagen. Prueba con otra fotografía más clara.");
    }
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
        className="w-full max-w-md rounded-2xl bg-[#090d16] border border-slate-700 shadow-2xl overflow-hidden flex flex-col text-slate-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Escáner */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Escanear Código de Barras / ISBN</h3>
              <p className="text-[11px] text-slate-400">Enfoca el código de barras en la parte trasera del libro</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              void stopScanner();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Cerrar escáner"
          >
            ✕
          </button>
        </div>

        {/* Pestañas: Cámara en Vivo vs Subir Imagen */}
        <div className="flex border-b border-slate-800 bg-slate-950/80 px-4 pt-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab("camera");
              if (selectedCameraId) void startScanning(selectedCameraId);
            }}
            className={`pb-2 px-3 font-semibold transition-all border-b-2 ${
              activeTab === "camera"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            📷 Cámara en vivo
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("upload");
              void stopScanner();
            }}
            className={`pb-2 px-3 font-semibold transition-all border-b-2 ${
              activeTab === "upload"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            🖼️ Subir fotografía
          </button>
        </div>

        {/* Contenido según pestaña */}
        <div className="p-4 flex flex-col items-center gap-3">
          {activeTab === "camera" ? (
            <div className="w-full flex flex-col items-center gap-3">
              {/* Contenedor del visor de cámara */}
              <div className="relative w-full aspect-4/3 max-h-[300px] bg-black rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
                <div id={scannerElementId} className="w-full h-full" />

                {/* Retícula visual / Viewfinder estilizado */}
                {isScanning && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="w-[80%] h-[55%] border-2 border-emerald-400/70 rounded-xl relative shadow-lg shadow-emerald-500/20">
                      {/* Esquinas destacadas */}
                      <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-300" />
                      <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-300" />
                      <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-300" />
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-300" />

                      {/* Haz láser animado */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                  </div>
                )}

                {!isScanning && !scannerError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span>Iniciando cámara...</span>
                  </div>
                )}
              </div>

              {/* Selector de cámara si hay más de 1 lente */}
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
            /* Pestaña de subir fotografía */
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

          {/* Mensaje de error si la cámara falla */}
          {scannerError && (
            <div className="w-full p-2.5 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300 text-center">
              {scannerError}
            </div>
          )}

          {/* Indicaciones breves */}
          <div className="w-full flex items-center justify-center gap-2 text-[11px] text-slate-400 bg-slate-900/50 py-1.5 px-3 rounded-lg">
            <span>💡</span>
            <span>Asegura buena iluminación sobre el código de barras para una lectura instantánea.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
