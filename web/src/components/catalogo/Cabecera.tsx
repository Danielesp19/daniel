import { enlaceWhatsApp, MARCA } from "@/lib/marca";

/**
 * Cabecera: el nombre a la izquierda y el botón de WhatsApp a la derecha.
 *
 * No lleva menú. Es lo que hace el diseño y para esta página tiene sentido: es
 * una sola pantalla larga donde cada sección es una categoría, y el recorrido
 * es bajar. Un menú de anclas sería una segunda forma de hacer lo mismo, y en
 * celular se lleva media barra. Los enlaces por sección viven en el pie, que
 * es donde uno los busca cuando ya llegó al final.
 *
 * Queda pegada arriba con fondo translúcido y no lleva estado: por eso es un
 * componente de servidor y no baja JavaScript al navegador.
 */
export default function Cabecera() {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: "var(--barra)",
        padding: "0 clamp(16px, 4.5vw, 48px)",
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "saturate(180%) blur(14px)",
        borderBottom: "1px solid var(--color-linea)",
      }}
    >
      <a
        href="#hero"
        className="nombre"
        style={{ fontSize: 21, letterSpacing: "-0.01em", textDecoration: "none", color: "inherit" }}
      >
        {MARCA.nombre}
      </a>

      <span style={{ flex: 1 }} />

      <a
        href={enlaceWhatsApp(`Hola ${MARCA.nombre}, quiero hacer un pedido.`)}
        target="_blank"
        rel="noopener noreferrer"
        className="boton boton-solido"
        style={{ minHeight: 40, padding: "9px 18px", fontSize: 12, letterSpacing: "0.03em" }}
      >
        Pedir por WhatsApp
      </a>
    </nav>
  );
}
