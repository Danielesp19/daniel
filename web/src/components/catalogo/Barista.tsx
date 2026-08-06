"use client";

import Image from "next/image";
import { useRevelado } from "@/hooks/useRevelar";
import { MARCA } from "@/lib/marca";

/**
 * Presentación de quien vende.
 *
 * Va justo después de la portada, antes del catálogo, y es la pieza más
 * importante del sitio: aquí no se vende un café anónimo, se vende el criterio
 * de un barista con nombre y con resultados. Quien llega decide si confía en
 * él ANTES de mirar precios.
 *
 * Lo que ofrece (cursos, asesorías, barra para eventos) NO se lista acá: son
 * productos del catálogo, en la categoría Servicios. Tenerlos en los dos
 * lugares obligaba a actualizar dos sitios cada vez que cambia uno, y Daniel
 * solo edita por WhatsApp — donde toca el catálogo.
 */
const DATOS = [
  ["Base", MARCA.ciudad],
  ["Envíos", "Todo el país"],
  ["Podios", `${MARCA.logros.length} nacionales`],
] as const;

export default function Barista() {
  const { ref, props } = useRevelado<HTMLElement>();

  return (
    <section ref={ref} {...props} id="barista" className="seccion">
      <div className="contenedor">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
            gap: "clamp(26px, 5vw, 72px)",
            alignItems: "center",
          }}
        >
          {/* Retrato: él mirando a cámara, no una foto de ambiente. La sección
              se llama "quién está detrás", así que la cara es el contenido. */}
          <div
            className="tesela revelar"
            style={{ width: "100%", maxWidth: 420, justifySelf: "center", aspectRatio: "4/5" }}
          >
            <Image
              src="/img5.jpg"
              alt="Daniel Buitrón en la barra, junto a su máquina de espresso"
              fill
              sizes="(max-width: 900px) 100vw, 420px"
              style={{ objectFit: "cover", objectPosition: "center 22%" }}
            />
          </div>

          <div>
            <span className="epigrafe revelar">Quién está detrás</span>

            <h2 className="titular revelar" style={{ marginTop: 16, transitionDelay: "80ms" }}>
              El café es tan bueno como <em>quien lo prepara.</em>
            </h2>

            <p
              className="revelar"
              style={{
                margin: "20px 0 0",
                maxWidth: "50ch",
                fontSize: 15,
                lineHeight: 1.75,
                color: "var(--color-fuerte)",
                transitionDelay: "160ms",
              }}
            >
              Soy Daniel Buitrón, barista profesional y competidor de arte latte. Llevo años
              detrás de una máquina: compitiendo, montando barras y enseñándole a otros a
              sacarle a su café lo que de verdad tiene. Lo que vendo acá es el mismo café que
              uso yo, el mismo equipo con el que compito y la misma forma de prepararlo.
            </p>

            <dl
              className="revelar"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                margin: "26px 0 0",
                borderTop: "1px solid var(--color-linea)",
                transitionDelay: "240ms",
              }}
            >
              {DATOS.map(([rotulo, valor]) => (
                <div key={rotulo} style={{ padding: "14px 0", borderBottom: "1px solid var(--color-linea)" }}>
                  <dt className="rotulo">{rotulo}</dt>
                  <dd className="nombre" style={{ fontSize: 18, marginTop: 6 }}>
                    {valor}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
