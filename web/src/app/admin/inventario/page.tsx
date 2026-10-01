"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listarProductos,
  moverStock,
  SesionVencida,
  type AdminProducto,
} from "@/lib/admin-api";
import { COLOR, campo, rotulo, Boton, Cabecera, Aviso } from "@/components/admin/ui";

/**
 * El inventario de todo el catálogo en una sola pantalla.
 *
 * Existe porque mover stock obligaba a entrar producto por producto, abrir su
 * formulario, buscar la sede y guardar. Con un catálogo de veinte referencias
 * en tres sedes, reponer después de una feria eran sesenta formularios.
 *
 * Acá cada producto es una fila y cada sede un control de − y +, así que
 * ajustar es un clic y se ve el efecto en el total sin cambiar de pantalla.
 *
 * NO deja editar nada más. No es el formulario del producto en forma de tabla:
 * es la pregunta "¿cuánto hay y dónde?" y su respuesta. Precio, fotos y ficha
 * se siguen editando en Catálogo, que es donde se piensan.
 */

/** Los servicios no salen: se agendan, no se cuentan. */
const soloContables = (ps: AdminProducto[]) => ps.filter((p) => p.controla_stock);

export default function InventarioAdmin() {
  const router = useRouter();
  const [productos, setProductos] = useState<AdminProducto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busca, setBusca] = useState("");
  const [soloBajos, setSoloBajos] = useState(false);
  // Qué filas están esperando al servidor, para no dejar pulsar dos veces el
  // mismo botón antes de que vuelva la primera respuesta.
  const [ocupados, setOcupados] = useState<Set<string>>(new Set());

  const cargar = useCallback(async () => {
    try {
      setProductos(soloContables(await listarProductos()));
      setError("");
    } catch (e) {
      if (e instanceof SesionVencida) {
        router.replace("/admin/login");
        return;
      }
      setError(e instanceof Error ? e.message : "No se pudo cargar el inventario");
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    // Desde el navegador: la petición va firmada con el token de
    // sessionStorage, que en el servidor no existe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  /**
   * Suma o resta una unidad en una sede.
   *
   * Va con `sumar`/`restar` y no con el número final a propósito: dos personas
   * ajustando a la vez con "fijar" se pisan —la segunda escribe partiendo de
   * un total que ya cambió— mientras que los movimientos relativos se suman
   * bien. Es la misma razón por la que la API los pide así.
   */
  async function mover(p: AdminProducto, sedeId: number, paso: -1 | 1) {
    const llave = `${p.id}:${sedeId}`;
    if (ocupados.has(llave)) return;

    const fila = p.stock_por_sede.find((s) => s.sede_id === sedeId);
    // En cero no se baja más: el inventario es un conteo de cosas en un
    // estante y el servidor lo rechazaría igual.
    if (paso === -1 && (fila?.stock ?? 0) <= 0) return;

    setOcupados((s) => new Set(s).add(llave));

    try {
      const r = await moverStock(p.id, {
        sede_id: sedeId,
        accion: paso === 1 ? "sumar" : "restar",
        cantidad: 1,
      });

      // Se escribe lo que respondió el servidor, no lo que suponíamos: si otra
      // persona movió esa misma sede, el número que vale es el suyo.
      setProductos((ps) =>
        ps.map((x) =>
          x.id !== p.id
            ? x
            : {
                ...x,
                stock: r.total,
                stock_por_sede: x.stock_por_sede.map((s) =>
                  s.sede_id === sedeId ? { ...s, stock: r.despues } : s,
                ),
              },
        ),
      );
      setError("");
    } catch (e) {
      if (e instanceof SesionVencida) {
        router.replace("/admin/login");
        return;
      }
      setError(e instanceof Error ? e.message : "No se pudo mover el inventario");
    } finally {
      setOcupados((s) => {
        const n = new Set(s);
        n.delete(llave);
        return n;
      });
    }
  }

  // Las sedes salen del primer producto: todas traen la misma lista, incluidas
  // las que están en cero. Así las columnas existen aunque nadie haya surtido
  // todavía esa sede.
  const sedes = productos[0]?.stock_por_sede ?? [];

  const visibles = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return productos.filter((p) => {
      if (soloBajos && !p.agotado && !p.por_acabarse) return false;
      if (!t) return true;
      return (
        p.nombre.toLowerCase().includes(t) ||
        (p.categoria ?? "").toLowerCase().includes(t)
      );
    });
  }, [productos, busca, soloBajos]);

  const cuantosBajos = productos.filter((p) => p.agotado || p.por_acabarse).length;

  if (cargando) {
    return <p style={{ color: COLOR.suave, fontSize: 14 }}>Cargando el inventario…</p>;
  }

  return (
    <>
      <Cabecera
        titulo="Inventario"
        bajada="Lo que hay de cada producto en cada sede. Súbelo o bájalo de a uno; se guarda al instante."
      />

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Aviso>{error}</Aviso>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nombre o sección…"
          style={{ ...campo, flex: "1 1 240px", width: "auto" }}
        />
        {/* El filtro trae su cuenta: si dice cero, no hay nada que reponer y
            no hace falta pulsarlo para averiguarlo. */}
        <Boton
          tono={soloBajos ? "solido" : "linea"}
          onClick={() => setSoloBajos((v) => !v)}
        >
          Por reponer ({cuantosBajos})
        </Boton>
      </div>

      {visibles.length === 0 ? (
        <p style={{ color: COLOR.suave, fontSize: 14 }}>
          {soloBajos ? "Nada por reponer." : "Ningún producto coincide."}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {visibles.map((p) => (
            <Fila
              key={p.id}
              producto={p}
              ocupados={ocupados}
              onMover={(sedeId, paso) => mover(p, sedeId, paso)}
            />
          ))}
        </div>
      )}

      {sedes.length === 0 && (
        <p style={{ marginTop: 16, fontSize: 13, color: COLOR.aviso }}>
          No hay sedes activas, así que no hay dónde contar el inventario. Crea
          una en Sedes.
        </p>
      )}
    </>
  );
}

/**
 * Un producto con sus sedes.
 *
 * Es una fila y no una celda de tabla: con tres o cuatro sedes una tabla de
 * verdad se sale de la pantalla de un teléfono, y quien repone lo hace con el
 * celular en la mano frente al estante.
 */
function Fila({
  producto: p,
  ocupados,
  onMover,
}: {
  producto: AdminProducto;
  ocupados: Set<string>;
  onMover: (sedeId: number, paso: -1 | 1) => void;
}) {
  const color = p.agotado ? COLOR.peligro : p.por_acabarse ? COLOR.aviso : COLOR.bien;

  return (
    <div
      style={{
        background: COLOR.papel,
        border: `1px solid ${COLOR.linea}`,
        borderRadius: 10,
        padding: "11px 14px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: "1 1 190px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{p.nombre}</span>
          {!p.activo && <span style={{ ...rotulo, marginBottom: 0, color: COLOR.aviso }}>oculto</span>}
        </div>
        <div style={{ marginTop: 2, fontSize: 12, color: COLOR.rotulo }}>{p.categoria}</div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {p.stock_por_sede.map((s) => (
          <ControlSede
            key={s.sede_id}
            nombre={s.sede}
            stock={s.stock}
            minimo={p.stock_minimo}
            ocupado={ocupados.has(`${p.id}:${s.sede_id}`)}
            onBajar={() => onMover(s.sede_id, -1)}
            onSubir={() => onMover(s.sede_id, 1)}
          />
        ))}

        {/* El total es de solo lectura: sale de sumar las sedes, y es lo que
            el cliente ve en la página como AGOTADO o disponible. */}
        <div style={{ textAlign: "right", minWidth: 58 }}>
          <span style={{ ...rotulo, marginBottom: 2 }}>Total</span>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600, color }}>
            {p.agotado ? "0" : p.stock}
          </div>
        </div>
      </div>
    </div>
  );
}

/** El − número + de una sede. */
function ControlSede({
  nombre,
  stock,
  minimo,
  ocupado,
  onBajar,
  onSubir,
}: {
  nombre: string;
  stock: number;
  minimo: number;
  ocupado: boolean;
  onBajar: () => void;
  onSubir: () => void;
}) {
  // El número se tiñe con el estado de ESTA sede, no el del producto: un café
  // puede estar bien de total y en cero justo en la sede donde se despacha.
  const color = stock <= 0 ? COLOR.peligro : stock <= minimo ? COLOR.aviso : COLOR.tinta;

  const paso = (signo: "−" | "+", onClick: () => void, bloqueado: boolean) => (
    <button
      type="button"
      onClick={onClick}
      disabled={bloqueado || ocupado}
      aria-label={`${signo === "+" ? "Sumar" : "Restar"} uno en ${nombre}`}
      style={{
        // 34 y no 28: esto se usa con el celular en la mano frente al
        // estante, y un blanco de 28 px se falla seguido —sobre todo el "−",
        // que está pegado al número—.
        width: 34,
        height: 34,
        border: "none",
        background: "transparent",
        color: bloqueado || ocupado ? "#D2CFCB" : COLOR.suave,
        cursor: bloqueado || ocupado ? "default" : "pointer",
        fontSize: 16,
        lineHeight: 1,
      }}
    >
      {signo}
    </button>
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        border: `1px solid ${COLOR.linea}`,
        borderRadius: 999,
        paddingInline: 2,
        opacity: ocupado ? 0.55 : 1,
        transition: "opacity .15s ease",
      }}
      title={nombre}
    >
      {paso("−", onBajar, stock <= 0)}
      <div style={{ textAlign: "center", minWidth: 54, paddingInline: 2 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color }}>
          {stock}
        </div>
        {/* El nombre de la sede va debajo del número y no en una cabecera de
            tabla: así la fila se entiende sola al desplazarse, sin tener que
            volver arriba a ver qué columna era cuál. */}
        <div style={{ fontSize: 9, color: COLOR.rotulo, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 76 }}>
          {nombre}
        </div>
      </div>
      {paso("+", onSubir, false)}
    </div>
  );
}
