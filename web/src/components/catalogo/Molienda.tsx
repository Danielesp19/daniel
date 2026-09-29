"use client";

import { useState } from "react";

/**
 * Referencia de molienda, dentro de la receta.
 *
 * El error más común preparando café en casa es la molienda, y no hay forma de
 * describirla con palabras: "medio" no significa lo mismo en dos molinos. Esto
 * la muestra dibujada, con las cinco al lado para compararlas entre sí, y cada
 * una comparada con algo que ya está en la cocina.
 *
 * ANTES ESTO PEDÍA UNA REGLA. Dibujaba los granos a tamaño físico real, y como
 * un navegador no sabe cuánto mide su propia pantalla, había que calibrarla:
 * poner una regla contra el monitor y arrastrar un control hasta que una barra
 * midiera cinco centímetros. Era preciso y nadie lo iba a hacer — y quien no
 * lo hacía veía una muestra con hasta un 30 % de error creyendo que era
 * exacta, que es peor que no tener la guía.
 *
 * AHORA LA ESCALA ES COMPARATIVA. Los cinco discos guardan entre sí la misma
 * proporción que en la vida real —la gruesa es cuatro veces la fina, y se
 * nota— pero no pretenden medir nada en la pantalla de nadie. Lo que ancla el
 * tamaño es la comparación con la sal o el azúcar: eso lo tiene cualquiera a
 * mano y no cambia de un teléfono a otro.
 *
 * El calibre queda escrito en milímetros, que es la unidad en la que se habla
 * de molienda. En milímetros y no en pulgadas porque estas van de 0,25 a 1 mm:
 * en pulgadas saldrían números como 0,01", que no le dicen nada a nadie.
 */

/**
 * Cuántos píxeles se dibuja un milímetro de café.
 *
 * Es una escala de lectura, NO una medida: sirve para que los cinco discos se
 * comparen entre sí, no para poner la pantalla al lado del molino. A este
 * valor la gruesa se lee como un puñado de piedritas y la fina como polvo,
 * que es la diferencia que hay que entender; más alto, la gruesa quedaba en
 * tres bloques y parecía otra cosa.
 */
const PX_POR_MM = 10;

/** La misma escala, agrandada, para la muestra del detalle. */
const PX_POR_MM_GRANDE = 17;

/**
 * Los cinco puntos de molienda. `micras` es el calibre del grano.
 *
 * Cada uno va con algo de la cocina al lado. Es como se enseña la molienda en
 * cualquier barra, y es lo único que funciona sin instrumentos: quien tiene
 * dudas abre el cajón de la sal y compara.
 *
 * Son los mismos cinco que ofrece el panel al escribir una receta, así que la
 * recomendación siempre cae en uno de estos discos.
 */
const MOLIENDAS = [
  { micras: 1000, mm: "1 mm", nombre: "Gruesa", como: "Como sal marina gruesa", para: "Prensa francesa · cold brew" },
  { micras: 800, mm: "0,8 mm", nombre: "Media gruesa", como: "Como arena de playa", para: "Chemex" },
  { micras: 600, mm: "0,6 mm", nombre: "Media", como: "Como azúcar común", para: "V60 · goteo" },
  { micras: 400, mm: "0,4 mm", nombre: "Media fina", como: "Como sal de mesa", para: "Moka · aeropress" },
  { micras: 250, mm: "0,25 mm", nombre: "Fina", como: "Como azúcar pulverizada", para: "Espresso" },
] as const;

/**
 * Los granos de cada muestra: posición, tamaño relativo, giro y tono.
 *
 * Se calculan UNA vez con un generador de números pseudoaleatorios de semilla
 * fija, no con `Math.random()`: con random la muestra se reacomoda en cada
 * repintado —y el servidor y el navegador dibujarían cosas distintas, que le
 * rompe la hidratación a React—. Con semilla fija sale siempre el mismo
 * desorden, que es justo lo que se quiere: que parezca café molido y no una
 * cuadrícula.
 *
 * Cada grano trae su propia variación de tamaño porque una molienda real NO es
 * pareja: hasta el mejor molino deja finos y trozos grandes, y una nube de
 * puntos idénticos se ve como un patrón, no como café.
 */
function generador(semilla: number) {
  let estado = semilla;

  return () => {
    estado |= 0;
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRANOS = (() => {
  const azar = generador(20260901);

  return Array.from({ length: 320 }, () => ({
    x: azar() * 100,
    y: azar() * 100,
    // De 0,55 a 1,45 del calibre: el reparto de tamaños que deja cualquier
    // molino, con finos alrededor del grano grande.
    tamano: 0.55 + azar() * 0.9,
    giro: azar() * 180,
    tono: Math.floor(azar() * 3),
    // Los granos del fondo se ven más apagados, como en un lecho de café.
    opacidad: 0.72 + azar() * 0.28,
  }));
})();

/** Los tres tonos del café molido, del más tostado al más claro. */
const TONOS = ["#33200F", "#4B2F1A", "#6B4526"] as const;

/**
 * Una muestra de café molido.
 *
 * Los granos no son círculos: llevan un `border-radius` de cuatro esquinas
 * distintas y un giro propio, que es lo que los hace ver partidos y no
 * fabricados. Cuanto más fina la molienda, más granos caben — y eso también es
 * cierto en la taza.
 */
function Muestra({ micras, grande = false }: { micras: number; grande?: boolean }) {
  const diametro = (micras / 1000) * (grande ? PX_POR_MM_GRANDE : PX_POR_MM);

  // Una molienda fina se ve como polvo denso y una gruesa como piedritas
  // sueltas: a igual cantidad de café, cuanto más fino más partículas. La
  // cuenta sube con el inverso del calibre, que es como se comporta de verdad.
  const cuantos = grande
    ? Math.min(GRANOS.length, Math.round(30 + (1000 / micras) * 85))
    : Math.min(GRANOS.length, Math.round(14 + (1000 / micras) * 22));

  return (
    <span className={`molienda-disco${grande ? " molienda-disco-grande" : ""}`} aria-hidden="true">
      {GRANOS.slice(0, cuantos).map((g, i) => (
        <span
          key={i}
          className="molienda-grano"
          style={{
            left: `${g.x}%`,
            top: `${g.y}%`,
            width: `${diametro * g.tamano}px`,
            height: `${diametro * g.tamano * 0.84}px`,
            transform: `translate(-50%, -50%) rotate(${g.giro}deg)`,
            background: TONOS[g.tono],
            opacity: g.opacidad,
          }}
        />
      ))}
    </span>
  );
}

export default function Molienda({ recomendada = null }: { recomendada?: number | null }) {
  // Arranca en la molienda de la receta. Sin recomendación, en la media, que es
  // el punto del que se sale para los dos lados.
  const [elegida, setElegida] = useState<number>(recomendada ?? MOLIENDAS[2].micras);

  const actual = MOLIENDAS.find((m) => m.micras === elegida) ?? MOLIENDAS[2];

  return (
    <section className="molienda">
      <div className="molienda-cabeza">
        <span className="rotulo">Molienda</span>
      </div>

      {/* Los cinco puntos, redondos y del tamaño de un botón para el dedo. El
          de la receta va marcado; tocar otro cambia la muestra grande. */}
      <ul className="molienda-opciones">
        {MOLIENDAS.map((m) => {
          const activa = m.micras === elegida;
          const esLaDeLaReceta = m.micras === recomendada;

          return (
            <li key={m.micras}>
              <button
                type="button"
                className={`molienda-opcion${activa ? " molienda-opcion-activa" : ""}`}
                aria-pressed={activa}
                onClick={() => setElegida(m.micras)}
                title={esLaDeLaReceta ? `${m.nombre} — la de esta receta` : m.nombre}
              >
                <Muestra micras={m.micras} />
                <span className="molienda-opcion-nombre">{m.nombre}</span>
                {esLaDeLaReceta && (
                  <span className="molienda-sello" aria-label="La molienda de esta receta">
                    ✓
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="molienda-detalle">
        <Muestra micras={actual.micras} grande />

        <div className="molienda-detalle-texto">
          <span className="molienda-detalle-nombre">
            {actual.nombre}
            {actual.micras === recomendada && <em className="molienda-etiqueta">la de esta receta</em>}
          </span>
          {/* La comparación manda sobre el número: es lo que se puede verificar
              sin instrumentos. El milímetro va al lado, para quien lo quiera. */}
          <span className="molienda-como">{actual.como}</span>
          <span className="cifra molienda-micras">{actual.mm}</span>
          <span className="molienda-para">{actual.para}</span>
        </div>
      </div>
    </section>
  );
}
