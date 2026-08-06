"use client";

import type { Producto } from "@/lib/catalogo";
import { pesos, gramos } from "@/lib/formato";
import { useCarrito } from "@/components/carrito/CarritoProvider";
import { Notas, SelloEstado } from "./FichaTecnica";
import ReglaTueste from "./ReglaTueste";
import TeselaFoto, { SelloVideo } from "./TeselaFoto";

/**
 * Tarjeta del catálogo: foto, nombre, notas, regla de tueste y precio.
 *
 * La regla es lo que la separa de la tarjeta de cualquier tienda: en vez de
 * repetir la ficha técnica entera —que fue el error de la primera versión—
 * muestra UN dato, el tueste, dibujado en una escala que se compara de un
 * vistazo con la tarjeta de al lado. El resto de la ficha vive en el detalle.
 *
 * El botón de agregar aparece al pasar el mouse; en pantalla táctil, donde no
 * hay hover, se muestra siempre (la regla vive en globals.css).
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

        <span
          style={{
            position: "absolute",
            top: 9,
            left: 9,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <SelloEstado producto={producto} />
          {producto.video_url && <SelloVideo />}
        </span>

        {/* El puntaje va sobre la foto, abajo a la derecha: es la credencial
            del lote y así no compite con el nombre por el mismo renglón. */}
        {producto.puntaje_sca && (
          <span
            className="cifra"
            style={{
              position: "absolute",
              right: 9,
              bottom: 9,
              padding: "3px 7px",
              borderRadius: "var(--radio-pildora)",
              background: "rgba(251,250,246,0.92)",
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            {producto.puntaje_sca.toFixed(1)} <span style={{ opacity: 0.55 }}>SCA</span>
          </span>
        )}
      </button>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "14px 4px 0" }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: "-0.012em" }}>
          {producto.nombre}
        </h3>

        {/* Las notas de cata son de los cafés. Un molino o una báscula no
            tienen, y sin nada bajo el nombre la tarjeta queda con un hueco:
            ahí va la primera línea de su descripción, recortada a dos
            renglones para que todas midan parecido. */}
        {producto.notas.length > 0 ? (
          <div style={{ marginTop: 5 }}>
            <Notas notas={producto.notas.slice(0, 3)} />
          </div>
        ) : (
          producto.descripcion && (
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 13,
                lineHeight: 1.5,
                color: "var(--color-grafito)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {producto.descripcion}
            </p>
          )
        )}

        {/* `auto` empuja todo lo de abajo al fondo: en una fila de la grilla
            las reglas y los precios quedan a la misma altura aunque los
            nombres ocupen distinto. */}
        <div style={{ marginTop: "auto", paddingTop: 14 }}>
          <ReglaTueste producto={producto} />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              marginTop: 14,
              // En celular la tarjeta mide la mitad del ancho y el precio junto
              // al botón no caben en una línea: sin `wrap` el botón se salía de
              // la tesela y se montaba sobre la tarjeta de al lado.
              flexWrap: "wrap",
            }}
          >
            <div className="cifra" style={{ fontSize: 15, fontWeight: 500, whiteSpace: "nowrap" }}>
              ${pesos(producto.precio_cop)}
              {peso && (
                <span style={{ marginLeft: 7, fontSize: 11, color: "var(--color-grafito)" }}>
                  {peso}
                </span>
              )}
            </div>

            <button
              type="button"
              className="agregar"
              disabled={producto.agotado}
              onClick={() => carrito.agregar(producto)}
              aria-label={`Agregar ${producto.nombre} al pedido`}
              style={{
                padding: "7px 12px",
                border: "1px solid var(--linea)",
                borderRadius: "var(--radio-pildora)",
                background: "transparent",
                color: producto.agotado ? "var(--color-grafito)" : "var(--color-tinta)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: producto.agotado ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
                transition: "background-color .18s ease, color .18s ease, border-color .18s ease",
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
      </div>
    </article>
  );
}
