/**
 * Datos del negocio en un solo lugar.
 *
 * Todo lo que aparece escrito en el sitio y no viene de la base de datos vive
 * aquí. Los logros van con año y puesto porque son verificables: son
 * competencias reales, no adjetivos.
 */
export const MARCA = {
  nombre: "Daniel Buitrón",
  oficio: "Barista profesional",
  ciudad: "Pitalito, Huila",

  /**
   * PROVISIONAL: número de pruebas mientras se consigue la línea de WhatsApp
   * Business. Los pedidos que salgan del sitio llegan acá, así que hay que
   * cambiarlo por el número real antes de publicar.
   *
   * Formato internacional sin "+", sin espacios y sin guiones: es como lo
   * espera wa.me.
   */
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "573222248487",

  instagram: "https://www.instagram.com/danielbuitron.barista/",
  threads: "https://www.threads.com/@danielbuitron.barista",

  descripcion:
    "Subcampeón Nacional de Arte Latte. Cursos, experiencias y café de especialidad del Huila.",

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
