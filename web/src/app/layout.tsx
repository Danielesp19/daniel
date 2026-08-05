import type { Metadata, Viewport } from "next";
import { Caprasimo, Figtree } from "next/font/google";
import { MARCA } from "@/lib/marca";
import "./globals.css";

// La display del sistema: gruesa, redonda y con mucha personalidad. Solo trae
// un peso, y va en minúsculas — en caja alta se empasta.
const caprasimo = Caprasimo({
  variable: "--font-caprasimo",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

// Figtree para todo el texto corrido y también para los datos: el sistema no
// tiene monoespaciada, así que las cifras se alinean con tabular-nums.
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${MARCA.nombre} — ${MARCA.oficio}`,
  description: MARCA.descripcion,
};

export const viewport: Viewport = {
  themeColor: "#120C08",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${caprasimo.variable} ${figtree.variable}`}>
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
          <style>{`.fantasma-real{opacity:1;transform:none}.fantasma-hueso{display:none}`}</style>
        </noscript>
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
