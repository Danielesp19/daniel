"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Categoria, Producto } from "@/lib/catalogo";
import { useRevelado } from "@/hooks/useRevelar";
import { CabezaSeccion } from "./Catalogo";
import TarjetaProducto from "./TarjetaProducto";

/**
 * Carrusel: una fila de tarjetas que se corre de lado.
 *
 * Es el modo para las secciones con muchos productos —los cafés, los
 * artefactos—: una grilla de seis o más obliga a bajar media pantalla para
 * pasar de una sección a la siguiente, y en celular convierte el catálogo en
 * una lista interminable. En una fila, la sección ocupa un alto fijo y se
 * recorre de lado.
 *
 * El desplazamiento es scroll nativo con `scroll-snap`, no un `transform`
 * calculado a mano. Eso da gratis: arrastre con el dedo, rueda del mouse en
 * horizontal, teclado, y la inercia propia de cada sistema. Las flechas
 * simplemente scrollean el contenedor.
 */
export default function Carrusel({
  categoria,
  enBanda,
  onAbrir,
}: {
  categoria: Categoria;
  enBanda: boolean;
  onAbrir: (p: Producto) => void;
}) {
  const { ref, props } = useRevelado<HTMLDivElement>();
  const pista = useRef<HTMLDivElement>(null);
  const [avance, setAvance] = useState(0);
  const [hayAnterior, setHayAnterior] = useState(false);
  const [haySiguiente, setHaySiguiente] = useState(true);

  const medir = useCallback(() => {
    const el = pista.current;
    if (!el) return;
    const recorrido = el.scrollWidth - el.clientWidth;
    // Un par de píxeles de margen: los navegadores no siempre llegan al valor
    // exacto y sin holgura la flecha del final nunca se apaga.
    setHayAnterior(el.scrollLeft > 2);
    setHaySiguiente(el.scrollLeft < recorrido - 2);
    setAvance(recorrido > 0 ? el.scrollLeft / recorrido : 0);
  }, []);

  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    medir();
    el.addEventListener("scroll", medir, { passive: true });
    // Si la ventana cambia de ancho cambian cuántas tarjetas caben, así que
    // hay que volver a medir: sin esto, al girar el teléfono la flecha del
    // final queda encendida sobre un carrusel que ya no tiene a dónde correr.
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => {
      el.removeEventListener("scroll", medir);
      observador.disconnect();
    };
  }, [medir]);

  /** Corre el carrusel una pantalla, sin pasarse de la última tarjeta. */
  const correr = (direccion: 1 | -1) => {
    const el = pista.current;
    if (!el) return;
    // Se avanza casi una pantalla y no exactamente una: dejar un pedazo de la
    // tarjeta anterior a la vista es lo que hace que se entienda que uno se
    // movió dentro de una fila y no que saltó a otra página.
    el.scrollBy({ left: direccion * el.clientWidth * 0.85, behavior: "smooth" });
  };

  if (!categoria.productos.length) return null;

  return (
    <section id={`cat-${categoria.slug}`} className={`seccion${enBanda ? " banda" : ""}`}>
      <div className="contenedor">
        <div ref={ref} {...props}>
          <CabezaSeccion
            epigrafe={`${String(categoria.productos.length).padStart(2, "0")} referencias`}
            titulo={categoria.nombre}
            descripcion={categoria.descripcion}
          />

          <div
            ref={pista}
            className="tiras revelar"
            style={{
              display: "flex",
              gap: "clamp(14px, 1.8vw, 22px)",
              overflowX: "auto",
              scrollSnapType: "x mandatory",
              // El relleno lateral deja que la primera y la última tarjeta se
              // despeguen del borde al llegar al tope del recorrido.
              paddingBlock: 4,
              scrollPaddingInline: 2,
            }}
          >
            {categoria.productos.map((producto) => (
              <div
                key={producto.id}
                style={{
                  // Cuántas caben: cuatro en escritorio, dos y un asomo en
                  // celular. El asomo importa — es lo que le dice a alguien
                  // que hay más hacia el lado sin tener que explicárselo.
                  flex: "0 0 clamp(210px, 42vw, 280px)",
                  scrollSnapAlign: "start",
                }}
              >
                <TarjetaProducto producto={producto} onAbrir={onAbrir} />
              </div>
            ))}
          </div>

          {/* Controles: barra de avance a la izquierda, flechas a la derecha. */}
          <div
            className="revelar"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
              marginTop: 26,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "relative",
                flex: "1 1 auto",
                maxWidth: 260,
                height: 2,
                borderRadius: 999,
                background: "var(--linea)",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 999,
                  background: "var(--color-cereza)",
                  // scaleX y no width: el ancho recalcula el layout en cada
                  // frame del scroll; la escala la lleva el compositor.
                  transform: `scaleX(${0.18 + avance * 0.82})`,
                  transformOrigin: "left",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <Flecha direccion="izquierda" activa={hayAnterior} onClick={() => correr(-1)} />
              <Flecha direccion="derecha" activa={haySiguiente} onClick={() => correr(1)} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Flecha({
  direccion,
  activa,
  onClick,
}: {
  direccion: "izquierda" | "derecha";
  activa: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={direccion === "izquierda" ? "Ver anteriores" : "Ver siguientes"}
      onClick={onClick}
      // Deshabilitado en vez de escondido: si el botón desapareciera al llegar
      // al final, el otro se correría de lugar justo cuando lo vas a tocar.
      disabled={!activa}
      style={{
        display: "grid",
        placeItems: "center",
        width: 44,
        height: 44,
        padding: 0,
        border: "1px solid var(--linea)",
        borderRadius: 999,
        background: "transparent",
        color: "var(--color-tinta)",
        cursor: activa ? "pointer" : "not-allowed",
        opacity: activa ? 1 : 0.35,
        transition: "background-color .18s ease, color .18s ease, opacity .18s ease",
      }}
      onMouseEnter={(e) => {
        if (!activa) return;
        e.currentTarget.style.background = "var(--color-tinta)";
        e.currentTarget.style.color = "#FFF";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--color-tinta)";
      }}
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        {direccion === "izquierda" ? (
          <polyline points="15 6 9 12 15 18" />
        ) : (
          <polyline points="9 6 15 12 9 18" />
        )}
      </svg>
    </button>
  );
}
