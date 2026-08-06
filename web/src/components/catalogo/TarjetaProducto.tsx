"use client";

import { useState } from "react";
import type { Producto } from "@/lib/catalogo";
import { pesos, gramos, altitud } from "@/lib/formato";
import { useCarrito } from "@/components/carrito/CarritoProvider";
import TeselaFoto from "./TeselaFoto";

/**
 * Tarjeta de producto: foto, rótulo, nombre en serif, notas en itálica, un
 * "ver más" que despliega la ficha ahí mismo, precio y botón a todo el ancho.
 *
 * El detalle se abre EN LA TARJETA y no en una ventana aparte. Es la decisión
 * del diseño y es mejor para esta retícula: con tarjetas de 175 px una ventana
 * modal tapa la pantalla entera para mostrar cuatro datos, y al cerrarla uno
 * ya perdió el hilo de dónde iba. Desplegando, la comparación entre lotes
 * —que es de lo que se trata comprar café de origen— no se interrumpe.
 *
 * Sirve igual sobre fondo claro y sobre fondo oscuro: los colores los resuelve
 * el CSS a partir de la sección que la contenga (ver `.seccion-oscura` en
 * globals.css), así que no recibe ninguna prop de tono.
 */
export default function TarjetaProducto({ producto }: { producto: Producto }) {
  const carrito = useCarrito();
  const [abierta, setAbierta] = useState(false);

  const peso = gramos(producto.gramos);

  // Solo las filas que este producto tenga. Un molino no tiene altura ni
  // proceso, y una rejilla con casillas vacías se ve rota.
  const ficha: Array<[string, string]> = [];
  if (producto.region) ficha.push(["Región", producto.region]);
  if (producto.altitud_msnm) ficha.push(["Altura", altitud(producto.altitud_msnm)]);
  if (producto.proceso) ficha.push(["Proceso", producto.proceso]);
  if (producto.tueste) ficha.push(["Tueste", producto.tueste]);
  if (producto.variedad) ficha.push(["Variedad", producto.variedad]);
  if (producto.puntaje_sca) ficha.push(["SCA", producto.puntaje_sca.toFixed(2)]);

  const hayQueAbrir = Boolean(producto.descripcion) || ficha.length > 0;
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

        {abierta && (
          <div className="desplegado">
            {producto.descripcion && (
              <p style={{ margin: "12px 0 0", fontSize: 13.5, lineHeight: 1.65, color: "var(--color-fuerte)" }}>
                {producto.descripcion}
              </p>
            )}

            {ficha.length > 0 && (
              <dl
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px 12px",
                  margin: "14px 0 0",
                  paddingTop: 12,
                  borderTop: "1px solid currentColor",
                  borderTopColor: "var(--color-linea)",
                }}
              >
                {ficha.map(([rotulo, valor]) => (
                  <div key={rotulo}>
                    <dt className="rotulo" style={{ fontSize: 8.5, letterSpacing: "0.18em" }}>
                      {rotulo}
                    </dt>
                    <dd style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 500 }}>{valor}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}

        {hayQueAbrir && (
          <button
            type="button"
            className="vermas"
            aria-expanded={abierta}
            onClick={() => setAbierta((v) => !v)}
            style={{ marginTop: 12 }}
          >
            {abierta ? "Ver menos" : "Ver más"}
          </button>
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

          <button
            type="button"
            className={`boton boton-ancho ${producto.controla_stock ? "boton-linea" : "boton-solido"}`}
            style={{ marginTop: 10 }}
            disabled={producto.agotado}
            onClick={() => carrito.agregar(producto)}
          >
            {producto.agotado ? "Agotado" : producto.controla_stock ? "Agregar" : "Agendar"}
          </button>
        </div>
      </div>
    </article>
  );
}
