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
 *
 * En cuanto un producto recibe su foto por WhatsApp, esa manda y el relleno
 * desaparece solo para ese producto. No hay que tocar nada acá.
 *
 * img3 queda fuera a propósito: tiene una bolsa de La Meca en el centro del
 * encuadre y no puede ilustrar un café de Daniel.
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
 * El marco de foto de un producto: fondo pergamino y la imagen encajada.
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
  const relleno = producto.imagen_url ? null : fotoDeRelleno(producto.id);

  return (
    <div className="tesela" style={{ aspectRatio: proporcion, width: "100%" }}>
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
