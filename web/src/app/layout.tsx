import type { Metadata, Viewport } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { MARCA } from "@/lib/marca";
import "./globals.css";

// Tres familias, una por oficio.
//
// Archivo para los titulares: es un grotesco, así que no se pelea con el
// lenguaje de las referencias, pero en los pesos altos tiene bastante más
// carácter que Inter y aguanta tamaños grandes sin verse genérico.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

// Inter para el texto corrido y la interfaz. Es la de cocinare y es la que
// mejor se lee en párrafo largo.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// Monoespaciada para TODA cifra y todo rótulo: precios, gramos, altitudes,
// puntajes SCA, contadores. El oficio se mide en básculas y cronómetros, así
// que los números son contenido y merecen su propia voz.
const mono = JetBrains_Mono({
  variable: "--font-mono-jet",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${MARCA.nombre} — ${MARCA.oficio}`,
  description: MARCA.descripcion,
};

export const viewport: Viewport = {
  themeColor: "#FBFAF6",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${archivo.variable} ${inter.variable} ${mono.variable}`}>
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
