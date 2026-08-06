"use client";

import { useEffect, useRef, useState } from "react";
import { enlaceWhatsApp, MARCA } from "@/lib/marca";

/**
 * Lo que va pasando en la cinta de arriba. Son datos, no eslóganes: de dónde
 * viene el café, cómo se tuesta y cómo se pide. Si algún día deja de ser
 * cierto —por ejemplo, que se tuesta bajo pedido— hay que sacarlo de acá.
 */
const ANUNCIOS = [
  "Tueste bajo pedido",
  "Huila · Cauca · Quindío",
  "Envíos a todo el país",
  "Pedidos por WhatsApp",
  "Pitalito, Huila",
] as const;

const NAVEGACION = [
  ["Catálogo", "#catalogo"],
  ["Sobre Daniel", "#barista"],
  ["Servicios", "#servicios"],
  ["Contacto", "#contacto"],
] as const;

/**
 * Cabecera fija: barra de anuncio arriba y navegación debajo, con el nombre a
 * la izquierda, los enlaces al centro y el contacto a la derecha. Es la misma
 * estructura de las dos referencias.
 *
 * Sobre el hero arranca transparente y con el texto en blanco; en cuanto la
 * página baja se vuelve sólida sobre papel. Así la foto del hero se ve entera
 * y el resto del sitio conserva una barra legible.
 */
export default function Cabecera() {
  const [solida, setSolida] = useState(false);
  const [menu, setMenu] = useState(false);
  const marca = useRef<HTMLElement>(null);

  useEffect(() => {
    let raf: number | null = null;
    const alScrollear = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        // El punto de corte es el alto del hero menos la propia barra. Se mide
        // contra el elemento y no contra un número fijo porque el hero cambia
        // de alto entre celular y escritorio.
        const hero = document.getElementById("hero");
        const corte = hero ? hero.offsetHeight - 90 : 420;
        setSolida(window.scrollY > corte);
      });
    };
    window.addEventListener("scroll", alScrollear, { passive: true });
    alScrollear();
    return () => {
      window.removeEventListener("scroll", alScrollear);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Con el menú de celular abierto, el fondo no scrollea.
  useEffect(() => {
    if (!menu) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, [menu]);

  const color = solida ? "var(--color-tinta)" : "#FFF";

  return (
    <>
      {/* ── Cinta de anuncio ──
          Los orígenes van pasando en bucle. Es lo único que se mueve solo en
          toda la página y dice algo real: de dónde viene el café. Se detiene
          al pasar el mouse por encima para poder leerla. */}
      <div
        className="cinta-marco"
        style={{
          background: "var(--color-tinta)",
          color: "#FFF",
          padding: "9px 0",
          overflow: "hidden",
        }}
      >
        <div className="cinta">
          {/* Dos copias del mismo contenido: la animación desplaza media
              vuelta, así que cuando la primera copia sale, la segunda ya está
              exactamente donde estaba la primera y el reinicio no se ve. */}
          {[0, 1].map((copia) => (
            <span
              key={copia}
              aria-hidden={copia === 1}
              style={{ display: "flex", flexShrink: 0 }}
            >
              {ANUNCIOS.map((texto) => (
                <span
                  key={texto}
                  className="epigrafe"
                  style={{
                    color: "rgba(255,255,255,0.78)",
                    fontSize: 10,
                    padding: "0 26px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {texto}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ── Navegación ── */}
      <header
        ref={marca}
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          height: "var(--barra)",
          display: "flex",
          alignItems: "center",
          background: solida ? "rgba(255,255,255,0.92)" : "transparent",
          backdropFilter: solida ? "saturate(180%) blur(12px)" : undefined,
          borderBottom: `1px solid ${solida ? "var(--linea)" : "transparent"}`,
          transition: "background .3s ease, border-color .3s ease",
          // Cuando es transparente se monta ENCIMA del hero sin ocupar alto:
          // así la foto empieza en el borde de arriba de la ventana.
          marginBottom: "calc(var(--barra) * -1)",
        }}
      >
        <div
          className="contenedor"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}
        >
          <a
            href="#hero"
            style={{
              color,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
              transition: "color .3s ease",
            }}
          >
            {MARCA.nombre}
          </a>

          <nav
            aria-label="Secciones"
            style={{ display: "none", gap: 30 }}
            data-nav-escritorio
          >
            {NAVEGACION.map(([texto, ancla]) => (
              <a
                key={ancla}
                href={ancla}
                className="nav-enlace"
                style={{ color, fontSize: 13, fontWeight: 500 }}
              >
                {texto}
              </a>
            ))}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a
              href={enlaceWhatsApp(`Hola ${MARCA.nombre}, quiero preguntarte por tu café.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="boton"
              style={{
                height: 36,
                paddingInline: 16,
                fontSize: 11,
                textDecoration: "none",
                color,
                border: `1px solid ${solida ? "var(--linea)" : "rgba(255,255,255,0.5)"}`,
                transition: "color .3s ease, border-color .3s ease",
              }}
            >
              WhatsApp
            </a>

            {/* Menú de celular: el mismo botón abre y cierra. */}
            <button
              type="button"
              aria-label={menu ? "Cerrar el menú" : "Abrir el menú"}
              aria-expanded={menu}
              onClick={() => setMenu((v) => !v)}
              data-boton-menu
              style={{
                width: 36,
                height: 36,
                display: "grid",
                placeItems: "center",
                border: `1px solid ${solida ? "var(--linea)" : "rgba(255,255,255,0.5)"}`,
                borderRadius: "var(--radio-pildora)",
                background: "transparent",
                color,
                cursor: "pointer",
                transition: "color .3s ease, border-color .3s ease",
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>
                {menu ? "×" : "≡"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Menú desplegado en celular ── */}
      {menu && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 55,
            background: "var(--color-papel)",
            paddingTop: 96,
            animation: "aparecer .18s ease both",
          }}
          onClick={() => setMenu(false)}
        >
          <nav className="contenedor" aria-label="Secciones" style={{ display: "grid" }}>
            {NAVEGACION.map(([texto, ancla]) => (
              <a
                key={ancla}
                href={ancla}
                onClick={() => setMenu(false)}
                className="titular"
                style={{
                  padding: "20px 0",
                  borderBottom: "1px solid var(--linea-tenue)",
                  color: "var(--color-tinta)",
                  textDecoration: "none",
                  fontSize: 30,
                }}
              >
                {texto}
              </a>
            ))}
          </nav>
        </div>
      )}

      {/*
        La navegación del centro y el botón de menú se alternan por ancho. Va
        como <style> y no como media query en globals.css porque son dos reglas
        que solo le sirven a este componente; tenerlas acá evita ir a buscarlas
        a otro archivo cuando se toca la cabecera.
      */}
      <style>{`
        @media (min-width: 900px) {
          [data-nav-escritorio] { display: flex !important; }
          [data-boton-menu] { display: none !important; }
        }
      `}</style>
    </>
  );
}
