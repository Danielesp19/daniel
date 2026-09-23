"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listarCategorias,
  listarProductos,
  crearCategoria,
  editarCategoria,
  borrarCategoria,
  reordenarCategorias,
  reordenarProductos,
  borrarProducto,
  NecesitaConfirmacion,
  SesionVencida,
  type AdminCategoria,
  type AdminProducto,
  type ModoVitrina,
} from "@/lib/admin-api";
import { COLOR, campo, rotulo, Campo, Boton, Cabecera, Aviso, Flechas, Hoja, Interruptor } from "@/components/admin/ui";
import FormularioProducto from "@/components/admin/FormularioProducto";

/**
 * Los tres modos que ofrece el panel.
 *
 * Solo deciden cómo se acomoda lo que NO está destacado: los destacados salen
 * en grande arriba de la sección en cualquiera de los tres.
 *
 * Los modos viejos —grid, vertical, horizontal— siguen dibujándose para no
 * romper categorías creadas antes, pero no se ofrecen: "vertical" hacía justo
 * lo que ahora hace cualquier modo con un destacado adentro.
 */
const VITRINAS: { valor: ModoVitrina; texto: string }[] = [
  { valor: "carrusel", texto: "Horizontal — una fila que se corre de lado" },
  { valor: "dos", texto: "Vertical — dos productos por fila" },
  { valor: "bandas", texto: "Vertical — bandas a lo ancho, como servicios" },
];

/** Los modos viejos, para poder nombrarlos en la lista de secciones. */
const VITRINAS_VIEJAS: Record<string, string> = {
  grid: "Grilla de tarjetas (modo antiguo)",
  vertical: "Vitrina (modo antiguo)",
  horizontal: "Tarjetas con video (modo antiguo)",
};

/**
 * El catálogo entero en una pantalla: las secciones en su orden, y dentro de
 * cada una sus productos.
 *
 * Van juntos y no en dos pestañas porque el orden de una sección solo se
 * entiende viendo lo que tiene adentro: mover un café al principio es una
 * decisión sobre la sección, no sobre el café.
 */
export default function CatalogoAdmin() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<AdminCategoria[]>([]);
  const [productos, setProductos] = useState<AdminProducto[]>([]);
  const [abiertas, setAbiertas] = useState<Set<number>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [editandoCategoria, setEditandoCategoria] = useState<AdminCategoria | null>(null);
  // false = cerrado; null = sección nueva; un id = subcategoría de esa sección.
  const [creandoCategoria, setCreandoCategoria] = useState<false | null | number>(false);
  const [productoEnEdicion, setProductoEnEdicion] = useState<{
    producto: AdminProducto | null;
    categoriaId: number;
    /** Nace como kit: se entró por "+ Kit". */
    kit?: boolean;
  } | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [cs, ps] = await Promise.all([listarCategorias(), listarProductos()]);
      setCategorias(cs);
      setProductos(ps);
      setError("");
      // La primera vez se abre todo: con tres secciones, verlas cerradas
      // obliga a un clic para saber qué hay.
      setAbiertas((previas) => (previas.size === 0 ? new Set(cs.map((c) => c.id)) : previas));
    } catch (e) {
      if (e instanceof SesionVencida) {
        router.replace("/admin/login");
        return;
      }
      setError(e instanceof Error ? e.message : "No se pudo cargar el catálogo");
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    // Se carga desde el navegador y no en el servidor porque la petición va
    // firmada con el token de sessionStorage, que allá no existe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const deLaCategoria = (id: number) =>
    productos.filter((p) => p.categoria_id === id).sort((a, b) => a.orden - b.orden);

  // El árbol: las secciones en su orden, y las subcategorías colgando de la
  // suya. Llegan planas del backend porque una categoría es el mismo objeto
  // cuelgue de donde cuelgue.
  const secciones = categorias.filter((c) => c.padre_id === null);
  const subcategoriasDe = (id: number) => categorias.filter((c) => c.padre_id === id);

  /**
   * Reordena dentro de un grupo de hermanas.
   *
   * Se mandan SOLO los ids del grupo: el backend numera de cero en adelante, y
   * el orden de una subcategoría se cuenta entre sus hermanas, no contra las
   * secciones.
   */
  async function moverCategoria(grupo: AdminCategoria[], indice: number, direccion: -1 | 1) {
    const orden = [...grupo];
    const destino = indice + direccion;
    if (destino < 0 || destino >= orden.length) return;
    [orden[indice], orden[destino]] = [orden[destino], orden[indice]];

    // Optimista: la lista se reacomoda sin esperar al servidor. Se reemplaza
    // solo el grupo movido; el resto del árbol se queda donde estaba.
    const ids = new Set(orden.map((c) => c.id));
    let i = 0;
    setCategorias(categorias.map((c) => (ids.has(c.id) ? orden[i++] : c)));

    try {
      await reordenarCategorias(orden.map((c) => c.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo reordenar");
      cargar();
    }
  }

  async function moverProducto(categoriaId: number, indice: number, direccion: -1 | 1) {
    const lista = deLaCategoria(categoriaId);
    const destino = indice + direccion;
    [lista[indice], lista[destino]] = [lista[destino], lista[indice]];

    const nuevos = lista.map((p, i) => ({ ...p, orden: i }));
    setProductos((ps) => ps.map((p) => nuevos.find((n) => n.id === p.id) ?? p));

    try {
      await reordenarProductos(lista.map((p) => p.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo reordenar");
      cargar();
    }
  }

  async function quitarCategoria(c: AdminCategoria) {
    if (!confirm(`¿Borrar «${c.nombre}»?`)) return;
    try {
      await borrarCategoria(c.id);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo borrar");
    }
  }

  async function quitarProducto(p: AdminProducto) {
    if (!confirm(`¿Borrar «${p.nombre}»? También se borran sus fotos.`)) return;
    try {
      await borrarProducto(p.id);
      cargar();
    } catch (e) {
      // El producto puede estar dentro de un kit o ser el café de una receta.
      // El backend no lo borra de una: dice dónde está enganchado y espera
      // que se confirme, para que el kit no amanezca con una pieza menos sin
      // que nadie se haya enterado.
      if (e instanceof NecesitaConfirmacion) {
        if (!confirm(`${e.message}\n\n¿Borrarlo de todos modos?`)) return;
        try {
          await borrarProducto(p.id, true);
          cargar();
        } catch (e2) {
          setError(e2 instanceof Error ? e2.message : "No se pudo borrar");
        }
        return;
      }
      setError(e instanceof Error ? e.message : "No se pudo borrar");
    }
  }

  if (cargando) {
    return <p style={{ color: COLOR.suave, fontSize: 14 }}>Cargando el catálogo…</p>;
  }

  return (
    <>
      <Cabecera
        titulo="Catálogo"
        bajada="Las secciones se dibujan en la página en este mismo orden, y los productos dentro de cada una también."
      >
        <Boton tono="solido" onClick={() => setCreandoCategoria(null)}>
          + Sección
        </Boton>
      </Cabecera>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Aviso>{error}</Aviso>
        </div>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        {secciones.map((c, i) => {
          const suyos = deLaCategoria(c.id);
          const estantes = subcategoriasDe(c.id);
          const abierta = abiertas.has(c.id);
          const cuantos = suyos.length + estantes.reduce((n, sub) => n + deLaCategoria(sub.id).length, 0);

          return (
            <section
              key={c.id}
              style={{
                background: COLOR.papel,
                border: `1px solid ${COLOR.linea}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {/* La cabecera de la sección va sobre fondo gris y con una barra
                  de tinta a la izquierda. Antes las tres alturas —sección,
                  subcategoría y producto— eran filas casi blancas separadas por
                  una raya de un píxel, y con la sección abierta no se veía
                  dónde terminaba una y empezaba la otra. La barra se pone
                  ámbar si la sección está oculta: se nota de un vistazo, sin
                  tener que leer el rótulo. */}
              <header
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  background: COLOR.fondo,
                  borderLeft: `3px solid ${c.activa ? COLOR.tinta : COLOR.aviso}`,
                }}
              >
                <Flechas
                  onSubir={() => moverCategoria(secciones, i, -1)}
                  onBajar={() => moverCategoria(secciones, i, 1)}
                  arribaBloqueada={i === 0}
                  abajoBloqueada={i === secciones.length - 1}
                />

                <button
                  onClick={() =>
                    setAbiertas((s) => {
                      const n = new Set(s);
                      if (n.has(c.id)) n.delete(c.id);
                      else n.add(c.id);
                      return n;
                    })
                  }
                  style={{ flex: 1, minWidth: 0, textAlign: "left", border: "none", background: "none", cursor: "pointer", padding: 0 }}
                >
                  <span style={{ ...rotulo, marginBottom: 3 }}>Sección</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Punta abierta={abierta} />
                    <span style={{ fontFamily: "var(--font-serif)", fontSize: 19 }}>{c.nombre}</span>
                    {!c.activa && (
                      <span style={{ ...rotulo, marginBottom: 0, color: COLOR.aviso }}>oculta</span>
                    )}
                  </div>
                  <div style={{ marginTop: 2, marginLeft: 17, fontSize: 12.5, color: COLOR.suave }}>
                    {cuantos} {cuantos === 1 ? "producto" : "productos"}
                    {estantes.length > 0 &&
                      ` en ${estantes.length} ${estantes.length === 1 ? "subcategoría" : "subcategorías"}`}{" "}
                    ·{" "}
                    {VITRINAS.find((v) => v.valor === c.modo_vitrina)?.texto ??
                      VITRINAS_VIEJAS[c.modo_vitrina] ??
                      c.modo_vitrina}
                  </div>
                </button>

                <Boton chico onClick={() => setProductoEnEdicion({ producto: null, categoriaId: c.id })}>
                  + Producto
                </Boton>
                {/* Un kit es un producto más de la sección, solo que se arma
                    con otro formulario: por eso se crea desde acá. */}
                <Boton chico tono="plano" onClick={() => setProductoEnEdicion({ producto: null, categoriaId: c.id, kit: true })}>
                  + Kit
                </Boton>
                <Boton chico tono="plano" onClick={() => setCreandoCategoria(c.id)}>
                  + Subcategoría
                </Boton>
                <Boton chico tono="plano" onClick={() => setEditandoCategoria(c)}>
                  Editar
                </Boton>
              </header>

              {abierta && (
                <div style={{ borderTop: `1px solid ${COLOR.linea}` }}>
                  {cuantos === 0 && estantes.length === 0 && (
                    <p style={{ margin: 0, padding: "14px 16px", fontSize: 13, color: COLOR.suave }}>
                      Esta sección está vacía.{" "}
                      <button
                        onClick={() => quitarCategoria(c)}
                        style={{ border: "none", background: "none", color: COLOR.peligro, cursor: "pointer", padding: 0, fontSize: 13 }}
                      >
                        Borrarla
                      </button>
                    </p>
                  )}

                  {/* Primero lo que cuelga directo de la sección: en la página
                      también va arriba y sin subtítulo. */}
                  {suyos.map((p, j) => (
                    <FilaProducto
                      key={p.id}
                      producto={p}
                      primera={j === 0}
                      arribaBloqueada={j === 0}
                      abajoBloqueada={j === suyos.length - 1}
                      onSubir={() => moverProducto(c.id, j, -1)}
                      onBajar={() => moverProducto(c.id, j, 1)}
                      onEditar={() => setProductoEnEdicion({ producto: p, categoriaId: c.id })}
                      onBorrar={() => quitarProducto(p)}
                    />
                  ))}

                  {/* Y después cada estante, con su propia cabecera. */}
                  {estantes.map((sub, k) => {
                    const deEste = deLaCategoria(sub.id);

                    return (
                      <div key={sub.id} style={{ borderTop: `1px solid ${COLOR.linea}` }}>
                        {/* La subcategoría cuelga de la sección: va sangrada y
                            con una línea vertical que la ata a su madre, en vez
                            de ser otra banda del mismo ancho. */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 16px 10px 22px",
                            marginLeft: 12,
                            borderLeft: `2px solid ${COLOR.linea}`,
                            background: COLOR.papel,
                          }}
                        >
                          <Flechas
                            onSubir={() => moverCategoria(estantes, k, -1)}
                            onBajar={() => moverCategoria(estantes, k, 1)}
                            arribaBloqueada={k === 0}
                            abajoBloqueada={k === estantes.length - 1}
                          />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ ...rotulo, marginBottom: 3 }}>Subcategoría</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontFamily: "var(--font-serif)", fontSize: 15 }}>{sub.nombre}</span>
                              {!sub.activa && (
                                <span style={{ ...rotulo, marginBottom: 0, color: COLOR.aviso }}>oculta</span>
                              )}
                            </div>
                            <div style={{ marginTop: 2, fontSize: 12, color: COLOR.suave }}>
                              {deEste.length} {deEste.length === 1 ? "producto" : "productos"}
                            </div>
                          </div>

                          <Boton chico onClick={() => setProductoEnEdicion({ producto: null, categoriaId: sub.id })}>
                            + Producto
                          </Boton>
                          <Boton chico tono="plano" onClick={() => setEditandoCategoria(sub)}>
                            Editar
                          </Boton>
                          {deEste.length === 0 && (
                            <Boton chico tono="peligro" onClick={() => quitarCategoria(sub)}>
                              Borrar
                            </Boton>
                          )}
                        </div>

                        {deEste.map((p, j) => (
                          <FilaProducto
                            key={p.id}
                            producto={p}
                            primera={false}
                            sangrada
                            arribaBloqueada={j === 0}
                            abajoBloqueada={j === deEste.length - 1}
                            onSubir={() => moverProducto(sub.id, j, -1)}
                            onBajar={() => moverProducto(sub.id, j, 1)}
                            onEditar={() => setProductoEnEdicion({ producto: p, categoriaId: sub.id })}
                            onBorrar={() => quitarProducto(p)}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {(creandoCategoria !== false || editandoCategoria) && (
        <FormularioCategoria
          categoria={editandoCategoria}
          padreInicial={typeof creandoCategoria === "number" ? creandoCategoria : null}
          secciones={secciones}
          onCerrar={() => {
            setCreandoCategoria(false);
            setEditandoCategoria(null);
          }}
          onGuardado={() => {
            setCreandoCategoria(false);
            setEditandoCategoria(null);
            cargar();
          }}
        />
      )}

      {productoEnEdicion && (
        <FormularioProducto
          producto={productoEnEdicion.producto}
          categorias={categorias}
          categoriaPorDefecto={productoEnEdicion.categoriaId}
          kitInicial={productoEnEdicion.kit}
          onCerrar={() => setProductoEnEdicion(null)}
          onGuardado={() => {
            setProductoEnEdicion(null);
            cargar();
          }}
        />
      )}
    </>
  );
}

/** Alta y edición de una sección. */
/**
 * Un producto dentro del panel del catálogo.
 *
 * Salió a componente cuando llegaron las subcategorías: la misma fila se pinta
 * colgada de la sección y colgada de un estante, y tenerla dos veces era
 * garantía de que una de las dos se quedara vieja.
 */
function FilaProducto({
  producto: p,
  primera,
  sangrada = false,
  arribaBloqueada,
  abajoBloqueada,
  onSubir,
  onBajar,
  onEditar,
  onBorrar,
}: {
  producto: AdminProducto;
  primera: boolean;
  /** Dentro de un estante va con sangría, para que se vea de quién cuelga. */
  sangrada?: boolean;
  arribaBloqueada: boolean;
  abajoBloqueada: boolean;
  onSubir: () => void;
  onBajar: () => void;
  onEditar: () => void;
  onBorrar: () => void;
}) {
  const [abierto, setAbierto] = useState(false);

  // El desglose por sede solo vale la pena si el inventario está repartido.
  const conStock = p.stock_por_sede.filter((s) => s.stock > 0);

  const ficha: [string, string][] = [];
  if (p.finca) ficha.push(["Finca", p.finca]);
  if (p.productor) ficha.push(["Productor", p.productor]);
  if (p.region) ficha.push(["Región", p.region]);
  if (p.altitud_msnm) ficha.push(["Altura", `${p.altitud_msnm.toLocaleString("es-CO")} msnm`]);
  if (p.variedad) ficha.push(["Variedad", p.variedad]);
  if (p.proceso) ficha.push(["Proceso", p.proceso]);
  if (p.tueste) ficha.push(["Tueste", p.tueste]);
  if (p.puntaje_sca) ficha.push(["Puntaje SCA", String(p.puntaje_sca)]);
  if (p.es_cafe && p.gramos > 0) ficha.push(["Peso", `${p.gramos} g`]);
  if (p.controla_stock) ficha.push(["Avisar bajo", `${p.stock_minimo} u.`]);

  return (
    <div style={{ borderTop: primera ? "none" : `1px solid ${COLOR.linea}` }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          paddingLeft: sangrada ? 34 : 16,
          background: abierto ? COLOR.fondo : sangrada ? COLOR.papel : undefined,
        }}
      >
        <Flechas
          onSubir={onSubir}
          onBajar={onBajar}
          arribaBloqueada={arribaBloqueada}
          abajoBloqueada={abajoBloqueada}
        />

        {/* Todo lo que describe al producto abre la ficha; los botones de la
            derecha siguen haciendo lo suyo. Antes había que abrir el formulario
            entero —un modal— solo para recordar de qué finca era un café. */}
        <button
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: 12,
            textAlign: "left",
            border: "none",
            background: "none",
            cursor: "pointer",
            padding: 0,
            font: "inherit",
            color: "inherit",
          }}
        >
          <Punta abierta={abierto} />

          <div
            style={{
              width: 42,
              height: 42,
              flexShrink: 0,
              borderRadius: 8,
              background: COLOR.fondo,
              border: `1px solid ${COLOR.linea}`,
              overflow: "hidden",
            }}
          >
            {p.imagen_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imagen_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{p.nombre}</span>
              {p.es_kit && <span style={{ ...rotulo, marginBottom: 0 }}>kit</span>}
              {!p.activo && <span style={{ ...rotulo, marginBottom: 0, color: COLOR.aviso }}>oculto</span>}
              {p.destacado && <span style={{ ...rotulo, marginBottom: 0 }}>destacado</span>}
            </div>
            <div style={{ marginTop: 2, fontSize: 12.5, color: COLOR.suave, fontFamily: "var(--font-mono)" }}>
              ${p.precio_cop.toLocaleString("es-CO")}
              {p.controla_stock ? (
                <>
                  {" · "}
                  <span style={{ color: p.agotado ? COLOR.peligro : p.por_acabarse ? COLOR.aviso : COLOR.bien }}>
                    {p.agotado ? "agotado" : `${p.stock} u.`}
                  </span>
                </>
              ) : (
                " · servicio"
              )}
            </div>
          </div>
        </button>

        <Boton chico tono="plano" onClick={onEditar}>
          Editar
        </Boton>
        <Boton chico tono="peligro" onClick={onBorrar}>
          Borrar
        </Boton>
      </div>

      {abierto && (
        <div
          style={{
            padding: "2px 16px 16px",
            paddingLeft: sangrada ? 34 + 26 : 16 + 26,
            background: COLOR.fondo,
            display: "grid",
            gap: 14,
          }}
        >
          {p.descripcion ? (
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: COLOR.suave, maxWidth: 620 }}>
              {p.descripcion}
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: COLOR.rotulo, fontStyle: "italic" }}>
              Sin descripción.
            </p>
          )}

          {ficha.length > 0 && (
            <div>
              <span style={rotulo}>{p.es_cafe ? "Ficha de origen" : "Datos"}</span>
              <dl
                style={{
                  margin: 0,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: "8px 18px",
                }}
              >
                {ficha.map(([clave, valor]) => (
                  <div key={clave}>
                    <dt style={{ fontSize: 11, color: COLOR.rotulo }}>{clave}</dt>
                    <dd style={{ margin: 0, fontSize: 13, fontFamily: "var(--font-mono)" }}>{valor}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {p.notas.length > 0 && (
            <div>
              <span style={rotulo}>Notas de cata</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {p.notas.map((n) => (
                  <span
                    key={n}
                    style={{
                      fontSize: 12,
                      padding: "3px 9px",
                      borderRadius: 999,
                      background: COLOR.papel,
                      border: `1px solid ${COLOR.linea}`,
                    }}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* El total que se ve arriba no dice dónde están las unidades, y esa
              es justo la pregunta cuando hay que despachar. */}
          {p.controla_stock && (
            <div>
              <span style={rotulo}>Inventario por sede</span>
              {conStock.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: COLOR.peligro }}>Sin unidades en ninguna sede.</p>
              ) : (
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                  {conStock.map((s) => (
                    <span key={s.sede}>
                      {s.sede}: <strong style={{ fontWeight: 600 }}>{s.stock}</strong>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {(p.componentes.length > 0 || p.piezas.length > 0) && (
            <div>
              <span style={rotulo}>Qué trae adentro</span>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: COLOR.suave, lineHeight: 1.7 }}>
                {p.componentes.map((c) => (
                  <li key={`c${c.id}`}>{c.nombre}</li>
                ))}
                {/* Las piezas no se venden sueltas: se marcan para que no se
                    confundan con los productos del catálogo que sí. */}
                {p.piezas.map((z) => (
                  <li key={`z${z.id}`}>
                    {z.nombre}{" "}
                    <span style={{ color: COLOR.rotulo, fontSize: 12 }}>
                      — pieza{!z.imagen_url && ", sin foto"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.medios.length > 1 && (
            <div>
              <span style={rotulo}>
                {p.medios.length} {p.medios.length === 1 ? "archivo" : "archivos"}
              </span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {p.medios.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 6,
                      overflow: "hidden",
                      border: `1px solid ${COLOR.linea}`,
                      background: COLOR.papel,
                      position: "relative",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.tipo === "video" ? (m.poster_url ?? "") : m.url}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    {m.tipo === "video" && (
                      <span
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "grid",
                          placeItems: "center",
                          background: "rgba(0,0,0,.35)",
                          color: "#FFF",
                          fontSize: 14,
                        }}
                      >
                        ▶
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * La puntita que gira: cerrada apunta a la derecha, abierta hacia abajo.
 *
 * Es lo único que le dice a quien mira que la fila se puede abrir. Sin ella el
 * clic existía pero nadie lo encontraba.
 */
function Punta({ abierta }: { abierta: boolean }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 10 10"
      aria-hidden="true"
      style={{
        flexShrink: 0,
        transform: abierta ? "rotate(90deg)" : "none",
        transition: "transform .18s ease",
        color: COLOR.rotulo,
      }}
    >
      <path d="M3 1l5 4-5 4z" fill="currentColor" />
    </svg>
  );
}

function FormularioCategoria({
  categoria,
  padreInicial = null,
  secciones,
  onCerrar,
  onGuardado,
}: {
  categoria: AdminCategoria | null;
  /** Con quién nace: viene puesto al crearla desde adentro de una sección. */
  padreInicial?: number | null;
  /** Las secciones de las que puede colgar. */
  secciones: AdminCategoria[];
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [nombre, setNombre] = useState(categoria?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(categoria?.descripcion ?? "");
  const [modo, setModo] = useState<ModoVitrina>(categoria?.modo_vitrina ?? "grid");
  const [padre, setPadre] = useState<string>(
    String(categoria?.padre_id ?? padreInicial ?? ""),
  );
  const [activa, setActiva] = useState(categoria?.activa ?? true);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [inicial] = useState(() =>
    JSON.stringify([
      categoria?.nombre ?? "",
      categoria?.descripcion ?? "",
      categoria?.modo_vitrina ?? "grid",
      String(categoria?.padre_id ?? padreInicial ?? ""),
      categoria?.activa ?? true,
    ]),
  );

  // Una subcategoría se dibuja con el modo de su sección, así que el selector
  // de vitrina sobra y solo confundiría: mostraría una opción que no hace nada.
  const esSub = padre !== "";

  async function guardar() {
    setGuardando(true);
    setError("");
    try {
      const datos = {
        nombre,
        descripcion,
        modo_vitrina: modo,
        activa,
        padre_id: padre === "" ? null : Number(padre),
      };
      if (categoria) await editarCategoria(categoria.id, datos);
      else await crearCategoria(datos);
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Hoja
      titulo={categoria ? categoria.nombre : esSub ? "Subcategoría nueva" : "Sección nueva"}
      onCerrar={onCerrar}
      sucio={JSON.stringify([nombre, descripcion, modo, padre, activa]) !== inicial}
      pie={
        <>
          <Boton tono="plano" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton tono="solido" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar"}
          </Boton>
        </>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        {error && <Aviso>{error}</Aviso>}

        <Campo etiqueta="Nombre">
          <input style={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </Campo>

        <Campo
          etiqueta="Pertenece a"
          nota="Una sección se ve en el menú de arriba. Una subcategoría es un estante dentro de su sección — «Básculas» dentro de «Artefactos»."
        >
          <select style={campo} value={padre} onChange={(e) => setPadre(e.target.value)}>
            <option value="">Es una sección</option>
            {secciones
              // No puede colgarse de sí misma.
              .filter((s) => s.id !== categoria?.id)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  Subcategoría de {s.nombre}
                </option>
              ))}
          </select>
        </Campo>

        <Campo etiqueta="Descripción" nota="Aparece bajo el título de la sección en la página.">
          <textarea
            style={{ ...campo, minHeight: 66, resize: "vertical", fontFamily: "var(--font-sans)" }}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </Campo>

        {esSub ? (
          <p style={{ margin: 0, fontSize: 12.5, color: COLOR.suave }}>
            Una subcategoría se dibuja con el mismo modo de su sección: dos modos distintos adentro
            de la misma sección se leerían como dos secciones mal pegadas.
          </p>
        ) : (
        <Campo
          etiqueta="Cómo se muestra"
          nota="Solo cambia lo que NO está destacado: los destacados salen en grande arriba, en cualquiera de los tres. Dale un modo distinto a cada sección — si dos usan el mismo, la página se siente repetida."
        >
          <select style={campo} value={modo} onChange={(e) => setModo(e.target.value as ModoVitrina)}>
            {VITRINAS.map((v) => (
              <option key={v.valor} value={v.valor}>
                {v.texto}
              </option>
            ))}
            {/* Si la sección todavía usa un modo viejo, hay que poder verlo
                seleccionado en vez de que el selector muestre otro por defecto
                y lo cambie sin querer al guardar. */}
            {VITRINAS_VIEJAS[modo] && <option value={modo}>{VITRINAS_VIEJAS[modo]}</option>}
          </select>
        </Campo>
        )}

        <Interruptor
          etiqueta="Visible en la página"
          nota="Apagada desaparece del sitio, pero sus productos se conservan."
          valor={activa}
          onChange={setActiva}
        />
      </div>
    </Hoja>
  );
}
