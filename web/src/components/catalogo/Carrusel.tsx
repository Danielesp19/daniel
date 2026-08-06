"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Producto } from "@/lib/catalogo";
import TarjetaProducto from "./TarjetaProducto";

/**
 * Una fila de tarjetas que se corre de lado.
 *
 * Es el modo para las secciones con muchos productos: una grilla de seis o más
 * obliga a bajar media pantalla para pasar a la siguiente sección, y en
 * celular convierte el catálogo en una lista interminable. En una fila, la
 * sección ocupa un alto fijo y se recorre de lado.
 *
 * El desplazamiento es scroll nativo con `scroll-snap`, no un `transform`
 * calculado a mano. Eso da gratis el arrastre con el dedo, la rueda del mouse
 * en horizontal, el teclado y la inercia propia de cada sistema. Las flechas
 * solo scrollean el contenedor.
 */
export default function Carrusel({ productos }: { productos: Producto[] }) {
  const pista = useRef<HTMLDivElement>(null);
  const [avance, setAvance] = useState(0);
  const [hayAnterior, setHayAnterior] = useState(false);
  const [haySiguiente, setHaySiguiente] = useState(true);

  const medir = useCallback(() => {
    const el = pista.current;
    if (!el) return;
    const recorrido = el.scrollWidth - el.clientWidth;
    // Un par de píxeles de holgura: los navegadores no siempre llegan al valor
    // exacto y sin margen la flecha del final nunca se apaga.
    setHayAnterior(el.scrollLeft > 2);
    setHaySiguiente(el.scrollLeft < recorrido - 2);
    setAvance(recorrido > 0 ? el.scrollLeft / recorrido : 0);
  }, []);

  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    medir();
    el.addEventListener("scroll", medir, { passive: true });
    // Al cambiar el ancho cambia cuántas tarjetas caben: sin volver a medir, al
    // girar el teléfono la flecha del final queda encendida sobre un carrusel
    // que ya no tiene a dónde correr.
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => {
      el.removeEventListener("scroll", medir);
      observador.disconnect();
    };
  }, [medir]);

  const correr = (direccion: 1 | -1) => {
    const el = pista.current;
    if (!el) return;
    // Casi una pantalla y no exactamente una: dejar a la vista un pedazo de la
    // tarjeta anterior es lo que hace entender que uno se movió dentro de una
    // fila y no que saltó a otra página.
    el.scrollBy({ left: direccion * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <>
      <div
        ref={pista}
        className="tiras revelar"
        style={{
          display: "flex",
          gap: "clamp(10px, 2vw, 18px)",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          paddingBlock: 4,
        }}
      >
        {productos.map((producto) => (
          <div
            key={producto.id}
            style={{
              // Cuántas caben: cinco o seis en escritorio, dos y un asomo en
              // celular. El asomo importa — es lo que dice que hay más hacia
              // el lado sin tener que explicarlo.
              flex: "0 0 clamp(175px, 42vw, 220px)",
              scrollSnapAlign: "start",
            }}
          >
            <TarjetaProducto producto={producto} />
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
          marginTop: 22,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "relative",
            flex: "1 1 auto",
            maxWidth: 240,
            height: 1,
            background: "currentColor",
            opacity: 0.22,
          }}
        >
          <span
            style={{
              position: "absolute",
              inset: 0,
              background: "currentColor",
              // scaleX y no width: el ancho recalcula el layout en cada frame
              // del scroll; la escala la lleva el compositor.
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
    </>
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
      className="boton"
      style={{
        width: 44,
        minHeight: 44,
        padding: 0,
        border: "1px solid currentColor",
        opacity: activa ? 1 : 0.3,
        cursor: activa ? "pointer" : "not-allowed",
      }}
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
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
