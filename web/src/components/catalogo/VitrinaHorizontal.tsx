"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { Categoria, Producto } from "@/lib/catalogo";
import { useRevelado } from "@/hooks/useRevelar";
import { MarcaGrano } from "./TeselaFoto";

/**
 * Vitrina de a uno: se ve un solo producto a la vez y se pasa deslizando o con
 * las flechas. Pensada para los métodos de preparación, donde cada ficha lleva
 * video y ponerlos todos en una grilla sería reproducir cinco a la vez.
 *
 * Es la única sección sobre hueso en vez de papel. Sirve de respiro a mitad de
 * página, igual que la banda gris de "Our looks" en normcore.
 */

// Recorrido horizontal mínimo (px) para contar como deslizada, y cuánto más
// horizontal que vertical debe ser el gesto. Sin la segunda condición, bajar
// por el catálogo con el dedo apenas inclinado cambiaría de ficha sin querer.
const MIN_PX = 45;
const PROPORCION = 1.4;

export default function VitrinaHorizontal({ categoria }: { categoria: Categoria }) {
  const { ref, props } = useRevelado<HTMLDivElement>();
  const [indice, setIndice] = useState(0);

  if (!categoria.productos.length) return null;

  const total = categoria.productos.length;
  const producto = categoria.productos[indice];
  const hayAnterior = indice > 0;
  const haySiguiente = indice < total - 1;

  return (
    <section
      id={`cat-${categoria.slug}`}
      className="seccion"
      style={{ background: "var(--color-hueso)" }}
    >
      <div className="contenedor" style={{ maxWidth: 1000 }}>
        <div ref={ref} {...props} style={{ textAlign: "center" }}>
          <span className="epigrafe revelar">En la barra</span>
          <h2
            className="titular revelar"
            style={{ fontSize: "clamp(28px, 3.6vw, 44px)", margin: "12px 0 0", transitionDelay: "60ms" }}
          >
            {categoria.nombre}
          </h2>
          {categoria.descripcion && (
            <p
              className="revelar"
              style={{
                margin: "14px auto 0",
                maxWidth: 480,
                fontSize: 15,
                lineHeight: 1.7,
                color: "var(--color-grafito)",
                transitionDelay: "120ms",
              }}
            >
              {categoria.descripcion}
            </p>
          )}
        </div>

        <Diapositiva
          // key: al cambiar de producto el bloque se remonta y vuelve a entrar
          // con el desvanecido, en vez de saltar de una foto a otra.
          key={producto.id}
          producto={producto}
          hayAnterior={hayAnterior}
          haySiguiente={haySiguiente}
          onAnterior={() => setIndice((i) => i - 1)}
          onSiguiente={() => setIndice((i) => i + 1)}
        />

        {total > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 30 }}>
            {categoria.productos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                aria-label={`Ver ${p.nombre}`}
                aria-current={i === indice}
                onClick={() => setIndice(i)}
                style={{
                  width: i === indice ? 22 : 7,
                  height: 7,
                  padding: 0,
                  border: "none",
                  borderRadius: 999,
                  background: i === indice ? "var(--color-tinta)" : "#CFCAC1",
                  cursor: "pointer",
                  transition: "width .25s ease, background-color .25s ease",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Diapositiva({
  producto,
  hayAnterior,
  haySiguiente,
  onAnterior,
  onSiguiente,
}: {
  producto: Producto;
  hayAnterior: boolean;
  haySiguiente: boolean;
  onAnterior: () => void;
  onSiguiente: () => void;
}) {
  // Eventos de puntero, no de tacto: cubren dedo, mouse y lápiz con un solo
  // handler y —clave acá— no se pierden cuando el navegador evalúa si el
  // gesto era un scroll. Con touchstart/touchend, arrastrar en horizontal
  // sobre una página que scrollea en vertical suele terminar en touchcancel,
  // así que el handler de fin nunca corría y la deslizada "no hacía nada".
  const inicio = useRef<{ x: number; y: number } | null>(null);

  const alBajar = (e: React.PointerEvent) => {
    inicio.current = { x: e.clientX, y: e.clientY };
  };

  const alSoltar = (e: React.PointerEvent) => {
    const desde = inicio.current;
    inicio.current = null;
    if (!desde) return;
    const dx = e.clientX - desde.x;
    const dy = e.clientY - desde.y;
    if (Math.abs(dx) < MIN_PX || Math.abs(dx) < Math.abs(dy) * PROPORCION) return;
    if (dx < 0 && haySiguiente) onSiguiente();
    else if (dx > 0 && hayAnterior) onAnterior();
  };

  return (
    <div
      onPointerDown={alBajar}
      onPointerUp={alSoltar}
      onPointerCancel={() => { inicio.current = null; }}
      // Arrastrar sobre una imagen dispara el drag-and-drop nativo del
      // navegador, que se queda el gesto y corta la secuencia de puntero a
      // mitad de camino: el pointerup nunca llega y la deslizada no hace nada.
      onDragStart={(e) => e.preventDefault()}
      style={{
        marginTop: "clamp(34px, 5vw, 56px)",
        display: "flex",
        alignItems: "center",
        gap: "clamp(10px, 2vw, 28px)",
        animation: "aparecer .4s ease both",
        // pan-y: el scroll vertical del catálogo sigue siendo del navegador,
        // pero el movimiento horizontal queda para nosotros.
        touchAction: "pan-y",
        // Sin esto, arrastrar sobre el texto lo selecciona en vez de pasar.
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <Flecha direccion="izquierda" visible={hayAnterior} onClick={onAnterior} />

      <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
        <div
          className="tesela"
          style={{
            width: "min(100%, 420px)",
            margin: "0 auto",
            aspectRatio: "1/1",
            background: "var(--color-papel)",
          }}
        >
          {producto.video_url ? (
            <video
              src={producto.video_url}
              poster={producto.video_poster_url ?? producto.imagen_url ?? undefined}
              autoPlay
              muted
              loop
              playsInline
              draggable={false}
              style={{ display: "block" }}
            />
          ) : producto.imagen_url ? (
            <Image
              src={producto.imagen_url}
              alt={producto.nombre}
              fill
              sizes="420px"
              draggable={false}
              style={{ objectFit: "cover" }}
            />
          ) : (
            <MarcaGrano />
          )}
        </div>

        <h3 className="titular" style={{ fontSize: "clamp(22px, 2.8vw, 32px)", margin: "26px 0 0" }}>
          {producto.nombre}
        </h3>

        {producto.descripcion && (
          <p
            style={{
              margin: "12px auto 0",
              maxWidth: 420,
              fontSize: 15,
              lineHeight: 1.7,
              color: "var(--color-grafito)",
            }}
          >
            {producto.descripcion}
          </p>
        )}
      </div>

      <Flecha direccion="derecha" visible={haySiguiente} onClick={onSiguiente} />
    </div>
  );
}

function Flecha({
  direccion,
  visible,
  onClick,
}: {
  direccion: "izquierda" | "derecha";
  visible: boolean;
  onClick: () => void;
}) {
  // Cuando no hay a dónde ir se deja el hueco en vez de quitar el botón: si
  // desapareciera, el bloque central se correría de lado al llegar al final.
  if (!visible) return <span style={{ flex: "0 0 44px" }} aria-hidden="true" />;

  return (
    <button
      type="button"
      aria-label={direccion === "izquierda" ? "Anterior" : "Siguiente"}
      onClick={onClick}
      style={{
        flex: "0 0 44px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 44,
        height: 44,
        padding: 0,
        border: "1px solid var(--linea)",
        borderRadius: 999,
        background: "var(--color-papel)",
        color: "var(--color-tinta)",
        cursor: "pointer",
        transition: "background-color .18s ease, color .18s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--color-tinta)";
        e.currentTarget.style.color = "#FFF";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--color-papel)";
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
