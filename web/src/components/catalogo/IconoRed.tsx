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
 *
 * Los trazos salen del diseño que mandó Daniel, que a su vez usa los de la
 * familia Feather. Los que había antes eran aproximaciones dibujadas a ojo —la
 * "f" de Facebook parecía una cruz y el de TikTok un palito con rabo— y a 18 px
 * no se reconocía ninguno.
 */

export type Red = "instagram" | "tiktok" | "facebook" | "whatsapp" | "threads";

const TRAZOS: Record<Red, React.ReactNode> = {
  instagram: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" />
    </>
  ),
  // La nota de TikTok: el gancho baja hasta el círculo y el brazo sale hacia
  // la bandera. La versión anterior era un palito con un rabo y no se
  // reconocía a 18 px.
  tiktok: (
    <path d="M9 12a4 4 0 1 0 4 4V3a5 5 0 0 0 5 5" />
  ),
  // La "f" de Facebook con su caja: antes eran cuatro trazos sueltos que
  // formaban algo parecido a una cruz.
  facebook: (
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
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

export default function IconoRed({ red, tamano = 18, grosor = 2.2 }: { red: Red; tamano?: number; grosor?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamano}
      height={tamano}
      fill="none"
      stroke="currentColor"
      // Trazo grueso: a 17 px, 1,6 dejaba los logos desvaídos y con la "f" de
      // Facebook casi ilegible. El diseño los dibuja a 2,75; acá 2,2 es el
      // punto donde se leen sin engordar el resto del pie.
      strokeWidth={grosor}
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
