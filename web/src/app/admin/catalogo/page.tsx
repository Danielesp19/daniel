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
  SesionVencida,
  type AdminCategoria,
  type AdminProducto,
  type ModoVitrina,
} from "@/lib/admin-api";
import { COLOR, campo, rotulo, Campo, Boton, Cabecera, Aviso, Flechas, Hoja, Interruptor } from "@/components/admin/ui";
import FormularioProducto from "@/components/admin/FormularioProducto";

const VITRINAS: { valor: ModoVitrina; texto: string }[] = [
  { valor: "grid", texto: "Grilla de tarjetas" },
  { valor: "carrusel", texto: "Carrusel — una fila que se corre" },
  { valor: "vertical", texto: "Vitrina — uno en grande y el resto en grilla" },
  { valor: "horizontal", texto: "Tarjetas con video" },
];

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
  const [creandoCategoria, setCreandoCategoria] = useState(false);
  const [productoEnEdicion, setProductoEnEdicion] = useState<{ producto: AdminProducto | null; categoriaId: number } | null>(null);

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

  async function moverCategoria(indice: number, direccion: -1 | 1) {
    const orden = [...categorias];
    const destino = indice + direccion;
    [orden[indice], orden[destino]] = [orden[destino], orden[indice]];
    setCategorias(orden); // optimista: la lista se reacomoda sin esperar
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
    if (!confirm(`¿Borrar la sección «${c.nombre}»?`)) return;
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
        <Boton tono="solido" onClick={() => setCreandoCategoria(true)}>
          + Sección
        </Boton>
      </Cabecera>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Aviso>{error}</Aviso>
        </div>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        {categorias.map((c, i) => {
          const suyos = deLaCategoria(c.id);
          const abierta = abiertas.has(c.id);

          return (
            <section key={c.id} style={{ background: COLOR.papel, border: `1px solid ${COLOR.linea}`, borderRadius: 12 }}>
              <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
                <Flechas
                  onSubir={() => moverCategoria(i, -1)}
                  onBajar={() => moverCategoria(i, 1)}
                  arribaBloqueada={i === 0}
                  abajoBloqueada={i === categorias.length - 1}
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-serif)", fontSize: 19 }}>{c.nombre}</span>
                    {!c.activa && (
                      <span style={{ ...rotulo, marginBottom: 0, color: COLOR.aviso }}>oculta</span>
                    )}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12.5, color: COLOR.suave }}>
                    {suyos.length} {suyos.length === 1 ? "producto" : "productos"} ·{" "}
                    {VITRINAS.find((v) => v.valor === c.modo_vitrina)?.texto ?? c.modo_vitrina}
                  </div>
                </button>

                <Boton chico onClick={() => setProductoEnEdicion({ producto: null, categoriaId: c.id })}>
                  + Producto
                </Boton>
                <Boton chico tono="plano" onClick={() => setEditandoCategoria(c)}>
                  Editar
                </Boton>
              </header>

              {abierta && (
                <div style={{ borderTop: `1px solid ${COLOR.linea}` }}>
                  {suyos.length === 0 && (
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

                  {suyos.map((p, j) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 16px",
                        borderTop: j === 0 ? "none" : `1px solid ${COLOR.linea}`,
                      }}
                    >
                      <Flechas
                        onSubir={() => moverProducto(c.id, j, -1)}
                        onBajar={() => moverProducto(c.id, j, 1)}
                        arribaBloqueada={j === 0}
                        abajoBloqueada={j === suyos.length - 1}
                      />

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

                      <Boton chico tono="plano" onClick={() => setProductoEnEdicion({ producto: p, categoriaId: c.id })}>
                        Editar
                      </Boton>
                      <Boton chico tono="peligro" onClick={() => quitarProducto(p)}>
                        Borrar
                      </Boton>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {(creandoCategoria || editandoCategoria) && (
        <FormularioCategoria
          categoria={editandoCategoria}
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
function FormularioCategoria({
  categoria,
  onCerrar,
  onGuardado,
}: {
  categoria: AdminCategoria | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [nombre, setNombre] = useState(categoria?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(categoria?.descripcion ?? "");
  const [modo, setModo] = useState<ModoVitrina>(categoria?.modo_vitrina ?? "grid");
  const [activa, setActiva] = useState(categoria?.activa ?? true);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    setError("");
    try {
      const datos = { nombre, descripcion, modo_vitrina: modo, activa };
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
      titulo={categoria ? categoria.nombre : "Sección nueva"}
      onCerrar={onCerrar}
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

        <Campo etiqueta="Descripción" nota="Aparece bajo el título de la sección en la página.">
          <textarea
            style={{ ...campo, minHeight: 66, resize: "vertical", fontFamily: "var(--font-sans)" }}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </Campo>

        <Campo etiqueta="Cómo se muestra" nota="Dale un modo distinto a cada sección: si dos usan el mismo, la página se siente repetida.">
          <select style={campo} value={modo} onChange={(e) => setModo(e.target.value as ModoVitrina)}>
            {VITRINAS.map((v) => (
              <option key={v.valor} value={v.valor}>
                {v.texto}
              </option>
            ))}
          </select>
        </Campo>

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
