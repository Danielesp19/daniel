"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
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
  // La navegación: null y null es la lista de secciones. Es un camino, no un
  // conjunto de abiertas — se entra a un sitio a la vez, como en cualquier
  // explorador de archivos.
  const [enSeccion, setEnSeccion] = useState<number | null>(null);
  const [enSubcategoria, setEnSubcategoria] = useState<number | null>(null);
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

  // Los dos formularios en hoja flotante. Van en una variable porque los tres
  // niveles de la navegación terminan pintándolos igual, y repetirlos era
  // garantía de que uno se quedara viejo.
  const formularios = (
    <>
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

  // Dónde estoy parado. null = la lista de secciones; con sección = adentro
  // de ella; con las dos = adentro de una subcategoría.
  const seccion = secciones.find((c) => c.id === enSeccion) ?? null;
  const subcategoria = categorias.find((c) => c.id === enSubcategoria) ?? null;

  if (cargando) {
    return <p style={{ color: COLOR.suave, fontSize: 14 }}>Cargando el catálogo…</p>;
  }

  const avisoError = error && (
    <div style={{ marginBottom: 16 }}>
      <Aviso>{error}</Aviso>
    </div>
  );

  // ── Nivel 3: los productos de una subcategoría ──────────────────────────
  if (subcategoria && seccion) {
    const suyos = deLaCategoria(subcategoria.id);

    return (
      <>
        <Migas
          pasos={[
            { texto: "Catálogo", ir: () => { setEnSeccion(null); setEnSubcategoria(null); } },
            { texto: seccion.nombre, ir: () => setEnSubcategoria(null) },
          ]}
          titulo={subcategoria.nombre}
          oculta={!subcategoria.activa}
        >
          <Boton tono="solido" onClick={() => setProductoEnEdicion({ producto: null, categoriaId: subcategoria.id })}>
            + Producto
          </Boton>
          <Boton tono="plano" onClick={() => setProductoEnEdicion({ producto: null, categoriaId: subcategoria.id, kit: true })}>
            + Kit
          </Boton>
          <Boton tono="plano" onClick={() => setEditandoCategoria(subcategoria)}>Editar</Boton>
        </Migas>

        {avisoError}

        <Lista vacia="Esta subcategoría no tiene productos todavía.">
          {suyos.map((prod, i) => (
            <FilaProducto
              key={prod.id}
              producto={prod}
              primera={i === 0}
              arribaBloqueada={i === 0}
              abajoBloqueada={i === suyos.length - 1}
              onSubir={() => moverProducto(subcategoria.id, i, -1)}
              onBajar={() => moverProducto(subcategoria.id, i, 1)}
              onEditar={() => setProductoEnEdicion({ producto: prod, categoriaId: subcategoria.id })}
              onBorrar={() => quitarProducto(prod)}
            />
          ))}
        </Lista>

        {suyos.length === 0 && (
          <BotonBorrar onClick={() => { quitarCategoria(subcategoria); setEnSubcategoria(null); }}>
            Borrar esta subcategoría
          </BotonBorrar>
        )}

        {formularios}
      </>
    );
  }

  // ── Nivel 2: lo que hay dentro de una sección ───────────────────────────
  if (seccion) {
    const estantes = subcategoriasDe(seccion.id);
    const sueltos = deLaCategoria(seccion.id);

    return (
      <>
        <Migas
          pasos={[{ texto: "Catálogo", ir: () => setEnSeccion(null) }]}
          titulo={seccion.nombre}
          oculta={!seccion.activa}
        >
          <Boton tono="solido" onClick={() => setProductoEnEdicion({ producto: null, categoriaId: seccion.id })}>
            + Producto
          </Boton>
          <Boton tono="plano" onClick={() => setProductoEnEdicion({ producto: null, categoriaId: seccion.id, kit: true })}>
            + Kit
          </Boton>
          <Boton tono="plano" onClick={() => setCreandoCategoria(seccion.id)}>+ Subcategoría</Boton>
          <Boton tono="plano" onClick={() => setEditandoCategoria(seccion)}>Editar</Boton>
        </Migas>

        {avisoError}

        {/* Las subcategorías primero: son carpetas, y una carpeta se abre
            antes de ponerse a mirar los papeles sueltos. */}
        {estantes.length > 0 && (
          <>
            <h3 style={rotuloSeccion}>Subcategorías</h3>
            <Lista>
              {estantes.map((sub, i) => (
                <FilaCarpeta
                  key={sub.id}
                  nombre={sub.nombre}
                  activa={sub.activa}
                  primera={i === 0}
                  arribaBloqueada={i === 0}
                  abajoBloqueada={i === estantes.length - 1}
                  onSubir={() => moverCategoria(estantes, i, -1)}
                  onBajar={() => moverCategoria(estantes, i, 1)}
                  onAbrir={() => setEnSubcategoria(sub.id)}
                />
              ))}
            </Lista>
          </>
        )}

        {/* Y después lo que cuelga directo de la sección, que en la página
            también va arriba y sin subtítulo. */}
        {sueltos.length > 0 && (
          <>
            <h3 style={rotuloSeccion}>{estantes.length > 0 ? "Productos sueltos" : "Productos"}</h3>
            <Lista>
              {sueltos.map((prod, i) => (
                <FilaProducto
                  key={prod.id}
                  producto={prod}
                  primera={i === 0}
                  arribaBloqueada={i === 0}
                  abajoBloqueada={i === sueltos.length - 1}
                  onSubir={() => moverProducto(seccion.id, i, -1)}
                  onBajar={() => moverProducto(seccion.id, i, 1)}
                  onEditar={() => setProductoEnEdicion({ producto: prod, categoriaId: seccion.id })}
                  onBorrar={() => quitarProducto(prod)}
                />
              ))}
            </Lista>
          </>
        )}

        {estantes.length === 0 && sueltos.length === 0 && (
          <>
            <Lista vacia="Esta sección está vacía." />
            <BotonBorrar onClick={() => { quitarCategoria(seccion); setEnSeccion(null); }}>
              Borrar esta sección
            </BotonBorrar>
          </>
        )}

        {formularios}
      </>
    );
  }

  // ── Nivel 1: las secciones ──────────────────────────────────────────────
  return (
    <>
      <Cabecera
        titulo="Catálogo"
        bajada="Las secciones se dibujan en la página en este mismo orden. Entra en una para ver lo que tiene adentro."
      >
        <Boton tono="solido" onClick={() => setCreandoCategoria(null)}>+ Sección</Boton>
      </Cabecera>

      {avisoError}

      <Lista vacia="Todavía no hay secciones. Crea la primera con «+ Sección».">
        {secciones.map((c, i) => (
          <FilaCarpeta
            key={c.id}
            nombre={c.nombre}
            activa={c.activa}
            primera={i === 0}
            grande
            arribaBloqueada={i === 0}
            abajoBloqueada={i === secciones.length - 1}
            onSubir={() => moverCategoria(secciones, i, -1)}
            onBajar={() => moverCategoria(secciones, i, 1)}
            onAbrir={() => setEnSeccion(c.id)}
          />
        ))}
      </Lista>

      {formularios}
    </>
  );
}

/** El rótulo que separa las subcategorías de los productos sueltos. */
const rotuloSeccion: CSSProperties = {
  ...rotulo,
  margin: "22px 0 8px",
};

/**
 * La caja blanca que envuelve una lista de filas.
 *
 * Con `vacia`, dice eso en vez de dibujar un marco sin nada adentro: una caja
 * vacía se lee como algo que no cargó.
 */
function Lista({ children, vacia }: { children?: React.ReactNode; vacia?: string }) {
  const hayAlgo = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <div style={{ background: COLOR.papel, border: `1px solid ${COLOR.linea}`, borderRadius: 12, overflow: "hidden" }}>
      {hayAlgo ? children : (
        <p style={{ margin: 0, padding: "18px 16px", fontSize: 13.5, color: COLOR.suave }}>{vacia}</p>
      )}
    </div>
  );
}

/**
 * La cabecera de adentro: por dónde vine, dónde estoy y qué puedo hacer acá.
 *
 * El camino de vuelta va arriba y en chico; el nombre del sitio donde estoy,
 * grande. Es el orden en que se lee: primero "¿dónde estoy?", y solo si me
 * equivoqué busco cómo volver.
 */
function Migas({
  pasos,
  titulo,
  oculta,
  children,
}: {
  pasos: { texto: string; ir: () => void }[];
  titulo: string;
  oculta?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <header style={{ marginBottom: 18 }}>
      <nav style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 13 }}>
        {pasos.map((paso, i) => (
          <span key={paso.texto} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {i > 0 && <span style={{ color: COLOR.rotulo }}>/</span>}
            <button
              onClick={paso.ir}
              style={{ border: "none", background: "none", padding: 0, cursor: "pointer", color: COLOR.suave, font: "inherit" }}
            >
              {i === 0 ? `← ${paso.texto}` : paso.texto}
            </button>
          </span>
        ))}
      </nav>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 400 }}>{titulo}</h2>
        {oculta && <span style={{ ...rotulo, marginBottom: 0, color: COLOR.aviso }}>oculta</span>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>{children}</div>
      </div>
    </header>
  );
}

/**
 * Una carpeta: una sección o una subcategoría. Se entra con un clic.
 *
 * NO dice cuántos productos tiene ni muestra su descripción. Ese recuento
 * llenaba la fila de un dato que no ayuda a decidir a cuál entrar —quien
 * administra busca por nombre— y la descripción es texto largo que empujaba
 * las filas al doble de alto.
 */
function FilaCarpeta({
  nombre,
  activa,
  primera,
  grande = false,
  arribaBloqueada,
  abajoBloqueada,
  onSubir,
  onBajar,
  onAbrir,
}: {
  nombre: string;
  activa: boolean;
  primera: boolean;
  /** Las secciones van un punto más grandes que las subcategorías. */
  grande?: boolean;
  arribaBloqueada: boolean;
  abajoBloqueada: boolean;
  onSubir: () => void;
  onBajar: () => void;
  onAbrir: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: grande ? "14px 16px" : "12px 16px",
        borderTop: primera ? "none" : `1px solid ${COLOR.linea}`,
      }}
    >
      <Flechas onSubir={onSubir} onBajar={onBajar} arribaBloqueada={arribaBloqueada} abajoBloqueada={abajoBloqueada} />

      {/* Toda la fila entra, no solo una flechita al final: es el gesto que
          espera quien viene de cualquier explorador de archivos. */}
      <button
        onClick={onAbrir}
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: 10,
          textAlign: "left",
          border: "none",
          background: "none",
          cursor: "pointer",
          padding: 0,
          font: "inherit",
          color: "inherit",
        }}
      >
        <span style={{ fontFamily: "var(--font-serif)", fontSize: grande ? 19 : 16 }}>{nombre}</span>
        {!activa && <span style={{ ...rotulo, marginBottom: 0, color: COLOR.aviso }}>oculta</span>}
        <span style={{ marginLeft: "auto", color: COLOR.rotulo, fontSize: 18, lineHeight: 1 }}>›</span>
      </button>
    </div>
  );
}

/** El borrar de una categoría vacía: suelto y abajo, lejos del resto. */
function BotonBorrar({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        marginTop: 14,
        border: "none",
        background: "none",
        color: COLOR.peligro,
        cursor: "pointer",
        padding: 0,
        fontSize: 13,
      }}
    >
      {children}
    </button>
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
