import type { Producto } from "@/lib/catalogo";

/**
 * La regla de tueste: una escala de claro a oscuro con la marca puesta donde
 * cae este café.
 *
 * Es la pieza propia del sitio. Sale del campo `tueste`, que es justo el dato
 * que uno quiere saber antes de comprar —qué tan tostado viene— y que casi
 * ninguna tienda muestra de forma que se entienda de un vistazo. Escrito como
 * palabra ("medio oscuro") hay que leerlo y compararlo mentalmente contra los
 * demás; dibujado en una escala, se compara solo.
 *
 * La marca viaja desde la izquierda hasta su posición cuando la pieza entra en
 * pantalla. Es el único movimiento del sitio que significa algo: dice "este
 * café cae ACÁ dentro de la escala".
 */

/**
 * Los cinco pasos de la escala, del más claro al más oscuro, con las formas
 * en que puede venir escrito el dato. Se comparan sin tildes y en minúscula
 * porque el texto lo escribe Daniel a mano por WhatsApp: "Medio Oscuro",
 * "medio-oscuro" y "MEDIO OSCURO" tienen que caer todos en el mismo paso.
 */
const PASOS = [
  { nombre: "Claro", alias: ["claro", "light"] },
  { nombre: "Medio claro", alias: ["medio claro", "medio-claro", "medium light"] },
  { nombre: "Medio", alias: ["medio", "medium"] },
  { nombre: "Medio oscuro", alias: ["medio oscuro", "medio-oscuro", "medium dark"] },
  { nombre: "Oscuro", alias: ["oscuro", "dark", "french"] },
];

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Índice del paso, o null si el tueste viene vacío o no se reconoce. */
export function pasoDeTueste(tueste: string | null): number | null {
  if (!tueste) return null;
  const t = normalizar(tueste);

  // De más específico a menos: "medio oscuro" contiene "medio", así que
  // buscar el más largo primero evita que caiga en el paso equivocado.
  const candidatos = PASOS.flatMap((paso, i) => paso.alias.map((a) => ({ a, i })))
    .sort((x, y) => y.a.length - x.a.length);

  return candidatos.find(({ a }) => t.includes(a))?.i ?? null;
}

export default function ReglaTueste({
  producto,
  conRotulo = true,
}: {
  producto: Producto;
  conRotulo?: boolean;
}) {
  const paso = pasoDeTueste(producto.tueste);
  if (paso === null) return null;

  // La marca se centra en su paso: con cinco pasos, el primero cae en 10% y el
  // último en 90%, así que nunca queda pegada al borde de la regla.
  const posicion = `${((paso + 0.5) / PASOS.length) * 100}%`;

  return (
    <div>
      {conRotulo && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 7,
          }}
        >
          <span className="epigrafe" style={{ fontSize: 10 }}>
            Tueste
          </span>
          <span className="epigrafe" style={{ fontSize: 10, color: "var(--color-tinta)" }}>
            {PASOS[paso].nombre}
          </span>
        </div>
      )}

      <div
        className="regla"
        role="img"
        aria-label={`Tueste ${PASOS[paso].nombre.toLowerCase()}, paso ${paso + 1} de ${PASOS.length} entre claro y oscuro`}
      >
        <span
          className="regla-marca"
          aria-hidden="true"
          // La posición va por variable CSS y no por `left` directo: así el
          // viaje de entrada lo controla el CSS —que ya sabe si hay que
          // anularlo por movimiento reducido— y aquí solo se dice a dónde.
          style={{ ["--posicion" as string]: posicion }}
        />
      </div>
    </div>
  );
}
