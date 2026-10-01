/**
 * Cliente de la API de administración.
 *
 * Todo pasa por el proxy del Next (`/api-tienda` → Laravel), así que el
 * navegador nunca le pega directo al backend y no hay CORS que resolver. El
 * token lo puso el login al cambiar la contraseña por él en /api/admin-auth, y
 * vive en el navegador con fecha de vencimiento — ver la sección «La sesión»
 * más abajo.
 */

const BASE = "/api-tienda/admin";

/** Cómo se dibuja una sección en el catálogo. */
export type ModoVitrina = "carrusel" | "dos" | "bandas" | "grid" | "vertical" | "horizontal";

export interface AdminCategoria {
  id: number;
  /** null = es una sección. Con valor, cuelga de esa sección. */
  padre_id: number | null;
  nombre: string;
  slug: string;
  descripcion: string | null;
  modo_vitrina: ModoVitrina;
  orden: number;
  activa: boolean;
  productos_count: number;
}

export interface StockDeSede {
  /** Para poder mover unidades sin adivinar la sede por su nombre. */
  sede_id: number;
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
  /** Enciende el peso y la ficha de origen en el formulario y en la página. */
  es_cafe: boolean;
  /** Se arma con el formulario de kit: componentes del catálogo y piezas. */
  es_kit: boolean;
  /** Lo que solo existe dentro del kit: nombre y foto. */
  piezas: { id: number; nombre: string; imagen: string | null; imagen_url: string | null }[];
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
  /** La foto que representa al producto en las listas del panel. */
  imagen_url: string | null;
  /** Fotos y videos en su orden. La primera es la portada. */
  medios: { id: number; tipo: "imagen" | "video"; url: string; poster_url: string | null }[];
  /** Los productos que incluye, si es un kit. */
  componentes: { id: number; nombre: string }[];
}

export interface AdminSede {
  id: number;
  nombre: string;
  slug: string;
  direccion: string;
  ciudad: string;
  barrio: string | null;
  horario: string | null;
  principal: boolean;
  activa: boolean;
  orden: number;
  bolsas_en_stock: number;
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
  /** Micras de la molienda recomendada. null = la receta no dice. */
  molienda_micras: number | null;
  molienda: string | null;
  ratio: number | null;
  duracion_seg: number | null;
  duracion: string | null;
  ingredientes: string[];
  /** Cada paso con su foto y su temporizador, los dos opcionales. */
  pasos: AdminPaso[];
  /** Los artefactos que usa la receta, para recomendarlos. */
  artefactos: { id: number; nombre: string }[];
  /** El enlace tal como lo pegaron, y el id que se sacó de él. */
  video_youtube: string | null;
  youtube_id: string | null;
  producto_id: number | null;
  producto: string | null;
  activa: boolean;
  orden: number;
  imagen_url: string | null;
}

export interface AdminPaso {
  id: number;
  texto: string;
  /** La ruta relativa: es lo que se devuelve al guardar para conservarla. */
  imagen: string | null;
  imagen_url: string | null;
  segundos: number | null;
  temporizador_etiqueta: string | null;
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

/* ── La sesión ──────────────────────────────────────────────────────────────
 *
 * Vivía en `sessionStorage`, que se borra al cerrar la pestaña. Eso estaba
 * bien cuando el panel se usaba desde un computador, pero desde que se
 * instala en el teléfono deja de servir: el sistema cierra las apps de la
 * memoria todo el tiempo, así que habría que escribir la contraseña varias
 * veces al día — y quien tiene que hacer eso termina guardándola en el
 * navegador, que es peor que cualquier cosa que esto evitaba.
 *
 * Ahora dura treinta días y se guarda con su fecha de vencimiento. No es
 * "para siempre" a propósito: un teléfono se pierde y se presta, y una sesión
 * sin caducidad es una puerta abierta de la que nadie se acuerda.
 */

const LLAVE_TOKEN = "admin_token";
const LLAVE_VENCE = "admin_token_vence";
const DIAS_DE_SESION = 30;

/** Guarda la sesión recién abierta y le pone fecha de vencimiento. */
export function guardarSesion(valor: string): void {
  try {
    localStorage.setItem(LLAVE_TOKEN, valor);
    localStorage.setItem(
      LLAVE_VENCE,
      String(Date.now() + DIAS_DE_SESION * 24 * 60 * 60 * 1000),
    );
  } catch {
    // Modo incógnito o almacenamiento bloqueado: la sesión vale para esta
    // visita y ya. Es justo lo que hacía antes.
  }
}

export function cerrarSesion(): void {
  try {
    localStorage.removeItem(LLAVE_TOKEN);
    localStorage.removeItem(LLAVE_VENCE);
  } catch {
    // Si no se puede borrar, el token vencido se descarta igual al leerlo.
  }
}

/**
 * El token de la sesión, o cadena vacía si no hay o ya venció.
 *
 * La caducidad se comprueba al LEER y no con un temporizador: el panel puede
 * estar meses sin abrirse, y lo que importa es que el token viejo no sirva
 * cuando alguien vuelva, no que algo lo borre a medianoche.
 */
export function token(): string {
  if (typeof window === "undefined") return "";

  try {
    const valor = localStorage.getItem(LLAVE_TOKEN);
    if (!valor) return "";

    const vence = Number(localStorage.getItem(LLAVE_VENCE));
    // Sin fecha se trata como vencido: es una sesión de la versión anterior,
    // y pedir la contraseña una vez es mejor que dejarla abierta sin plazo.
    if (!Number.isFinite(vence) || Date.now() > vence) {
      cerrarSesion();
      return "";
    }

    return valor;
  } catch {
    return "";
  }
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
    medios: (p.medios ?? []).map((m) => ({
      ...m,
      url: urlArchivo(m.url)!,
      poster_url: urlArchivo(m.poster_url),
    })),
  };
}

/** Se lanza cuando la sesión venció o el token dejó de servir. */
export class SesionVencida extends Error {}

/**
 * El backend puede hacer la operación, pero quiere que se confirme antes:
 * borrar una sede con inventario, borrar un producto que está dentro de un
 * kit. Trae el motivo ya redactado y el detalle de qué se rompería.
 *
 * Es una clase y no un texto a propósito. Antes esto se detectaba buscando
 * una palabra dentro del mensaje ("unidades"), así que bastaba con reescribir
 * el aviso en el backend para que el panel dejara de ofrecer la confirmación
 * —sin que fallara nada visible—.
 */
export class NecesitaConfirmacion extends Error {
  readonly usos: Record<string, string[]>;

  constructor(mensaje: string, usos: Record<string, string[]> = {}) {
    super(mensaje);
    this.usos = usos;
  }
}

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
    const mensaje = primero ?? json.error ?? json.message ?? `Error ${res.status}`;

    if (json.necesita_confirmacion) {
      throw new NecesitaConfirmacion(mensaje, json.usos ?? {});
    }

    throw new Error(mensaje);
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

/** `confirmar` es necesario cuando el producto está dentro de un kit o lo usa una receta. */
export const borrarProducto = (id: number, confirmar = false) =>
  pedir<null>(`/productos/${id}${confirmar ? "?confirmar=1" : ""}`, {
    method: "DELETE",
    headers: cabeceras(),
  });

export const reordenarProductos = (ids: number[]) =>
  pedir<{ ok: boolean }>("/productos/reordenar", {
    method: "POST",
    headers: cabecerasJson(),
    body: JSON.stringify({ ids }),
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
    rs.map((r) => ({
      ...r,
      imagen_url: urlArchivo(r.imagen_url),
      pasos: (r.pasos ?? []).map((p) => ({ ...p, imagen_url: urlArchivo(p.imagen_url) })),
    })),
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
