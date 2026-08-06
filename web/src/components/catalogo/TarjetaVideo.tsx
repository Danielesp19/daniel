"use client";

import { useState } from "react";
import type { Producto } from "@/lib/catalogo";
import { pesos } from "@/lib/formato";
import { enlaceWhatsApp, MARCA } from "@/lib/marca";
import TeselaFoto from "./TeselaFoto";

/**
 * Tarjeta de servicio: una tesela apaisada con el video, el número del
 * servicio, nombre en serif, resumen, "ver más" y el botón de agendar.
 *
 * Los servicios no se compran, se agendan: el botón abre WhatsApp con el
 * mensaje escrito en vez de sumar al pedido. Por eso no comparte componente
 * con la tarjeta de producto aunque se parezcan.
 *
 * El precio va con "desde" cuando el servicio se cotiza —una barra para
 * eventos depende de invitados, duración y ciudad—, así nadie llega al chat
 * creyendo que era un precio cerrado.
 */
export default function TarjetaVideo({
  producto,
  numero,
}: {
  producto: Producto;
  numero: number;
}) {
  const [abierta, setAbierta] = useState(false);

  // Un servicio que cuesta más de medio millón casi nunca es precio cerrado.
  const desde = producto.precio_cop >= 500000;

  // Precio en cero = no se vende, se explica. Los métodos de preparación usan
  // esta misma tarjeta y no tienen precio ni se agendan: mostrarles "$0" y un
  // botón de agendar sería ofrecer algo que no existe.
  const seVende = producto.precio_cop > 0;

  const mensaje = `Hola ${MARCA.nombre}, quiero agendar: ${producto.nombre}.`;

  return (
    <article className="tarjeta">
      <div className="tesela" style={{ aspectRatio: "16/9" }}>
        <TeselaFoto producto={producto} sizes="(max-width: 700px) 100vw, 280px" />

        {/* El botón de play solo se dibuja si hay video de verdad. Ponerlo
            sobre una foto quieta es prometer algo que no va a pasar. */}
        {producto.video_url && (
          <>
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                display: "grid",
                placeItems: "center",
                width: 52,
                height: 52,
                paddingLeft: 3,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.92)",
                color: "#0A0A0A",
                fontSize: 15,
                boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
              }}
            >
              ▶
            </span>
            <span className="sello" style={{ background: "rgba(10,10,10,0.75)", color: "#FFF" }}>
              Video
            </span>
          </>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "18px 16px 16px" }}>
        <span className="rotulo" style={{ fontSize: 10, letterSpacing: "0.1em" }}>
          {String(numero).padStart(2, "0")}
        </span>

        <h3 className="nombre" style={{ fontSize: 22, marginTop: 10 }}>
          {producto.nombre}
        </h3>

        {producto.descripcion && (
          <>
            <p
              style={{
                margin: "9px 0 0",
                fontSize: 13.5,
                lineHeight: 1.6,
                color: "var(--color-suave)",
                ...(abierta
                  ? {}
                  : // Sin abrir se muestran dos renglones: alcanza para saber
                    // de qué se trata y deja todas las tarjetas parejas.
                    {
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as const,
                      overflow: "hidden",
                    }),
              }}
            >
              {producto.descripcion}
            </p>

            <button
              type="button"
              className="vermas"
              aria-expanded={abierta}
              onClick={() => setAbierta((v) => !v)}
              style={{ marginTop: 10 }}
            >
              {abierta ? "Ver menos" : "Ver más"}
            </button>
          </>
        )}

        {seVende && (
          <div style={{ marginTop: "auto", paddingTop: 16 }}>
            <span className="cifra" style={{ display: "block", fontSize: 14 }}>
              {desde && (
                <span style={{ fontWeight: 400, color: "var(--color-rotulo)", marginRight: 6 }}>
                  desde
                </span>
              )}
              ${pesos(producto.precio_cop)}
            </span>

            <a
              href={enlaceWhatsApp(mensaje)}
              target="_blank"
              rel="noopener noreferrer"
              className="boton boton-ancho boton-solido"
              style={{ marginTop: 10 }}
            >
              Agendar
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
