"use client";

import Image from "next/image";
import { useRevelado } from "@/hooks/useRevelar";
import { enlaceWhatsApp, MARCA } from "@/lib/marca";

/**
 * Franja a sangre con una foto grande y una frase corta encima.
 *
 * Cumple la misma función que la banda de testimonio de cocinare: cortar la
 * sucesión de secciones blancas a mitad de página y dejar que una foto ocupe
 * todo el ancho sin nada que compita. Va después del catálogo, justo antes del
 * cierre, para que la última imagen antes de escribirle sea café saliendo.
 */
export default function FranjaFoto() {
  const { ref, props } = useRevelado<HTMLElement>();

  return (
    <section
      ref={ref}
      {...props}
      style={{
        position: "relative",
        minHeight: "clamp(340px, 46vw, 520px)",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        background: "var(--color-pergamino2)",
      }}
    >
      <Image
        src="/img4.jpg"
        alt="Espresso cayendo en un vaso de vidrio"
        fill
        sizes="100vw"
        style={{ objectFit: "cover", objectPosition: "center 60%" }}
      />

      {/* Velo: la foto es cálida y clara en el centro, justo donde va el
          texto. Sin esto el titular en blanco se pierde. */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, background: "rgba(23,21,15,0.5)" }}
      />

      <div
        className="contenedor revelar"
        style={{ position: "relative", maxWidth: 680, textAlign: "center", color: "#FFF" }}
      >
        <span className="epigrafe" style={{ color: "rgba(255,255,255,0.7)" }}>
          Tueste bajo pedido
        </span>
        <p
          className="titular"
          style={{ fontSize: "clamp(24px, 3.4vw, 40px)", margin: "14px 0 0" }}
        >
          No tuesto para tener bodega. Tuesto cuando me lo pides, y sale la misma semana.
        </p>
        <a
          href={enlaceWhatsApp(`Hola ${MARCA.nombre}, quiero saber qué lotes tienes esta semana.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="boton boton-claro"
          style={{ marginTop: 26, textDecoration: "none" }}
        >
          Preguntar por los lotes
        </a>
      </div>
    </section>
  );
}
