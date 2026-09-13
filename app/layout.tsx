import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Biblioteca Digital — Mapa Espacial de Estanterías",
  description: "Digitalización y localización física de libros en estanterías IKEA Kallax",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 selection:bg-blue-500/30 selection:text-blue-200">
        {children}
      </body>
    </html>
  );
}
