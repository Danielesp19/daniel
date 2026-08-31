"use client";

import type { Categoria } from "@/lib/catalogo";
import { useRevelado } from "@/hooks/useRevelar";
import BandaServicio from "./BandaServicio";
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
 *   bandas     → una fila por producto, a lo ancho y con el video de fondo
 *   horizontal → tarjetas apaisadas con video
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

  // Los destacados salen en grande arriba de la sección, en CUALQUIER modo, y
  // el modo solo decide cómo se acomoda lo que queda. Antes eso lo hacía un
  // modo aparte ("vertical") que ponía en grande al PRIMERO de la lista, no al
  // marcado: la casilla de destacado solo pintaba un sello y no cambiaba nada.
  //
  // Las bandas y las tarjetas con video no entran acá: ya son formatos a lo
  // ancho, y meterles un panel gigante encima sería el mismo tratamiento dos
  // veces seguidas.
  const admiteDestacados = modo !== "bandas" && modo !== "horizontal";
  const destacados = admiteDestacados ? categoria.productos.filter((p) => p.destacado) : [];
  const resto = admiteDestacados ? categoria.productos.filter((p) => !p.destacado) : categoria.productos;

  return (
    <section
      ref={ref}
      {...props}
      id={`cat-${categoria.slug}`}
      className={`seccion${tono}`}
    >
      <div className="contenedor">
        <Cabeza categoria={categoria} />

        {destacados.length > 0 && (
          <div className="destacados">
            {destacados.map((p) => (
              <Destacado key={p.id} producto={p} />
            ))}
          </div>
        )}

        {resto.length > 0 &&
          (modo === "carrusel" ? (
            <Carrusel productos={resto} />
          ) : modo === "bandas" ? (
            <div className="bandas">
              {resto.map((p, i) => (
                <BandaServicio key={p.id} producto={p} numero={i + 1} />
              ))}
            </div>
          ) : modo === "horizontal" ? (
            <div className="grilla grilla-videos">
              {resto.map((p, i) => (
                <Envoltura key={p.id} indice={i}>
                  <TarjetaVideo producto={p} numero={i + 1} />
                </Envoltura>
              ))}
            </div>
          ) : (
            <div className={`grilla ${modo === "dos" ? "grilla-dos" : "grilla-productos"}`}>
              {resto.map((p, i) => (
                <Envoltura key={p.id} indice={i}>
                  <TarjetaProducto producto={p} />
                </Envoltura>
              ))}
            </div>
          ))}
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
    cafes: "Un productor · un lote · una cosecha",
    artefactos: "La tienda",
    servicios: "Aprende del subcampeón",
    // Los métodos están apagados por ahora: son la base de las recetas que
    // vienen después. La leyenda se deja lista para cuando se enciendan.
    metodos: "En la barra",
    // Nombres viejos, por si una base sin migrar todavía los tiene.
    "cafes-de-origen": "Un productor · un lote · una cosecha",
    "cafe-en-grano": "Para todos los días",
  };
  return propias[categoria.slug] ?? `${String(categoria.productos.length).padStart(2, "0")} referencias`;
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
