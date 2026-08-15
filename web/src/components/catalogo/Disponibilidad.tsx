import type { Sede } from "@/lib/catalogo";

/**
 * Dónde hay este producto y dónde no: una fila por sede, con cuántas unidades
 * quedan ahí y cómo llegar.
 *
 * Muestra TAMBIÉN las sedes en cero. Para quien está decidiendo si cruza la
 * ciudad, "en el Centro no hay" es tan útil como "en el Norte quedan tres";
 * esconder la sede vacía lo dejaría sin saber si no hay o si nunca se surtió
 * ahí. Por eso la fila agotada se apaga en vez de desaparecer.
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

  return (
    <section className={`sedes${oscuro ? " sedes-oscuro" : ""}`}>
      <h4 className="rotulo sedes-titulo">Disponibilidad por sede</h4>

      <ul className="sedes-lista">
        {sedes.map((sede) => (
          <li key={sede.id} className={`sede${sede.agotado ? " sede-agotada" : ""}`}>
            <div className="sede-info">
              <span className="sede-nombre">{sede.nombre}</span>

              <span className="sede-dato">
                {sede.direccion}
                {/* El barrio antes que la ciudad: es lo que de verdad ubica a
                    quien ya está en esa ciudad. */}
                {sede.barrio ? ` · ${sede.barrio}` : ""}
                {`, ${sede.ciudad}`}
              </span>

              {sede.horario && <span className="sede-dato">{sede.horario}</span>}

              {(sede.telefono ?? sede.whatsapp) && (
                <span className="sede-dato sede-contacto">
                  {sede.telefono && (
                    // El número sin formato para marcar, el formateado para leer.
                    <a href={`tel:${sede.telefono.replace(/\D+/g, "")}`} className="sede-enlace">
                      {sede.telefono}
                    </a>
                  )}
                  {sede.whatsapp && (
                    <a
                      href={`https://wa.me/${sede.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sede-enlace"
                    >
                      WhatsApp
                    </a>
                  )}
                </span>
              )}
            </div>

            <span className="cifra sede-stock" aria-label={`${sede.stock} disponibles en ${sede.nombre}`}>
              {sede.agotado ? "Agotado" : sede.stock}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
