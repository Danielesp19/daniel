/**
 * El fondo de la portada: ramas de café grabadas.
 *
 * Es el diseño que mandó Daniel, y viene de la carta impresa de otro proyecto
 * suyo: las ramas en las esquinas, dibujadas a línea como un grabado antiguo.
 * Reemplaza al cuadro del video desenfocado, que solo aportaba una mancha
 * marrón y obligaba a que la portada dependiera del archivo de video.
 *
 * Va en SVG y no como imagen: son cuatro ramas repetidas por transformación
 * —la misma `<g>` reflejada y girada— así que pesa un par de kilobytes en vez
 * de los cientos de un PNG, y se ve nítido en cualquier pantalla.
 *
 * Las ramas se mecen muy despacio (19 a 25 segundos por ciclo) y con tiempos
 * distintos para que no vayan a compás: a esa velocidad no se sigue con la
 * vista, solo se nota que la portada está viva. Con `prefers-reduced-motion`
 * se quedan quietas.
 */
export default function FondoBotanico() {
  return (
    <div className="hero-fondo" aria-hidden="true">
      {/* Los dos halos de color: el cálido arriba, detrás del medallón, y el
          verde hoja abajo a la izquierda. Son lo único que rompe el negro. */}
      <span className="hero-halo-calido" />
      <span className="hero-halo-hoja" />

      {/* Solo las definiciones: no pinta nada por sí mismo, las esquinas de
          abajo lo referencian con <use>. */}
      <svg className="hero-defs" aria-hidden="true">
        <defs>
          {/* La hoja: el contorno, la nervadura central y las laterales. */}
          <g id="hoja">
            <path d="M0 0 C 22 -23 64 -27 92 0 C 64 27 22 23 0 0 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
            <path d="M3 0 C 30 -2 62 -2 89 0" fill="none" stroke="currentColor" strokeWidth="2" />
            <g fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".8">
              <path d="M14 -1 Q 24 -10 33 -15" />
              <path d="M28 -1 Q 40 -11 50 -16" />
              <path d="M44 -1 Q 56 -10 66 -14" />
              <path d="M60 -1 Q 70 -8 78 -11" />
              <path d="M14 1 Q 24 10 33 15" />
              <path d="M28 1 Q 40 11 50 16" />
              <path d="M44 1 Q 56 10 66 14" />
              <path d="M60 1 Q 70 8 78 11" />
            </g>
          </g>

          {/* Los frutos, de a tres como salen en la rama. */}
          <g id="cerezas">
            <g fill="none" stroke="currentColor" strokeWidth="2.8">
              <circle cx="0" cy="0" r="8" />
              <circle cx="15" cy="9" r="7.2" />
              <circle cx="-2" cy="16" r="6.4" />
            </g>
            <g fill="none" stroke="currentColor" strokeWidth="1" opacity=".7">
              <path d="M-3 -4 Q 0 -6 3 -4" />
              <path d="M12 5 Q 15 3 18 5" />
            </g>
          </g>

          {/* La rama entera: el tallo, un brote y las hojas en pares. */}
          <g id="rama">
            <path d="M2 2 C 58 28 118 68 166 134" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <path d="M86 48 C 116 36 148 40 176 58" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <use href="#hoja" transform="translate(24,14) rotate(20)" />
            <use href="#hoja" transform="translate(22,12) rotate(-58) scale(.82)" />
            <use href="#hoja" transform="translate(66,40) rotate(32) scale(.96)" />
            <use href="#hoja" transform="translate(64,38) rotate(-46) scale(.86)" />
            <use href="#hoja" transform="translate(112,82) rotate(44) scale(.9)" />
            <use href="#hoja" transform="translate(110,80) rotate(-34) scale(.76)" />
            <use href="#hoja" transform="translate(152,122) rotate(56) scale(.78)" />
            <use href="#hoja" transform="translate(176,58) rotate(-12) scale(.72)" />
            <use href="#hoja" transform="translate(174,56) rotate(-86) scale(.6)" />
            <use href="#cerezas" transform="translate(52,32) scale(.95)" />
            <use href="#cerezas" transform="translate(100,68) scale(.85)" />
            <use href="#cerezas" transform="translate(146,116) scale(.7)" />
          </g>
        </defs>

      </svg>

      {/* Las cuatro esquinas, cada una en su propio lienzo y con tamaño fijo.
          Antes era un solo SVG con `slice` sobre el lienzo de 448x860 del
          diseño, que es de celular: en una pantalla ancha el recorte ampliaba
          el dibujo hasta dejar una hoja del tamaño de media portada. Con una
          rama por esquina, el grabado conserva su escala en cualquier ventana
          y las esquinas siguen siendo esquinas. */}
      {(["a", "b", "c", "d"] as const).map((esquina) => (
        <svg key={esquina} viewBox="0 0 210 175" className={`hero-rama hero-rama-${esquina}`}>
          <use href="#rama" transform="translate(6,10)" />
        </svg>
      ))}
    </div>
  );
}
