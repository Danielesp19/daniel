import type { Metadata, Viewport } from "next";
import { Archivo, Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";
import { MARCA } from "@/lib/marca";
import "./globals.css";

// Condensada para titulares en mayúsculas: ocupa poco ancho y aguanta
// tamaños enormes en un celular sin partirse en tres renglones.
const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

// Grotesca neutra para el texto corrido.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// Monoespaciada para TODO dato medible: peso, altitud, puntaje, precio.
// Es lo que le da al catálogo el aire de ficha técnica en vez de folleto.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${MARCA.nombre} — ${MARCA.oficio}`,
  description: MARCA.descripcion,
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${barlow.variable} ${archivo.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
