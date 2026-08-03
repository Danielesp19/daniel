import { enlaceWhatsApp, MARCA } from "@/lib/marca";

export default function PieSitio() {
  return (
    <footer
      style={{
        position: "relative",
        zIndex: 2,
        background: "#0A0A0A",
        borderTop: "1px solid var(--linea)",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "clamp(48px,7vw,88px) clamp(20px,5vw,56px)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          gap: "clamp(28px,4vw,48px)",
        }}
      >
        <div>
          <div className="titular" style={{ fontSize: "clamp(40px,6vw,76px)" }}>
            {MARCA.nombre}
          </div>
          <p
            style={{
              margin: "12px 0 0",
              maxWidth: 300,
              fontSize: 13,
              lineHeight: 1.7,
              color: "var(--apagado)",
            }}
          >
            {MARCA.descripcion}
          </p>
        </div>

        <div>
          <div className="etiqueta" style={{ color: "var(--color-acido)", marginBottom: 14 }}>
            Pedidos
          </div>
          <a
            href={enlaceWhatsApp(`Hola ${MARCA.nombre}, quiero hacer un pedido.`)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              color: "var(--color-tinta)",
              textDecoration: "none",
              fontSize: 14,
              borderBottom: "1px solid var(--color-acido)",
              paddingBottom: 2,
            }}
          >
            WhatsApp
          </a>
          <div className="cifra" style={{ marginTop: 12, fontSize: 12, color: "var(--apagado)" }}>
            {MARCA.correo}
          </div>
        </div>

        <div>
          <div className="etiqueta" style={{ color: "var(--color-acido)", marginBottom: 14 }}>
            Dónde
          </div>
          <div style={{ fontSize: 14 }}>{MARCA.ciudad}</div>
          <a
            href={MARCA.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="etiqueta"
            style={{ display: "inline-block", marginTop: 12, color: "var(--apagado)" }}
          >
            Instagram
          </a>
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid var(--linea-tenue)",
          padding: "18px clamp(20px,5vw,56px)",
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          maxWidth: 1400,
          margin: "0 auto",
          // Deja aire para la barra fija del carrito, que se monta encima.
          paddingBottom: "calc(18px + env(safe-area-inset-bottom))",
        }}
      >
        <span className="etiqueta" style={{ color: "var(--apagado)" }}>
          © {new Date().getFullYear()} {MARCA.nombre}
        </span>
        <span className="etiqueta" style={{ color: "var(--apagado)" }}>
          Tostado en Colombia
        </span>
      </div>
    </footer>
  );
}
