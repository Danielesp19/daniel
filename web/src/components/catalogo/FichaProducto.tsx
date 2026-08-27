"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Producto } from "@/lib/catalogo";
import { pesos, gramos, altitud } from "@/lib/formato";
import { useCarrito } from "@/components/carrito/CarritoProvider";
import TeselaFoto from "./TeselaFoto";
import Disponibilidad from "./Disponibilidad";

/**
 * La ficha completa del producto, en una hoja flotante sobre la página.
 *
 * Antes esto se desplegaba dentro de la tarjeta. Se pasó a hoja porque la ficha
 * creció: con la ficha de origen y la disponibilidad de tres sedes ya no cabe
 * en una tarjeta de 175 px sin volverla una columna larguísima que empuja al
 * resto de la grilla hacia abajo. En hoja, cada dato se lee al ancho que
 * necesita y la grilla de atrás no se mueve.
 *
 * Se cierra por fuera, por la X y con Escape — las tres, porque quien abre esto
 * está comparando lotes y tiene que poder salir sin buscar el botón.
 */
export default function FichaProducto({
  producto,
  onCerrar,
}: {
  producto: Producto | null;
  onCerrar: () => void;
}) {
  const carrito = useCarrito();
  const cerrarRef = useRef<HTMLButtonElement>(null);
  // Para devolver el foco a la tarjeta que abrió la ficha al cerrarla; si no,
  // el lector de pantalla y el tabulador vuelven al principio de la página.
  const foco = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!producto) return;

    foco.current = document.activeElement as HTMLElement | null;
    cerrarRef.current?.focus();

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alTeclear);

    // La página de atrás no se desplaza mientras la hoja está abierta.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflow;
      foco.current?.focus();
    };
  }, [producto, onCerrar]);

  // En el servidor no hay `document` al que colgar el portal. No hace falta
  // esperar al montaje: la hoja solo existe después de un clic, así que en el
  // render del servidor `producto` siempre llega en null y no hay desajuste
  // de hidratación que arreglar.
  if (!producto || typeof document === "undefined") return null;

  const peso = gramos(producto.gramos);

  // Solo las filas que este producto tenga. Un molino no tiene altura ni
  // proceso, y una rejilla con casillas vacías se ve rota.
  const ficha: Array<[string, string]> = [];
  if (producto.region) ficha.push(["Región", producto.region]);
  if (producto.altitud_msnm) ficha.push(["Altura", altitud(producto.altitud_msnm)]);
  if (producto.proceso) ficha.push(["Proceso", producto.proceso]);
  if (producto.tueste) ficha.push(["Tueste", producto.tueste]);
  if (producto.variedad) ficha.push(["Variedad", producto.variedad]);
  if (producto.puntaje_sca) ficha.push(["SCA", producto.puntaje_sca.toFixed(2)]);

  // Va colgada del <body> y no de la tarjeta que la abrió: `.tarjeta:hover`
  // aplica un `transform`, y un ancestro con transform vuelve `position: fixed`
  // relativo a él — la hoja quedaría encajada dentro de la tarjeta de 175 px.
  return createPortal(
    <div className="ficha-fondo" onClick={onCerrar}>
      <article
        className="ficha"
        role="dialog"
        aria-modal="true"
        aria-label={producto.nombre}
        // El clic dentro no debe cerrar: solo el que cae en el fondo.
        onClick={(e) => e.stopPropagation()}
      >
        {/* `tesela` pone el marco y el encaje de la foto, como en las tarjetas:
            TeselaFoto no los dibuja por su cuenta a propósito. */}
        <div className="tesela ficha-foto">
          <TeselaFoto producto={producto} sizes="(max-width: 560px) 100vw, 520px" />

          {producto.agotado && <span className="sello">Agotado</span>}
          {!producto.agotado && producto.por_acabarse && (
            <span className="sello">Últimas {producto.stock}</span>
          )}

          <button ref={cerrarRef} type="button" className="ficha-cerrar" aria-label="Cerrar" onClick={onCerrar}>
            ×
          </button>
        </div>

        <div className="ficha-cuerpo">
          {producto.finca && <span className="rotulo">{producto.finca}</span>}

          <h2 className="nombre ficha-nombre">{producto.nombre}</h2>

          {producto.notas.length > 0 && (
            <p className="notas" style={{ marginTop: 8 }}>
              {producto.notas.join(", ")}
            </p>
          )}

          {producto.descripcion && <p className="ficha-descripcion">{producto.descripcion}</p>}

          {/* Si es un kit, lo primero que hay que saber es qué trae: es la
              razón por la que alguien lo mira en vez de comprar las piezas
              sueltas. */}
          {producto.componentes.length > 0 && (
            <div className="ficha-kit">
              <span className="rotulo">Incluye</span>
              <ul>
                {producto.componentes.map((c) => (
                  <li key={c.id}>{c.nombre}</li>
                ))}
              </ul>
            </div>
          )}

          {ficha.length > 0 && (
            <dl className="ficha-datos">
              {ficha.map(([rotulo, valor]) => (
                <div key={rotulo}>
                  <dt className="rotulo" style={{ fontSize: 8.5, letterSpacing: "0.18em" }}>
                    {rotulo}
                  </dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
          )}

          <Disponibilidad sedes={producto.sedes} />
        </div>

        {/* Fijo al fondo de la hoja: el precio y el botón no se pierden al
            bajar por una ficha larga. */}
        <div className="ficha-pie">
          <div className="cifra" style={{ fontSize: 17 }}>
            ${pesos(producto.precio_cop)}
            {peso && (
              <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 400, color: "var(--color-rotulo)" }}>
                {peso}
              </span>
            )}
          </div>

          <button
            type="button"
            className="boton boton-grande boton-solido"
            style={{ flex: "1 1 150px" }}
            disabled={producto.agotado}
            onClick={() => {
              carrito.agregar(producto);
              onCerrar();
            }}
          >
            {producto.agotado ? "Agotado" : producto.controla_stock ? "Agregar" : "Agendar"}
          </button>
        </div>
      </article>
    </div>,
    document.body,
  );
}
