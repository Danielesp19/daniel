"use client";

import type { Producto } from "@/lib/catalogo";
import { pesos } from "@/lib/formato";
import { enlaceWhatsApp, MARCA } from "@/lib/marca";
import TeselaFoto from "./TeselaFoto";

/**
 * Un servicio como banda a lo ancho, con su foto o su video DE FONDO y el
 * texto encima.
 *
 * Antes los servicios iban en una grilla de tarjetas apaisadas, que en
 * escritorio los dejaba del tamaño de un producto cualquiera. Un servicio no
 * se compara como se compara un café: no se elige entre cuatro mirando el
 * precio, se entra a uno porque la escena convence. Por eso cada uno se toma
 * el ancho completo y el video manda.
 *
 * Se alternan de lado —uno con el texto a la izquierda, el siguiente a la
 * derecha— para que cuatro bandas seguidas tengan ritmo en vez de parecer la
 * misma repetida. Lo resuelve el CSS con :nth-child, así que agregar o quitar
 * un servicio no obliga a tocar nada.
 *
 * El botón abre WhatsApp con el mensaje escrito: los servicios se agendan, no
 * se meten al carrito.
 */
export default function BandaServicio({
  producto,
  numero,
}: {
  producto: Producto;
  numero: number;
}) {
  // Un servicio que cuesta más de medio millón casi nunca es precio cerrado:
  // una barra para eventos depende de invitados, duración y ciudad.
  const desde = producto.precio_cop >= 500000;

  // Precio en cero = se cotiza, no que no se preste. El cliente publica los
  // suyos como referencia y quiere poder quitarlos sin que el servicio deje de
  // poder agendarse: quien pregunta por WhatsApp recibe el precio de viva voz.
  //
  // Por eso el precio y el botón son independientes. Antes iban juntos y poner
  // el precio en cero escondía también el "Agendar", que es justo lo contrario
  // de lo que se busca.
  const tienePrecio = producto.precio_cop > 0;

  const mensaje = `Hola ${MARCA.nombre}, quiero agendar: ${producto.nombre}.`;

  return (
    <article className="banda revelar">
      <div className="tesela banda-fondo">
        <TeselaFoto producto={producto} sizes="100vw" />
      </div>

      {/* Dos velos: uno de abajo hacia arriba que sostiene el texto, y otro
          desde el lado donde el texto se apoya. Sin el segundo, el titular
          sobre una zona clara del video se pierde. */}
      <div aria-hidden="true" className="banda-velo" />

      <div className="banda-texto">
        <span className="rotulo banda-numero">{String(numero).padStart(2, "0")}</span>

        <h3 className="nombre banda-nombre">{producto.nombre}</h3>

        {producto.descripcion && <p className="banda-bajada">{producto.descripcion}</p>}

        <div className="banda-pie">
          {tienePrecio && (
            <span className="cifra banda-precio">
              {desde && <span className="banda-desde">desde</span>}${pesos(producto.precio_cop)}
            </span>
          )}

          <a
            href={enlaceWhatsApp(mensaje)}
            target="_blank"
            rel="noopener noreferrer"
            className="boton boton-grande boton-solido-claro"
          >
            {tienePrecio ? "Agendar" : "Consultar precio"}
          </a>
        </div>
      </div>
    </article>
  );
}
