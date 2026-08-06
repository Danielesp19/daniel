import type { Producto } from "@/lib/catalogo";
import { altitud } from "@/lib/formato";

/**
 * El bloque de datos duros de un café: región, altura, variedad, proceso,
 * tueste y puntaje.
 *
 * Vive SOLO en el detalle del producto. En la tarjeta del catálogo ya no va:
 * en las dos referencias la tarjeta lleva foto, nombre y precio, y meterle
 * seis datos más al mismo tamaño es justo lo que hacía que la versión anterior
 * se viera recargada. Quien quiere la ficha, la abre.
 *
 * Solo se pintan los campos que existen: un molino o una prensa comparten
 * tabla con los cafés pero no tienen finca ni altitud, y una rejilla con
 * casillas vacías se ve rota.
 */
export function FichaTecnica({ producto }: { producto: Producto }) {
  const filas: Array<[string, string]> = [];

  if (producto.region) filas.push(["Región", producto.region]);
  if (producto.finca) filas.push(["Finca", producto.finca]);
  if (producto.productor) filas.push(["Productor", producto.productor]);
  if (producto.altitud_msnm) filas.push(["Altura", altitud(producto.altitud_msnm)]);
  if (producto.variedad) filas.push(["Variedad", producto.variedad]);
  if (producto.proceso) filas.push(["Proceso", producto.proceso]);
  if (producto.tueste) filas.push(["Tueste", producto.tueste]);
  if (producto.puntaje_sca) filas.push(["Puntaje SCA", producto.puntaje_sca.toFixed(2)]);

  if (filas.length === 0) return null;

  return (
    <dl style={{ margin: 0, borderTop: "1px solid var(--linea)" }}>
      {filas.map(([rotulo, valor]) => (
        <div
          key={rotulo}
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 20,
            padding: "11px 0",
            borderBottom: "1px solid var(--linea-tenue)",
          }}
        >
          <dt className="epigrafe">{rotulo}</dt>
          <dd className="cifra" style={{ margin: 0, fontSize: 14, fontWeight: 500, textAlign: "right" }}>
            {valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Notas de cata. Van con un punto de color al frente, no en etiquetas
 * enmarcadas: son un aroma, no un dato, y el punto es lo único de color en la
 * tarjeta — el mismo rojo del fruto maduro.
 */
export function Notas({ notas }: { notas: string[] }) {
  if (!notas?.length) return null;

  return (
    <p
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 7,
        margin: 0,
        fontSize: 13,
        color: "var(--color-grafito)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flex: "0 0 auto",
          width: 5,
          height: 5,
          borderRadius: 999,
          background: "var(--color-cereza)",
          transform: "translateY(-2px)",
        }}
      />
      <span>{notas.join(", ")}</span>
    </p>
  );
}

/** Sello de estado del inventario. Null cuando hay stock de sobra. */
export function SelloEstado({ producto }: { producto: Producto }) {
  if (!producto.agotado && !producto.por_acabarse) return null;

  const agotado = producto.agotado;

  return (
    <span
      className="epigrafe"
      style={{
        display: "inline-block",
        padding: "5px 10px",
        borderRadius: "var(--radio-pildora)",
        background: agotado ? "var(--color-cereza)" : "var(--color-tinta)",
        color: "#FFF",
        fontSize: 9,
        whiteSpace: "nowrap",
      }}
    >
      {agotado ? "Agotado" : `Últimas ${producto.stock}`}
    </span>
  );
}
