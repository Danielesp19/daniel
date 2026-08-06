import { MARCA } from "@/lib/marca";

/**
 * Cortina de entrada: una mano inclina la jarra sobre la taza y va dibujando
 * una rosetta hoja por hoja, sale el vapor y aparece la firma.
 *
 * Viene de la escena que bajó Daniel (animacion latte.zip), con dos cambios:
 *
 *  · RITMO. La original dura 6,1 s, que para una portada es una eternidad —
 *    quien vuelve al sitio la ve entera cada vez. Todos los tiempos se
 *    multiplican por RITMO, así que se acelera o se frena el conjunto entero
 *    tocando un solo número, sin desarmar la coreografía.
 *  · COLOR. La original va en negro con acento verde. Acá el fondo es nuestra
 *    tinta y el halo es cereza. El escenario se queda oscuro a propósito: el
 *    brillo de la taza es lo que sostiene la escena, y sobre papel se pierde.
 *
 * Sigue siendo CSS puro, sin una línea de JavaScript, por dos razones:
 *
 *  1. No hay estado que hidratar, así que no puede desincronizarse con el
 *     servidor ni romper la hidratación del resto de la página.
 *  2. Si el JavaScript falla o no llega, la cortina se va igual: la animación
 *     termina en `visibility: hidden` con `forwards`, así que nadie se queda
 *     encerrado detrás de ella.
 *
 * Con `prefers-reduced-motion` no se muestra en absoluto (ver globals.css).
 */

/**
 * Cuánto se comprime la escena original. 0,5 la deja exactamente en la mitad:
 * la rosetta queda hecha a los 3 s y la cortina termina de irse a los 3,8 s,
 * contra los 6,1 s del original. Subirlo la alarga; bajarlo la apura.
 */
const RITMO = 0.5;

/** Convierte un tiempo de la escena original al ritmo de acá. */
const t = (segundos: number) => `${(segundos * RITMO).toFixed(2)}s`;

/**
 * Las hojas de la rosetta, de la punta hacia el asa. Van saliendo por pares
 * conforme la jarra baja, que es el orden en que aparecen al verter de verdad.
 */
const HOJAS = [
  "M 130 100 C 117.4 97 94 105.4 96.88 126.64 C 112 116.56 123.52 102 130 100 Z",
  "M 130 100 C 142.6 97 166 105.4 163.12 126.64 C 148 116.56 136.48 102 130 100 Z",
  "M 130 118 C 118.45 115 97 122.95 99.64 142.42 C 113.5 133.18 124.06 120 130 118 Z",
  "M 130 118 C 141.55 115 163 122.95 160.36 142.42 C 146.5 133.18 135.94 120 130 118 Z",
  "M 130 135 C 119.5 132 100 139.5 102.4 157.2 C 115 148.8 124.6 137 130 135 Z",
  "M 130 135 C 140.5 132 160 139.5 157.6 157.2 C 145 148.8 135.4 137 130 135 Z",
  "M 130 151 C 120.9 148 104 154.9 106.08 170.24 C 117 162.96 125.32 153 130 151 Z",
  "M 130 151 C 139.1 148 156 154.9 153.92 170.24 C 143 162.96 134.68 153 130 151 Z",
  "M 130 166 C 122.3 163 108 169.3 109.76 182.28 C 119 176.12 126.04 168 130 166 Z",
  "M 130 166 C 137.7 163 152 169.3 150.24 182.28 C 141 176.12 133.96 168 130 166 Z",
  "M 130 179 C 124.05 176 113 181.55 114.36 191.58 C 121.5 186.82 126.94 181 130 179 Z",
  "M 130 179 C 135.95 176 147 181.55 145.64 191.58 C 138.5 186.82 133.06 181 130 179 Z",
  "M 130 190 C 125.8 187 118 191.8 118.96 198.88 C 124 195.52 127.84 192 130 190 Z",
  "M 130 190 C 134.2 187 142 191.8 141.04 198.88 C 136 195.52 132.16 192 130 190 Z",
];

/** Cada hoja entra 0,2 s después de la anterior; la primera, a 1,55 s. */
const florece = (i: number) => ({
  animation: `latteFlorece ${t(0.42)} ease ${t(1.55 + i * 0.2)} both`,
});

/** Los tres hilos de vapor, cada uno con su propio ritmo para que no vayan a compás. */
const VAPOR = [
  { d: "M52 96 C44 78 60 70 52 52 C46 38 58 30 52 16", opacidad: 0.45, dura: 4.4, espera: 4.6, origen: "52px 96px" },
  { d: "M68 98 C60 82 74 74 66 58 C60 46 70 38 66 26", opacidad: 0.36, dura: 4.8, espera: 5.0, origen: "68px 98px" },
  { d: "M82 96 C76 82 86 74 80 60 C75 50 82 44 79 34", opacidad: 0.3, dura: 5.2, espera: 5.4, origen: "82px 96px" },
];

export default function Intro() {
  return (
    // La cortina se retira apenas termina la firma. El retraso se calcula con
    // el mismo RITMO que todo lo demás: si se cambia el ritmo, la salida se
    // acomoda sola en vez de quedar colgada al final.
    <div className="latte" aria-hidden="true" style={{ animationDelay: t(6.2) }}>
      <div className="latte-escena">
        {/* ── Vapor ── */}
        <svg viewBox="0 0 120 120" className="latte-vapor">
          {VAPOR.map((v) => (
            <path
              key={v.d}
              d={v.d}
              fill="none"
              stroke={`rgba(243,233,217,${v.opacidad})`}
              strokeWidth="4"
              strokeLinecap="round"
              style={{
                transformOrigin: v.origen,
                animation: `latteVapor ${t(v.dura)} ease-in-out ${t(v.espera)} infinite`,
              }}
            />
          ))}
        </svg>

        {/* ── Taza ── */}
        <div className="latte-taza">
          <div className="latte-halo" />

          <div
            className="latte-cuerpo"
            style={{ animation: `latteTaza ${t(0.8)} cubic-bezier(.34,1.4,.5,1) both` }}
          >
            <div className="latte-plato" />
            <div className="latte-borde" />
            <div className="latte-cafe" />
            <div className="latte-crema" />
            <div className="latte-brillo" />

            {/* La rosetta que va dejando el chorro. */}
            <svg viewBox="0 0 260 260" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <ellipse
                cx="130"
                cy="84"
                rx="24"
                ry="17"
                className="latte-leche"
                style={{ animation: `latteFlorece ${t(0.5)} ease ${t(1.35)} both` }}
              />
              {HOJAS.map((d, i) => (
                <path key={d} d={d} className="latte-leche" style={florece(i)} />
              ))}
              {/* El tallo se dibuja al final, de un solo trazo: es el corte que
                  cierra la figura cuando ya están puestas todas las hojas. */}
              <path
                d="M130 74 L130 204"
                fill="none"
                stroke="rgba(247,240,227,.97)"
                strokeWidth="7"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1"
                style={{ animation: `latteTrazo ${t(0.55)} cubic-bezier(.5,0,.5,1) ${t(4.35)} both` }}
              />
            </svg>

            <div className="latte-aro" />
          </div>
        </div>

        {/* ── Mano y jarra ── */}
        <div
          className="latte-mano"
          style={{ animation: `latteMano ${t(4.3)} cubic-bezier(.45,.05,.5,1) ${t(0.7)} both` }}
        >
          <div className="latte-chorro" style={{ animation: `latteChorro ${t(4.3)} ease ${t(0.7)} both` }} />

          <div
            className="latte-jarra"
            style={{ animation: `latteInclina ${t(4.3)} cubic-bezier(.45,.05,.5,1) ${t(0.7)} both` }}
          >
            <svg viewBox="0 0 140 150" style={{ width: "100%", height: "100%", overflow: "visible" }}>
              <defs>
                <linearGradient id="latte-acero" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#f4f5f7" />
                  <stop offset=".5" stopColor="#cbced4" />
                  <stop offset="1" stopColor="#969ca4" />
                </linearGradient>
                <linearGradient id="latte-piel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#f1c39d" />
                  <stop offset="1" stopColor="#dd9f73" />
                </linearGradient>
              </defs>

              {/* Asa, cuerpo y pico de la jarra */}
              <path d="M118 54 q28 4 26 34 q-2 24 -26 26" fill="none" stroke="#b6bbc3" strokeWidth="10" strokeLinecap="round" />
              <path
                d="M60 44 L114 38 Q128 37 128 54 L126 92 Q124 110 100 112 L74 114 Q58 114 56 96 L54 60 Q54 46 60 44 Z"
                fill="url(#latte-acero)"
                stroke="rgba(0,0,0,.12)"
                strokeWidth="1.4"
              />
              <path d="M56 96 L72 118 L86 102 Q70 102 56 96 Z" fill="url(#latte-acero)" stroke="rgba(0,0,0,.1)" strokeWidth="1.2" />
              <ellipse cx="92" cy="48" rx="32" ry="7.5" fill="rgba(255,255,255,.5)" />
              <path d="M64 56 Q66 88 80 106" stroke="rgba(255,255,255,.45)" strokeWidth="4" fill="none" strokeLinecap="round" />

              {/* Mano */}
              <path d="M84 22 Q120 8 138 30 Q146 46 128 56 L98 58 Q82 44 84 22 Z" fill="url(#latte-piel)" />
              <path
                d="M96 44 q6 15 2 26 M108 44 q6 15 2 26 M120 46 q6 13 2 23 M131 48 q5 11 1 20"
                stroke="#e7b085"
                strokeWidth="8.5"
                strokeLinecap="round"
                fill="none"
              />
              <path d="M86 28 Q78 36 82 50" stroke="url(#latte-piel)" strokeWidth="11" strokeLinecap="round" fill="none" />
            </svg>
          </div>
        </div>

        <div className="latte-firma" style={{ animation: `latteFlorece ${t(0.8)} ease ${t(5.3)} both` }}>
          {MARCA.nombre} · Arte latte
        </div>
      </div>
    </div>
  );
}
