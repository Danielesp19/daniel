"use client";

import { useFondoPineado } from "@/hooks/useFondoPineado";

/**
 * Foto de fondo que se queda quieta mientras se recorre toda una sección.
 *
 * Es el tratamiento de la vitrina de Cafés de origen, que ahora usa casi toda
 * la página: el contenido pasa por encima de una imagen que no se mueve, y
 * cada sección tiene la suya, así que bajar por el sitio se siente como pasar
 * de una sala a otra en vez de recorrer una lista.
 *
 * No usa `position: sticky` a propósito — ver el comentario largo en
 * useFondoPineado: un ancestro con overflow recortado lo rompe en iOS Safari.
 */
export default function FondoPineado({
  seccion,
  imagen,
  posicion = "center",
  /** Qué tan oscuro va el velo. Más alto = el texto se lee mejor y la foto se ve menos. */
  velo = 0.9,
}: {
  seccion: React.RefObject<HTMLElement | null>;
  imagen: string;
  posicion?: string;
  velo?: number;
}) {
  const pin = useFondoPineado(seccion);

  return (
    <div
      aria-hidden="true"
      style={{
        position: pin === "durante" ? "fixed" : "absolute",
        top: pin === "despues" ? "auto" : 0,
        bottom: pin === "despues" ? 0 : "auto",
        left: 0,
        right: 0,
        // Los +120px en "antes"/"despues" son un colchón: esos dos estados se
        // mueven con el scroll normal y dependen de que el estado de React ya
        // se haya actualizado. El listener va con un frame de retraso (rAF), y
        // sin el colchón asomaba una franja del fondo en el borde.
        height:
          pin === "corta" ? "100%" : pin === "durante" ? "100svh" : "calc(100svh + 120px)",
        zIndex: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          // Sin `filter` de CSS: un filtro sobre una capa a pantalla completa
          // obliga a la GPU a re-renderizarla en cada frame de scroll, y en
          // iPhone eso se siente como scroll pesado. El oscurecido va en el
          // degradado, que es gratis. Y va tintado de marrón, no de negro: un
          // velo neutro sobre una foto cálida la vuelve gris.
          background:
            `linear-gradient(180deg, rgba(18,12,8,${velo}) 0%, rgba(18,12,8,${velo - 0.06}) 45%, rgba(18,12,8,0.97) 100%),` +
            ` url(${imagen}) ${posicion}/cover no-repeat`,
        }}
      />
    </div>
  );
}
