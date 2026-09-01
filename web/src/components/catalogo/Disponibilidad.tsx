import type { Sede } from "@/lib/catalogo";

/**
 * Dónde hay este producto y dónde no, agrupado por ciudad.
 *
 * Lo que se viene a mirar acá es UN número: cuántas quedan y en cuál sede. Por
 * eso el número manda —grande, en su ficha, alineado a la derecha— y la
 * dirección queda debajo del nombre, en gris, para cuando ya se decidió a
 * cuál ir.
 *
 * Se agrupa por ciudad porque es el primer corte que hace cualquiera: alguien
 * en Pitalito no compara contra la sede de Bogotá, la descarta entera. Con una
 * sola ciudad el encabezado no aparece — sería un título para una sola cosa.
 *
 * Muestra TAMBIÉN las sedes en cero. Para quien está decidiendo si cruza la
 * ciudad, "en el Centro no hay" es tan útil como "en el Norte quedan tres";
 * esconder la sede vacía lo dejaría sin saber si no hay o si nunca se surtió
 * ahí. Por eso la fila agotada se apaga en vez de desaparecer.
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

  const total = sedes.reduce((suma, s) => suma + s.stock, 0);
  const conStock = sedes.filter((s) => !s.agotado).length;
  const varias = ciudades.size > 1;

  return (
    <section className={`sedes${oscuro ? " sedes-oscuro" : ""}`}>
      <div className="sedes-cabeza">
        <h4 className="rotulo sedes-titulo">Dónde hay</h4>
        {/* El resumen evita tener que sumar de a una para saber si vale la pena
            seguir leyendo la lista. */}
        <span className="sedes-resumen">
          {total === 0
            ? "Agotado en todas"
            : `${total} ${total === 1 ? "unidad" : "unidades"} en ${conStock} ${conStock === 1 ? "sede" : "sedes"}`}
        </span>
      </div>

      {[...ciudades.entries()].map(([ciudad, deLaCiudad]) => (
        <div key={ciudad} className="sedes-ciudad">
          {varias && <span className="rotulo sedes-ciudad-nombre">{ciudad}</span>}

          <ul className="sedes-lista">
            {deLaCiudad.map((sede) => (
              <li key={sede.id} className={`sede${sede.agotado ? " sede-agotada" : ""}`}>
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

                <span
                  className="sede-stock"
                  aria-label={
                    sede.agotado
                      ? `Agotado en ${sede.nombre}`
                      : `${sede.stock} disponibles en ${sede.nombre}`
                  }
                >
                  {sede.agotado ? (
                    <span className="sede-stock-agotado">Agotado</span>
                  ) : (
                    <>
                      <span className="cifra sede-stock-cifra">{sede.stock}</span>
                      <span className="sede-stock-unidad">{sede.stock === 1 ? "queda" : "quedan"}</span>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
