"use client";

import { useRef } from "react";
import { entrada, useRevelar } from "@/hooks/useRevelar";
import { useFondoPineado } from "@/hooks/useFondoPineado";
import { MARCA } from "@/lib/marca";

/**
 * Presentación de quien vende: qué hace la tostadora y cómo trabaja.
 *
 * Va justo después de la portada, antes del catálogo: quien llega a un sitio
 * de café de especialidad decide si confía en el vendedor ANTES de mirar
 * precios. La foto de fondo queda pineada durante toda la sección, así que
 * el texto pasa por encima de una imagen quieta.
 */

const PASOS = [
  {
    n: "01",
    titulo: "Compra directa",
    texto:
      "Le compramos a diez familias caficultoras sin intermediarios, a un precio acordado antes de la cosecha. El nombre del productor va impreso en cada bolsa.",
  },
  {
    n: "02",
    titulo: "Tueste por lote",
    texto:
      "Cada origen se tuesta con su propio perfil, en lotes de veinte kilos. Nada de mezclas para estirar el inventario.",
  },
  {
    n: "03",
    titulo: "Fecha, no vencimiento",
    texto:
      "La bolsa lleva la fecha de tueste, no la de expiración. El café se toma entre los siete y los treinta días después de tostado.",
  },
];

export default function Tostador() {
  const seccion = useRef<HTMLElement>(null);
  const pin = useFondoPineado(seccion);
  const { ref: refCabecera, visible: cabeceraVisible } = useRevelar<HTMLDivElement>();

  return (
    <section
      ref={seccion}
      id="tostador"
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
            Quiénes tuestan
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
            Un café no debería ser
            <br />
            <span style={{ color: "var(--color-acido)" }}>un secreto</span>
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
            {MARCA.nombre} es una tostadora pequeña en {MARCA.ciudad}. Compramos lotes de
            veinte a cien kilos, los tostamos cada semana y publicamos de dónde viene cada
            uno: finca, productor, altura, variedad y proceso. Si un dato no está en la
            ficha es porque no lo sabemos, no porque no queramos decirlo.
          </p>
        </div>

        {/* Los tres pasos del proceso, como fichas numeradas. */}
        <div
          style={{
            marginTop: "clamp(52px,7vw,96px)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
            borderTop: "1px solid var(--linea)",
          }}
        >
          {PASOS.map((paso, i) => (
            <Paso key={paso.n} paso={paso} primero={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Paso({ paso, primero }: { paso: (typeof PASOS)[number]; primero: boolean }) {
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
      <div className="indice">{paso.n}</div>
      <h3
        className="titular"
        style={{ fontSize: "clamp(22px,2.6vw,30px)", margin: "14px 0 0" }}
      >
        {paso.titulo}
      </h3>
      <p
        style={{
          margin: "12px 0 0",
          fontSize: 14,
          lineHeight: 1.65,
          color: "var(--apagado)",
        }}
      >
        {paso.texto}
      </p>
    </div>
  );
}
