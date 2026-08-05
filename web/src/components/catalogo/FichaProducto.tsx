"use client";

import { useEffect } from "react";
import Image from "next/image";
import type { Producto } from "@/lib/catalogo";
import { pesos } from "@/lib/formato";
import { useCarrito } from "@/components/carrito/CarritoProvider";
import { FichaTecnica, Notas, SelloEstado } from "./FichaTecnica";

/** Detalle de un producto: foto grande, ficha completa y botón de agregar. */
export default function FichaProducto({
  producto,
  onCerrar,
}: {
  producto: Producto;
  onCerrar: () => void;
}) {
  const carrito = useCarrito();

  // Con la ficha abierta el fondo no debe scrollear detrás, y Escape cierra.
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => {
      document.body.style.overflow = previo;
      window.removeEventListener("keydown", alTeclear);
    };
  }, [onCerrar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={producto.nombre}
      onClick={onCerrar}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(18,12,8,0.86)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(0px,3vw,32px)",
        animation: "aparecer .2s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 900,
          maxHeight: "94dvh",
          overflowY: "auto",
          background: "var(--color-carbon)",
          border: "1px solid var(--linea)",
          borderRadius: "var(--radio-lg)",
          animation: "entrar .28s cubic-bezier(0.2,0.7,0.2,1) both",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: 12,
            position: "sticky",
            top: 0,
            background: "var(--color-carbon)",
            zIndex: 2,
          }}
        >
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            style={{
              border: "1px solid var(--linea)",
              borderRadius: "var(--radio-pildora)",
              background: "transparent",
              color: "var(--color-tinta)",
              width: 36,
              height: 36,
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
            gap: 0,
            padding: "0 clamp(16px,3vw,28px) clamp(24px,3vw,32px)",
            alignItems: "start",
          }}
        >
          <div
            style={{
              position: "relative",
              aspectRatio: "1/1",
              border: "1px solid var(--linea)",
              borderRadius: "var(--radio-lg)",
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
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : producto.imagen_url ? (
              <Image
                src={producto.imagen_url}
                alt={producto.nombre}
                fill
                sizes="(max-width: 760px) 100vw, 440px"
                style={{
                  objectFit: "cover",
                  filter: producto.agotado ? "saturate(0.25) brightness(0.5)" : undefined,
                }}
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
                  fontSize: 130,
                  color: "rgba(243,233,217,0.07)",
                }}
              >
                {producto.nombre.charAt(0)}
              </span>
            )}
          </div>

          <div style={{ padding: "clamp(16px,3vw,28px) 0 0 clamp(0px,3vw,28px)", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {producto.finca && (
                <span className="etiqueta" style={{ color: "var(--color-acento)" }}>
                  {producto.finca}
                </span>
              )}
              <SelloEstado producto={producto} />
            </div>

            <h2 className="titular" style={{ fontSize: "clamp(32px,5vw,52px)", margin: "10px 0 0" }}>
              {producto.nombre}
            </h2>

            {producto.productor && (
              <div className="etiqueta" style={{ color: "var(--apagado)", marginTop: 10 }}>
                Productor · {producto.productor}
              </div>
            )}

            {producto.descripcion && (
              <p style={{ margin: "16px 0 0", fontSize: 14, lineHeight: 1.75, color: "var(--apagado)" }}>
                {producto.descripcion}
              </p>
            )}

            {producto.notas.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div className="etiqueta" style={{ color: "var(--apagado)", marginBottom: 9, fontSize: 9 }}>
                  Notas de cata
                </div>
                <Notas notas={producto.notas} />
              </div>
            )}

            {producto.tiene_ficha && (
              <div style={{ marginTop: 22 }}>
                <FichaTecnica producto={producto} />
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginTop: 24,
                flexWrap: "wrap",
              }}
            >
              <div>
                <span className="cifra" style={{ fontSize: 24 }}>
                  ${pesos(producto.precio_cop)}
                </span>
                {producto.gramos > 0 && (
                  <span className="etiqueta" style={{ color: "var(--apagado)", marginLeft: 10, fontSize: 9 }}>
                    {producto.gramos} g
                  </span>
                )}
              </div>

              <button
                type="button"
                disabled={producto.agotado}
                onClick={() => {
                  carrito.agregar(producto);
                  onCerrar();
                }}
                style={{
                  flex: "1 1 160px",
                  padding: "14px 22px",
                  border: `1px solid ${producto.agotado ? "var(--linea)" : "var(--color-acento)"}`,
              borderRadius: "var(--radio-pildora)",
                  background: producto.agotado ? "transparent" : "var(--color-acento)",
                  color: producto.agotado ? "var(--apagado)" : "var(--color-negro)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  cursor: producto.agotado ? "not-allowed" : "pointer",
                }}
              >
                {producto.agotado
                  ? "Agotado"
                  : producto.controla_stock
                    ? "Agregar al pedido"
                    : "Agendar por WhatsApp"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
