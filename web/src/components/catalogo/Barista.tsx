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
 * Dos columnas —foto y texto— y el palmarés debajo como tabla de datos: año,
 * competencia, puesto. Son hechos verificables y se leen mejor así que como
 * una lista de elogios.
 *
 * Lo que ofrece (cursos, asesorías, barra para eventos) NO se lista acá: son
 * productos del catálogo, en la categoría Servicios. Tenerlos en los dos
 * lugares obligaba a actualizar dos sitios cada vez que cambia uno, y Daniel
 * solo edita por WhatsApp — donde toca el catálogo.
 */
export default function Barista() {
  const { ref, props } = useRevelado<HTMLElement>();

  return (
    <section ref={ref} {...props} id="barista" className="seccion">
      <div className="contenedor">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
            gap: "clamp(32px, 5vw, 72px)",
            alignItems: "center",
          }}
        >
          {/* Retrato de Daniel. Va él mirando a cámara y no una foto de
              ambiente: la sección se llama "quién está detrás", así que la
              cara es el contenido. */}
          <div className="tesela revelar" style={{ aspectRatio: "4/5", maxHeight: 620 }}>
            <Image
              src="/img5.jpg"
              alt="Daniel Buitrón en la barra, junto a su máquina de espresso"
              fill
              sizes="(max-width: 900px) 100vw, 45vw"
              style={{ objectFit: "cover", objectPosition: "center 22%" }}
            />
          </div>

          <div>
            <span className="epigrafe revelar">Quién está detrás</span>

            <h2
              className="titular revelar"
              style={{
                fontSize: "clamp(32px, 4.4vw, 56px)",
                margin: "16px 0 0",
                transitionDelay: "60ms",
              }}
            >
              El café es tan bueno como quien lo prepara.
            </h2>

            <p
              className="revelar"
              style={{
                margin: "22px 0 0",
                maxWidth: 520,
                fontSize: 16,
                lineHeight: 1.75,
                color: "var(--color-grafito)",
                transitionDelay: "120ms",
              }}
            >
              Soy Daniel Buitrón, barista profesional y competidor de arte latte. Llevo años
              detrás de una máquina: compitiendo, montando barras y enseñándole a otros a
              sacarle a su café lo que de verdad tiene. Lo que vendo acá es el mismo café que
              uso yo, y la misma forma de prepararlo.
            </p>

            {/* Palmarés */}
            <div className="revelar" style={{ marginTop: "clamp(30px, 4vw, 44px)", transitionDelay: "180ms" }}>
              <span className="epigrafe">Competencias</span>

              <dl style={{ margin: "14px 0 0", borderTop: "1px solid var(--linea)" }}>
                {MARCA.logros.map((logro) => (
                  <div
                    key={`${logro.anio}-${logro.competencia}`}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "clamp(12px, 2vw, 24px)",
                      padding: "16px 0",
                      borderBottom: "1px solid var(--linea-tenue)",
                    }}
                  >
                    <dt className="cifra" style={{ flex: "0 0 auto", fontSize: 13, color: "var(--color-grafito)" }}>
                      {logro.anio}
                    </dt>
                    <dd style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 15, fontWeight: 500 }}>
                      {logro.competencia}
                    </dd>
                    <span className="cifra" style={{ flex: "0 0 auto", fontSize: 14, fontWeight: 600 }}>
                      {logro.puesto}
                    </span>
                  </div>
                ))}
              </dl>
            </div>

            <a
              href="#catalogo"
              className="boton boton-linea revelar"
              style={{ marginTop: 28, textDecoration: "none", transitionDelay: "240ms" }}
            >
              Ver lo que tuesto
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
