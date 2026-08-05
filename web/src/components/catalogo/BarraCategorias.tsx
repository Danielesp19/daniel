"use client";

import { useEffect, useRef } from "react";
import type { Categoria } from "@/lib/catalogo";

/**
 * Barra de categorías pegada arriba. Filtra el catálogo; no navega.
 *
 * Se apoya en `position: sticky` sin ancestro con overflow recortado — ver el
 * comentario de `html, body { overflow-x: clip }` en globals.css, que es lo
 * que evita el temblor en iOS Safari.
 */
export default function BarraCategorias({
  categorias,
  activa,
  onCambiar,
}: {
  categorias: Categoria[];
  activa: number | null;
  onCambiar: (id: number | null) => void;
}) {
  const lista = useRef<HTMLDivElement>(null);
  const botonActivo = useRef<HTMLButtonElement>(null);

  // La categoría elegida se centra sola: en celular las últimas quedan fuera
  // de pantalla y sin esto no se ve cuál quedó seleccionada.
  useEffect(() => {
    const el = botonActivo.current;
    const caja = lista.current;
    if (!el || !caja) return;
    caja.scrollTo({
      left: el.offsetLeft - caja.clientWidth / 2 + el.clientWidth / 2,
      behavior: "smooth",
    });
  }, [activa]);

  const opciones: Array<{ id: number | null; nombre: string }> = [
    { id: null, nombre: "Todo" },
    ...categorias.map((c) => ({ id: c.id as number | null, nombre: c.nombre })),
  ];

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        height: "var(--barra)",
        background: "rgba(18,12,8,0.92)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--linea)",
      }}
    >
      <div
        ref={lista}
        className="tiras"
        role="tablist"
        aria-label="Categorías del catálogo"
        style={{
          display: "flex",
          alignItems: "stretch",
          height: "100%",
          overflowX: "auto",
          maxWidth: 1400,
          margin: "0 auto",
          padding: "0 clamp(12px,5vw,48px)",
        }}
      >
        {opciones.map((opcion) => {
          const esActiva = opcion.id === activa;
          return (
            <button
              key={opcion.id ?? "todo"}
              ref={esActiva ? botonActivo : null}
              role="tab"
              aria-selected={esActiva}
              onClick={() => onCambiar(opcion.id)}
              className="etiqueta"
              style={{
                flexShrink: 0,
                alignSelf: "center",
                padding: "8px 16px",
                border: "none",
                // En un sistema redondo la selección se marca con un relleno
                // en píldora, no con una línea: la línea era el recurso del
                // sistema anterior, que no tenía ni radios ni rellenos.
                borderRadius: "var(--radio-pildora)",
                background: esActiva ? "var(--color-acento)" : "transparent",
                color: esActiva ? "var(--color-negro)" : "var(--apagado)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "background-color .2s ease, color .2s ease",
              }}
            >
              {opcion.nombre}
            </button>
          );
        })}
      </div>
    </div>
  );
}
