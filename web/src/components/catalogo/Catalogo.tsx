"use client";

import { useState } from "react";
import type { Categoria, Producto } from "@/lib/catalogo";
import { useRevelado } from "@/hooks/useRevelar";
import BarraCategorias from "./BarraCategorias";
import TarjetaProducto from "./TarjetaProducto";
import VitrinaVertical from "./VitrinaVertical";
import VitrinaHorizontal from "./VitrinaHorizontal";
import FichaProducto from "./FichaProducto";

/**
 * El catálogo completo. Cada categoría se dibuja según su `modo_vitrina`,
 * que se configura desde el panel:
 *   grid       → grilla de tarjetas (el modo normal)
 *   vertical   → filas grandes alternadas, una por producto
 *   horizontal → una ficha a la vez, se pasa deslizando
 *
 * Las secciones se separan con aire y una línea de un pelo. La versión anterior
 * le ponía una foto de fondo distinta a cada una; sobre papel eso ya no hace
 * falta y es justo lo que emborronaba la página.
 */
export default function Catalogo({ categorias }: { categorias: Categoria[] }) {
  const [activa, setActiva] = useState<number | null>(null);
  const [abierto, setAbierto] = useState<Producto | null>(null);

  const visibles = activa === null ? categorias : categorias.filter((c) => c.id === activa);

  return (
    <div id="catalogo">
      <BarraCategorias categorias={categorias} activa={activa} onCambiar={setActiva} />

      {visibles.length === 0 ? (
        <p
          style={{
            padding: "100px 24px",
            textAlign: "center",
            color: "var(--color-grafito)",
            fontSize: 14,
          }}
        >
          No hay nada en esta categoría por ahora.
        </p>
      ) : (
        visibles.map((categoria) => {
          if (categoria.modo_vitrina === "vertical") {
            return <VitrinaVertical key={categoria.id} categoria={categoria} onAbrir={setAbierto} />;
          }
          if (categoria.modo_vitrina === "horizontal") {
            return <VitrinaHorizontal key={categoria.id} categoria={categoria} />;
          }
          return <Grilla key={categoria.id} categoria={categoria} onAbrir={setAbierto} />;
        })
      )}

      {abierto && <FichaProducto producto={abierto} onCerrar={() => setAbierto(null)} />}
    </div>
  );
}

function Grilla({
  categoria,
  onAbrir,
}: {
  categoria: Categoria;
  onAbrir: (p: Producto) => void;
}) {
  const { ref, props } = useRevelado<HTMLElement>();

  return (
    <section
      ref={ref}
      {...props}
      id={`cat-${categoria.slug}`}
      className="seccion"
      style={{ borderTop: "1px solid var(--linea-tenue)" }}
    >
      <div className="contenedor">
        {/* Encabezado centrado con epígrafe encima: es el patrón de las dos
            referencias y lo que le da ritmo a la página sin usar color. */}
        <div style={{ textAlign: "center", marginBottom: "clamp(34px, 5vw, 56px)" }}>
          <span className="epigrafe revelar">
            {String(categoria.productos.length).padStart(2, "0")} referencias
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

        <div
          style={{
            display: "grid",
            // El `min(46%, 240px)` hace dos cosas: en escritorio manda el
            // 240px y salen cuatro o cinco columnas; en celular manda el 46%,
            // así que siempre entran DOS tarjetas por fila en vez de una sola
            // gigante. Las dos referencias muestran dos productos por fila en
            // celular y es lo que hace que se vea catálogo y no lista.
            gridTemplateColumns: "repeat(auto-fill, minmax(min(46%, 240px), 1fr))",
            gap: "clamp(18px, 2.4vw, 32px) clamp(14px, 1.8vw, 24px)",
          }}
        >
          {categoria.productos.map((producto, i) => (
            <div key={producto.id} className="revelar" style={{ transitionDelay: `${Math.min(i, 7) * 50}ms` }}>
              <TarjetaProducto producto={producto} onAbrir={onAbrir} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
