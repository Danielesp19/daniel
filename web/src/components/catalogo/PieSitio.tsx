import { enlaceWhatsApp, MARCA } from "@/lib/marca";

/**
 * Cierre de la página: un bloque oscuro con la llamada a escribir y, debajo,
 * el pie en papel con los enlaces.
 *
 * El bloque oscuro al final lo hacen las dos referencias, y es lo que le pone
 * punto final a una página que hasta ahí fue toda blanca. Es el único lugar
 * del sitio donde se invierte el color: si se repitiera antes, dejaría de
 * funcionar como cierre.
 */
export default function PieSitio() {
  return (
    <>
      <section
        id="contacto"
        style={{ background: "var(--color-tinta)", color: "#FFF", textAlign: "center" }}
      >
        <div className="contenedor seccion" style={{ maxWidth: 720 }}>
          <span className="epigrafe" style={{ color: "rgba(255,255,255,0.6)" }}>
            Pedidos y agenda
          </span>

          <h2 className="titular" style={{ fontSize: "clamp(28px, 4vw, 48px)", margin: "14px 0 0" }}>
            Escríbeme y armamos tu pedido.
          </h2>

          <p
            style={{
              margin: "16px auto 0",
              maxWidth: 480,
              fontSize: 15,
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.72)",
            }}
          >
            Café tostado bajo pedido, cursos, asesorías y barra para eventos. Todo se
            coordina por WhatsApp: disponibilidad, envío y pago.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 12,
              marginTop: 30,
            }}
          >
            <a
              href={enlaceWhatsApp(`Hola ${MARCA.nombre}, quiero hacer un pedido.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="boton"
              style={{ background: "#FFF", color: "var(--color-tinta)", border: "1px solid #FFF", textDecoration: "none" }}
            >
              Escribir por WhatsApp
            </a>
            <a
              href={MARCA.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="boton boton-claro"
              style={{ textDecoration: "none" }}
            >
              Ver Instagram
            </a>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid var(--linea)" }}>
        <div
          className="contenedor"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
            gap: "clamp(28px, 4vw, 48px)",
            paddingBlock: "clamp(40px, 5vw, 64px)",
          }}
        >
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>
              {MARCA.nombre}
            </div>
            <p style={{ margin: "10px 0 0", maxWidth: 280, fontSize: 13, lineHeight: 1.7, color: "var(--color-grafito)" }}>
              {MARCA.descripcion}
            </p>
          </div>

          <div>
            <div className="epigrafe" style={{ marginBottom: 14 }}>
              Catálogo
            </div>
            <Enlaces
              items={[
                ["Café en grano", "#cat-cafe-en-grano"],
                ["Cafés de origen", "#cat-cafes-de-origen"],
                ["Métodos", "#cat-metodos"],
                ["Servicios", "#cat-servicios"],
              ]}
            />
          </div>

          <div>
            <div className="epigrafe" style={{ marginBottom: 14 }}>
              Sígueme
            </div>
            <Enlaces
              externos
              items={[
                ["Instagram", MARCA.instagram],
                ["Threads", MARCA.threads],
                ["WhatsApp", enlaceWhatsApp(`Hola ${MARCA.nombre}, quiero hacer un pedido.`)],
              ]}
            />
          </div>

          <div>
            <div className="epigrafe" style={{ marginBottom: 14 }}>
              Dónde
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.9, color: "var(--color-grafito)" }}>
              {MARCA.ciudad}
              <br />
              Envíos a todo el país
              <br />
              Tueste bajo pedido
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--linea-tenue)" }}>
          <div
            className="contenedor"
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              paddingBlock: 18,
              // Deja aire para la barra fija del carrito, que se monta encima.
              paddingBottom: "calc(18px + env(safe-area-inset-bottom))",
            }}
          >
            <span className="epigrafe">
              © {new Date().getFullYear()} {MARCA.nombre}
            </span>
            <span className="epigrafe">Tostado en Colombia</span>
          </div>
        </div>
      </footer>
    </>
  );
}

function Enlaces({
  items,
  externos = false,
}: {
  items: Array<readonly [string, string]>;
  externos?: boolean;
}) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 9 }}>
      {items.map(([texto, url]) => (
        <li key={texto}>
          <a
            href={url}
            {...(externos ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            style={{ color: "var(--color-grafito)", textDecoration: "none", fontSize: 13 }}
          >
            {texto}
          </a>
        </li>
      ))}
    </ul>
  );
}
