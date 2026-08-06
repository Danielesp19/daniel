/** Cómo se dibuja una categoría en el catálogo. Ver la migración categorias. */
export type ModoVitrina = "grid" | "carrusel" | "vertical" | "horizontal";

export interface Producto {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  /** Pesos colombianos, entero. Nunca decimales para plata. */
  precio_cop: number;
  gramos: number;

  /** false = servicio (asesoría, barra para eventos): no se cuenta ni se agota. */
  controla_stock: boolean;
  stock: number;
  agotado: boolean;
  por_acabarse: boolean;

  // Ficha técnica de origen — el bloque de datos duros del diseño.
  tiene_ficha: boolean;
  finca: string | null;
  productor: string | null;
  region: string | null;
  altitud_msnm: number | null;
  variedad: string | null;
  proceso: string | null;
  tueste: string | null;
  notas: string[];
  puntaje_sca: number | null;

  imagen_url: string | null;
  video_url: string | null;
  video_poster_url: string | null;
  imagenes_extra: string[];

  destacado: boolean;
  categoria?: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  modo_vitrina: ModoVitrina;
  productos: Producto[];
}

export interface Hero {
  id: number;
  titulo: string;
  subtitulo: string | null;
  etiqueta: string | null;
  imagen_url: string | null;
  cta_texto: string | null;
  cta_url: string | null;
}

// En el servidor se pega directo a Laravel (sin pasar por el rewrite).
// En el navegador se usa el proxy de Next para no lidiar con CORS.
const BASE =
  typeof window === "undefined"
    ? process.env.API_INTERNA ?? "http://localhost:8001/api"
    : process.env.NEXT_PUBLIC_API ?? "/api-tienda";

async function pedir<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  const controlador = new AbortController();
  const corte = setTimeout(() => controlador.abort(), 8000);
  try {
    const res = await fetch(`${BASE}${ruta}`, { ...opciones, signal: controlador.signal });
    if (!res.ok) throw new Error(`API ${res.status}: ${ruta}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(corte);
  }
}

/**
 * Las URLs de archivos que devuelve Laravel apuntan a su propio dominio.
 * Se reescriben al proxy de Next para que el navegador nunca le pegue directo
 * al backend (PHP atiende de a una petición por proceso; servir imágenes desde
 * ahí lo tumba con poco tráfico).
 */
export function urlArchivo(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(/^https?:\/\/[^/]+\/storage\//, "/tienda-storage/");
}

function normalizarProducto(p: Producto): Producto {
  return {
    ...p,
    imagen_url: urlArchivo(p.imagen_url),
    video_url: urlArchivo(p.video_url),
    video_poster_url: urlArchivo(p.video_poster_url),
    imagenes_extra: (p.imagenes_extra ?? []).map((u) => urlArchivo(u)!),
  };
}

export const getCatalogo = () =>
  pedir<Categoria[]>("/catalogo", { next: { revalidate: 60 } } as RequestInit).then((cats) =>
    cats.map((c) => ({ ...c, productos: c.productos.map(normalizarProducto) })),
  );

export const getHero = () =>
  pedir<Hero[]>("/catalogo/hero", { next: { revalidate: 60 } } as RequestInit).then(
    (h) => h[0] ?? null,
  );

/**
 * Stock en vivo: id → unidades. Sin caché.
 *
 * El catálogo se sirve desde el CDN y su `stock` puede venir hasta un minuto
 * atrasado — sirve para pintar el sello de AGOTADO, pero antes de mandar un
 * pedido a WhatsApp el carrito revalida contra esto.
 */
export const getStock = () => pedir<Record<string, number>>("/catalogo/stock", { cache: "no-store" });
