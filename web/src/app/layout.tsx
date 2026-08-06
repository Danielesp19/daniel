import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { MARCA } from "@/lib/marca";
import "./globals.css";

// Una sola familia para todo el sitio, como en las dos referencias (Inter en
// cocinare, Open Sans en normcore). La jerarquía la hace el peso y el tracking,
// no una segunda tipografía: en cuanto entra una display con personalidad, la
// página deja de parecerse a ellas.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    <html lang="es" className={inter.variable}>
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
