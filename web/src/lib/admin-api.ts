/**
 * Cliente de la API de administración.
 *
 * Todo pasa por el proxy del Next (`/api-tienda` → Laravel), así que el
 * navegador nunca le pega directo al backend y no hay CORS que resolver. El
 * token sale de `sessionStorage`: lo puso el login al cambiar la contraseña por
 * él en /api/admin-auth. En sessionStorage y no en localStorage a propósito —
 * cerrar la pestaña cierra la sesión.
 */

const BASE = "/api-tienda/admin";

/** Cómo se dibuja una sección en el catálogo. */
export type ModoVitrina = "grid" | "carrusel" | "vertical" | "bandas" | "horizontal";

export interface AdminCategoria {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  modo_vitrina: ModoVitrina;
  orden: number;
  activa: boolean;
  productos_count: number;
}

export interface StockDeSede {
  sede: string;
  stock: number;
}

export interface AdminProducto {
  id: number;
  nombre: string;
  categoria: string | null;
  categoria_id: number;
  descripcion: string | null;
  precio_cop: number;
  gramos: number;
  controla_stock: boolean;
  /** Total de todas las sedes. De solo lectura: es su suma. */
  stock: number;
  stock_minimo: number;
  agotado: boolean;
  por_acabarse: boolean;
  stock_por_sede: StockDeSede[];
  finca: string | null;
  productor: string | null;
  region: string | null;
  altitud_msnm: number | null;
  variedad: string | null;
  proceso: string | null;
  tueste: string | null;
  notas: string[];
  puntaje_sca: number | null;
  activo: boolean;
  destacado: boolean;
  orden: number;
  imagen_url: string | null;
  video_url: string | null;
  imagenes_extra: { id: number; url: string }[];
}

export interface AdminSede {
  id: number;
  nombre: string;
  slug: string;
  direccion: string;
  ciudad: string;
  barrio: string | null;
  telefono: string | null;
  whatsapp: string | null;
  horario: string | null;
  principal: boolean;
  activa: boolean;
  orden: number;
  bolsas_en_stock: number;
}

/**
 * La portada, solo textos: el fondo es un video fijo del frontend
 * (public/videos/hero.mp4) y no se administra desde el panel.
 */
export interface AdminHero {
  id: number;
  titulo: string;
  subtitulo: string | null;
  etiqueta: string | null;
  cta_texto: string | null;
  cta_url: string | null;
  activo: boolean;
}

/** La banda de aviso: solo textos y un botón. */
export interface AdminAviso {
  id: number;
  etiqueta: string;
  titulo: string;
  texto: string | null;
  cta_texto: string | null;
  cta_url: string | null;
  activo: boolean;
}

export interface AdminReceta {
  id: number;
  nombre: string;
  slug: string;
  metodo: string;
  resumen: string | null;
  detalle: string | null;
  /** Alimentan la calculadora de ratios de la página. */
  cafe_g: number | null;
  agua_g: number | null;
  ratio: number | null;
  duracion_seg: number | null;
  duracion: string | null;
  ingredientes: string[];
  pasos: string[];
  producto_id: number | null;
  producto: string | null;
  activa: boolean;
  orden: number;
  imagen_url: string | null;
  video_url: string | null;
}

export interface AdminPregunta {
  id: number;
  pregunta: string;
  respuesta: string;
  activa: boolean;
  orden: number;
}

/** Una pregunta que dejó alguien desde la página. */
export interface AdminConsulta {
  id: number;
  mensaje: string;
  contacto: string | null;
  atendida: boolean;
  recibida: string | null;
}

export function token(): string {
  return typeof window !== "undefined" ? (sessionStorage.getItem("admin_token") ?? "") : "";
}

function cabeceras(): HeadersInit {
  return { Authorization: `Bearer ${token()}`, Accept: "application/json" };
}

function cabecerasJson(): HeadersInit {
  return { ...cabeceras(), "Content-Type": "application/json" };
}

/**
 * Las URLs de archivos que devuelve Laravel apuntan a su propio dominio. Se
 * reescriben al proxy del Next por lo mismo que en el catálogo público: PHP
 * atiende de a una petición por proceso y servir imágenes desde ahí lo tumba.
 */
function urlArchivo(url: string | null): string | null {
  if (!url) return null;
  return url.replace(/^https?:\/\/[^/]+\/storage\//, "/tienda-storage/");
}

function normalizar(p: AdminProducto): AdminProducto {
  return {
    ...p,
    imagen_url: urlArchivo(p.imagen_url),
    video_url: urlArchivo(p.video_url),
    imagenes_extra: (p.imagenes_extra ?? []).map((i) => ({ ...i, url: urlArchivo(i.url)! })),
  };
}

/** Se lanza cuando la sesión venció o el token dejó de servir. */
export class SesionVencida extends Error {}

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${ruta}`, init);

  if (res.status === 401) {
    throw new SesionVencida("La sesión venció. Vuelve a entrar.");
  }
  if (res.status === 204) {
    return null as T;
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Los errores de validación de Laravel vienen en `errors`, uno por campo.
    // Se muestra el primero: en un formulario corto, decir el primer problema
    // es más útil que volcar la lista entera.
    const primero = json.errors
      ? (Object.values(json.errors as Record<string, string[]>)[0]?.[0] ?? null)
      : null;
    throw new Error(primero ?? json.error ?? json.message ?? `Error ${res.status}`);
  }

  return json as T;
}

// ── Categorías ──────────────────────────────────────────────────────────────

export const listarCategorias = () =>
  pedir<AdminCategoria[]>("/categorias", { headers: cabeceras() });

export const crearCategoria = (datos: Partial<AdminCategoria>) =>
  pedir<AdminCategoria>("/categorias", {
    method: "POST",
    headers: cabecerasJson(),
    body: JSON.stringify(datos),
  });

export const editarCategoria = (id: number, datos: Partial<AdminCategoria>) =>
  pedir<AdminCategoria>(`/categorias/${id}`, {
    method: "PUT",
    headers: cabecerasJson(),
    body: JSON.stringify(datos),
  });

export const borrarCategoria = (id: number) =>
  pedir<null>(`/categorias/${id}`, { method: "DELETE", headers: cabeceras() });

/** Reordena las secciones: se mandan los ids en el orden deseado. */
export const reordenarCategorias = (ids: number[]) =>
  pedir<AdminCategoria[]>("/categorias/reordenar", {
    method: "POST",
    headers: cabecerasJson(),
    body: JSON.stringify({ ids }),
  });

// ── Productos ───────────────────────────────────────────────────────────────

export const listarProductos = () =>
  pedir<AdminProducto[]>("/productos", { headers: cabeceras() }).then((ps) => ps.map(normalizar));

// Van como FormData porque pueden traer foto y video. Los campos de texto
// viajan igual; Laravel los lee sin diferencia.
export const crearProducto = (datos: FormData) =>
  pedir<AdminProducto>("/productos", {
    method: "POST",
    headers: cabeceras(),
    body: datos,
  }).then(normalizar);

export const editarProducto = (id: number, datos: FormData) => {
  // Los navegadores no mandan archivos por PATCH: se manda POST y Laravel lo
  // traduce con `_method`.
  datos.append("_method", "PATCH");
  return pedir<AdminProducto>(`/productos/${id}`, {
    method: "POST",
    headers: cabeceras(),
    body: datos,
  }).then(normalizar);
};

export const borrarProducto = (id: number) =>
  pedir<null>(`/productos/${id}`, { method: "DELETE", headers: cabeceras() });

export const reordenarProductos = (ids: number[]) =>
  pedir<{ ok: boolean }>("/productos/reordenar", {
    method: "POST",
    headers: cabecerasJson(),
    body: JSON.stringify({ ids }),
  });

export const borrarImagenExtra = (productoId: number, imagenId: number) =>
  pedir<null>(`/productos/${productoId}/imagenes/${imagenId}`, {
    method: "DELETE",
    headers: cabeceras(),
  });

/** Movimiento de inventario en una sede. */
export const moverStock = (
  productoId: number,
  datos: { sede_id: number; accion: "fijar" | "sumar" | "restar"; cantidad: number },
) =>
  pedir<{ sede: string; antes: number; despues: number; total: number }>(
    `/productos/${productoId}/stock`,
    { method: "PATCH", headers: cabecerasJson(), body: JSON.stringify(datos) },
  );

// ── Sedes ───────────────────────────────────────────────────────────────────

export const listarSedes = () => pedir<AdminSede[]>("/sedes", { headers: cabeceras() });

export const crearSede = (datos: Partial<AdminSede>) =>
  pedir<AdminSede>("/sedes", {
    method: "POST",
    headers: cabecerasJson(),
    body: JSON.stringify(datos),
  });

export const editarSede = (id: number, datos: Partial<AdminSede>) =>
  pedir<AdminSede>(`/sedes/${id}`, {
    method: "PUT",
    headers: cabecerasJson(),
    body: JSON.stringify(datos),
  });

/** `confirmar` es necesario cuando la sede todavía tiene inventario. */
export const borrarSede = (id: number, confirmar = false) =>
  pedir<null>(`/sedes/${id}${confirmar ? "?confirmar=1" : ""}`, {
    method: "DELETE",
    headers: cabeceras(),
  });

// ── Portada ─────────────────────────────────────────────────────────────────

export const obtenerHero = () => pedir<AdminHero | null>("/hero", { headers: cabeceras() });

export const guardarHero = (datos: FormData) =>
  pedir<AdminHero>("/hero", { method: "POST", headers: cabeceras(), body: datos });

// ── Aviso ───────────────────────────────────────────────────────────────────

export const obtenerAviso = () => pedir<AdminAviso | null>("/aviso", { headers: cabeceras() });

export const guardarAviso = (datos: Partial<AdminAviso>) =>
  pedir<AdminAviso>("/aviso", {
    method: "POST",
    headers: cabecerasJson(),
    body: JSON.stringify(datos),
  });

// ── Recetas ─────────────────────────────────────────────────────────────────

export const listarRecetas = () =>
  pedir<AdminReceta[]>("/recetas", { headers: cabeceras() }).then((rs) =>
    rs.map((r) => ({ ...r, imagen_url: urlArchivo(r.imagen_url), video_url: urlArchivo(r.video_url) })),
  );

export const crearReceta = (datos: FormData) =>
  pedir<AdminReceta>("/recetas", { method: "POST", headers: cabeceras(), body: datos });

export const editarReceta = (id: number, datos: FormData) => {
  // Los navegadores no mandan archivos por PATCH: va POST y Laravel traduce.
  datos.append("_method", "PATCH");
  return pedir<AdminReceta>(`/recetas/${id}`, { method: "POST", headers: cabeceras(), body: datos });
};

export const borrarReceta = (id: number) =>
  pedir<null>(`/recetas/${id}`, { method: "DELETE", headers: cabeceras() });

export const reordenarRecetas = (ids: number[]) =>
  pedir<AdminReceta[]>("/recetas/reordenar", {
    method: "POST",
    headers: cabecerasJson(),
    body: JSON.stringify({ ids }),
  });

// ── Preguntas frecuentes ────────────────────────────────────────────────────

export const listarPreguntas = () => pedir<AdminPregunta[]>("/preguntas", { headers: cabeceras() });

export const crearPregunta = (datos: Partial<AdminPregunta>) =>
  pedir<AdminPregunta>("/preguntas", {
    method: "POST",
    headers: cabecerasJson(),
    body: JSON.stringify(datos),
  });

export const editarPregunta = (id: number, datos: Partial<AdminPregunta>) =>
  pedir<AdminPregunta>(`/preguntas/${id}`, {
    method: "PUT",
    headers: cabecerasJson(),
    body: JSON.stringify(datos),
  });

export const borrarPregunta = (id: number) =>
  pedir<null>(`/preguntas/${id}`, { method: "DELETE", headers: cabeceras() });

export const reordenarPreguntas = (ids: number[]) =>
  pedir<AdminPregunta[]>("/preguntas/reordenar", {
    method: "POST",
    headers: cabecerasJson(),
    body: JSON.stringify({ ids }),
  });

// ── Buzón de preguntas ──────────────────────────────────────────────────────

export const listarConsultas = () =>
  pedir<AdminConsulta[]>("/consultas", { headers: cabeceras() });

/** Marca como atendida, o la devuelve a pendiente. */
export const alternarConsulta = (id: number) =>
  pedir<{ id: number; atendida: boolean }>(`/consultas/${id}`, {
    method: "PATCH",
    headers: cabeceras(),
  });

export const borrarConsulta = (id: number) =>
  pedir<null>(`/consultas/${id}`, { method: "DELETE", headers: cabeceras() });
