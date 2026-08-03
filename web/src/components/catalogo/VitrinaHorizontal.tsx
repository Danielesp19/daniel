"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { Categoria, Producto } from "@/lib/catalogo";
import { entrada, useRevelar } from "@/hooks/useRevelar";
import { useFondoPineado } from "@/hooks/useFondoPineado";

/**
 * Vitrina de a uno: se ve un solo producto a la vez y se pasa deslizando o
 * con las flechas. Pensada para los métodos de preparación, donde cada ficha
 * lleva video y ponerlos todos en una grilla sería reproducir cinco a la vez.
 */

// Recorrido horizontal mínimo (px) para contar como deslizada, y cuánto más
// horizontal que vertical debe ser el gesto. Sin la segunda condición, bajar
// por el catálogo con el dedo apenas inclinado cambiaría de ficha sin querer.
const MIN_PX = 45;
const PROPORCION = 1.4;

export default function VitrinaHorizontal({ categoria }: { categoria: Categoria }) {
  const seccion = useRef<HTMLElement>(null);
  const pin = useFondoPineado(seccion);
  const { ref: refCabecera, visible: cabeceraVisible } = useRevelar<HTMLDivElement>();
  const [indice, setIndice] = useState(0);

  if (!categoria.productos.length) return null;

  const total = categoria.productos.length;
  const producto = categoria.productos[indice];
  const hayAnterior = indice > 0;
  const haySiguiente = indice < total - 1;

  return (
    <section
      ref={seccion}
      id={`cat-${categoria.slug}`}
      style={{ position: "relative", background: "#0A0A0A" }}
    >
      {/* Fondo pineado. Ver el mismo bloque comentado en Tostador.tsx. */}
      <div
        aria-hidden="true"
        style={{
          position: pin === "durante" ? "fixed" : "absolute",
          top: pin === "despues" ? "auto" : 0,
          bottom: pin === "despues" ? 0 : "auto",
          left: 0,
          right: 0,
          height:
            pin === "corta" ? "100%" : pin === "durante" ? "100svh" : "calc(100svh + 120px)",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(10,10,10,0.88) 0%, rgba(10,10,10,0.9) 45%, rgba(10,10,10,0.97) 100%), url(/metodos.jpg) center 38%/cover no-repeat",
          }}
        />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1100,
          margin: "0 auto",
          padding: "clamp(64px,9vw,120px) clamp(20px,5vw,56px)",
          borderTop: "1px solid var(--linea)",
        }}
      >
        <div ref={refCabecera} style={{ textAlign: "center" }}>
          <div className="etiqueta" style={{ color: "var(--color-acido)", ...entrada(cabeceraVisible) }}>
            En la barra
          </div>
          <h2
            className="titular"
            style={{
              fontSize: "clamp(40px,8vw,96px)",
              margin: "14px 0 0",
              ...entrada(cabeceraVisible, 0.08),
            }}
          >
            {categoria.nombre}
          </h2>
          {categoria.descripcion && (
            <p
              style={{
                margin: "16px auto 0",
                maxWidth: 460,
                fontSize: 14,
                lineHeight: 1.7,
                color: "var(--apagado)",
                ...entrada(cabeceraVisible, 0.16),
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
          <div style={{ textAlign: "center", marginTop: 26 }}>
            <span className="cifra" style={{ fontSize: 12, color: "var(--apagado)" }}>
              {String(indice + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
            {/* Que se puede deslizar no se ve. Sin decirlo, mucha gente usaría
                solo las flechas. Se muestra hasta el primer cambio: después ya
                quedó claro cómo se pasa. */}
            {indice === 0 && (
              <div className="etiqueta" style={{ marginTop: 8, color: "var(--apagado)", fontSize: 9 }}>
                ‹ desliza ›
              </div>
            )}
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
        marginTop: "clamp(36px,5vw,60px)",
        display: "flex",
        alignItems: "center",
        gap: "clamp(10px,2vw,24px)",
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
          style={{
            position: "relative",
            width: "min(100%, 320px)",
            margin: "0 auto",
            aspectRatio: "1/1",
            border: "1px solid var(--linea)",
            background: "var(--color-humo)",
            overflow: "hidden",
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
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : producto.imagen_url ? (
            <Image
              src={producto.imagen_url}
              alt={producto.nombre}
              fill
              sizes="320px"
              draggable={false}
              style={{ objectFit: "cover" }}
            />
          ) : (
            <span
              aria-hidden="true"
              className="titular"
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 90,
                color: "rgba(250,250,250,0.07)",
              }}
            >
              {producto.nombre.charAt(0)}
            </span>
          )}
        </div>

        <h3
          className="titular"
          style={{ fontSize: "clamp(28px,5vw,46px)", margin: "24px 0 0" }}
        >
          {producto.nombre}
        </h3>

        {producto.descripcion && (
          <p
            style={{
              margin: "14px auto 0",
              maxWidth: 400,
              fontSize: 14,
              lineHeight: 1.7,
              color: "var(--apagado)",
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
  if (!visible) return <span style={{ flex: "0 0 36px" }} aria-hidden="true" />;

  return (
    <button
      type="button"
      aria-label={direccion === "izquierda" ? "Anterior" : "Siguiente"}
      onClick={onClick}
      style={{
        flex: "0 0 36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 48,
        padding: 0,
        border: "1px solid var(--linea)",
        background: "transparent",
        color: "var(--color-acido)",
        cursor: "pointer",
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
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
