"use client";

import { useRef } from "react";
import { entrada, useRevelar } from "@/hooks/useRevelar";
import { useFondoPineado } from "@/hooks/useFondoPineado";
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
    titulo: "Vende café",
    texto:
      "Lotes de especialidad con fecha de tueste reciente. Se muele al momento y para el método que uses.",
  },
  {
    n: "02",
    titulo: "Enseña",
    texto:
      "Asesoría para negocios que quieren dejar de quemar el café, y para quien está montando su barra en casa.",
  },
  {
    n: "03",
    titulo: "Monta barra",
    texto:
      "Servicio de barra para eventos: café de especialidad, arte latte y coctelería con café.",
  },
];

export default function Barista() {
  const seccion = useRef<HTMLElement>(null);
  const pin = useFondoPineado(seccion);
  const { ref: refCabecera, visible: cabeceraVisible } = useRevelar<HTMLDivElement>();
  const { ref: refLogros, visible: logrosVisible } = useRevelar<HTMLDivElement>();

  return (
    <section
      ref={seccion}
      id="barista"
      style={{ position: "relative", background: "#0A0A0A", zIndex: 2 }}
    >
      {/* Foto de fondo a pantalla completa, quieta durante toda la sección.
          Ver useFondoPineado para por qué esto no usa position:sticky.
          Los +120px en "antes"/"despues" son un colchón: esos dos estados se
          mueven con el scroll normal y dependen de que el estado de React ya
          se haya actualizado; el listener va con un frame de retraso (rAF) y
          sin el colchón asomaba una franja negra en el borde. */}
      <div
        aria-hidden="true"
        style={{
          position: pin === "durante" ? "fixed" : "absolute",
          top: pin === "despues" ? "auto" : 0,
          bottom: pin === "despues" ? 0 : "auto",
          left: 0,
          right: 0,
          height:
            pin === "corta" ? "100%" : pin === "durante" ? "100svh" : "calc(100svh + 120px)",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            // Sin `filter` de CSS: un filtro sobre una capa a pantalla completa
            // obliga a la GPU a re-renderizarla en cada frame de scroll, y en
            // iPhone eso se siente como scroll pesado. El oscurecido va en el
            // degradado, que es gratis.
            background:
              "linear-gradient(180deg, rgba(10,10,10,0.93) 0%, rgba(10,10,10,0.86) 45%, rgba(10,10,10,0.97) 100%), url(/image.webp) center/cover no-repeat",
          }}
        />
      </div>

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
            style={{ color: "var(--color-acido)", ...entrada(cabeceraVisible) }}
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
            como <span style={{ color: "var(--color-acido)" }}>quien lo prepara</span>
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
                {/* El puesto en verde: es el dato que el ojo busca en la fila. */}
                <span
                  className="cifra"
                  style={{
                    flex: "0 0 auto",
                    fontSize: "clamp(15px,2vw,22px)",
                    color: "var(--color-acido)",
                  }}
                >
                  {logro.puesto}
                </span>
              </div>
            ))}
          </dl>
        </div>

        {/* Las tres cosas que vende. */}
        <div
          style={{
            marginTop: "clamp(52px,7vw,96px)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
            borderTop: "1px solid var(--linea)",
          }}
        >
          {QUE_HACE.map((item, i) => (
            <Servicio key={item.n} item={item} primero={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Servicio({ item, primero }: { item: (typeof QUE_HACE)[number]; primero: boolean }) {
  const { ref, visible } = useRevelar<HTMLDivElement>();

  return (
    <div
      ref={ref}
      style={{
        padding: "clamp(26px,3.5vw,40px) clamp(20px,2.5vw,34px)",
        borderLeft: primero ? "none" : "1px solid var(--linea-tenue)",
        borderBottom: "1px solid var(--linea)",
        ...entrada(visible),
      }}
    >
      <div className="indice">{item.n}</div>
      <h3 className="titular" style={{ fontSize: "clamp(22px,2.6vw,30px)", margin: "14px 0 0" }}>
        {item.titulo}
      </h3>
      <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.65, color: "var(--apagado)" }}>
        {item.texto}
      </p>
    </div>
  );
}
