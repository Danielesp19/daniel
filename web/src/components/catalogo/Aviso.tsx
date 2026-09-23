import type { Aviso as AvisoDatos } from "@/lib/catalogo";

/**
 * El aviso: una feria, un lote que llegó, un cierre por vacaciones.
 *
 * Va DESPUÉS de la portada y dentro del contenedor, no pegado sobre la
 * cabecera. Arriba del todo competía con el titular por lo primero que se lee
 * y empujaba la página entera hacia abajo; acá aparece cuando el visitante ya
 * sabe dónde está.
 *
 * NO SE PUEDE CERRAR, a propósito. Llevaba una equis que lo ocultaba y dejaba
 * la marca en `localStorage` de ese navegador. El problema es para quién
 * trabaja el aviso: es el único sitio donde el negocio anuncia algo con fecha
 * —una feria el sábado, que no hay despachos esta semana— y quien lo cierra
 * de un manotazo el lunes ya no se entera del aviso del jueves. Se quita
 * desde el panel cuando deja de aplicar, que es quien sabe cuándo deja de
 * aplicar.
 *
 * Sin esa equis desaparecieron el estado, el efecto y la lectura de
 * `localStorage`, así que esto volvió a ser un componente de servidor: llega
 * pintado en el HTML en vez de aparecer un instante después del montaje,
 * empujando la página.
 */
export default function Aviso({ aviso }: { aviso: AvisoDatos | null }) {
  if (!aviso) return null;

  return (
    <aside className="aviso-caja">
      <div className="aviso" role="status">
        <span className="aviso-destello" aria-hidden="true" />

        <span className="aviso-etiqueta">
          <span className="aviso-punto" aria-hidden="true" />
          {aviso.etiqueta}
        </span>

        <div className="aviso-texto">
          <p className="aviso-titulo">{aviso.titulo}</p>
          {aviso.texto && <p className="aviso-bajada">{aviso.texto}</p>}
        </div>

        {aviso.cta_texto && aviso.cta_url && (
          <a
            href={aviso.cta_url}
            target="_blank"
            rel="noopener noreferrer"
            className="boton aviso-boton"
          >
            {aviso.cta_texto}
          </a>
        )}
      </div>
    </aside>
  );
}
