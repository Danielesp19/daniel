import { MARCA } from "@/lib/marca";

/**
 * Cortina de entrada: un cisne de arte latte que se dibuja trazo por trazo
 * sobre la taza, con vapor, y termina en la firma.
 *
 * Es la segunda escena que mandó Daniel ("Animacion Latte 2"). El cisne no es
 * un capricho estético: es una figura bastante más difícil de verter que una
 * rosetta, y abrir con ella dice de entrada de qué nivel se está hablando.
 *
 * Dos cambios sobre la original:
 *
 *  · RITMO. La original dura 6,7 s, que para una portada es una eternidad —
 *    quien vuelve al sitio la ve entera cada vez. Todos los tiempos se
 *    multiplican por RITMO, así que se acelera o se frena el conjunto entero
 *    tocando un solo número, sin desarmar la coreografía.
 *  · COLOR. Los acentos de la original se cambian por los del sitio: cereza y
 *    verde hoja. El escenario se queda oscuro a propósito: el brillo de la
 *    taza es lo que sostiene la escena, y sobre papel se pierde.
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
 * el cisne queda dibujado a los 3 s y la cortina termina de irse a los 4,1 s,
 * contra los 6,7 s del original. Subirlo la alarga; bajarlo la apura.
 */
const RITMO = 0.5;

/** Convierte un tiempo de la escena original al ritmo de acá. */
const t = (segundos: number) => `${(segundos * RITMO).toFixed(2)}s`;

/**
 * Los trazos del cisne, EN EL ORDEN EN QUE SE VIERTEN: primero el cuerpo,
 * después las plumas del ala una sobre otra, la cola, el pecho y el cuello en
 * ese arco de S que es lo que cuesta, la cabeza, el pico y por último las
 * ondas del agua. Ese orden es el que hace que se lea como alguien vertiendo
 * y no como un dibujo que aparece.
 */
const TRAZOS = [
  { d: "M100 208 Q116 228 160 230 Q216 228 230 202 Q238 184 224 172", grosor: 9, dura: 0.8, espera: 0.9 },
  { d: "M116 202 Q114 168 148 152 Q186 136 222 150 Q192 152 172 168 Q150 186 148 208", grosor: 11, dura: 0.75, espera: 1.6 },
  { d: "M142 210 Q146 178 178 164 Q206 154 226 162 Q200 168 186 184 Q172 198 172 214", grosor: 10, dura: 0.7, espera: 2.2 },
  { d: "M168 214 Q176 190 202 178 Q220 172 232 178 Q212 186 202 198 Q192 208 194 216", grosor: 9, dura: 0.65, espera: 2.75 },
  { d: "M226 170 Q244 158 250 142", grosor: 7, dura: 0.5, espera: 3.25 },
  { d: "M112 214 Q94 190 100 162 Q106 138 122 122 Q138 106 132 88 Q126 70 108 64", grosor: 12, dura: 0.9, espera: 3.6 },
  { d: "M108 64 Q94 60 90 70 Q88 80 100 84 Q110 86 116 80", grosor: 8, dura: 0.5, espera: 4.45 },
  { d: "M92 68 L70 79 L92 78", grosor: 4.5, dura: 0.35, espera: 4.9 },
  { d: "M84 244 Q160 268 236 242", grosor: 5, dura: 0.6, espera: 5.2, opacidad: 0.6 },
  { d: "M108 258 Q160 274 212 256", grosor: 4, dura: 0.55, espera: 5.55, opacidad: 0.35 },
];

/** Los tres hilos de vapor, cada uno con su ritmo para que no vayan a compás. */
const VAPOR = [
  { d: "M58 112 C48 92 66 82 56 62 C49 46 62 36 56 20", opacidad: 0.4, dura: 4.2, espera: 4.6, origen: "58px 112px" },
  { d: "M76 114 C67 96 82 86 73 68 C66 54 77 44 72 30", opacidad: 0.32, dura: 4.7, espera: 5.0, origen: "76px 114px" },
  { d: "M93 112 C86 96 97 86 90 70 C84 58 92 50 88 38", opacidad: 0.26, dura: 5.0, espera: 5.4, origen: "93px 112px" },
];

export default function Intro() {
  return (
    // La cortina se retira apenas termina la firma. El retraso se calcula con
    // el mismo RITMO que todo lo demás: si se cambia el ritmo, la salida se
    // acomoda sola en vez de quedar colgada al final.
    <div className="latte" aria-hidden="true" style={{ animationDelay: t(6.9) }}>
      {/* Manchas de color que van a la deriva por detrás de todo. Son lo único
          que rompe el fondo plano y le da profundidad a la escena. */}
      <div className="latte-mancha latte-mancha-cereza" />
      <div className="latte-mancha latte-mancha-hoja" />
      <div className="latte-vineta" />

      <div className="latte-escena">
        {/* ── Vapor ── */}
        <svg viewBox="0 0 140 130" className="latte-vapor">
          {VAPOR.map((v) => (
            <path
              key={v.d}
              d={v.d}
              fill="none"
              stroke={`rgba(245,234,216,${v.opacidad})`}
              strokeWidth="4.5"
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
          {/* Anillo que se expande una sola vez al aparecer la taza: es el
              golpe que la asienta sobre el plato. */}
          <div className="latte-anillo" style={{ animation: `latteAnillo ${t(2.2)} ease-out ${t(0.4)} both` }} />

          <div className="latte-cuerpo" style={{ animation: `latteTaza ${t(0.9)} cubic-bezier(.34,1.4,.5,1) both` }}>
            <div className="latte-plato" />
            <div className="latte-borde" />
            <div className="latte-cafe" />
            <div className="latte-crema" />
            <div className="latte-brillo" />

            {/* El cisne. */}
            <svg viewBox="0 0 320 320" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <g fill="none" stroke="#F7F0E3" strokeLinecap="round" strokeLinejoin="round">
                {TRAZOS.map((trazo) => (
                  <path
                    key={trazo.d}
                    d={trazo.d}
                    strokeWidth={trazo.grosor}
                    opacity={trazo.opacidad}
                    // pathLength=1 hace que el largo del trazo sea 1 sin
                    // importar su geometría real, así que el mismo par
                    // dasharray/dashoffset sirve para dibujar los diez.
                    pathLength={1}
                    strokeDasharray="1"
                    style={{
                      animation: `latteTrazo ${t(trazo.dura)} cubic-bezier(.4,0,.2,1) ${t(trazo.espera)} both`,
                    }}
                  />
                ))}
              </g>

              {/* El ojo y el pico van al final: son los dos toques que
                  convierten la silueta en un animal. */}
              <circle
                cx="98"
                cy="72"
                r="3.2"
                fill="#52341D"
                style={{ opacity: 0, animation: `latteSube ${t(0.35)} ease ${t(5.0)} both` }}
              />
              <path
                d="M92 68 L70 79 L92 78 Z"
                fill="#F7F0E3"
                stroke="#F7F0E3"
                strokeWidth="2"
                strokeLinejoin="round"
                style={{ opacity: 0, animation: `latteSube ${t(0.3)} ease ${t(5.1)} both` }}
              />
            </svg>

            <div className="latte-aro" />
          </div>
        </div>

        {/* ── Firma ── */}
        <div className="latte-firma" style={{ animation: `latteSube ${t(0.9)} ease ${t(5.8)} both` }}>
          <span className="epigrafe" style={{ color: "rgba(245,234,216,.62)" }}>
            Arte latte
          </span>
          <span className="titular" style={{ fontSize: 32, color: "#F5EAD8" }}>
            {MARCA.nombre}
          </span>
          <span className="latte-filete" />
        </div>
      </div>
    </div>
  );
}
