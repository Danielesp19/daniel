import { enlaceWhatsApp, MARCA } from "@/lib/marca";

/**
 * Cierre y pie.
 *
 * El cierre es una sola frase grande y un botón: es la última cosa que se lee
 * antes de escribir, así que no compite con nada. Termina en itálica, como
 * todos los titulares del sitio.
 *
 * El pie va sobre blanco, no sobre negro: en este diseño el negro ya aparece
 * varias veces a lo largo de la página, y rematar también en negro haría que
 * el pie se leyera como una sección más en vez de como el final.
 */
export default function PieSitio() {
  return (
    <>
      <section id="contacto" style={{ borderBottom: "1px solid var(--color-linea)" }}>
        <div
          className="revelar"
          style={{
            maxWidth: 760,
            margin: "0 auto",
            padding: "var(--aire) var(--margen)",
            textAlign: "center",
          }}
        >
          <span className="epigrafe">Tueste bajo pedido</span>

          <p
            className="titular"
            style={{
              fontSize: "clamp(26px, 5.5vw, 42px)",
              lineHeight: 1.1,
              letterSpacing: "-0.015em",
              margin: "16px auto 0",
              maxWidth: "22ch",
            }}
          >
            No tuesto para tener bodega. Tuesto cuando me lo pides, <em>y sale la misma semana.</em>
          </p>

          <a
            href={enlaceWhatsApp(`Hola ${MARCA.nombre}, quiero saber qué lotes tienes esta semana.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="boton boton-grande boton-solido"
            style={{ marginTop: 24 }}
          >
            Preguntar por los lotes de la semana
          </a>
        </div>
      </section>

      <footer>
        <div
          style={{
            maxWidth: "var(--ancho)",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
            gap: "clamp(22px, 4vw, 40px)",
            padding: "clamp(32px, 5vw, 56px) var(--margen) clamp(24px, 4vw, 36px)",
          }}
        >
          <div>
            <div className="nombre" style={{ fontSize: 23 }}>
              {MARCA.nombre}
            </div>
            <p style={{ margin: "11px 0 0", maxWidth: "28ch", fontSize: 13, lineHeight: 1.7, color: "var(--color-suave)" }}>
              {MARCA.descripcion}
            </p>
          </div>

          <Columna
            titulo="Tienda"
            enlaces={[
              ["Cafés de origen", "#cat-cafes-de-origen"],
              ["Café en grano", "#cat-cafe-en-grano"],
              ["Equipo y artefactos", "#cat-artefactos"],
              ["Cursos y asesorías", "#cat-servicios"],
            ]}
          />

          <Columna
            externos
            titulo="Sígueme"
            enlaces={[
              ["Instagram", MARCA.instagram],
              ["Threads", MARCA.threads],
              ["WhatsApp", enlaceWhatsApp(`Hola ${MARCA.nombre}, quiero hacer un pedido.`)],
            ]}
          />

          <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
            <span className="rotulo">Dónde</span>
            <span style={{ fontSize: 13, lineHeight: 1.9, color: "var(--color-fuerte)" }}>
              {MARCA.ciudad}
              <br />
              Envíos a todo el país
              <br />
              Tueste bajo pedido
            </span>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--color-linea)" }}>
          <div
            className="rotulo"
            style={{
              maxWidth: "var(--ancho)",
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
              // El relleno de abajo deja aire para la barra de pedido, que se
              // monta flotando encima del final de la página.
              padding: "16px var(--margen) calc(100px + env(safe-area-inset-bottom))",
              letterSpacing: "0.18em",
            }}
          >
            <span>© {new Date().getFullYear()} {MARCA.nombre}</span>
            <span>Tostado en Colombia</span>
          </div>
        </div>
      </footer>
    </>
  );
}

function Columna({
  titulo,
  enlaces,
  externos = false,
}: {
  titulo: string;
  enlaces: Array<readonly [string, string]>;
  externos?: boolean;
}) {
  return (
    <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
      <span className="rotulo">{titulo}</span>
      {enlaces.map(([texto, url]) => (
        <a
          key={texto}
          href={url}
          {...(externos ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          style={{ fontSize: 13, textDecoration: "none", color: "var(--color-fuerte)" }}
        >
          {texto}
        </a>
      ))}
    </div>
  );
}
