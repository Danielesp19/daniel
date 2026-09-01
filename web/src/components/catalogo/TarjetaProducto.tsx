"use client";

import { useState } from "react";
import type { Producto } from "@/lib/catalogo";
import { pesos, gramos } from "@/lib/formato";
import TeselaFoto from "./TeselaFoto";
import FichaProducto from "./FichaProducto";

/**
 * Tarjeta de producto: foto, rótulo, nombre en serif, notas en itálica, precio
 * y un botón de "ver más" que abre la ficha completa.
 *
 * La tarjeta NO agrega al pedido. Su trabajo es que uno reconozca el lote y
 * decida si quiere mirarlo; agregar se decide en la ficha, donde están la
 * ficha de origen y en qué sede hay. Antes el detalle se desplegaba aquí
 * mismo, pero con esos dos bloques ya no cabe en 175 px sin volver la tarjeta
 * una columna larguísima que empuja al resto de la grilla hacia abajo.
 *
 * Sirve igual sobre fondo claro y sobre fondo oscuro: los colores los resuelve
 * el CSS a partir de la sección que la contenga (ver `.seccion-oscura` en
 * globals.css), así que no recibe ninguna prop de tono.
 */
export default function TarjetaProducto({ producto }: { producto: Producto }) {
  const [abierta, setAbierta] = useState(false);

  const peso = gramos(producto.gramos);

  const sello = producto.agotado
    ? "Agotado"
    : producto.por_acabarse
      ? `Últimas ${producto.stock}`
      : producto.destacado
        ? "Destacado"
        : null;

  return (
    <article className="tarjeta">
      <div className="tesela" style={{ aspectRatio: "1" }}>
        <TeselaFoto producto={producto} />
        {sello && <span className="sello">{sello}</span>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 14 }}>
        {producto.finca && (
          <span className="rotulo" style={{ fontSize: 8.5 }}>
            {producto.finca}
          </span>
        )}

        <h3 className="nombre" style={{ marginTop: producto.finca ? 7 : 0 }}>
          {producto.nombre}
        </h3>

        {producto.notas.length > 0 && (
          <p className="notas" style={{ marginTop: 7 }}>
            {producto.notas.join(", ")}
          </p>
        )}

        {/* `auto` empuja el precio y el botón al fondo: en una fila de la
            grilla quedan a la misma altura aunque los nombres ocupen distinto. */}
        <div style={{ marginTop: "auto", paddingTop: 14 }}>
          <div className="cifra" style={{ fontSize: 15 }}>
            ${pesos(producto.precio_cop)}
            {peso && (
              <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 400, color: "var(--color-rotulo)" }}>
                {peso}
              </span>
            )}
          </div>

          {/* La tarjeta invita a mirar; agregar al pedido se decide adentro,
              con la ficha de origen y la disponibilidad a la vista. Por eso
              este botón NO se deshabilita cuando el producto está agotado: ahí
              adentro es donde se ve en qué sede se acabó y en cuál no. */}
          <button
            type="button"
            className="boton boton-ancho boton-linea boton-vermas"
            style={{ marginTop: 10 }}
            aria-haspopup="dialog"
            onClick={() => setAbierta(true)}
          >
            Ver más
          </button>
        </div>
      </div>

      <FichaProducto producto={abierta ? producto : null} onCerrar={() => setAbierta(false)} />
    </article>
  );
}
