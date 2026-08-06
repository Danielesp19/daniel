"use client";

import { useState } from "react";
import { getStock } from "@/lib/catalogo";
import { enlaceWhatsApp, MARCA } from "@/lib/marca";
import { pesos } from "@/lib/formato";
import { useCarrito, type Ajuste } from "./CarritoProvider";

/**
 * Barra de pedido: una píldora flotante con el resumen y el botón de enviar.
 *
 * No abre panel ni modal. El pedido se arma tocando "Agregar" en las tarjetas
 * y se manda por WhatsApp; el detalle línea por línea va escrito en el mensaje,
 * que es donde de verdad se revisa y donde se confirma disponibilidad, envío y
 * pago. Un panel intermedio sería una pantalla de más para llegar al mismo
 * chat.
 *
 * El pedido no se guarda en el servidor: quien atiende confirma y descuenta el
 * stock desde el chatbot de administración.
 */
export default function BarraCarrito() {
  const carrito = useCarrito();
  const [enviando, setEnviando] = useState(false);
  const [ajustes, setAjustes] = useState<Ajuste[] | null>(null);

  if (carrito.unidades === 0) return null;

  function armarMensaje(): string {
    const lineas = carrito.lineas.map(
      (l) =>
        `• ${l.cantidad} × ${l.nombre}` +
        (l.gramos > 0 ? ` (${l.gramos} g)` : "") +
        ` — $${pesos(l.cantidad * l.precio_cop)}`,
    );

    // La última línea es una pregunta a propósito: la molienda ya no se elige
    // en la página, y preguntarla acá abre la conversación en vez de mandar un
    // pedido incompleto.
    return [
      `Hola ${MARCA.nombre}, quiero pedir:`,
      "",
      ...lineas,
      "",
      `Total: $${pesos(carrito.total)}`,
      "",
      "¿Me lo dejas en grano o molido? Te digo para qué método.",
    ].join("\n");
  }

  async function enviar() {
    setEnviando(true);
    setAjustes(null);
    try {
      // Última revisión contra el servidor: el catálogo viene del CDN y su
      // stock puede estar hasta un minuto atrasado.
      const stock = await getStock();
      const recortes = carrito.ajustarAStock(stock);

      if (recortes.length > 0) {
        // No se abre WhatsApp: primero que el cliente vea qué cambió.
        setAjustes(recortes);
        return;
      }

      window.open(enlaceWhatsApp(armarMensaje()), "_blank", "noopener,noreferrer");
    } catch {
      // Si la consulta de stock falla, se manda igual: perder el pedido por un
      // problema de red nuestro es peor que un ajuste por WhatsApp.
      window.open(enlaceWhatsApp(armarMensaje()), "_blank", "noopener,noreferrer");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {/* Aviso cuando el stock real no alcanzó para lo pedido. Va encima de la
          barra, no dentro: la barra tiene que seguir siendo de un renglón. */}
      {ajustes && ajustes.length > 0 && (
        <div
          role="status"
          style={{
            position: "fixed",
            left: "50%",
            bottom: "calc(76px + env(safe-area-inset-bottom))",
            transform: "translateX(-50%)",
            zIndex: 70,
            width: "min(94vw, 470px)",
            padding: "14px 18px",
            background: "var(--color-papel)",
            border: "1px solid var(--color-tinta)",
            fontSize: 13,
            lineHeight: 1.6,
            animation: "subirBarra .35s cubic-bezier(.2,.7,.2,1) both",
          }}
        >
          <strong style={{ display: "block", marginBottom: 6 }}>Ajustamos tu pedido</strong>
          {ajustes.map((a) => (
            <div key={a.nombre} style={{ color: "var(--color-suave)" }}>
              {a.nombre}: pediste {a.pedidas} y{" "}
              {a.disponibles === 0 ? "ya no queda" : `solo quedan ${a.disponibles}`}.
            </div>
          ))}
          <div style={{ marginTop: 8 }}>Revisa y vuelve a enviar.</div>
        </div>
      )}

      <div
        style={{
          position: "fixed",
          left: "50%",
          bottom: "calc(14px + env(safe-area-inset-bottom))",
          transform: "translateX(-50%)",
          zIndex: 70,
          display: "flex",
          alignItems: "center",
          gap: 12,
          width: "min(94vw, 470px)",
          padding: "10px 10px 10px 20px",
          background: "var(--color-tinta)",
          color: "#FFF",
          borderRadius: 999,
          boxShadow: "0 18px 48px rgba(10,10,10,0.32)",
          animation: "subirBarra .35s cubic-bezier(.2,.7,.2,1) both",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="rotulo"
            style={{ fontSize: 10, letterSpacing: "0.14em", color: "rgba(255,255,255,0.55)" }}
          >
            {carrito.unidades} {carrito.unidades === 1 ? "producto" : "productos"}
          </div>
          <div className="cifra" style={{ fontSize: 15 }}>
            ${pesos(carrito.total)}
          </div>
        </div>

        <button
          type="button"
          onClick={enviar}
          disabled={enviando}
          className="boton boton-solido-claro"
          style={{ flex: "0 0 auto", fontWeight: 700 }}
        >
          {enviando ? "Verificando…" : "Enviar pedido"}
        </button>

        <button
          type="button"
          onClick={carrito.vaciar}
          aria-label="Vaciar pedido"
          style={{
            flex: "0 0 auto",
            display: "grid",
            placeItems: "center",
            width: 34,
            height: 34,
            border: "none",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.14)",
            color: "#FFF",
            fontSize: 15,
            cursor: "pointer",
            transition: "background-color .18s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.28)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
        >
          ✕
        </button>
      </div>
    </>
  );
}
