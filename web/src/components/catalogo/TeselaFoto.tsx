"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { Producto } from "@/lib/catalogo";

/**
 * Fotos de relleno mientras Daniel sube las suyas.
 *
 * Son fotos de él, no de banco: la del V60, la del plano cenital de la
 * Staresso y la del espresso cayendo. OJO: no corresponden al producto que
 * acompañan —son ambiente, no retrato del lote—, así que sirven para ver la
 * página armada, no para publicarla.
 *
 * Van con `alt` vacío y `aria-hidden`: para un lector de pantalla no son la
 * foto de ese café, porque no lo son. Cuando llega la real, pasa a tener el
 * nombre del producto como texto alternativo.
 */
const RELLENO = [
  // El encuadre de esta recorta la parte de abajo a propósito: ahí hay una
  // bolsa de La Meca sobre el mesón y no puede quedar ilustrando un café de
  // Daniel. imagen1 quedó fuera del todo por lo mismo, que ahí no se puede
  // recortar sin perder la escena.
  { src: "/img1.jpg", posicion: "center 26%" },
  { src: "/img2.jpg", posicion: "center" },
  { src: "/img4.jpg", posicion: "center 55%" },
] as const;

/** Foto de relleno estable para un producto: el mismo id da siempre la misma. */
export function fotoDeRelleno(id: number): (typeof RELLENO)[number] {
  return RELLENO[id % RELLENO.length];
}

/**
 * El marco de foto de un producto: fondo pergamino y la imagen —o el video—
 * encajados dentro.
 *
 * Cuando el producto tiene video manda el video sobre la foto, que pasa a ser
 * el póster. Se reproduce en bucle y sin sonido, pero SOLO mientras la tesela
 * está en pantalla: cuatro videos corriendo a la vez en un carrusel que ya se
 * salió de cuadro es batería quemada sin que nadie los vea.
 */
export default function TeselaFoto({
  producto,
  proporcion = "1/1",
  sizes = "(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 25vw",
  prioridad = false,
}: {
  producto: Producto;
  proporcion?: string;
  sizes?: string;
  prioridad?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = video.current;
    if (!v) return;

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.25 },
    );
    observador.observe(v);
    return () => observador.disconnect();
  }, []);

  const relleno = producto.imagen_url ? null : fotoDeRelleno(producto.id);

  return (
    <div className="tesela" style={{ aspectRatio: proporcion, width: "100%" }}>
      {producto.video_url ? (
        <video
          ref={video}
          src={producto.video_url}
          poster={producto.video_poster_url ?? producto.imagen_url ?? undefined}
          muted
          loop
          playsInline
          preload="metadata"
          draggable={false}
          aria-label={producto.nombre}
          style={{ display: "block" }}
        />
      ) : (
        <Image
          src={producto.imagen_url ?? relleno!.src}
          alt={relleno ? "" : producto.nombre}
          aria-hidden={relleno ? true : undefined}
          fill
          sizes={sizes}
          priority={prioridad}
          draggable={false}
          style={{
            objectFit: "cover",
            objectPosition: relleno?.posicion,
            // Agotado apagado: se entiende sin leer el sello.
            filter: producto.agotado ? "saturate(0.15) opacity(0.5)" : undefined,
          }}
        />
      )}
    </div>
  );
}

/** Grano de café a línea. Se usa donde no hay producto del cual sacar foto. */
export function MarcaGrano() {
  return (
    <span
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}
    >
      <svg viewBox="0 0 100 100" style={{ height: "38%", aspectRatio: "1 / 1", maxHeight: 180 }}>
        <g fill="none" stroke="#CFC6B2" strokeWidth="3" strokeLinecap="round">
          <ellipse cx="50" cy="50" rx="27" ry="40" transform="rotate(-32 50 50)" />
          <path d="M36 24 Q52 50 64 76" />
        </g>
      </svg>
    </span>
  );
}

/** Señal de que la tesela lleva video, para pintarla sobre la foto. */
export function SelloVideo() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "grid",
        placeItems: "center",
        width: 26,
        height: 26,
        borderRadius: 999,
        background: "rgba(251,250,246,0.92)",
      }}
    >
      <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
        <path d="M2 1.2 L10.4 6 L2 10.8 Z" />
      </svg>
    </span>
  );
}
