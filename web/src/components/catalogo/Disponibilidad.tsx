import type { Sede } from "@/lib/catalogo";

/**
 * Dónde se consigue este producto, agrupado por ciudad.
 *
 * ANTES ESTO PUBLICABA EL INVENTARIO: cada sede venía con cuántas unidades
 * tenía, en grande y alineado a la derecha. Eso es información del negocio
 * —cualquiera que entrara sabía cuánto café había en cada local, y un
 * competidor también—, así que ahora vive solo en el panel. Lo que queda es lo
 * que el cliente necesita para ir a buscarlo: la dirección, el barrio y el
 * horario.
 *
 * Si el producto está agotado del todo, el sello de la ficha ya lo dice; acá
 * no se repite sede por sede, porque sin conteos todas las filas se verían
 * iguales y el aviso perdería fuerza.
 *
 * Se agrupa por ciudad porque es el primer corte que hace cualquiera: alguien
 * en Pitalito no compara contra la sede de Bogotá, la descarta entera. Con una
 * sola ciudad el encabezado no aparece — sería un título para una sola cosa.
 *
 * No hay teléfono por sede: todo el contacto pasa por la línea de Daniel, y
 * tres números distintos solo lograban que el pedido llegara al lugar
 * equivocado.
 *
 * `oscuro` existe porque el panel del destacado pinta su propio fondo negro
 * aunque la sección que lo contiene sea clara — el resto de las tarjetas
 * resuelve el tono por CSS y no necesita decir nada.
 */
export default function Disponibilidad({
  sedes,
  oscuro = false,
}: {
  sedes: Sede[];
  oscuro?: boolean;
}) {
  if (sedes.length === 0) return null;

  // Por ciudad, en el orden en que llegan las sedes (que es el que puso el
  // panel): así la ciudad principal queda arriba sin tener que ordenarla acá.
  const ciudades = new Map<string, Sede[]>();
  for (const sede of sedes) {
    const lista = ciudades.get(sede.ciudad);
    if (lista) lista.push(sede);
    else ciudades.set(sede.ciudad, [sede]);
  }

  const varias = ciudades.size > 1;

  return (
    <section className={`sedes${oscuro ? " sedes-oscuro" : ""}`}>
      <div className="sedes-cabeza">
        <h4 className="rotulo sedes-titulo">Dónde encontrarlo</h4>
        <span className="sedes-resumen">
          {sedes.length} {sedes.length === 1 ? "punto de venta" : "puntos de venta"}
        </span>
      </div>

      {[...ciudades.entries()].map(([ciudad, deLaCiudad]) => (
        <div key={ciudad} className="sedes-ciudad">
          {varias && <span className="rotulo sedes-ciudad-nombre">{ciudad}</span>}

          <ul className="sedes-lista">
            {deLaCiudad.map((sede) => (
              <li key={sede.id} className="sede">
                <div className="sede-info">
                  <span className="sede-nombre">{sede.nombre}</span>

                  <span className="sede-dato">
                    {sede.direccion}
                    {/* El barrio antes que la ciudad: es lo que de verdad ubica
                        a quien ya está en esa ciudad. */}
                    {sede.barrio ? ` · ${sede.barrio}` : ""}
                    {varias ? "" : `, ${sede.ciudad}`}
                  </span>

                  {sede.horario && <span className="sede-dato">{sede.horario}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
