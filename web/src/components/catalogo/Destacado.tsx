"use client";

import type { Producto } from "@/lib/catalogo";
import { pesos, gramos } from "@/lib/formato";
import { useCarrito } from "@/components/carrito/CarritoProvider";
import TeselaFoto from "./TeselaFoto";

/**
 * Panel del producto destacado: foto grande a un lado y la ficha al otro,
 * sobre negro, ocupando todo el ancho de la sección.
 *
 * Es el único producto que se dibuja en grande. Sirve para el lote o el equipo
 * que uno quiere que se vea primero, y funciona porque es UNO: si se destacan
 * tres, no hay destacado.
 */
export default function Destacado({ producto }: { producto: Producto }) {
  const carrito = useCarrito();
  const peso = gramos(producto.gramos);

  return (
    <article
      className="revelar"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
        background: "var(--color-tinta)",
        color: "#FFF",
        overflow: "hidden",
      }}
    >
      <div className="tesela" style={{ minHeight: 240, background: "var(--color-tesela-o)" }}>
        <TeselaFoto producto={producto} sizes="(max-width: 800px) 100vw, 590px" />
        <span className="sello" style={{ top: 12, left: 12, background: "#FFF", color: "var(--color-tinta)" }}>
          Destacado
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "clamp(22px, 4.5vw, 44px)",
        }}
      >
        {(producto.finca ?? producto.categoria) && (
          <span className="epigrafe" style={{ color: "var(--rotulo-o)", letterSpacing: "0.22em" }}>
            {producto.finca ?? producto.categoria}
          </span>
        )}

        <h3
          className="nombre"
          style={{ fontSize: "clamp(27px, 5.5vw, 42px)", lineHeight: 1.04, marginTop: 11 }}
        >
          {producto.nombre}
        </h3>

        {producto.descripcion && (
          <p
            style={{
              margin: "12px 0 0",
              maxWidth: "40ch",
              fontSize: 14,
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            {producto.descripcion}
          </p>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 22,
            paddingTop: 18,
            borderTop: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          <div className="cifra" style={{ fontSize: 20 }}>
            ${pesos(producto.precio_cop)}
            {peso && (
              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: "var(--rotulo-o)" }}>
                {peso}
              </span>
            )}
          </div>

          <button
            type="button"
            className="boton boton-grande boton-solido-claro"
            style={{ flex: "1 1 160px" }}
            disabled={producto.agotado}
            onClick={() => carrito.agregar(producto)}
          >
            {producto.agotado ? "Agotado" : "Agregar al pedido"}
          </button>
        </div>
      </div>
    </article>
  );
}
