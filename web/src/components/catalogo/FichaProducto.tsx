"use client";

import { useEffect } from "react";
import Image from "next/image";
import type { Producto } from "@/lib/catalogo";
import { pesos, gramos } from "@/lib/formato";
import { useCarrito } from "@/components/carrito/CarritoProvider";
import { FichaTecnica, Notas, SelloEstado } from "./FichaTecnica";
import { fotoDeRelleno } from "./TeselaFoto";

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

  const peso = gramos(producto.gramos);

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
        background: "rgba(23,21,15,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(0px, 3vw, 32px)",
        animation: "aparecer .2s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 940,
          maxHeight: "94dvh",
          overflowY: "auto",
          background: "var(--color-papel)",
          borderRadius: "var(--radio-xl)",
          animation: "entrar .28s cubic-bezier(0.2,0.7,0.2,1) both",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: 14,
            position: "sticky",
            top: 0,
            background: "var(--color-papel)",
            zIndex: 2,
          }}
        >
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            style={{
              border: "1px solid var(--linea)",
              borderRadius: 999,
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
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: "clamp(20px, 3vw, 40px)",
            padding: "0 clamp(18px, 3vw, 32px) clamp(28px, 4vw, 40px)",
            alignItems: "start",
          }}
        >
          <div className="tesela" style={{ aspectRatio: "1/1", background: "var(--color-pergamino)" }}>
            {producto.video_url ? (
              <video
                src={producto.video_url}
                poster={producto.video_poster_url ?? producto.imagen_url ?? undefined}
                autoPlay
                muted
                loop
                playsInline
                style={{ display: "block" }}
              />
            ) : (
              <Image
                src={producto.imagen_url ?? fotoDeRelleno(producto.id).src}
                alt={producto.imagen_url ? producto.nombre : ""}
                aria-hidden={producto.imagen_url ? undefined : true}
                fill
                sizes="(max-width: 760px) 100vw, 460px"
                style={{
                  objectFit: "cover",
                  objectPosition: producto.imagen_url ? undefined : fotoDeRelleno(producto.id).posicion,
                  filter: producto.agotado ? "saturate(0.15) opacity(0.55)" : undefined,
                }}
              />
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {producto.finca && <span className="epigrafe">{producto.finca}</span>}
              <SelloEstado producto={producto} />
            </div>

            <h2
              className="titular"
              style={{ fontSize: "clamp(26px, 3.4vw, 40px)", margin: producto.finca ? "12px 0 0" : 0 }}
            >
              {producto.nombre}
            </h2>

            {producto.productor && (
              <div style={{ marginTop: 8, fontSize: 13, color: "var(--color-grafito)" }}>
                Productor · {producto.productor}
              </div>
            )}

            {producto.descripcion && (
              <p style={{ margin: "18px 0 0", fontSize: 15, lineHeight: 1.75, color: "var(--color-grafito)" }}>
                {producto.descripcion}
              </p>
            )}

            {producto.notas.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div className="epigrafe" style={{ marginBottom: 7 }}>
                  Notas de cata
                </div>
                <Notas notas={producto.notas} />
              </div>
            )}

            {producto.tiene_ficha && (
              <div style={{ marginTop: 26 }}>
                <FichaTecnica producto={producto} />
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                marginTop: 28,
                flexWrap: "wrap",
              }}
            >
              <span className="cifra" style={{ fontSize: 24, fontWeight: 600 }}>
                ${pesos(producto.precio_cop)}
                {peso && (
                  <span style={{ marginLeft: 9, fontSize: 13, fontWeight: 400, color: "var(--color-grafito)" }}>
                    {peso}
                  </span>
                )}
              </span>

              <button
                type="button"
                className="boton boton-solido"
                style={{ flex: "1 1 190px" }}
                disabled={producto.agotado}
                onClick={() => {
                  carrito.agregar(producto);
                  onCerrar();
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
