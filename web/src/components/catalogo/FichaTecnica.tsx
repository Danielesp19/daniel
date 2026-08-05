import type { Producto } from "@/lib/catalogo";
import { altitud } from "@/lib/formato";

/**
 * El bloque de datos duros de un café: región, altura, variedad, proceso,
 * tueste y puntaje. Es la pieza que define el diseño del catálogo — una
 * etiqueta de laboratorio, no una descripción de menú.
 *
 * Solo se pintan los campos que existen: un molino o una prensa comparten
 * tabla con los cafés pero no tienen finca ni altitud, y una rejilla con
 * casillas vacías se ve rota.
 */
export function FichaTecnica({ producto, compacta = false }: { producto: Producto; compacta?: boolean }) {
  const filas: Array<[string, string]> = [];

  if (producto.region) filas.push(["Región", producto.region]);
  if (producto.altitud_msnm) filas.push(["Altura", altitud(producto.altitud_msnm)]);
  if (producto.variedad) filas.push(["Variedad", producto.variedad]);
  if (producto.proceso) filas.push(["Proceso", producto.proceso]);
  if (producto.tueste) filas.push(["Tueste", producto.tueste]);
  if (producto.puntaje_sca) filas.push(["SCA", producto.puntaje_sca.toFixed(2)]);

  if (filas.length === 0) return null;

  // En la tarjeta solo caben los cuatro datos que más pesan a la hora de
  // elegir; la ficha completa vive en el detalle del producto.
  const visibles = compacta ? filas.slice(0, 4) : filas;

  return (
    <dl
      style={{
        display: "grid",
        gridTemplateColumns: compacta ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(130px, 1fr))",
        gap: 0,
        margin: 0,
        borderTop: "1px solid var(--linea-tenue)",
      }}
    >
      {visibles.map(([rotulo, valor], i) => (
        <div
          key={rotulo}
          style={{
            padding: compacta ? "9px 10px" : "13px 14px",
            borderBottom: "1px solid var(--linea-tenue)",
            // Línea vertical entre columnas: se omite en la primera de cada
            // fila para que el borde no se duplique contra el del contenedor.
            borderLeft: compacta && i % 2 === 0 ? "none" : "1px solid var(--linea-tenue)",
            minWidth: 0,
          }}
        >
          <dt className="etiqueta" style={{ color: "var(--apagado)", fontSize: 9 }}>
            {rotulo}
          </dt>
          <dd
            className="cifra"
            style={{
              margin: "5px 0 0",
              fontSize: compacta ? 11 : 13,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Notas de cata como etiquetas sueltas. */
export function Notas({ notas, alineado = "left" }: { notas: string[]; alineado?: "left" | "right" }) {
  if (!notas?.length) return null;

  return (
    <ul
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        listStyle: "none",
        margin: 0,
        padding: 0,
        justifyContent: alineado === "right" ? "flex-end" : "flex-start",
      }}
    >
      {notas.map((nota) => (
        <li
          key={nota}
          className="etiqueta"
          style={{
            padding: "5px 11px",
            borderRadius: "var(--radio-pildora)",
            border: "1px solid rgba(200,211,173,0.28)",
            color: "var(--color-salvia)",
            fontSize: 10,
          }}
        >
          {nota}
        </li>
      ))}
    </ul>
  );
}

/** Sello de estado del inventario. Null cuando hay stock de sobra. */
export function SelloEstado({ producto }: { producto: Producto }) {
  if (!producto.agotado && !producto.por_acabarse) return null;

  const agotado = producto.agotado;

  return (
    <span
      className="etiqueta"
      style={{
        padding: "5px 11px",
        borderRadius: "var(--radio-pildora)",
        background: agotado ? "var(--color-alerta)" : "var(--color-acento)",
        color: "var(--color-negro)",
        fontSize: 9,
        whiteSpace: "nowrap",
      }}
    >
      {agotado ? "Agotado" : `Últimas ${producto.stock}`}
    </span>
  );
}
