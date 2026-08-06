"use client";

import type { Producto } from "@/lib/catalogo";
import { pesos, gramos } from "@/lib/formato";
import { useCarrito } from "@/components/carrito/CarritoProvider";
import { Notas, SelloEstado } from "./FichaTecnica";
import TeselaFoto from "./TeselaFoto";

/**
 * Tarjeta del catálogo: foto, nombre, notas y precio. Nada más.
 *
 * Es la tarjeta de las dos referencias, y el cambio más grande respecto a la
 * versión anterior: antes cada tarjeta cargaba con la ficha técnica completa,
 * un índice, etiquetas de cata y el botón, todo al mismo peso. Con veinte
 * productos en pantalla eso es una pared de texto. Acá manda la foto, el
 * nombre se lee de un vistazo y el detalle vive un clic más adentro.
 *
 * El botón de agregar aparece al pasar el mouse en escritorio; en pantallas
 * táctiles, donde no hay hover, se muestra siempre.
 */
export default function TarjetaProducto({
  producto,
  onAbrir,
}: {
  producto: Producto;
  onAbrir: (p: Producto) => void;
}) {
  const carrito = useCarrito();
  const peso = gramos(producto.gramos);

  // El revelado lo pone quien la coloca (la grilla escalona los retrasos) y no
  // la tarjeta: así los productos de una misma fila no aparecen todos juntos.
  return (
    <article className="tarjeta">
      <button
        type="button"
        onClick={() => onAbrir(producto)}
        aria-label={`Ver la ficha de ${producto.nombre}`}
        style={{
          position: "relative",
          display: "block",
          width: "100%",
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <TeselaFoto producto={producto} />

        <span style={{ position: "absolute", top: 10, left: 10 }}>
          <SelloEstado producto={producto} />
        </span>
      </button>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingTop: 14 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>
          {producto.nombre}
        </h3>

        {producto.notas.length > 0 && (
          <div style={{ marginTop: 5 }}>
            <Notas notas={producto.notas.slice(0, 3)} />
          </div>
        )}

        {/* `auto` empuja el precio al fondo: en una fila de la grilla todos los
            precios quedan a la misma altura aunque los nombres ocupen distinto. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginTop: "auto",
            paddingTop: 12,
            // En celular la tarjeta mide la mitad del ancho y el precio junto
            // al botón no caben en una línea: sin `wrap` el botón se salía de
            // la tesela y se montaba sobre la tarjeta de al lado.
            flexWrap: "wrap",
          }}
        >
          <div className="cifra" style={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap" }}>
            ${pesos(producto.precio_cop)}
            {peso && (
              <span style={{ marginLeft: 7, fontSize: 12, fontWeight: 400, color: "var(--color-grafito)" }}>
                {peso}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={producto.agotado}
            onClick={() => carrito.agregar(producto)}
            aria-label={`Agregar ${producto.nombre} al pedido`}
            style={{
              padding: "7px 12px",
              border: "1px solid var(--linea)",
              borderRadius: "var(--radio-sm)",
              background: "transparent",
              color: producto.agotado ? "var(--color-grafito)" : "var(--color-tinta)",
              fontFamily: "inherit",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: producto.agotado ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              transition: "background .18s, color .18s, border-color .18s",
            }}
            onMouseEnter={(e) => {
              if (producto.agotado) return;
              e.currentTarget.style.background = "var(--color-tinta)";
              e.currentTarget.style.color = "#FFF";
              e.currentTarget.style.borderColor = "var(--color-tinta)";
            }}
            onMouseLeave={(e) => {
              if (producto.agotado) return;
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--color-tinta)";
              e.currentTarget.style.borderColor = "var(--linea)";
            }}
          >
            {producto.agotado ? "Agotado" : producto.controla_stock ? "Agregar" : "Agendar"}
          </button>
        </div>
      </div>
    </article>
  );
}
