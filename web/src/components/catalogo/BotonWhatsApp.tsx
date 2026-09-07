"use client";

import { enlaceWhatsApp, MARCA } from "@/lib/marca";
import { useCarrito } from "@/components/carrito/CarritoProvider";

/**
 * El botón flotante de WhatsApp, abajo a la derecha.
 *
 * Es el mismo de la carta de la meca: un disco con el logo de WhatsApp, un aro
 * que late alrededor y una entrada desde abajo con un rebote corto. Va solo el
 * icono, sin texto: el botón vive encima del contenido toda la visita y con
 * etiqueta se come una esquina de la lectura.
 *
 * SE ESCONDE CUANDO HAY PEDIDO ARMADO. Con productos en el carrito, la barra
 * del pedido ocupa el borde inferior —centrada y casi de ancho completo en el
 * celular— y los dos se pisarían. Además, escribir desde ahí manda el pedido
 * ya escrito, que es mejor que abrir un chat en blanco.
 *
 * Va en el verde de WhatsApp, por la misma razón por la que el de la meca va en
 * su oliva y no en su marrón: el botón flota sobre TODO —el destacado negro,
 * las bandas de servicios, el papel—, y probado en el negro del sitio
 * desaparecía sobre las secciones oscuras. Un color propio se lee sobre
 * cualquier fondo, y encima es con el que la gente reconoce WhatsApp sin leer
 * nada.
 */
export default function BotonWhatsApp() {
  const { lineas } = useCarrito();

  if (lineas.length > 0) return null;

  return (
    <a
      href={enlaceWhatsApp(`Hola ${MARCA.nombre}, quiero hacer un pedido.`)}
      target="_blank"
      rel="noopener noreferrer"
      className="wasap"
      aria-label="Escribir por WhatsApp"
    >
      <span className="wasap-aro" aria-hidden="true" />
      {/* El logo oficial, en trazo relleno: en línea se veía endeble a 26 px. */}
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.83 14.12c-.25.7-1.44 1.34-2 1.4-.51.05-1.16.24-3.9-.81-3.3-1.3-5.42-4.65-5.58-4.87-.16-.22-1.33-1.77-1.33-3.38 0-1.61.85-2.4 1.15-2.73.3-.33.65-.41.87-.41.22 0 .43 0 .62.01.2.01.47-.08.73.56.27.64.9 2.2.98 2.36.08.16.13.35.03.57-.1.22-.16.35-.31.54-.16.19-.33.42-.47.57-.16.16-.32.33-.14.64.19.32.83 1.36 1.78 2.21 1.22 1.09 2.25 1.42 2.57 1.58.32.16.5.13.69-.08.19-.22.79-.92 1-1.24.21-.32.42-.27.71-.16.29.11 1.84.87 2.15 1.03.32.16.53.24.61.37.08.14.08.79-.17 1.49z" />
      </svg>
    </a>
  );
}
