"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. Registrar el Service Worker para Android PWA
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[PWA] Service Worker activo:", reg.scope);
          })
          .catch((err) => {
            console.warn("[PWA] No se pudo registrar Service Worker:", err);
          });
      });
    }

    // 2. Capturar el evento de instalación nativo de Android Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // Si el usuario descartó el aviso recientemente, no mostrarlo
      const dismissedUntil = localStorage.getItem("pwa_android_dismissed_until");
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        return;
      }
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      console.log("[PWA] Aplicación instalada en Android con éxito.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      setDeferredPrompt(null);
    } catch (err) {
      console.warn("[PWA] Error al invocar diálogo de instalación:", err);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setDeferredPrompt(null);
    // Recordar descarte durante 5 días
    const expireTime = Date.now() + 5 * 24 * 60 * 60 * 1000;
    localStorage.setItem("pwa_android_dismissed_until", String(expireTime));
  };

  // No mostrar si no hay evento de instalación o si fue descartada
  if (isDismissed || !deferredPrompt) {
    return null;
  }

  return (
    <aside
      aria-label="Instalar aplicación en Android"
      className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-md z-50 bg-[#0b1324] border border-amber-500/40 rounded-2xl shadow-2xl p-4 text-slate-100 flex flex-col gap-3 animate-in slide-in-from-bottom-5 duration-300 backdrop-blur-xl"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700/80 overflow-hidden shrink-0 shadow-md flex items-center justify-center p-1">
          <Image
            src="/icons/icon-192x192.png"
            alt="Biblioteca Digital Icono"
            width={44}
            height={44}
            className="rounded-lg object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-bold text-white tracking-tight">
              Instalar en tu Android
            </h4>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              PWA
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-0.5 leading-snug">
            Accede en 1 toque desde tu pantalla de inicio, a pantalla completa y sin barra de navegación.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors shrink-0 cursor-pointer"
          title="Descartar aviso"
          aria-label="Descartar aviso"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/80">
        <button
          type="button"
          onClick={handleDismiss}
          className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          Ahora no
        </button>

        <button
          type="button"
          onClick={handleInstallClick}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:from-amber-700 active:to-amber-800 shadow-lg shadow-amber-950/60 border border-amber-400/40 transition-all flex items-center gap-1.5 cursor-pointer transform hover:scale-[1.02]"
        >
          <span>📲</span>
          <span>Instalar Aplicación</span>
        </button>
      </div>
    </aside>
  );
}
