import { MARCA } from "@/lib/marca";

/**
 * Cortina de entrada: un tulipán de arte latte, visto en planta.
 *
 * Entra la taza, entra la jarra inclinada desde arriba a la derecha y el chorro
 * de leche empieza a caer. Cada inyección revela una capa del tulipán —cinco
 * lóbulos y la punta— y el remate atraviesa las capas de arriba abajo. La
 * jarra no se va y luego aparece el dibujo: se disuelve mientras el dibujo
 * crece, que es lo que pasa de verdad al verter.
 *
 * CÓMO SE DIBUJA. Cada capa es una elipse RELLENA que se revela con una
 * máscara cuyo contenido es un solo trazo barrido de izquierda a derecha:
 * `pathLength={1}` con `strokeDasharray="1"` y el `dashoffset` animado de 1 a
 * 0. Ese par de valores sirve para todas las geometrías sin recalcular nada, y
 * el relleno da la silueta de leche de verdad —alas que se afinan, borde
 * empujado por la capa siguiente— que un trazo de grosor constante no puede
 * dar.
 *
 * TIEMPOS. Hay una sola constante de ritmo, `--beat`, en globals.css: doce
 * tiempos de 0,2 s son 2,4 s de cortina. Se acelera o se frena la coreografía
 * entera tocando ese número, sin desarmar nada. Dos segundos y medio es el
 * techo: quien vuelve al sitio la ve entera cada vez.
 *
 * Es CSS puro, sin una línea de JavaScript, por dos razones:
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
 * Los barridos que revelan el tulipán, EN EL ORDEN EN QUE SE VIERTEN: primero
 * el charco de crema donde aterriza el chorro, después cada inyección —cada
 * una más arriba y más angosta que la anterior— y al final la punta.
 *
 * `grosor` es el ancho del barrido, y tiene que cubrir de sobra la altura de
 * su elipse: si se queda corto, la capa se revela por una franja y se ve el
 * corte. `capa` es la elipse que ese barrido descubre.
 */
const CAPAS = [
  { id: 1, grosor: 72, barrido: "M 72 236 Q 160 242 248 236", cy: 236, rx: 74, ry: 30 },
  { id: 2, grosor: 66, barrido: "M 79 216 Q 160 221 241 216", cy: 216, rx: 67, ry: 27 },
  { id: 3, grosor: 64, barrido: "M 88 196 Q 160 201 232 196", cy: 196, rx: 58, ry: 26 },
  { id: 4, grosor: 62, barrido: "M 98 176 Q 160 181 222 176", cy: 176, rx: 48, ry: 25 },
  { id: 5, grosor: 60, barrido: "M 109 155 Q 160 160 211 155", cy: 155, rx: 37, ry: 24 },
  { id: 6, grosor: 60, barrido: "M 121 132 Q 160 137 199 132", cy: 132, rx: 25, ry: 24 },
];

export default function Intro() {
  return (
    <div className="cortina" role="presentation" aria-hidden="true">
      {/* Manchas de color a la deriva por detrás de todo: es lo único que rompe
          el fondo plano. Van en los dos acentos del sitio. */}
      <div className="cortina-mancha cortina-mancha-cereza" />
      <div className="cortina-mancha cortina-mancha-hoja" />

      <div className="cortina-escena">
        <svg className="cortina-taza" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="cortinaCafe" cx="46%" cy="34%" r="74%">
              <stop offset="0%" stopColor="#52341D" />
              <stop offset="60%" stopColor="#452A16" />
              <stop offset="100%" stopColor="#3A2312" />
            </radialGradient>
            <radialGradient id="cortinaPlato" cx="44%" cy="34%" r="76%">
              <stop offset="0%" stopColor="#241609" />
              <stop offset="100%" stopColor="#160C05" />
            </radialGradient>
            <clipPath id="cortinaDentro">
              <circle cx="160" cy="160" r="110" />
            </clipPath>
            {/* La leche no es plana: más brillante en el borde de ataque. */}
            <linearGradient id="cortinaLeche" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFCF4" />
              <stop offset="55%" stopColor="#F7F0E3" />
              <stop offset="100%" stopColor="#E9DCC4" />
            </linearGradient>

            {CAPAS.map((capa) => (
              <mask
                key={capa.id}
                id={`cortinaBarrido${capa.id}`}
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width="320"
                height="320"
              >
                <path
                  className={`cortina-trazo cortina-trazo-${capa.id}`}
                  pathLength={1}
                  strokeDasharray="1"
                  strokeDashoffset="1"
                  strokeWidth={capa.grosor}
                  d={capa.barrido}
                />
              </mask>
            ))}
          </defs>

          {/* Plato */}
          <circle cx="160" cy="160" r="150" fill="url(#cortinaPlato)" />
          <circle cx="160" cy="160" r="150" fill="none" stroke="rgba(198,113,57,0.30)" strokeWidth="2" />
          <circle cx="160" cy="160" r="131" fill="none" stroke="rgba(247,240,227,0.10)" strokeWidth="1.5" />

          {/* Borde de la taza */}
          <circle cx="160" cy="160" r="120" fill="#2A1A10" />
          <circle cx="160" cy="160" r="120" fill="none" stroke="rgba(247,240,227,0.40)" strokeWidth="3" />

          {/* Superficie de café con su crema */}
          <circle cx="160" cy="160" r="112" fill="url(#cortinaCafe)" />
          <ellipse cx="126" cy="118" rx="56" ry="38" fill="rgba(247,240,227,0.055)" />

          {/* El tulipán. Se pintan de la punta hacia abajo para que cada capa
              nueva quede POR DEBAJO de la anterior: así el borde de fuga se ve
              empujado por la que sigue, como en la taza. */}
          <g
            fill="url(#cortinaLeche)"
            stroke="rgba(44,26,13,0.42)"
            strokeWidth="2"
            clipPath="url(#cortinaDentro)"
          >
            {[...CAPAS].reverse().map((capa) => (
              <ellipse
                key={capa.id}
                mask={`url(#cortinaBarrido${capa.id})`}
                cx="160"
                cy={capa.cy}
                rx={capa.rx}
                ry={capa.ry}
              />
            ))}
          </g>

          {/* El remate: atraviesa las capas de arriba abajo y cierra la figura. */}
          <path
            className="cortina-trazo cortina-trazo-7 cortina-crema"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset="1"
            strokeWidth="4"
            fill="none"
            clipPath="url(#cortinaDentro)"
            d="M 160 110 C 163 164 162 218 160 260"
          />

          {/* El chorro: lo que cae es justo lo que va dibujando. */}
          <path
            className="cortina-trazo cortina-chorro"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset="1"
            strokeWidth="5"
            fill="none"
            d="M 206 112 Q 194 166 168 222"
          />

          <g className="cortina-jarra">
            <g
              className="cortina-jarra-disuelve"
              transform="translate(214 90) scale(0.86)"
              fill="#3A2312"
              stroke="rgba(247,240,227,0.62)"
              strokeWidth="5"
              strokeLinejoin="round"
            >
              {/* Cuerpo alto y pico largo en V, apuntando al centro de la taza. */}
              <path
                d="M -18 6 L 14 -44 L 14 -70 Q 14 -82 28 -82 L 52 -82 Q 66 -82 64 -70
                   L 56 -18 Q 54 -6 40 -6 L 14 -6 Q 6 -6 2 -2 Z"
              />
              {/* Asa cerrada, unida a la pared en los dos extremos. */}
              <path
                d="M 64 -70 C 92 -70 97 -57 97 -46 C 97 -33 85 -24 56 -24
                   L 61 -35 C 81 -35 87 -39 87 -46 C 87 -54 82 -60 62 -60 Z"
              />
              {/* La leche adentro: un filo claro en la boca. */}
              <path
                d="M 20 -74 L 58 -74"
                stroke="rgba(247,240,227,0.30)"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          </g>
        </svg>

        <div className="cortina-firma">{MARCA.nombre}</div>
      </div>
    </div>
  );
}
