"use client";

import { MARCA } from "@/lib/marca";

/**
 * Los podios, como medallas.
 *
 * Estaban en una cinta de tres columnas pegada debajo del hero, donde se leían
 * como una nota al pie. Aquí son el respaldo de lo que dice la presentación:
 * van al lado de la biografía, que es donde alguien decide si le compra a este
 * barista y no a otro.
 *
 * El metal sale del PUESTO, no del orden en la lista: un primero es oro
 * aunque esté de últimas, y agregar un podio nuevo no obliga a reacomodar
 * nada. Los galones debajo repiten el dato para quien no distingue los metales
 * —en una pantalla mala el plata y el bronce se parecen— y el rótulo lo dice
 * con palabras, que es la única forma que no depende de ver bien el color.
 */

type Metal = "oro" | "plata" | "bronce";

/** 1.º → oro, 2.º → plata, el resto → bronce. */
function metalDe(puesto: string): Metal {
  if (puesto.startsWith("1")) return "oro";
  if (puesto.startsWith("2")) return "plata";
  return "bronce";
}

const ROTULO: Record<Metal, string> = {
  oro: "Campeón",
  plata: "Subcampeón",
  bronce: "Podio",
};

const GALONES: Record<Metal, number> = { oro: 3, plata: 2, bronce: 1 };

export default function Medallas() {
  return (
    <ul className="medallas">
      {MARCA.logros.map((logro, i) => {
        const metal = metalDe(logro.puesto);

        return (
          <li
            key={`${logro.competencia}-${logro.anio}`}
            className={`medalla medalla-${metal} revelar`}
            style={{ transitionDelay: `${i * 90}ms` }}
          >
            <span className="medalla-emblema">
              <span className="medalla-halo" aria-hidden="true" />
              <span className="medalla-hexagono" aria-hidden="true" />
              <span className="medalla-hueco" aria-hidden="true" />
              <span className="medalla-brillo" aria-hidden="true">
                <span />
              </span>
              <span className="medalla-puesto">{logro.puesto.replace(/\D/g, "")}</span>
            </span>

            <span className="medalla-galones" aria-hidden="true">
              {[0, 1, 2].map((g) => (
                <span key={g} className={g < GALONES[metal] ? "galon" : "galon galon-apagado"} />
              ))}
            </span>

            <strong className="medalla-rotulo">{ROTULO[metal]}</strong>

            <span className="medalla-nombre">
              {/* "Campeonato Nacional de Arte Latte" no cabe en una tarjeta de
                  este ancho, y la palabra "Campeonato" ya la dice el rótulo. */}
              {logro.competencia.replace(/^Campeonato\s+/i, "")}
            </span>

            <span className="medalla-detalle">
              {logro.puesto} · {logro.anio}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
