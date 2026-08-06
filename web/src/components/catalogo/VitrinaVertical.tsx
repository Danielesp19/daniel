"use client";

import type { Categoria, Producto } from "@/lib/catalogo";
import { pesos, altitud, gramos } from "@/lib/formato";
import { useRevelado } from "@/hooks/useRevelar";
import { useCarrito } from "@/components/carrito/CarritoProvider";
import { Notas, SelloEstado } from "./FichaTecnica";
import TeselaFoto from "./TeselaFoto";

/**
 * Vitrina de los cafés de origen: un lote por fila, alternando el lado de la
 * foto. Es el formato para los lotes que valen una página propia, y la sección
 * donde sí tiene sentido mostrar los datos de la finca en la fila misma —hay
 * espacio de sobra y son lo que diferencia un origen de otro.
 */
export default function VitrinaVertical({
  categoria,
  onAbrir,
}: {
  categoria: Categoria;
  onAbrir: (p: Producto) => void;
}) {
  const { ref, props } = useRevelado<HTMLDivElement>();

  if (!categoria.productos.length) return null;

  return (
    <section
      id={`cat-${categoria.slug}`}
      className="seccion"
      style={{ borderTop: "1px solid var(--linea-tenue)" }}
    >
      <div className="contenedor">
        <div ref={ref} {...props} style={{ textAlign: "center", marginBottom: "clamp(40px, 6vw, 72px)" }}>
          <span className="epigrafe revelar">
            {String(categoria.productos.length).padStart(2, "0")} lotes
          </span>
          <h2
            className="titular revelar"
            style={{ fontSize: "clamp(28px, 3.6vw, 44px)", margin: "12px 0 0", transitionDelay: "60ms" }}
          >
            {categoria.nombre}
          </h2>
          {categoria.descripcion && (
            <p
              className="revelar"
              style={{
                margin: "14px auto 0",
                maxWidth: 560,
                fontSize: 15,
                lineHeight: 1.7,
                color: "var(--color-grafito)",
                transitionDelay: "120ms",
              }}
            >
              {categoria.descripcion}
            </p>
          )}
        </div>

        <div style={{ display: "grid", gap: "clamp(48px, 7vw, 104px)" }}>
          {categoria.productos.map((producto, i) => (
            <Fila key={producto.id} producto={producto} invertida={i % 2 === 1} onAbrir={onAbrir} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Fila({
  producto,
  invertida,
  onAbrir,
}: {
  producto: Producto;
  invertida: boolean;
  onAbrir: (p: Producto) => void;
}) {
  const { ref, props } = useRevelado<HTMLDivElement>();
  const carrito = useCarrito();

  const datos: Array<[string, string]> = [];
  if (producto.region) datos.push(["Región", producto.region]);
  if (producto.altitud_msnm) datos.push(["Altura", altitud(producto.altitud_msnm)]);
  if (producto.variedad) datos.push(["Variedad", producto.variedad]);
  if (producto.proceso) datos.push(["Proceso", producto.proceso]);

  const peso = gramos(producto.gramos);

  return (
    <article
      ref={ref}
      {...props}
      className="tarjeta"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
        gap: "clamp(24px, 4vw, 64px)",
        alignItems: "center",
      }}
    >
      {/* En pantalla angosta las dos columnas se apilan y `order` deja la foto
          siempre arriba: alternar el orden solo tiene sentido si hay dos
          columnas de verdad. */}
      <button
        type="button"
        onClick={() => onAbrir(producto)}
        aria-label={`Ver la ficha de ${producto.nombre}`}
        className="revelar"
        style={{
          position: "relative",
          display: "block",
          width: "100%",
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          order: invertida ? 2 : 0,
        }}
      >
        <TeselaFoto
          producto={producto}
          proporcion="4/3"
          sizes="(max-width: 900px) 100vw, 50vw"
        />
        <span style={{ position: "absolute", top: 14, left: 14 }}>
          <SelloEstado producto={producto} />
        </span>
      </button>

      <div className="revelar" style={{ transitionDelay: "100ms" }}>
        {producto.finca && <span className="epigrafe">{producto.finca}</span>}

        <h3
          className="titular"
          style={{ fontSize: "clamp(26px, 3.2vw, 40px)", margin: producto.finca ? "10px 0 0" : 0 }}
        >
          {producto.nombre}
        </h3>

        {producto.descripcion && (
          <p
            style={{
              margin: "16px 0 0",
              maxWidth: 460,
              fontSize: 15,
              lineHeight: 1.75,
              color: "var(--color-grafito)",
            }}
          >
            {producto.descripcion}
          </p>
        )}

        {producto.notas.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <Notas notas={producto.notas} />
          </div>
        )}

        {datos.length > 0 && (
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: "18px 24px",
              margin: "26px 0 0",
              paddingTop: 22,
              borderTop: "1px solid var(--linea)",
            }}
          >
            {datos.map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt className="epigrafe">{rotulo}</dt>
                <dd className="cifra" style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 500 }}>
                  {valor}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            flexWrap: "wrap",
            marginTop: 28,
          }}
        >
          <span className="cifra" style={{ fontSize: 22, fontWeight: 600 }}>
            ${pesos(producto.precio_cop)}
            {peso && (
              <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 400, color: "var(--color-grafito)" }}>
                {peso}
              </span>
            )}
          </span>

          <button
            type="button"
            className="boton boton-solido"
            disabled={producto.agotado}
            onClick={() => carrito.agregar(producto)}
          >
            {producto.agotado ? "Agotado" : "Agregar al pedido"}
          </button>

          <button
            type="button"
            className="boton boton-linea"
            onClick={() => onAbrir(producto)}
          >
            Ficha completa
          </button>
        </div>
      </div>
    </article>
  );
}
