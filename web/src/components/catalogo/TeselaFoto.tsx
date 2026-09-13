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
 * La foto —o el video— de un producto, encajada en su tesela.
 *
 * Cuando el producto tiene video manda el video sobre la foto, que pasa a ser
 * el póster. Se reproduce en bucle y sin sonido, pero SOLO mientras está en
 * pantalla: cuatro videos corriendo a la vez en una grilla que ya se salió de
 * cuadro es batería quemada sin que nadie los vea.
 *
 * No dibuja el marco: eso lo pone quien la coloca, con la clase `.tesela` y la
 * proporción que le corresponda. Así la misma foto sirve cuadrada en una
 * tarjeta, apaisada en un servicio y a sangre en el destacado.
 */
export default function TeselaFoto({
  producto,
  sizes = "(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 220px",
  prioridad = false,
}: {
  producto: Producto;
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

  // La PORTADA es el primer medio de la lista, sea foto o video: es el orden
  // que se decidió en el panel. Si la API todavía no manda `medios` —queda
  // atrás un despliegue— se cae a la forma vieja, donde el video mandaba.
  const portada = producto.medios?.[0];
  const esVideo = portada ? portada.tipo === "video" : Boolean(producto.video_url);

  if (esVideo) {
    return (
      <video
        ref={video}
        src={portada?.url ?? producto.video_url!}
        poster={portada?.poster_url ?? producto.video_poster_url ?? producto.imagen_url ?? undefined}
        muted
        loop
        playsInline
        preload="metadata"
        draggable={false}
        aria-label={producto.nombre}
        style={{ position: "absolute", inset: 0 }}
      />
    );
  }

  // Un KIT con varias fotos se dibuja como mosaico: son varias cosas metidas
  // en una, y una sola foto obliga a leer la lista de abajo para saber qué
  // trae. Con las piezas a la vista se entiende de un vistazo.
  //
  // Solo los kits. Un café con cuatro fotos quiere su foto principal grande,
  // no cuatro miniaturas; ahí las adicionales son la galería, no el contenido.
  const fotos = (
    producto.medios?.length
      ? producto.medios.filter((m) => m.tipo === "imagen").map((m) => m.url)
      : [producto.imagen_url, ...producto.imagenes_extra]
  ).filter(Boolean) as string[];
  // Se pregunta por la marca y no por "tiene componentes": un kit armado solo
  // con piezas propias —que no son productos del catálogo— también es un kit.
  const esKit = producto.es_kit ?? producto.componentes.length > 0;

  if (esKit && fotos.length >= 2) {
    // Máximo cuatro: con más, cada pieza queda del tamaño de una estampilla y
    // el mosaico deja de decir nada.
    const muestra = fotos.slice(0, 4);

    return (
      <div className={`mosaico mosaico-${muestra.length}`} aria-label={producto.nombre}>
        {muestra.map((url, i) => (
          <span key={url} className="mosaico-celda">
            <Image
              src={url}
              alt=""
              aria-hidden="true"
              fill
              sizes={sizes}
              draggable={false}
              style={{
                objectFit: "cover",
                filter: producto.agotado ? "saturate(0.15) opacity(0.5)" : undefined,
              }}
              priority={prioridad && i === 0}
            />
          </span>
        ))}
      </div>
    );
  }

  const principal = fotos[0] ?? producto.imagen_url;
  const relleno = principal ? null : fotoDeRelleno(producto.id);

  return (
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
  );
}
