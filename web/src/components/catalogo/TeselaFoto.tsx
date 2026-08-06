import Image from "next/image";
import type { Producto } from "@/lib/catalogo";

/**
 * El marco de foto de un producto: fondo hueso, la imagen encajada y, cuando
 * todavía no hay foto, una marca de grano dibujada a línea.
 *
 * El marcador importa más de lo que parece. Hoy NINGÚN producto tiene foto —se
 * suben por WhatsApp, una a una— y en un diseño donde la foto es el 80% de la
 * página, un hueco gris o una inicial gigante hace que el sitio se vea roto.
 * Una marca discreta y repetida se lee como decisión de diseño mientras las
 * fotos van llegando.
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
  return (
    <div className="tesela" style={{ aspectRatio: proporcion, width: "100%" }}>
      {producto.imagen_url ? (
        <Image
          src={producto.imagen_url}
          alt={producto.nombre}
          fill
          sizes={sizes}
          priority={prioridad}
          draggable={false}
          style={{
            objectFit: "cover",
            // Agotado apagado: se entiende sin leer el sello.
            filter: producto.agotado ? "saturate(0.15) opacity(0.55)" : undefined,
          }}
        />
      ) : (
        <MarcaGrano />
      )}
    </div>
  );
}

/**
 * Grano de café a línea, centrado y en un gris apenas más oscuro que el hueso.
 *
 * El tamaño se fija por ALTO y con `aspect-ratio`, no con un padding en
 * porcentaje: los porcentajes de padding se calculan siempre sobre el ancho,
 * así que en una tesela apaisada (4/3) el relleno vertical se comía el alto
 * entero y el grano quedaba del tamaño de una miga.
 */
export function MarcaGrano() {
  return (
    <span
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}
    >
      <svg viewBox="0 0 100 100" style={{ height: "38%", aspectRatio: "1 / 1", maxHeight: 180 }}>
        <g fill="none" stroke="#CFCAC1" strokeWidth="3" strokeLinecap="round">
          <ellipse cx="50" cy="50" rx="27" ry="40" transform="rotate(-32 50 50)" />
          <path d="M36 24 Q52 50 64 76" />
        </g>
      </svg>
    </span>
  );
}
