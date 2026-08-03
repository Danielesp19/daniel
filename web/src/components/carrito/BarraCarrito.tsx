"use client";

import { useEffect, useState } from "react";
import { getStock } from "@/lib/catalogo";
import { enlaceWhatsApp, MARCA } from "@/lib/marca";
import { pesos } from "@/lib/formato";
import { MOLIENDAS, type Molienda, useCarrito, type Ajuste } from "./CarritoProvider";

/**
 * Barra fija con el resumen del pedido, y el panel que se abre al tocarla.
 *
 * El pedido no se guarda en el servidor: se arma un mensaje de WhatsApp con
 * las líneas y se abre el chat. Quien atiende confirma y descuenta el stock
 * desde el chatbot de administración.
 */
export default function BarraCarrito() {
  const carrito = useCarrito();
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [ajustes, setAjustes] = useState<Ajuste[] | null>(null);

  // Con el panel abierto, el fondo no debe scrollear detrás.
  useEffect(() => {
    if (!abierto) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, [abierto]);

  // Escape cierra el panel.
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  if (carrito.unidades === 0) return null;

  async function pedir() {
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
      // Si la consulta de stock falla, se manda igual: perder el pedido por
      // un problema de red nuestro es peor que un ajuste por WhatsApp.
      window.open(enlaceWhatsApp(armarMensaje()), "_blank", "noopener,noreferrer");
    } finally {
      setEnviando(false);
    }
  }

  function armarMensaje(): string {
    const lineas = carrito.lineas.map(
      (l) =>
        `• ${l.cantidad} × ${l.nombre}` +
        (l.gramos > 0 ? ` (${l.gramos} g)` : "") +
        ` — ${l.molienda} — $${pesos(l.cantidad * l.precio_cop)}`,
    );

    return [
      `Hola ${MARCA.nombre}, quiero pedir:`,
      "",
      ...lineas,
      "",
      `Total: $${pesos(carrito.total)}`,
    ].join("\n");
  }

  return (
    <>
      {/* ── Barra fija ── */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 60,
          borderTop: "1px solid var(--color-acido)",
          background: "rgba(10,10,10,0.94)",
          backdropFilter: "blur(10px)",
          // Respeta la barra de gestos de iOS.
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <button
          type="button"
          onClick={() => setAbierto(true)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            width: "100%",
            maxWidth: 1400,
            margin: "0 auto",
            padding: "14px clamp(20px,5vw,56px)",
            background: "transparent",
            border: "none",
            color: "var(--color-tinta)",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span style={{ display: "flex", alignItems: "baseline", gap: 12, minWidth: 0 }}>
            <span className="cifra" style={{ fontSize: 12, color: "var(--color-acido)" }}>
              {String(carrito.unidades).padStart(2, "0")}
            </span>
            <span className="etiqueta" style={{ color: "var(--apagado)" }}>
              {carrito.unidades === 1 ? "producto" : "productos"}
            </span>
          </span>

          <span style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <span className="cifra" style={{ fontSize: 16 }}>
              ${pesos(carrito.total)}
            </span>
            <span
              className="etiqueta"
              style={{
                padding: "9px 16px",
                background: "var(--color-acido)",
                color: "#0A0A0A",
                whiteSpace: "nowrap",
              }}
            >
              Ver pedido
            </span>
          </span>
        </button>
      </div>

      {/* ── Panel ── */}
      {abierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tu pedido"
          onClick={() => setAbierto(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            background: "rgba(10,10,10,0.8)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            animation: "aparecer .2s ease both",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 620,
              maxHeight: "90dvh",
              overflowY: "auto",
              background: "var(--color-carbon)",
              border: "1px solid var(--linea)",
              borderBottom: "none",
              animation: "entrar .28s cubic-bezier(0.2,0.7,0.2,1) both",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 20px",
                borderBottom: "1px solid var(--linea)",
                position: "sticky",
                top: 0,
                background: "var(--color-carbon)",
                zIndex: 1,
              }}
            >
              <h2 className="titular" style={{ fontSize: 24, margin: 0 }}>
                Tu pedido
              </h2>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                style={{
                  border: "1px solid var(--linea)",
                  background: "transparent",
                  color: "var(--color-tinta)",
                  width: 34,
                  height: 34,
                  cursor: "pointer",
                  fontSize: 16,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "4px 20px 20px" }}>
              {carrito.lineas.map((l) => (
                <div
                  key={`${l.id}-${l.molienda}`}
                  style={{ padding: "18px 0", borderBottom: "1px solid var(--linea-tenue)" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
                    <div style={{ minWidth: 0 }}>
                      <div
                        className="titular"
                        style={{ fontSize: 19, lineHeight: 1.05 }}
                      >
                        {l.nombre}
                      </div>
                      {l.gramos > 0 && (
                        <div
                          className="cifra"
                          style={{ fontSize: 11, color: "var(--apagado)", marginTop: 5 }}
                        >
                          {l.gramos} g · ${pesos(l.precio_cop)} c/u
                        </div>
                      )}
                    </div>
                    <div className="cifra" style={{ fontSize: 15, whiteSpace: "nowrap" }}>
                      ${pesos(l.cantidad * l.precio_cop)}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      marginTop: 14,
                      flexWrap: "wrap",
                    }}
                  >
                    {/* La molienda solo tiene sentido en café en grano. */}
                    {l.gramos > 0 ? (
                      <select
                        aria-label={`Molienda de ${l.nombre}`}
                        value={l.molienda}
                        onChange={(e) =>
                          carrito.cambiarMolienda(l.id, l.molienda, e.target.value as Molienda)
                        }
                        style={{
                          background: "var(--color-humo)",
                          color: "var(--color-tinta)",
                          border: "1px solid var(--linea)",
                          padding: "8px 10px",
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                        }}
                      >
                        {MOLIENDAS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span />
                    )}

                    <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--linea)" }}>
                      <BotonCantidad
                        etiqueta={`Quitar una unidad de ${l.nombre}`}
                        onClick={() => carrito.cambiarCantidad(l.id, l.molienda, l.cantidad - 1)}
                      >
                        −
                      </BotonCantidad>
                      <span
                        className="cifra"
                        style={{ minWidth: 34, textAlign: "center", fontSize: 13 }}
                      >
                        {l.cantidad}
                      </span>
                      <BotonCantidad
                        etiqueta={`Agregar una unidad de ${l.nombre}`}
                        onClick={() => carrito.cambiarCantidad(l.id, l.molienda, l.cantidad + 1)}
                      >
                        +
                      </BotonCantidad>
                    </div>
                  </div>
                </div>
              ))}

              {/* Aviso cuando el stock real no alcanzó para lo pedido. */}
              {ajustes && ajustes.length > 0 && (
                <div
                  role="status"
                  style={{
                    marginTop: 18,
                    padding: 14,
                    border: "1px solid var(--color-alerta)",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  <strong style={{ display: "block", marginBottom: 6 }}>
                    Ajustamos tu pedido
                  </strong>
                  {ajustes.map((a) => (
                    <div key={a.nombre} style={{ color: "var(--apagado)" }}>
                      {a.nombre}: pediste {a.pedidas} y{" "}
                      {a.disponibles === 0 ? "ya no queda" : `solo quedan ${a.disponibles}`}.
                    </div>
                  ))}
                  <div style={{ marginTop: 8 }}>Revisa y vuelve a enviar.</div>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  margin: "22px 0 16px",
                }}
              >
                <span className="etiqueta" style={{ color: "var(--apagado)" }}>
                  Total
                </span>
                <span className="cifra" style={{ fontSize: 24 }}>
                  ${pesos(carrito.total)}
                </span>
              </div>

              <button
                type="button"
                onClick={pedir}
                disabled={enviando}
                style={{
                  width: "100%",
                  padding: "16px",
                  border: "none",
                  background: "var(--color-acido)",
                  color: "#0A0A0A",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  cursor: enviando ? "wait" : "pointer",
                  opacity: enviando ? 0.7 : 1,
                }}
              >
                {enviando ? "Verificando…" : "Pedir por WhatsApp"}
              </button>

              <p
                style={{
                  margin: "12px 0 0",
                  fontSize: 11,
                  lineHeight: 1.6,
                  color: "var(--apagado)",
                  textAlign: "center",
                }}
              >
                Se abre un chat con el pedido escrito. Confirmamos disponibilidad, envío y
                pago por ahí mismo.
              </p>

              <button
                type="button"
                onClick={() => {
                  carrito.vaciar();
                  setAbierto(false);
                }}
                style={{
                  display: "block",
                  margin: "16px auto 0",
                  border: "none",
                  background: "transparent",
                  color: "var(--apagado)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Vaciar pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BotonCantidad({
  children,
  etiqueta,
  onClick,
}: {
  children: React.ReactNode;
  etiqueta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      onClick={onClick}
      style={{
        width: 34,
        height: 34,
        border: "none",
        background: "transparent",
        color: "var(--color-tinta)",
        cursor: "pointer",
        fontSize: 15,
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  );
}
