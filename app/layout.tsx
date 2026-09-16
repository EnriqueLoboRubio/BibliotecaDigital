import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/context";
import { PwaInstallBanner } from "@/components/pwa";

export const metadata: Metadata = {
  title: "Biblioteca Digital — Mapa Espacial de Estanterías",
  description: "Digitalización y localización física de libros en estanterías IKEA Kallax",
  manifest: "/manifest.webmanifest",
  applicationName: "Biblioteca Digital",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Biblioteca",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#090d16",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 selection:bg-blue-500/30 selection:text-blue-200">
        <AuthProvider>
          {children}
          <PwaInstallBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
