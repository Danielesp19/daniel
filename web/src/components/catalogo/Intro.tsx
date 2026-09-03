import { MARCA } from "@/lib/marca";

/**
 * Cortina de entrada: una rosetta vertida en la taza, vista en planta.
 *
 * Es la escena "Animación Latte 2" que mandó Daniel. Entra la taza con su
 * anillo, sale el vapor y la figura se arma pétalo por pétalo, de afuera hacia
 * adentro: primero la U grande, después las dos hojas largas, los dos pétalos
 * laterales, el central, la U interior y por último el tallo, que es el trazo
 * con el que se remata de verdad. Ese orden es el que hace que se lea como
 * alguien vertiendo y no como un dibujo que aparece.
 *
 * Reemplaza al tulipán plano: acá la taza es cerámica —brillos, sombra
 * proyectada, crema que gira despacio— y la leche tiene volumen. Sobre el papel
 * claro del sitio, una silueta plana se veía como un ícono; esto se ve como una
 * taza.
 *
 * TIEMPOS. Una sola constante, `--beat` en globals.css. La escena original está
 * escrita en múltiplos de 0,2 s y acá corre a 0,18 s: la misma coreografía, un
 * 10 % más rápida, porque quien vuelve al sitio la ve entera cada vez. Se
 * acelera o se frena todo tocando ese número.
 *
 * Es CSS puro, sin una línea de JavaScript, por dos razones:
 *
 *  1. No hay estado que hidratar, así que no puede desincronizarse con el
 *     servidor ni romper la hidratación del resto de la página.
 *  2. Si el JavaScript falla o no llega, la cortina se va igual: la animación
 *     termina en `visibility: hidden` con `both`, así que nadie se queda
 *     encerrado detrás de ella.
 *
 * Con `prefers-reduced-motion` no se muestra en absoluto (ver globals.css).
 */

/**
 * Los pétalos, EN EL ORDEN EN QUE SE VIERTEN.
 *
 * `origen` es desde dónde crece cada uno: los de la derecha desde su esquina
 * derecha, los de la izquierda desde la suya. Un pétalo que crece desde el
 * centro se ve inflarse; creciendo desde donde lo empujaría la jarra, se ve
 * verter.
 */
const PETALOS = [
  {
    nombre: "U exterior",
    d: "M48 160 C54 220 102 254 160 264 C218 254 266 220 272 160 C266 202 218 230 160 234 C102 230 54 202 48 160 Z",
    origen: "center bottom",
    dura: 2.5,
    espera: 3.3,
  },
  {
    nombre: "hoja derecha",
    d: "M240 138 C248 174 216 202 174 220 C182 188 208 158 240 138 Z",
    origen: "right bottom",
    dura: 2.3,
    espera: 5.8,
  },
  {
    nombre: "hoja izquierda",
    d: "M80 138 C72 174 104 202 146 220 C138 188 112 158 80 138 Z",
    origen: "left bottom",
    dura: 2.3,
    espera: 6.4,
  },
  {
    nombre: "pétalo lateral derecho",
    d: "M198 118 C214 148 208 182 161 206 C170 172 182 140 198 118 Z",
    origen: "right bottom",
    dura: 2.3,
    espera: 8.1,
  },
  {
    nombre: "pétalo lateral izquierdo",
    d: "M122 118 C106 148 112 182 159 206 C150 172 138 140 122 118 Z",
    origen: "left bottom",
    dura: 2.3,
    espera: 8.6,
  },
  {
    nombre: "pétalo central",
    d: "M160 100 C180 136 180 174 160 208 C140 174 140 136 160 100 Z",
    origen: "center bottom",
    dura: 2.2,
    espera: 10,
  },
  {
    nombre: "U interior",
    d: "M80 178 C88 214 122 234 160 240 C198 234 232 214 240 178 C232 198 196 210 160 214 C124 210 88 198 80 178 Z",
    origen: "center bottom",
    dura: 2.2,
    espera: 10.8,
  },
];

/** Los tres hilos de vapor, cada uno con su ritmo para que no vayan a compás. */
const VAPOR = [
  { d: "M58 112 C48 92 66 82 56 62 C49 46 62 36 56 20", opacidad: 0.42, dura: 4.2, espera: 1.1, origen: "58px 112px" },
  { d: "M76 114 C67 96 82 86 73 68 C66 54 77 44 72 30", opacidad: 0.34, dura: 4.7, espera: 1.4, origen: "76px 114px" },
  { d: "M93 112 C86 96 97 86 90 70 C84 58 92 50 88 38", opacidad: 0.26, dura: 5, espera: 1.7, origen: "93px 112px" },
];

/** Un tiempo de la coreografía, en múltiplos de `--beat`. */
const beats = (n: number) => `calc(var(--beat) * ${n})`;

export default function Intro() {
  return (
    <div className="cortina" role="presentation" aria-hidden="true">
      {/* Dos manchas de color a la deriva por detrás de todo, en los acentos
          del sitio: es lo único que rompe el fondo plano. */}
      <div className="cortina-mancha cortina-mancha-cereza" />
      <div className="cortina-mancha cortina-mancha-hoja" />
      <div className="cortina-vineta" />

      <div className="cortina-escena">
        <svg viewBox="0 0 140 130" className="cortina-vapor">
          {VAPOR.map((v) => (
            <path
              key={v.d}
              d={v.d}
              fill="none"
              stroke={`rgba(120,88,56,${v.opacidad})`}
              strokeWidth="4.5"
              strokeLinecap="round"
              style={{
                transformOrigin: v.origen,
                animation: `cortinaVapor ${v.dura}s ease-in-out ${v.espera}s infinite`,
              }}
            />
          ))}
        </svg>

        <div className="cortina-taza">
          <div className="cortina-halo" />
          {/* El anillo se expande una sola vez al aparecer la taza: es el golpe
              que la asienta sobre el plato. */}
          <div className="cortina-anillo" />

          <div className="cortina-cuerpo">
            {/* Plato, borde, café y crema: cuatro discos, del más grande al más
                chico, cada uno con su brillo. Es lo que le da la cerámica. */}
            <div className="cortina-plato" />
            <div className="cortina-borde" />
            <div className="cortina-cafe" />
            <div className="cortina-crema" />
            <div className="cortina-brillo" />

            <svg viewBox="0 0 320 320" className="cortina-arte">
              <defs>
                <linearGradient id="cortinaLeche" x1=".15" y1="0" x2=".7" y2="1">
                  <stop offset="0" stopColor="#FFFDF6" />
                  <stop offset=".42" stopColor="#F8ECD6" />
                  <stop offset="1" stopColor="#DCC09A" />
                </linearGradient>
              </defs>

              <g
                transform="translate(0,-16)"
                fill="url(#cortinaLeche)"
                stroke="rgba(196,152,96,.55)"
                strokeWidth="1.6"
                strokeLinejoin="round"
                style={{ transformBox: "fill-box" }}
                className="cortina-rosetta"
              >
                {/* El tallo va de último y se dibuja, no se infla: es el trazo
                    final que atraviesa la figura al levantar la jarra. */}
                <path
                  d="M160 260 L160 288"
                  fill="none"
                  stroke="#F8ECD6"
                  strokeWidth="15"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray="1"
                  style={{
                    animation: `cortinaTrazo ${beats(1.9)} cubic-bezier(.4,0,.2,1) ${beats(12.5)} both`,
                  }}
                />

                {PETALOS.map((p) => (
                  <path
                    key={p.nombre}
                    d={p.d}
                    style={{
                      transformOrigin: p.origen,
                      animation: `cortinaPetalo ${beats(p.dura)} cubic-bezier(.3,1.15,.5,1) ${beats(p.espera)} both`,
                    }}
                  />
                ))}
              </g>
            </svg>

            <div className="cortina-aro" />
          </div>
        </div>

        <div className="cortina-firma">
          <span className="cortina-etiqueta">Arte latte</span>
          <span className="cortina-nombre">{MARCA.nombre}</span>
          <span className="cortina-filete" />
        </div>
      </div>
    </div>
  );
}
