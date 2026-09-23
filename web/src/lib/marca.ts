/**
 * Datos del negocio en un solo lugar.
 *
 * Todo lo que aparece escrito en el sitio y no viene de la base de datos vive
 * aquí. Los logros van con año y puesto porque son verificables: son
 * competencias reales, no adjetivos.
 */
export const MARCA = {
  // Sin tilde en la "o": así figura en su cédula, y es el nombre con el que
  // factura. Lo pidió él expresamente en la revisión del 19 de agosto.
  nombre: "Daniel Buitron",
  oficio: "Barista profesional",
  ciudad: "Pitalito, Huila",

  /**
   * El número de Daniel. Acá llegan los pedidos que salen del sitio.
   *
   * Formato internacional sin "+", sin espacios y sin guiones: es como lo
   * espera wa.me. El 57 es Colombia.
   *
   * La variable de entorno gana sobre esto, así que si en el servidor quedó
   * puesto el número viejo, el sitio seguirá usando ese: hay que cambiarlo
   * también allá (o quitarlo y dejar que mande este valor).
   */
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "573227323425",

  instagram: "https://www.instagram.com/danielbuitron.barista/",
  threads: "https://www.threads.com/@danielbuitron.barista",

  // Confirmados por él en la revisión del 27 de agosto. Ojo: el usuario de
  // TikTok lleva guion bajo y el de Instagram lleva punto — no son el mismo.
  tiktok: "https://www.tiktok.com/@danielbuitron_barista",
  facebook: "https://www.facebook.com/danielbuitron.barista",

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
