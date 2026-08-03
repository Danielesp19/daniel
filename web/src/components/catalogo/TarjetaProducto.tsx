"use client";

import Image from "next/image";
import type { Producto } from "@/lib/catalogo";
import { pesos, gramos } from "@/lib/formato";
import { entrada, useRevelar } from "@/hooks/useRevelar";
import { useCarrito } from "@/components/carrito/CarritoProvider";
import { FichaTecnica, Notas, SelloEstado } from "./FichaTecnica";

/**
 * Tarjeta del catálogo: foto cuadrada, nombre, ficha técnica compacta y el
 * botón de agregar. Bordes duros y sin radios — la retícula es el diseño.
 */
export default function TarjetaProducto({
  producto,
  indice,
  onAbrir,
}: {
  producto: Producto;
  indice: number;
  onAbrir: (p: Producto) => void;
}) {
  const { ref, visible } = useRevelar<HTMLElement>();
  const carrito = useCarrito();

  const peso = gramos(producto.gramos);

  return (
    <article
      ref={ref}
      className="tarjeta"
      style={{
        display: "flex",
        flexDirection: "column",
        border: "1px solid var(--linea)",
        background: "var(--color-carbon)",
        ...entrada(visible),
      }}
    >
      {/* Foto: abre el detalle. */}
      <button
        type="button"
        onClick={() => onAbrir(producto)}
        aria-label={`Ver la ficha de ${producto.nombre}`}
        style={{
          position: "relative",
          display: "block",
          width: "100%",
          aspectRatio: "1/1",
          padding: 0,
          border: "none",
          borderBottom: "1px solid var(--linea)",
          background: "var(--color-humo)",
          cursor: "pointer",
          overflow: "hidden",
        }}
      >
        {producto.imagen_url ? (
          <Image
            src={producto.imagen_url}
            alt={producto.nombre}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 25vw"
            draggable={false}
            style={{
              objectFit: "cover",
              // Agotado en escala de grises: se entiende sin leer el sello.
              filter: producto.agotado ? "grayscale(1) brightness(0.55)" : undefined,
            }}
          />
        ) : (
          // Sin foto: la inicial enorme en lugar de un hueco gris.
          <span
            aria-hidden="true"
            className="titular"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "clamp(48px,9vw,88px)",
              color: "rgba(250,250,250,0.07)",
            }}
          >
            {producto.nombre.charAt(0)}
          </span>
        )}

        {/* Índice arriba a la izquierda, estado arriba a la derecha. */}
        <span
          className="indice"
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            padding: "3px 6px",
            background: "rgba(10,10,10,0.75)",
          }}
        >
          {String(indice + 1).padStart(2, "0")}
        </span>
        <span style={{ position: "absolute", top: 10, right: 10 }}>
          <SelloEstado producto={producto} />
        </span>
      </button>

      {/* Nombre y origen */}
      <div style={{ padding: "14px 14px 12px" }}>
        <h3 className="titular" style={{ fontSize: "clamp(19px,2.2vw,24px)", margin: 0 }}>
          {producto.nombre}
        </h3>
        {producto.finca && (
          <div
            className="etiqueta"
            style={{ color: "var(--apagado)", marginTop: 6, fontSize: 9 }}
          >
            {producto.finca}
          </div>
        )}
        {producto.notas.length > 0 && (
          <div style={{ marginTop: 11 }}>
            <Notas notas={producto.notas.slice(0, 3)} />
          </div>
        )}
      </div>

      {/* La ficha empuja el precio al fondo para que todas las tarjetas de una
          fila alineen el precio a la misma altura aunque el texto varíe. */}
      <div style={{ marginTop: "auto" }}>
        <FichaTecnica producto={producto} compacta />

        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            justifyContent: "space-between",
            gap: 10,
            padding: "12px 14px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="cifra" style={{ fontSize: 17 }}>
              ${pesos(producto.precio_cop)}
            </div>
            {peso && (
              <div className="etiqueta" style={{ color: "var(--apagado)", marginTop: 4, fontSize: 9 }}>
                {peso}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={producto.agotado}
            onClick={() => carrito.agregar(producto)}
            aria-label={`Agregar ${producto.nombre} al pedido`}
            style={{
              alignSelf: "center",
              padding: "10px 14px",
              border: `1px solid ${producto.agotado ? "var(--linea)" : "var(--color-acido)"}`,
              background: "transparent",
              color: producto.agotado ? "var(--apagado)" : "var(--color-acido)",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: producto.agotado ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              transition: "background .18s, color .18s",
            }}
            onMouseEnter={(e) => {
              if (producto.agotado) return;
              e.currentTarget.style.background = "var(--color-acido)";
              e.currentTarget.style.color = "#0A0A0A";
            }}
            onMouseLeave={(e) => {
              if (producto.agotado) return;
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--color-acido)";
            }}
          >
            {producto.agotado ? "Agotado" : producto.controla_stock ? "Agregar" : "Agendar"}
          </button>
        </div>
      </div>
    </article>
  );
}
