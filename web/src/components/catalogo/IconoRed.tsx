/**
 * Los logos de las redes, en SVG.
 *
 * Van dibujados aquí y no como archivos ni como una librería de iconos: son
 * cuatro trazos que no cambian nunca, y traerse un paquete entero —o cuatro
 * peticiones más— para esto sería desproporcionado. Además así heredan el
 * color del texto y funcionan igual sobre blanco y sobre negro.
 *
 * Todos comparten un lienzo de 24×24 y el mismo peso visual, para que en fila
 * no se vea uno más gordo que otro.
 */

export type Red = "instagram" | "tiktok" | "facebook" | "whatsapp" | "threads";

const TRAZOS: Record<Red, React.ReactNode> = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  tiktok: (
    <path d="M14 4v9.5a3.5 3.5 0 1 1-3-3.46M14 4c.3 2.3 1.8 3.8 4 4" />
  ),
  facebook: (
    <path d="M14.5 8.5h2.2M14.5 8.5V7.2c0-1 .5-1.7 1.6-1.7h1M14.5 8.5V19M10 12h6" />
  ),
  whatsapp: (
    <>
      <path d="M4.2 19.8l1.1-3.6A7.6 7.6 0 1 1 8.4 19l-4.2.8Z" />
      <path d="M9.2 9c.3 1.6 2.2 3.6 3.9 4 .5.1 1-.2 1.3-.6" />
    </>
  ),
  threads: (
    <path d="M12 20c-4.5 0-7-3-7-8s2.5-8 7-8c3 0 5 1.3 6 3.6M12 20c3 0 4.8-1.4 4.8-3.2 0-2-2-2.9-4.3-2.9-1.9 0-3 .8-3 2 0 1 .9 1.7 2 1.7 1.7 0 2.6-1.4 2.6-3.9" />
  ),
};

export default function IconoRed({ red, tamano = 18 }: { red: Red; tamano?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamano}
      height={tamano}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      // Decorativo: el nombre de la red ya va escrito al lado del icono, así
      // que repetirlo sería leerlo dos veces con un lector de pantalla.
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      {TRAZOS[red]}
    </svg>
  );
}
