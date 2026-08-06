"use client";

import type { Categoria, Producto } from "@/lib/catalogo";
import { useRevelado } from "@/hooks/useRevelar";
import Carrusel from "./Carrusel";
import Destacado from "./Destacado";
import TarjetaProducto from "./TarjetaProducto";
import TarjetaVideo from "./TarjetaVideo";

/**
 * El catálogo completo. Cada categoría se dibuja según su `modo_vitrina`, que
 * se elige desde el panel o por WhatsApp:
 *
 *   grid       → grilla de tarjetas (el modo normal)
 *   carrusel   → una fila que se corre de lado (para secciones largas)
 *   vertical   → el primer producto en grande y el resto en grilla
 *   horizontal → tarjetas apaisadas con video, para lo que se agenda
 *
 * El TONO lo pone la posición, no la categoría: las secciones van alternando
 * blanco, blanco roto y negro. El negro no es el cierre de la página —vuelve
 * varias veces— y es lo que le da el ritmo a un recorrido largo. Se calcula
 * sobre el índice para que agregar una categoría nueva desde WhatsApp no
 * obligue a tocar código.
 */
const TONOS = ["", " seccion-banda", " seccion-oscura"] as const;

export default function Catalogo({ categorias }: { categorias: Categoria[] }) {
  if (categorias.length === 0) {
    return (
      <p
        style={{
          padding: "100px 24px",
          textAlign: "center",
          color: "var(--color-suave)",
          fontSize: 14,
        }}
      >
        El catálogo está vacío por ahora.
      </p>
    );
  }

  return (
    <div id="catalogo">
      {categorias.map((categoria, i) => (
        <Seccion key={categoria.id} categoria={categoria} tono={TONOS[i % TONOS.length]} />
      ))}
    </div>
  );
}

function Seccion({ categoria, tono }: { categoria: Categoria; tono: string }) {
  const { ref, props } = useRevelado<HTMLElement>();

  if (!categoria.productos.length) return null;

  const modo = categoria.modo_vitrina;

  return (
    <section
      ref={ref}
      {...props}
      id={`cat-${categoria.slug}`}
      className={`seccion${tono}`}
    >
      <div className="contenedor">
        <Cabeza categoria={categoria} />

        {modo === "carrusel" ? (
          <Carrusel productos={categoria.productos} />
        ) : modo === "horizontal" ? (
          <div className="grilla grilla-videos">
            {categoria.productos.map((p, i) => (
              <Envoltura key={p.id} indice={i}>
                <TarjetaVideo producto={p} numero={i + 1} />
              </Envoltura>
            ))}
          </div>
        ) : modo === "vertical" ? (
          <Vitrina productos={categoria.productos} />
        ) : (
          <div className="grilla grilla-productos">
            {categoria.productos.map((p, i) => (
              <Envoltura key={p.id} indice={i}>
                <TarjetaProducto producto={p} />
              </Envoltura>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** Encabezado de sección: epígrafe, titular y bajada. */
function Cabeza({ categoria }: { categoria: Categoria }) {
  return (
    <div style={{ marginBottom: "clamp(22px, 4vw, 40px)" }}>
      <span className="epigrafe revelar">{leyenda(categoria)}</span>
      <h2 className="titular revelar" style={{ marginTop: 12, transitionDelay: "80ms" }}>
        {categoria.nombre}
      </h2>
      {categoria.descripcion && (
        <p
          className="bajada revelar"
          style={{
            margin: "12px 0 0",
            maxWidth: "44ch",
            fontSize: 14,
            lineHeight: 1.7,
            color: "var(--color-suave)",
            transitionDelay: "160ms",
          }}
        >
          {categoria.descripcion}
        </p>
      )}
    </div>
  );
}

/**
 * El epígrafe de cada sección dice algo del contenido, no "05 productos".
 * Cuando la categoría no tiene una leyenda propia se cae en la cuenta, que
 * al menos es un dato y no un relleno.
 */
function leyenda(categoria: Categoria): string {
  const propias: Record<string, string> = {
    "cafes-de-origen": "Un productor · un lote · una cosecha",
    "cafe-en-grano": "Para todos los días",
    artefactos: "La tienda",
    servicios: "Aprende del subcampeón",
    metodos: "En la barra",
  };
  return propias[categoria.slug] ?? `${String(categoria.productos.length).padStart(2, "0")} referencias`;
}

/** Vitrina: el primero en grande, el resto en grilla debajo. */
function Vitrina({ productos }: { productos: Producto[] }) {
  const [primero, ...resto] = productos;

  return (
    <>
      <Destacado producto={primero} />

      {resto.length > 0 && (
        <div className="grilla grilla-productos" style={{ marginTop: "clamp(10px, 2vw, 18px)" }}>
          {resto.map((p, i) => (
            <Envoltura key={p.id} indice={i}>
              <TarjetaProducto producto={p} />
            </Envoltura>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Envuelve una tarjeta para escalonar su entrada. El retraso se corta en la
 * octava: más allá, la última de una grilla larga tardaría medio segundo de
 * más en aparecer y se nota como lentitud, no como coreografía.
 */
function Envoltura({ indice, children }: { indice: number; children: React.ReactNode }) {
  return (
    <div className="revelar" style={{ transitionDelay: `${Math.min(indice, 7) * 55}ms`, height: "100%" }}>
      {children}
    </div>
  );
}
