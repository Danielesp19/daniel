"use client";

import { useRef } from "react";
import Image from "next/image";
import type { Categoria, Producto } from "@/lib/catalogo";
import { pesos, altitud } from "@/lib/formato";
import { entrada, useFantasma, useRevelar } from "@/hooks/useRevelar";
import FondoPineado from "./FondoPineado";
import { useCarrito } from "@/components/carrito/CarritoProvider";
import { Notas, SelloEstado } from "./FichaTecnica";

/**
 * Vitrina de cierre: los cafés de origen, uno por fila, alternando el lado de
 * la foto, sobre una foto de fondo que se queda quieta durante toda la
 * sección. Es el formato para los lotes que valen una página propia.
 */
export default function VitrinaVertical({
  categoria,
  onAbrir,
}: {
  categoria: Categoria;
  onAbrir: (p: Producto) => void;
}) {
  const seccion = useRef<HTMLElement>(null);
  const { ref: refCabecera, visible: cabeceraVisible } = useRevelar<HTMLDivElement>();

  if (!categoria.productos.length) return null;

  return (
    <section
      ref={seccion}
      id={`cat-${categoria.slug}`}
      style={{ position: "relative", background: "var(--color-negro)" }}
    >
      <FondoPineado seccion={seccion} imagen="/image.webp" velo={0.9} />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1400,
          margin: "0 auto",
          padding: "clamp(64px,9vw,120px) clamp(20px,5vw,56px)",
          borderTop: "1px solid var(--linea)",
        }}
      >
        <div ref={refCabecera} style={{ maxWidth: 620 }}>
          <div className="etiqueta" style={{ color: "var(--color-acento)", ...entrada(cabeceraVisible) }}>
            {String(categoria.productos.length).padStart(2, "0")} lotes
          </div>
          <h2
            className="titular"
            style={{
              fontSize: "clamp(40px,8vw,104px)",
              margin: "14px 0 0",
              ...entrada(cabeceraVisible, 0.08),
            }}
          >
            {categoria.nombre}
          </h2>
          {categoria.descripcion && (
            <p
              style={{
                margin: "18px 0 0",
                fontSize: "clamp(14px,1.5vw,16px)",
                lineHeight: 1.7,
                color: "var(--apagado)",
                ...entrada(cabeceraVisible, 0.16),
              }}
            >
              {categoria.descripcion}
            </p>
          )}
        </div>

        <div style={{ marginTop: "clamp(44px,6vw,80px)" }}>
          {categoria.productos.map((producto, i) => (
            <Fila
              key={producto.id}
              producto={producto}
              indice={i}
              invertida={i % 2 === 1}
              onAbrir={onAbrir}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Fila({
  producto,
  indice,
  invertida,
  onAbrir,
}: {
  producto: Producto;
  indice: number;
  invertida: boolean;
  onAbrir: (p: Producto) => void;
}) {
  // Revelado "fantasma": mientras la fila va llegando se ve su esqueleto
  // respirando, y al entrar en cuadro el esqueleto se desvanece y el contenido
  // real sube a ocupar su sitio.
  const { ref, visible, props: fantasma } = useFantasma<HTMLDivElement>();
  const carrito = useCarrito();

  // La foto entra primero y el texto la sigue: ese desfase es lo que da la
  // sensación de que la fila se arma, en vez de aparecer de golpe.
  const foto = entrada(visible);
  const texto = entrada(visible, 0.12);

  const datos: Array<[string, string]> = [];
  if (producto.region) datos.push(["Región", producto.region]);
  if (producto.altitud_msnm) datos.push(["Altura", altitud(producto.altitud_msnm)]);
  if (producto.variedad) datos.push(["Variedad", producto.variedad]);
  if (producto.proceso) datos.push(["Proceso", producto.proceso]);
  if (producto.puntaje_sca) datos.push(["SCA", producto.puntaje_sca.toFixed(2)]);

  return (
    <div ref={ref} {...fantasma}>
      {/* Esqueleto: ocupa la misma celda de grid que el contenido, así que la
          fila ya mide lo que va a medir y no hay salto de altura al cambiar.
          Imita la silueta de la fila —bloque de foto a un lado, renglones al
          otro— porque un rectángulo plano no anticipa nada; con la forma, el
          ojo ya sabe qué va a aparecer. */}
      <div
        aria-hidden="true"
        style={{
          display: "flex",
          flexWrap: "wrap",
          flexDirection: invertida ? "row-reverse" : "row",
          alignItems: "center",
          gap: "clamp(20px,4vw,56px)",
          padding: "clamp(32px,5vw,60px) 0",
        }}
      >
        <div
          className="fantasma-hueso"
          style={{ flex: "1 1 240px", aspectRatio: "4/5", borderRadius: "var(--radio-lg)" }}
        />
        <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 14 }}>
          {[38, 70, 90, 52].map((ancho, i) => (
            <div
              key={i}
              className="fantasma-hueso"
              style={{
                width: `${ancho}%`,
                // El segundo renglón es el título: más alto que los demás.
                height: i === 1 ? 34 : 14,
                borderRadius: "var(--radio-pildora)",
              }}
            />
          ))}
        </div>
      </div>

      <div
        className="fantasma-real"
        style={{
          display: "flex",
          flexWrap: "wrap",
          flexDirection: invertida ? "row-reverse" : "row",
          alignItems: "center",
          gap: "clamp(20px,4vw,56px)",
          // Mucho aire entre filas a propósito: si caben dos en pantalla
          // aparecen juntas y se pierde la sensación de ir descubriéndolas al
          // bajar. Con este alto, en un celular solo cabe una en la banda de
          // revelado del observer.
          padding: "clamp(32px,5vw,60px) 0",
          borderBottom: "1px solid var(--linea-tenue)",
        }}
      >
      <div style={{ flex: "1 1 240px", minWidth: 0, ...foto }}>
        <button
          type="button"
          onClick={() => onAbrir(producto)}
          aria-label={`Ver la ficha de ${producto.nombre}`}
          style={{
            position: "relative",
            display: "block",
            width: "100%",
            aspectRatio: "4/5",
            padding: 0,
            border: "1px solid var(--linea)",
            borderRadius: "var(--radio-lg)",
            background: "var(--color-humo)",
            cursor: "pointer",
            overflow: "hidden",
          }}
        >
          {producto.imagen_url ? (
            <Image
              src={producto.imagen_url}
              alt={producto.nombre}
              fill
              sizes="(max-width: 760px) 100vw, 45vw"
              // lazy a propósito: esta sección vive al final de un catálogo
              // largo y sus fotos no deben competir con la carga inicial.
              loading="lazy"
              draggable={false}
              style={{
                objectFit: "cover",
                filter: producto.agotado ? "saturate(0.25) brightness(0.5)" : undefined,
              }}
            />
          ) : (
            <span
              aria-hidden="true"
              className="titular"
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "clamp(60px,12vw,140px)",
                color: "rgba(243,233,217,0.07)",
              }}
            >
              {producto.nombre.charAt(0)}
            </span>
          )}
          <span className="indice" style={{ position: "absolute", top: 12, left: 12 }}>
            {String(indice + 1).padStart(2, "0")}
          </span>
        </button>
      </div>

      <div style={{ flex: "1 1 300px", minWidth: 0, ...texto }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {producto.finca && (
            <span className="etiqueta" style={{ color: "var(--color-acento)" }}>
              {producto.finca}
            </span>
          )}
          <SelloEstado producto={producto} />
        </div>

        <h3
          className="titular"
          style={{ fontSize: "clamp(30px,5vw,56px)", margin: "10px 0 0" }}
        >
          {producto.nombre}
        </h3>

        {producto.productor && (
          <div className="etiqueta" style={{ color: "var(--apagado)", marginTop: 10 }}>
            Productor · {producto.productor}
          </div>
        )}

        {producto.descripcion && (
          <p
            style={{
              margin: "16px 0 0",
              maxWidth: 440,
              fontSize: 14,
              lineHeight: 1.7,
              color: "var(--apagado)",
            }}
          >
            {producto.descripcion}
          </p>
        )}

        {producto.notas.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Notas notas={producto.notas} />
          </div>
        )}

        {/* Los datos duros, en línea y separados por barras verticales. */}
        {datos.length > 0 && (
          <dl
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0 18px",
              margin: "20px 0 0",
              paddingTop: 16,
              borderTop: "1px solid var(--linea-tenue)",
            }}
          >
            {datos.map(([rotulo, valor]) => (
              <div key={rotulo} style={{ padding: "4px 0" }}>
                <dt className="etiqueta" style={{ color: "var(--apagado)", fontSize: 9 }}>
                  {rotulo}
                </dt>
                <dd className="cifra" style={{ margin: "4px 0 0", fontSize: 13 }}>
                  {valor}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <span className="cifra" style={{ fontSize: 22 }}>
              ${pesos(producto.precio_cop)}
            </span>
            {producto.gramos > 0 && (
              <span
                className="etiqueta"
                style={{ color: "var(--apagado)", marginLeft: 10, fontSize: 9 }}
              >
                {producto.gramos} g
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={producto.agotado}
            onClick={() => carrito.agregar(producto)}
            style={{
              padding: "12px 22px",
              border: `1px solid ${producto.agotado ? "var(--linea)" : "var(--color-acento)"}`,
              borderRadius: "var(--radio-pildora)",
              background: producto.agotado ? "transparent" : "var(--color-acento)",
              color: producto.agotado ? "var(--apagado)" : "var(--color-negro)",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: producto.agotado ? "not-allowed" : "pointer",
            }}
          >
            {producto.agotado ? "Agotado" : producto.controla_stock ? "Agregar" : "Agendar"}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
