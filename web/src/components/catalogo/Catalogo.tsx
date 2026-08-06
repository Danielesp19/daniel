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
 * Las secciones alternan papel y pergamino. Esa alternancia es lo que separa
 * una sección de la siguiente: es más limpio que ponerle una foto de fondo a
 * cada una, que fue lo que emborronó la primera versión, y más legible que
 * dejarlas todas del mismo blanco, que fue lo que dejó vacía la segunda.
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
        visibles.map((categoria, i) => {
          // La alternancia se calcula sobre lo que está a la vista: al filtrar
          // por una categoría, la que quede sola siempre arranca en papel.
          const enBanda = i % 2 === 1;

          if (categoria.modo_vitrina === "vertical") {
            return (
              <VitrinaVertical
                key={categoria.id}
                categoria={categoria}
                enBanda={enBanda}
                onAbrir={setAbierto}
              />
            );
          }
          if (categoria.modo_vitrina === "horizontal") {
            return <VitrinaHorizontal key={categoria.id} categoria={categoria} enBanda={enBanda} />;
          }
          return (
            <Grilla
              key={categoria.id}
              categoria={categoria}
              enBanda={enBanda}
              onAbrir={setAbierto}
            />
          );
        })
      )}

      {abierto && <FichaProducto producto={abierto} onCerrar={() => setAbierto(null)} />}
    </div>
  );
}

/**
 * Encabezado de sección, igual para los tres modos de vitrina: un epígrafe con
 * la cuenta, el nombre y la bajada. Vive acá y se exporta para que las tres
 * vitrinas no lo copien cada una con sus propios tamaños.
 */
export function CabezaSeccion({
  epigrafe,
  titulo,
  descripcion,
}: {
  epigrafe: string;
  titulo: string;
  descripcion?: string | null;
}) {
  return (
    <div style={{ textAlign: "center", marginBottom: "clamp(36px, 5vw, 60px)" }}>
      <span className="epigrafe revelar">{epigrafe}</span>
      <h2
        className="titular revelar"
        style={{ fontSize: "clamp(28px, 3.6vw, 46px)", margin: "12px 0 0", transitionDelay: "60ms" }}
      >
        {titulo}
      </h2>
      {descripcion && (
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
          {descripcion}
        </p>
      )}
      {/* Filete corto bajo el encabezado: cierra el bloque y separa el título
          de la grilla sin recurrir a más espacio en blanco. */}
      <span
        aria-hidden="true"
        className="revelar"
        style={{
          display: "block",
          width: 34,
          height: 2,
          margin: "22px auto 0",
          background: "var(--color-cereza)",
          transitionDelay: "180ms",
        }}
      />
    </div>
  );
}

function Grilla({
  categoria,
  enBanda,
  onAbrir,
}: {
  categoria: Categoria;
  enBanda: boolean;
  onAbrir: (p: Producto) => void;
}) {
  const { ref, props } = useRevelado<HTMLElement>();

  return (
    <section
      ref={ref}
      {...props}
      id={`cat-${categoria.slug}`}
      className={`seccion${enBanda ? " banda" : ""}`}
    >
      <div className="contenedor">
        <CabezaSeccion
          epigrafe={`${String(categoria.productos.length).padStart(2, "0")} referencias`}
          titulo={categoria.nombre}
          descripcion={categoria.descripcion}
        />

        <div
          style={{
            display: "grid",
            // El `min(46%, 250px)` hace dos cosas: en escritorio manda el
            // 250px y salen cuatro o cinco columnas; en celular manda el 46%,
            // así que siempre entran DOS tarjetas por fila en vez de una sola
            // gigante — que es como muestran el catálogo las dos referencias.
            gridTemplateColumns: "repeat(auto-fill, minmax(min(46%, 250px), 1fr))",
            gap: "clamp(14px, 1.8vw, 22px)",
          }}
        >
          {categoria.productos.map((producto, i) => (
            <div
              key={producto.id}
              className="revelar"
              // El escalonado se corta en la octava tarjeta: más allá, la
              // última de una grilla larga tardaría casi medio segundo de más
              // en aparecer y se nota como lentitud, no como coreografía.
              style={{ transitionDelay: `${Math.min(i, 7) * 55}ms` }}
            >
              <TarjetaProducto producto={producto} onAbrir={onAbrir} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
