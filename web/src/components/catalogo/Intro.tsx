import { MARCA } from "@/lib/marca";

/**
 * Cortina de entrada: una jarra que se inclina sobre una taza y va dibujando
 * una rosetta, como la de la maqueta. Es la firma del oficio de Daniel —es
 * competidor de arte latte— así que el sitio abre haciendo justo eso.
 *
 * Todo es CSS y SVG, sin una línea de JavaScript, por dos razones:
 *
 *  1. No hay estado que hidratar, así que no puede desincronizarse con el
 *     servidor ni romper la hidratación del resto de la página.
 *  2. Si el JavaScript falla o no llega, la cortina se va igual: la animación
 *     termina en `visibility: hidden` con `forwards`, así que nadie se queda
 *     encerrado detrás de ella.
 *
 * Con `prefers-reduced-motion` no se muestra en absoluto (ver globals.css).
 */
export default function Intro() {
  return (
    <div className="intro" aria-hidden="true">
      <div className="intro-escena">
        <svg viewBox="0 0 240 240" width="100%" height="100%" role="presentation">
          <defs>
            {/* La crema: más clara en el borde que en el centro, como se ve
                una taza real desde arriba. */}
            <radialGradient id="crema" cx="42%" cy="34%" r="72%">
              <stop offset="0%" stopColor="#8A5C36" />
              <stop offset="55%" stopColor="#5E3A21" />
              <stop offset="100%" stopColor="#3A2214" />
            </radialGradient>
          </defs>

          {/* Taza vista desde arriba */}
          <circle cx="120" cy="130" r="82" fill="#241811" />
          <circle cx="120" cy="130" r="74" fill="url(#crema)" className="intro-crema" />

          {/* Rosetta: el tallo se dibuja y las hojas van saliendo por pares,
              de atrás hacia adelante, como cuando se vierte de verdad. */}
          <g className="intro-rosetta" stroke="#F3E9D9" fill="none" strokeLinecap="round">
            <path
              className="intro-tallo"
              d="M120 176 L120 96"
              strokeWidth="5"
              pathLength={1}
            />
            {[0, 1, 2, 3, 4].map((i) => {
              const y = 168 - i * 17;
              // Las hojas se abren abajo y se cierran hacia la punta: así se
              // vierte una rosetta de verdad. Al revés se nota a la legua, y
              // más viniendo de alguien que compite en arte latte.
              const ancho = 34 - i * 4;
              return (
                <path
                  key={i}
                  className="intro-hoja"
                  style={{ animationDelay: `${0.55 + i * 0.13}s` }}
                  d={`M${120 - ancho} ${y} Q120 ${y - 13} ${120 + ancho} ${y}`}
                  strokeWidth="7"
                />
              );
            })}
          </g>

          {/* Jarra: entra desde arriba, se inclina para verter y se retira. */}
          <g className="intro-jarra">
            <path
              d="M150 34 h44 a9 9 0 0 1 9 9 v30 a9 9 0 0 1 -9 9 h-44 a9 9 0 0 1 -9 -9 v-30 a9 9 0 0 1 9 -9 z"
              fill="#F3E9D9"
            />
            {/* Pico */}
            <path d="M141 44 L118 62 L141 66 z" fill="#F3E9D9" />
            {/* Asa */}
            <path
              d="M203 48 q14 6 0 20"
              stroke="#F3E9D9"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
            />
          </g>

          {/* El chorro, solo mientras la jarra está inclinada. */}
          <path
            className="intro-chorro"
            d="M118 64 Q116 82 120 100"
            stroke="#F3E9D9"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="intro-firma">
        <span className="titular">{MARCA.nombre}</span>
        <span className="etiqueta">{MARCA.oficio}</span>
      </div>
    </div>
  );
}
