"use client";

import { useEffect, useState } from "react";

/**
 * Referencia de molienda a tamaño real, dentro de la receta.
 *
 * El error más común preparando café en casa es la molienda, y no hay forma de
 * describirla con palabras: "medio" no significa lo mismo en dos molinos. Esto
 * la muestra al tamaño que tiene de verdad, para poner los granos al lado de la
 * pantalla y comparar.
 *
 * Va DENTRO de la receta y no como un bloque suelto al final de la sección: la
 * molienda no es una duda general, es la primera decisión de esa preparación
 * concreta. La receta llega con la suya marcada —la que puso Daniel al
 * escribirla— y quien la lee puede tocar las demás para ver en qué se
 * diferencian.
 *
 * EL PROBLEMA: un navegador no sabe cuánto mide físicamente su propia pantalla.
 * El píxel CSS es una unidad relativa y la relación con el milímetro cambia
 * entre un celular y un monitor. Estimarla sale mal —el error pasa del 30 %— y
 * en una guía de molienda eso es peor que no tenerla.
 *
 * LA SALIDA: que calibre el usuario, una sola vez, con una regla de verdad.
 * Ajusta la barra hasta que mida 5 cm y de ahí sale cuántos píxeles hay en un
 * milímetro. Se calibra con 5 cm y no con 1 mm —que es la medida que importa—
 * porque el error de apreciación se reparte entre cincuenta milímetros en vez
 * de caer entero sobre uno.
 */

/** Píxeles CSS por milímetro en una pantalla de 96 ppp: el punto de partida. */
const PX_POR_MM_ESTANDAR = 96 / 25.4;

const LLAVE = "altura:px-por-mm";

/**
 * Los cinco puntos de molienda, en micrones. Mil micrones son un milímetro:
 * es la equivalencia que pidió el cliente que quedara explícita.
 *
 * Son los mismos cinco que ofrece el panel al escribir una receta, así que la
 * recomendación siempre cae en uno de estos discos.
 */
const MOLIENDAS = [
  { micras: 1000, nombre: "Gruesa", para: "Prensa francesa · cold brew" },
  { micras: 800, nombre: "Media gruesa", para: "Chemex" },
  { micras: 600, nombre: "Media", para: "V60 · goteo" },
  { micras: 400, nombre: "Media fina", para: "Moka · aeropress" },
  { micras: 250, nombre: "Fina", para: "Espresso" },
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
 * Una muestra de café molido dibujada a tamaño real.
 *
 * Los granos no son círculos: llevan un `border-radius` de cuatro esquinas
 * distintas y un giro propio, que es lo que los hace ver partidos y no
 * fabricados. Cuanto más fina la molienda, más granos caben —y eso también es
 * cierto en la taza—.
 */
function Muestra({ micras, escala, grande = false }: { micras: number; escala: number; grande?: boolean }) {
  // Micrones → milímetros → píxeles de esta pantalla.
  const diametro = (micras / 1000) * escala;

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
  const [pxPorMm, setPxPorMm] = useState(PX_POR_MM_ESTANDAR);
  const [calibrando, setCalibrando] = useState(false);
  const [listo, setListo] = useState(false);

  // Arranca en la molienda de la receta. Sin recomendación, en la media, que es
  // el punto del que se sale para los dos lados.
  const [elegida, setElegida] = useState<number>(
    recomendada ?? MOLIENDAS[2].micras,
  );

  useEffect(() => {
    // La calibración es de esta pantalla, así que vive en el navegador y no en
    // la base: la misma persona en el celular y en el computador necesita dos
    // valores distintos.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setListo(true);
    try {
      const guardado = Number(localStorage.getItem(LLAVE));
      if (Number.isFinite(guardado) && guardado > 0) setPxPorMm(guardado);
    } catch {
      // Modo incógnito o almacenamiento bloqueado: se queda con el estándar.
    }
  }, []);

  const guardar = (valor: number) => {
    setPxPorMm(valor);
    try {
      localStorage.setItem(LLAVE, String(valor));
    } catch {
      // Si no se puede guardar, la calibración vale para esta visita y ya.
    }
  };

  // Hasta que el efecto lea el almacenamiento se dibuja con el estándar; sin
  // esto el primer pintado del servidor y el del navegador no coinciden.
  const escala = listo ? pxPorMm : PX_POR_MM_ESTANDAR;
  const actual = MOLIENDAS.find((m) => m.micras === elegida) ?? MOLIENDAS[2];

  return (
    <section className="molienda">
      <div className="molienda-cabeza">
        <span className="rotulo">Molienda</span>
        <button type="button" className="molienda-calibrar-boton" onClick={() => setCalibrando((v) => !v)}>
          {calibrando ? "Listo" : "Calibrar pantalla"}
        </button>
      </div>

      {calibrando && (
        <div className="molienda-calibrar">
          <p className="molienda-instruccion">
            Pon una regla contra la pantalla y mueve el control hasta que esta barra mida
            exactamente <strong>5 centímetros</strong>.
          </p>

          <div className="molienda-regla" style={{ width: `${50 * escala}px` }}>
            {/* Las marcas de cada centímetro dan una segunda forma de acertar:
                si las rayas caen sobre los números de la regla, está bien. */}
            {[1, 2, 3, 4].map((cm) => (
              <span key={cm} style={{ left: `${cm * 20}%` }} />
            ))}
            <span className="molienda-regla-texto">5 cm</span>
          </div>

          <input
            type="range"
            min={2}
            max={12}
            step={0.05}
            value={escala}
            onChange={(e) => guardar(Number(e.target.value))}
            aria-label="Calibrar el tamaño de la pantalla"
          />

          <button type="button" className="molienda-calibrar-boton" onClick={() => guardar(PX_POR_MM_ESTANDAR)}>
            Volver al valor por defecto
          </button>
        </div>
      )}

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
                <Muestra micras={m.micras} escala={escala} />
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
        <Muestra micras={actual.micras} escala={escala} grande />

        <div className="molienda-detalle-texto">
          <span className="molienda-detalle-nombre">
            {actual.nombre}
            {actual.micras === recomendada && <em className="molienda-etiqueta">la de esta receta</em>}
          </span>
          <span className="cifra molienda-micras">{actual.micras} µm</span>
          <span className="molienda-para">{actual.para}</span>
          <p className="molienda-nota">
            A tamaño real. Si no coincide con tu café, calibra la pantalla: cada una tiene una
            densidad distinta y el navegador no sabe cuál es la tuya.
          </p>
        </div>
      </div>
    </section>
  );
}
