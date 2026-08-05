"use client";

import { useRef, useState } from "react";
import type { Categoria, Producto } from "@/lib/catalogo";
import { entrada, useRevelar } from "@/hooks/useRevelar";
import BarraCategorias from "./BarraCategorias";
import TarjetaProducto from "./TarjetaProducto";
import VitrinaVertical from "./VitrinaVertical";
import VitrinaHorizontal from "./VitrinaHorizontal";
import FichaProducto from "./FichaProducto";
import FondoPineado from "./FondoPineado";

/**
 * El catálogo completo. Cada categoría se dibuja según su `modo_vitrina`,
 * que se configura desde el panel:
 *   grid       → grilla de tarjetas (el modo normal)
 *   vertical   → vitrina de filas alternadas sobre foto de fondo
 *   horizontal → una ficha a la vez, se pasa deslizando
 */
export default function Catalogo({ categorias }: { categorias: Categoria[] }) {
  const [activa, setActiva] = useState<number | null>(null);
  const [abierto, setAbierto] = useState<Producto | null>(null);

  const visibles = activa === null ? categorias : categorias.filter((c) => c.id === activa);

  return (
    <div id="catalogo" style={{ position: "relative", zIndex: 2, background: "var(--color-negro)" }}>
      <BarraCategorias categorias={categorias} activa={activa} onCambiar={setActiva} />

      {visibles.length === 0 ? (
        <p
          style={{
            padding: "80px 24px",
            textAlign: "center",
            color: "var(--apagado)",
            fontSize: 14,
          }}
        >
          No hay nada en esta categoría por ahora.
        </p>
      ) : (
        visibles.map((categoria, i) => {
          if (categoria.modo_vitrina === "vertical") {
            return <VitrinaVertical key={categoria.id} categoria={categoria} onAbrir={setAbierto} />;
          }
          if (categoria.modo_vitrina === "horizontal") {
            return <VitrinaHorizontal key={categoria.id} categoria={categoria} />;
          }
          return (
            <Grilla
              key={categoria.id}
              categoria={categoria}
              onAbrir={setAbierto}
              // Se alterna la foto de fondo para que dos grillas seguidas no
              // se vean como la misma sala.
              fondo={i % 2 === 0 ? "/cafe-planta.webp" : "/image.webp"}
            />
          );
        })
      )}

      {abierto && <FichaProducto producto={abierto} onCerrar={() => setAbierto(null)} />}
    </div>
  );
}

function Grilla({
  categoria,
  onAbrir,
  fondo,
}: {
  categoria: Categoria;
  onAbrir: (p: Producto) => void;
  fondo: string;
}) {
  const seccion = useRef<HTMLElement>(null);
  const { ref: refCabecera, visible: cabeceraVisible } = useRevelar<HTMLDivElement>();

  return (
    <section
      ref={seccion}
      id={`cat-${categoria.slug}`}
      style={{ position: "relative", background: "var(--color-negro)" }}
    >
      {/* El mismo fondo quieto de las vitrinas: bajar por el catálogo se
          siente como pasar de una sala a otra, no como recorrer una lista. */}
      <FondoPineado seccion={seccion} imagen={fondo} velo={0.93} />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1400,
          margin: "0 auto",
          padding: "clamp(56px,8vw,104px) clamp(20px,5vw,56px)",
          borderTop: "1px solid var(--linea)",
        }}
      >
      <div
        ref={refCabecera}
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
          marginBottom: "clamp(28px,4vw,48px)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2
            className="titular"
            style={{ fontSize: "clamp(34px,6vw,72px)", margin: 0, ...entrada(cabeceraVisible) }}
          >
            {categoria.nombre}
          </h2>
          {categoria.descripcion && (
            <p
              style={{
                margin: "14px 0 0",
                maxWidth: 480,
                fontSize: 14,
                lineHeight: 1.7,
                color: "var(--apagado)",
                ...entrada(cabeceraVisible, 0.08),
              }}
            >
              {categoria.descripcion}
            </p>
          )}
        </div>

        <span
          className="etiqueta"
          style={{ color: "var(--apagado)", ...entrada(cabeceraVisible, 0.12) }}
        >
          {String(categoria.productos.length).padStart(2, "0")} referencias
        </span>
      </div>

      <div
        style={{
          display: "grid",
          // minmax con min() para que en pantallas angostas la tarjeta pueda
          // bajar de 230px en vez de desbordar el ancho de la página.
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 230px), 1fr))",
          gap: "clamp(12px,1.6vw,20px)",
        }}
      >
        {categoria.productos.map((producto, i) => (
            <TarjetaProducto key={producto.id} producto={producto} indice={i} onAbrir={onAbrir} />
          ))}
        </div>
      </div>
    </section>
  );
}
