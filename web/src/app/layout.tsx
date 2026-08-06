import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Instrument_Serif, Spline_Sans_Mono } from "next/font/google";
import { MARCA } from "@/lib/marca";
import "./globals.css";

// Tres familias, una por oficio, tomadas del diseño que eligió Daniel.
//
// Instrument Serif para los titulares. Es la voz del sitio: trae itálica de
// verdad, y el recurso que sostiene todo el diseño es un titular en redonda
// que termina en itálica —"El café es tan bueno como *quien lo prepara*"—.
// Sin la itálica, los titulares se caen.
const serif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

// Instrument Sans para el texto corrido y la interfaz.
const sans = Instrument_Sans({
  variable: "--font-sans-i",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Monoespaciada para TODO rótulo y TODA cifra: epígrafes, precios, pesos,
// fichas. El oficio se mide en básculas y cronómetros, y es lo que le da
// textura a una página que por lo demás es blanca y serena.
const mono = Spline_Sans_Mono({
  variable: "--font-mono-spline",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${MARCA.nombre} — ${MARCA.oficio}`,
  description: MARCA.descripcion,
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        {/*
          El revelado por scroll nace en opacity 0 y lo despierta un observer.
          Si el JavaScript no corre, el contenido —que sí viene en el HTML del
          servidor— se quedaría invisible; este bloque lo muestra, sin animación.

          Va en <noscript> y NO como un script que toque las clases del <html>:
          esa versión mutaba el mismo atributo `class` que React acababa de
          renderizar, y la diferencia le rompía la hidratación entera. Con la
          página sin hidratar no se revelaba nada, no filtraban las categorías
          y el carrito no abría. <noscript> no ejecuta nada ni toca el DOM que
          React controla.
        */}
        <noscript>
          <style>{`.revelar{opacity:1;transform:none}`}</style>
        </noscript>
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
