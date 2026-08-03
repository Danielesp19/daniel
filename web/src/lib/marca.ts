/**
 * Datos del negocio en un solo lugar.
 *
 * Todo lo que aparece escrito en el sitio y no viene de la base de datos vive
 * aquí. Los logros van con año y puesto porque son verificables: son
 * competencias reales, no adjetivos.
 */
export const MARCA = {
  nombre: "DANIEL BUITRÓN",
  oficio: "Barista profesional",
  ciudad: "Colombia",

  /**
   * Dos líneas de pedidos, las mismas que publica en Instagram. La primera es
   * la que usa el sitio para armar los mensajes; la segunda queda visible en
   * el pie por si la primera está ocupada.
   */
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "573227323425",
  telefonoAlterno: "3132289390",

  instagram: "https://www.instagram.com/danielbuitron.barista/",
  threads: "https://www.threads.com/@danielbuitron.barista",

  descripcion:
    "Café de especialidad recién tostado, asesoría para tu barra y servicio de barra para eventos.",

  /**
   * Palmarés. Se pinta como una tabla de datos, no como una lista de elogios:
   * año, competencia y puesto, y que el lector saque su conclusión.
   *
   * OJO: falta un logro. El bio de Instagram venía cortado en "🥇Ranci…" y no
   * se alcanzó a leer completo — agrégalo aquí cuando lo confirmes.
   */
  logros: [
    { anio: "2025", puesto: "2.º", competencia: "Campeonato Nacional de Arte Latte" },
    { anio: "2024", puesto: "2.º", competencia: "Campeonato Nacional de Arte Latte" },
    { anio: "2024", puesto: "1.º", competencia: "Reto 4V" },
  ],
} as const;

/** Enlace de WhatsApp con el mensaje ya escrito. */
export function enlaceWhatsApp(mensaje: string): string {
  return `https://wa.me/${MARCA.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}
