"use client";

import { useEffect, useRef } from "react";
import type { Categoria } from "@/lib/catalogo";

/**
 * Filtro de categorías: pestañas centradas con subrayado en la activa, como la
 * fila "New releases / Best sellers / All products" de normcore. Filtra el
 * catálogo; no navega.
 *
 * Queda pegada justo debajo de la cabecera. Se apoya en `position: sticky` sin
 * ancestro con overflow recortado — ver el comentario de
 * `html, body { overflow-x: clip }` en globals.css, que es lo que evita el
 * temblor en iOS Safari.
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
        top: "var(--barra)",
        zIndex: 40,
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "saturate(180%) blur(12px)",
        borderBottom: "1px solid var(--linea)",
      }}
    >
      <div
        ref={lista}
        className="tiras contenedor"
        role="tablist"
        aria-label="Categorías del catálogo"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "clamp(18px, 3vw, 38px)",
          overflowX: "auto",
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
              style={{
                flexShrink: 0,
                padding: "16px 2px",
                border: "none",
                // El subrayado se dibuja siempre, transparente cuando no está
                // activa: así la fila no cambia de alto al elegir y el texto no
                // salta un pixel.
                borderBottom: `2px solid ${esActiva ? "var(--color-tinta)" : "transparent"}`,
                background: "transparent",
                color: esActiva ? "var(--color-tinta)" : "var(--color-grafito)",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: esActiva ? 600 : 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "color .2s ease, border-color .2s ease",
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
