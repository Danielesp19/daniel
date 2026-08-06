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
          borderTop: "1px solid var(--linea)",
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "saturate(180%) blur(12px)",
          // Respeta la barra de gestos de iOS.
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="contenedor"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            paddingBlock: 12,
            background: "transparent",
            border: "none",
            color: "var(--color-tinta)",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span className="epigrafe">
            {carrito.unidades} {carrito.unidades === 1 ? "producto" : "productos"}
          </span>

          <span style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <span className="cifra" style={{ fontSize: 15, fontWeight: 600 }}>
              ${pesos(carrito.total)}
            </span>
            <span className="boton boton-solido" style={{ height: 38 }}>
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
            background: "rgba(23,22,20,0.45)",
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
              background: "var(--color-papel)",
              borderRadius: "var(--radio-lg) var(--radio-lg) 0 0",
              animation: "entrar .28s cubic-bezier(0.2,0.7,0.2,1) both",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 22px",
                borderBottom: "1px solid var(--linea)",
                position: "sticky",
                top: 0,
                background: "var(--color-papel)",
                zIndex: 1,
              }}
            >
              <h2 className="titular" style={{ fontSize: 22, margin: 0 }}>
                Tu pedido
              </h2>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                style={{
                  border: "1px solid var(--linea)",
                  borderRadius: 999,
                  background: "transparent",
                  color: "var(--color-tinta)",
                  width: 36,
                  height: 36,
                  cursor: "pointer",
                  fontSize: 16,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "4px 22px 24px" }}>
              {carrito.lineas.map((l) => (
                <div
                  key={`${l.id}-${l.molienda}`}
                  style={{ padding: "18px 0", borderBottom: "1px solid var(--linea-tenue)" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{l.nombre}</div>
                      {l.gramos > 0 && (
                        <div
                          className="cifra"
                          style={{ fontSize: 12, color: "var(--color-grafito)", marginTop: 4 }}
                        >
                          {l.gramos} g · ${pesos(l.precio_cop)} c/u
                        </div>
                      )}
                    </div>
                    <div className="cifra" style={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap" }}>
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
                          background: "var(--color-papel)",
                          color: "var(--color-tinta)",
                          border: "1px solid var(--linea)",
                          borderRadius: "var(--radio-sm)",
                          padding: "9px 12px",
                          fontFamily: "inherit",
                          fontSize: 13,
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

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        border: "1px solid var(--linea)",
                        borderRadius: "var(--radio-sm)",
                      }}
                    >
                      <BotonCantidad
                        etiqueta={`Quitar una unidad de ${l.nombre}`}
                        onClick={() => carrito.cambiarCantidad(l.id, l.molienda, l.cantidad - 1)}
                      >
                        −
                      </BotonCantidad>
                      <span className="cifra" style={{ minWidth: 34, textAlign: "center", fontSize: 13 }}>
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
                    padding: 16,
                    border: "1px solid var(--color-alerta)",
                    borderRadius: "var(--radio-md)",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  <strong style={{ display: "block", marginBottom: 6 }}>Ajustamos tu pedido</strong>
                  {ajustes.map((a) => (
                    <div key={a.nombre} style={{ color: "var(--color-grafito)" }}>
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
                  margin: "24px 0 18px",
                }}
              >
                <span className="epigrafe">Total</span>
                <span className="cifra" style={{ fontSize: 24, fontWeight: 700 }}>
                  ${pesos(carrito.total)}
                </span>
              </div>

              <button
                type="button"
                onClick={pedir}
                disabled={enviando}
                className="boton boton-solido"
                style={{ width: "100%", height: 50 }}
              >
                {enviando ? "Verificando…" : "Pedir por WhatsApp"}
              </button>

              <p
                style={{
                  margin: "12px 0 0",
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: "var(--color-grafito)",
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
                className="epigrafe"
                style={{
                  display: "block",
                  margin: "18px auto 0",
                  border: "none",
                  background: "transparent",
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
        width: 36,
        height: 36,
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
