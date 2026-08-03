/**
 * Datos de la marca en un solo lugar.
 *
 * Todo lo que aparece escrito en el sitio y no viene de la base de datos vive
 * aquí: cambiar el nombre, el teléfono o el eslogan es tocar este archivo y
 * nada más.
 */
export const MARCA = {
  nombre: "ALTURA",
  eslogan: "Café de origen colombiano",
  descripcion:
    "Compramos lotes pequeños directamente a diez fincas colombianas y los tostamos cada semana.",

  /**
   * WhatsApp al que llegan los pedidos, en formato internacional sin "+",
   * sin espacios y sin guiones — es como lo espera wa.me.
   */
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "573001112233",

  instagram: "https://instagram.com/",
  ciudad: "Bogotá, Colombia",
  correo: "hola@altura.co",
} as const;

/** Enlace de WhatsApp con el mensaje ya escrito. */
export function enlaceWhatsApp(mensaje: string): string {
  return `https://wa.me/${MARCA.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}
