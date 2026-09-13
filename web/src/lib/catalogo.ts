/** Cómo se dibuja una categoría en el catálogo. Ver la migración categorias. */
export type ModoVitrina = "carrusel" | "dos" | "bandas" | "grid" | "vertical" | "horizontal";

/**
 * Un punto de venta. Cuando viaja dentro de un producto trae además cuántas
 * unidades de ESE producto hay en ELLA.
 *
 * Sin teléfono propio: todo el contacto pasa por la línea de Daniel. Las sedes
 * son información de dónde hay y cómo llegar, no tres números distintos a los
 * que escribirle.
 */
export interface Sede {
  id: number;
  nombre: string;
  slug: string;
  direccion: string;
  ciudad: string;
  barrio: string | null;
  horario: string | null;
  stock: number;
  agotado: boolean;
}

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
  /** Un café: es lo que decide si la tarjeta y la ficha muestran el origen. */
  es_cafe: boolean;
  /** Total de todas las sedes: es la suma de `sedes[].stock`. */
  stock: number;
  agotado: boolean;
  por_acabarse: boolean;
  /** Dónde hay y dónde no. Vacío en los servicios, que no se cuentan. */
  sedes: Sede[];

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

  /**
   * Lo que trae adentro, si es un kit. Vacío en todo lo demás.
   *
   * Un kit se vende como una cosa —un precio, una línea en el pedido— y esto
   * es lo que le dice al comprador qué se lleva.
   */
  componentes: { id: number; nombre: string; slug: string }[];
}

export interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  modo_vitrina: ModoVitrina;
  /** Los que cuelgan directo de la sección, sin subcategoría. */
  productos: Producto[];
  /** Los estantes de adentro. Vacío en una sección sin subcategorías. */
  subcategorias: Subcategoria[];
}

/**
 * Un estante dentro de una sección: «Básculas» dentro de «Artefactos».
 *
 * No tiene modo de vitrina propio — se dibuja con el de su sección. Dos modos
 * distintos dentro de la misma sección se leerían como dos secciones.
 */
export interface Subcategoria {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  productos: Producto[];
}

/** La banda de aviso de arriba del sitio. */
export interface Aviso {
  id: number;
  etiqueta: string;
  titulo: string;
  texto: string | null;
  cta_texto: string | null;
  cta_url: string | null;
}

export interface Receta {
  id: number;
  nombre: string;
  slug: string;
  /** Filtrado, Inmersión, Espresso, Con leche… Es el filtro de la sección. */
  metodo: string;
  resumen: string | null;
  detalle: string | null;
  /** Gramos de café y de agua. Alimentan la calculadora de ratios. */
  cafe_g: number | null;
  agua_g: number | null;
  /** agua ÷ café. 16.67 se lee "1:16,7". null si falta alguno de los dos. */
  ratio: number | null;
  /** Micras de la molienda recomendada. null = la receta no dice. */
  molienda_micras: number | null;
  /** El mismo punto ya nombrado: "Media gruesa". */
  molienda: string | null;
  /** Lo que necesita el temporizador. null = receta sin reloj. */
  duracion_seg: number | null;
  /** La misma duración ya escrita: "2:45", "14 h". */
  duracion: string | null;
  ingredientes: string[];
  /** Cada paso con su imagen y su reloj, los dos opcionales. */
  pasos: PasoReceta[];
  /** Los artefactos que usa y están a la venta. */
  artefactos: ArtefactoReceta[];
  /** El id del video en YouTube. null = receta sin video. */
  youtube_id: string | null;
  imagen_url: string | null;
  /** El café que mejor le queda, si hay uno recomendado. */
  producto: { id: number; nombre: string } | null;
}

export interface PasoReceta {
  id: number;
  texto: string;
  imagen_url: string | null;
  /** Segundos del temporizador de ESTE paso. null = paso sin reloj. */
  segundos: number | null;
  /** "Bloom", "Infusión". Sin etiqueta se muestra solo el tiempo. */
  etiqueta: string | null;
}

export interface ArtefactoReceta {
  id: number;
  nombre: string;
  precio_cop: number;
  agotado: boolean;
  imagen_url: string | null;
}

export interface Pregunta {
  id: number;
  pregunta: string;
  respuesta: string;
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
    // Blindaje contra una respuesta vieja del CDN: mientras vence el caché de
    // un minuto puede llegar catálogo sin este campo, y la ficha lo recorre
    // sin preguntar.
    sedes: p.sedes ?? [],
    componentes: p.componentes ?? [],
  };
}

export const getCatalogo = () =>
  pedir<Categoria[]>("/catalogo", { next: { revalidate: 60 } } as RequestInit).then((cats) =>
    cats.map((c) => ({
      ...c,
      productos: c.productos.map(normalizarProducto),
      // Blindaje contra una respuesta vieja del CDN: mientras vence el caché
      // puede llegar catálogo sin este campo, y la página lo recorre sin
      // preguntar.
      subcategorias: (c.subcategorias ?? []).map((sub) => ({
        ...sub,
        productos: sub.productos.map(normalizarProducto),
      })),
    })),
  );


export const getAviso = () =>
  pedir<Aviso | null>("/catalogo/aviso", { next: { revalidate: 60 } } as RequestInit);

export const getRecetas = () =>
  pedir<Receta[]>("/catalogo/recetas", { next: { revalidate: 60 } } as RequestInit).then((rs) =>
    rs.map((r) => ({
      ...r,
      imagen_url: urlArchivo(r.imagen_url),
      pasos: (r.pasos ?? []).map(normalizarPaso),
      artefactos: (r.artefactos ?? []).map((a) => ({ ...a, imagen_url: urlArchivo(a.imagen_url) })),
    })),
  );

/**
 * Un paso de receta, venga como venga.
 *
 * Antes los pasos eran una lista de textos y ahora son objetos con foto y
 * reloj. El backend puede ir por detrás del sitio —se despliegan por separado,
 * y entre un despliegue y el otro hay una ventana— y en esa ventana llegaban
 * cadenas donde el componente esperaba objetos: la receta se abría con los
 * pasos numerados y en blanco. Acá se acepta la forma vieja y se traduce.
 */
function normalizarPaso(paso: PasoReceta | string, i: number): PasoReceta {
  if (typeof paso === "string") {
    return { id: i, texto: paso, imagen_url: null, segundos: null, etiqueta: null };
  }
  return { ...paso, imagen_url: urlArchivo(paso.imagen_url) };
}

export const getPreguntas = () =>
  pedir<Pregunta[]>("/catalogo/preguntas", { next: { revalidate: 60 } } as RequestInit);

/**
 * Deja una pregunta en el buzón. Devuelve el mensaje de agradecimiento.
 *
 * Va sin caché y por POST: es lo único que el visitante escribe en la base.
 * El backend la guarda siempre y avisa por correo si hay uno configurado.
 */
export async function enviarConsulta(datos: { mensaje: string; contacto?: string }) {
  const res = await fetch(`${BASE}/consultas`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(datos),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    // 429 es el límite por IP. Decirlo tal cual evita que alguien crea que su
    // pregunta se perdió y la mande cinco veces más.
    if (res.status === 429) throw new Error("Muchas preguntas seguidas. Espera un momento.");
    const primero = json.errors
      ? (Object.values(json.errors as Record<string, string[]>)[0]?.[0] ?? null)
      : null;
    throw new Error(primero ?? json.message ?? "No se pudo enviar. Intenta de nuevo.");
  }

  return json as { ok: boolean; mensaje: string };
}

/**
 * Stock en vivo: id → unidades. Sin caché.
 *
 * El catálogo se sirve desde el CDN y su `stock` puede venir hasta un minuto
 * atrasado — sirve para pintar el sello de AGOTADO, pero antes de mandar un
 * pedido a WhatsApp el carrito revalida contra esto.
 */
export const getStock = () => pedir<Record<string, number>>("/catalogo/stock", { cache: "no-store" });
