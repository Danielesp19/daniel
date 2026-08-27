"use client";

import { useEffect, useState } from "react";

/**
 * Referencia de molienda a tamaño real.
 *
 * El error más común preparando café en casa es la molienda, y no hay forma de
 * describirla con palabras: "medio" no significa lo mismo en dos molinos. Esto
 * la muestra al tamaño que tiene de verdad, para poner los granos al lado de la
 * pantalla y comparar.
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
 */
const MOLIENDAS = [
  { micras: 1000, nombre: "Gruesa", para: "Prensa francesa · cold brew" },
  { micras: 800, nombre: "Media gruesa", para: "Chemex" },
  { micras: 600, nombre: "Media", para: "V60 · goteo" },
  { micras: 400, nombre: "Media fina", para: "Moka · aeropress" },
  { micras: 250, nombre: "Fina", para: "Espresso" },
] as const;

/**
 * Posiciones de los granos dentro de cada muestra, en porcentaje.
 *
 * Fijas y no aleatorias: con `Math.random()` la muestra se reacomoda en cada
 * repintado —y el servidor y el navegador dibujarían cosas distintas, que le
 * rompe la hidratación a React—. Están desordenadas a mano para que parezca
 * café molido y no una cuadrícula.
 */
const GRANOS = [
  [12, 22], [34, 14], [58, 26], [78, 18], [22, 46], [46, 38], [68, 52], [88, 42],
  [16, 68], [38, 74], [60, 66], [82, 78], [28, 88], [52, 90], [72, 34], [8, 44],
];

export default function Molienda() {
  const [pxPorMm, setPxPorMm] = useState(PX_POR_MM_ESTANDAR);
  const [calibrando, setCalibrando] = useState(false);
  const [listo, setListo] = useState(false);

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

  return (
    <section className="molienda revelar">
      <header className="molienda-cabeza">
        <div>
          <span className="rotulo">Tamaño real</span>
          <h3 className="nombre molienda-titulo">Referencia de molienda</h3>
          <p className="molienda-bajada">
            Mil micrones son un milímetro. Pon tus granos molidos al lado de la pantalla y compara.
          </p>
        </div>

        <button type="button" className="vermas" onClick={() => setCalibrando((v) => !v)}>
          {calibrando ? "Listo" : "Calibrar pantalla"}
        </button>
      </header>

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

          <button type="button" className="vermas" onClick={() => guardar(PX_POR_MM_ESTANDAR)}>
            Volver al valor por defecto
          </button>
        </div>
      )}

      <ul className="molienda-muestras">
        {MOLIENDAS.map((m) => {
          // Micrones → milímetros → píxeles de esta pantalla.
          const diametro = (m.micras / 1000) * escala;

          return (
            <li key={m.micras} className="molienda-muestra">
              <span className="molienda-caja" aria-hidden="true">
                {GRANOS.map(([x, y], i) => (
                  <span
                    key={i}
                    className="molienda-grano"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${diametro}px`,
                      height: `${diametro}px`,
                    }}
                  />
                ))}
              </span>

              <span className="molienda-nombre">{m.nombre}</span>
              <span className="cifra molienda-micras">{m.micras} µm</span>
              <span className="molienda-para">{m.para}</span>
            </li>
          );
        })}
      </ul>

      <p className="molienda-nota">
        Sin calibrar, los tamaños son aproximados: cada pantalla tiene una densidad distinta y el
        navegador no sabe cuál es la tuya. La calibración se guarda en este dispositivo.
      </p>
    </section>
  );
}
