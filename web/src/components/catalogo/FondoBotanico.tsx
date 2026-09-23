/**
 * El fondo de la portada: ramas de café en las esquinas, meciéndose.
 *
 * Es el diseño "hero v final" que mandó Daniel. Antes esto era un grabado
 * dibujado a mano en SVG; ahora es la ilustración de verdad, la misma de la
 * carta impresa, con su trama de nervaduras y sus cerezas. El SVG nunca llegó
 * a ese detalle: eran ocho trazos por hoja contra los cientos que tiene el
 * dibujo original.
 *
 * LA ILUSTRACIÓN VA COMO MÁSCARA, no como imagen. El archivo original es un
 * PNG de 445 KB pintado todo del mismo color —#E8D5BD, el mismo que ya usaba
 * el CSS— con el dibujo entero viviendo en el canal alfa. Guardando solo ese
 * canal en WebP quedan 42 KB, diez veces menos, y de paso el color vuelve a
 * ser una propiedad de CSS en vez de estar quemado en los píxeles.
 *
 * CADA ESQUINA SON DOS ELEMENTOS Y NO UNO. El de afuera es el que se mece, y
 * pivota desde su esquina (`transform-origin`) para que la rama se vea colgada
 * de fuera del encuadre en vez de flotando. El de adentro es el que se refleja
 * o gira para que las cuatro salgan de la misma ilustración. Si los dos
 * `transform` vivieran en el mismo elemento se pisarían y el reflejo se
 * perdería a mitad del ciclo.
 *
 * Se mecen con dos compases distintos y con arranques desfasados (los retrasos
 * negativos del CSS): a la vez se lee como un GIF, desfasadas se lee como aire.
 * Con `prefers-reduced-motion` se quedan quietas, por la regla general de
 * globals.css.
 */
export default function FondoBotanico() {
  return (
    <div className="hero-fondo" aria-hidden="true">
      {/* Los halos de color, lo único que rompe el negro. En escritorio va uno
          solo, cálido y detrás del medallón; en celular se reparten en dos, el
          cálido arriba y uno verde hoja abajo a la izquierda. */}
      <span className="hero-halo-calido" />
      <span className="hero-halo-hoja" />

      {/* Las cuatro esquinas. En celular solo se ven dos —la de arriba a la
          derecha y la de abajo a la izquierda—: cuatro ramas en 390 px de
          ancho no dejan sitio para el titular. */}
      {(["a", "b", "c", "d"] as const).map((esquina) => (
        <div key={esquina} className={`hero-rama hero-rama-${esquina}`}>
          <span className="hero-rama-dibujo" />
        </div>
      ))}
    </div>
  );
}
