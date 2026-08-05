"use client";

import { useRef } from "react";
import { entrada, useRevelar } from "@/hooks/useRevelar";
import FondoPineado from "./FondoPineado";
import { MARCA } from "@/lib/marca";

/**
 * Presentación de quien vende.
 *
 * Va justo después de la portada, antes del catálogo, y es la pieza más
 * importante del sitio: aquí no se vende un café anónimo, se vende el criterio
 * de un barista con nombre y con resultados. Quien llega decide si confía en
 * él ANTES de mirar precios.
 *
 * El palmarés se pinta como tabla de datos —año, competencia, puesto— en vez
 * de como una lista de elogios: son hechos verificables y se leen mejor así.
 * La foto de fondo queda quieta durante toda la sección.
 */

const QUE_HACE = [
  {
    n: "01",
    titulo: "Cursos y talleres de barismo",
    texto: "Desde tu primer espresso hasta técnica avanzada.",
  },
  {
    n: "02",
    titulo: "Clases de arte latte",
    texto: "Rosettas, tulipanes y free pour con un competidor nacional.",
  },
  {
    n: "03",
    titulo: "Asesoría para cafeterías",
    texto: "Carta, recetas, capacitación de personal y montaje.",
  },
  {
    n: "04",
    titulo: "Barista para eventos",
    texto: "Barra de café en vivo para bodas, lanzamientos y encuentros.",
  },
  {
    n: "05",
    titulo: "Catación y experiencias",
    texto: "Cata guiada por orígenes, métodos y perfiles de taza.",
  },
];

export default function Barista() {
  const seccion = useRef<HTMLElement>(null);
  const { ref: refCabecera, visible: cabeceraVisible } = useRevelar<HTMLDivElement>();
  const { ref: refLogros, visible: logrosVisible } = useRevelar<HTMLDivElement>();

  return (
    <section
      ref={seccion}
      id="barista"
      style={{ position: "relative", background: "var(--color-negro)", zIndex: 2 }}
    >
      <FondoPineado seccion={seccion} imagen="/cafe-planta.webp" velo={0.93} />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1400,
          margin: "0 auto",
          padding: "clamp(72px,11vw,140px) clamp(20px,5vw,56px)",
          borderTop: "1px solid var(--linea)",
        }}
      >
        <div ref={refCabecera}>
          <div
            className="etiqueta"
            style={{ color: "var(--color-acento)", ...entrada(cabeceraVisible) }}
          >
            Quién está detrás
          </div>

          <h2
            className="titular"
            style={{
              fontSize: "clamp(38px,7.5vw,92px)",
              margin: "clamp(18px,2.5vw,28px) 0 0",
              maxWidth: 950,
              ...entrada(cabeceraVisible, 0.08),
            }}
          >
            El café es tan bueno
            <br />
            como <span style={{ color: "var(--color-acento)" }}>quien lo prepara</span>
          </h2>

          <p
            style={{
              maxWidth: 560,
              margin: "clamp(22px,3vw,34px) 0 0",
              fontSize: "clamp(14px,1.5vw,17px)",
              lineHeight: 1.7,
              color: "var(--apagado)",
              ...entrada(cabeceraVisible, 0.16),
            }}
          >
            Soy Daniel Buitrón, barista profesional y competidor de arte latte. Llevo años
            detrás de una máquina: compitiendo, montando barras y enseñándole a otros a
            sacarle a su café lo que de verdad tiene. Lo que vendo acá es el mismo café que
            uso yo, y la misma forma de prepararlo.
          </p>
        </div>

        {/* Palmarés como tabla de datos: año, competencia, puesto. */}
        <div ref={refLogros} style={{ marginTop: "clamp(44px,6vw,80px)" }}>
          <div className="etiqueta" style={{ color: "var(--apagado)", marginBottom: 16 }}>
            Competencias
          </div>

          <dl style={{ margin: 0, borderTop: "1px solid var(--linea)" }}>
            {MARCA.logros.map((logro, i) => (
              <div
                key={`${logro.anio}-${logro.competencia}`}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "clamp(12px,3vw,32px)",
                  padding: "clamp(14px,2vw,20px) 0",
                  borderBottom: "1px solid var(--linea-tenue)",
                  ...entrada(logrosVisible, i * 0.07),
                }}
              >
                <dt
                  className="cifra"
                  style={{ flex: "0 0 auto", fontSize: 13, color: "var(--apagado)" }}
                >
                  {logro.anio}
                </dt>
                <dd
                  className="titular"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    margin: 0,
                    fontSize: "clamp(17px,2.4vw,28px)",
                  }}
                >
                  {logro.competencia}
                </dd>
                {/* El puesto en terracota: es el dato que el ojo busca en la fila. */}
                <span
                  className="cifra"
                  style={{
                    flex: "0 0 auto",
                    fontSize: "clamp(15px,2vw,22px)",
                    color: "var(--color-acento)",
                  }}
                >
                  {logro.puesto}
                </span>
              </div>
            ))}
          </dl>
        </div>

        {/* Lo que ofrece, como tarjetas separadas por aire. En un sistema
            redondo las divisiones a filo no funcionan: las formas necesitan
            espacio para leerse como suaves. */}
        <div
          style={{
            marginTop: "clamp(52px,7vw,96px)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
            gap: "clamp(12px,1.6vw,18px)",
          }}
        >
          {QUE_HACE.map((item) => (
            <Servicio key={item.n} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Servicio({ item }: { item: (typeof QUE_HACE)[number] }) {
  const { ref, visible } = useRevelar<HTMLDivElement>();

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        gap: 16,
        padding: "clamp(20px,2.6vw,26px)",
        border: "1px solid var(--linea-tenue)",
        borderRadius: "var(--radio-lg)",
        background: "var(--color-carbon)",
        transition: "border-color .25s ease, transform .25s ease",
        ...entrada(visible),
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(214,127,72,0.55)";
        e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--linea-tenue)";
        e.currentTarget.style.transform = "none";
      }}
    >
      {/* El número en un cuadro redondeado, como los iconos de la maqueta. */}
      <span
        aria-hidden="true"
        className="indice"
        style={{
          flex: "0 0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 42,
          height: 42,
          borderRadius: "var(--radio-md)",
          background: "rgba(214,127,72,0.14)",
          color: "var(--color-acento)",
        }}
      >
        {item.n}
      </span>

      <div style={{ minWidth: 0 }}>
        <h3 className="titular" style={{ fontSize: "clamp(19px,2.1vw,23px)", margin: 0 }}>
          {item.titulo}
        </h3>
        <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.6, color: "var(--apagado)" }}>
          {item.texto}
        </p>
      </div>
    </div>
  );
}
