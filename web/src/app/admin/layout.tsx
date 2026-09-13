"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { MARCA } from "@/lib/marca";
import { COLOR } from "@/components/admin/ui";

const NAV = [
  { href: "/admin/catalogo", etiqueta: "Catálogo", icono: "☰" },
  { href: "/admin/recetas", etiqueta: "Recetas", icono: "◷" },
  { href: "/admin/preguntas", etiqueta: "Preguntas", icono: "✉" },
  { href: "/admin/sedes", etiqueta: "Sedes", icono: "⌂" },
  { href: "/admin/aviso", etiqueta: "Aviso", icono: "!" },
];

/**
 * Armazón del panel: barra lateral en escritorio, franja arriba en móvil.
 *
 * El guardia de sesión vive acá y no en cada pantalla: si no hay token, se
 * manda al login antes de pintar nada. Es un guardia de conveniencia, no de
 * seguridad — quien de verdad protege los datos es el token que exige la API
 * de Laravel en cada petición, así que saltarse esta pantalla no da acceso a
 * nada.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const ruta = usePathname();
  const esLogin = ruta === "/admin/login";
  const [listo, setListo] = useState(esLogin);

  useEffect(() => {
    if (!esLogin && !sessionStorage.getItem("admin_token")) {
      router.replace("/admin/login");
      return;
    }
    // El token vive en sessionStorage, que no existe durante el render del
    // servidor: la única forma de saber si hay sesión es preguntarlo ya
    // montados. De ahí este estado que se enciende desde el efecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setListo(true);
  }, [esLogin, router]);

  if (esLogin) return <>{children}</>;
  if (!listo) return null;

  const salir = () => {
    sessionStorage.removeItem("admin_token");
    router.push("/admin/login");
  };

  const enlace = (activo: boolean) => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 12px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: activo ? 600 : 400,
    color: activo ? COLOR.tinta : COLOR.suave,
    background: activo ? COLOR.fondo : "transparent",
    textDecoration: "none",
  });

  return (
    <div style={{ minHeight: "100dvh", background: COLOR.fondo, fontFamily: "var(--font-sans)" }}>
      {/* Franja superior — solo en móvil: la barra lateral no cabe en una
          pantalla angosta. Pegajosa, para que con una lista larga de productos
          la navegación siga al alcance sin volver a subir del todo. */}
      <div
        className="flex md:hidden"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "10px 14px",
          background: COLOR.papel,
          borderBottom: `1px solid ${COLOR.linea}`,
        }}
      >
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 17, whiteSpace: "nowrap" }}>
          {MARCA.nombre}
        </span>
        <nav style={{ display: "flex", gap: 2, overflowX: "auto" }}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} style={{ ...enlace(ruta.startsWith(n.href)), fontSize: 13, padding: "6px 10px" }}>
              {n.etiqueta}
            </Link>
          ))}
        </nav>
        <button
          onClick={salir}
          title="Cerrar sesión"
          style={{ border: "none", background: "none", color: COLOR.rotulo, cursor: "pointer", fontSize: 15 }}
        >
          ⎋
        </button>
      </div>

      {/* Barra lateral — solo en escritorio */}
      <aside
        className="hidden md:flex"
        style={{
          position: "fixed",
          insetBlock: 0,
          left: 0,
          width: 216,
          flexDirection: "column",
          padding: "26px 16px",
          background: COLOR.papel,
          borderRight: `1px solid ${COLOR.linea}`,
        }}
      >
        <div style={{ marginBottom: 30, paddingLeft: 8 }}>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, lineHeight: 1.1 }}>{MARCA.nombre}</div>
          <div
            style={{
              marginTop: 5,
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: COLOR.rotulo,
            }}
          >
            Panel
          </div>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} style={enlace(ruta.startsWith(n.href))}>
              <span style={{ fontSize: 13, width: 14, textAlign: "center", color: COLOR.rotulo }}>{n.icono}</span>
              {n.etiqueta}
            </Link>
          ))}
        </nav>

        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          style={{ ...enlace(false), fontSize: 13, marginBottom: 4 }}
        >
          Ver la página ↗
        </a>

        <button
          onClick={salir}
          style={{
            textAlign: "left",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 13,
            color: COLOR.rotulo,
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          Cerrar sesión
        </button>
      </aside>

      <main className="md:ml-[216px]" style={{ padding: "clamp(18px, 3vw, 38px)" }}>
        {children}
      </main>
    </div>
  );
}
