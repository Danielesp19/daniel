"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  crearProducto,
  editarProducto,
  borrarImagenExtra,
  moverStock,
  listarSedes,
  type AdminProducto,
  type AdminCategoria,
  type AdminSede,
} from "@/lib/admin-api";
import { COLOR, campo, rotulo, Campo, Boton, Interruptor, Aviso, Hoja, Etiqueta } from "./ui";

/** Lo que el formulario mantiene en memoria mientras se llena. */
interface Borrador {
  categoria_id: number;
  nombre: string;
  descripcion: string;
  precio_cop: string;
  gramos: string;
  controla_stock: boolean;
  stock_minimo: string;
  finca: string;
  productor: string;
  region: string;
  altitud_msnm: string;
  variedad: string;
  proceso: string;
  tueste: string;
  notas: string[];
  puntaje_sca: string;
  activo: boolean;
  destacado: boolean;
}

function borradorDe(producto: AdminProducto | null, categoriaId: number): Borrador {
  return {
    categoria_id: producto?.categoria_id ?? categoriaId,
    nombre: producto?.nombre ?? "",
    descripcion: producto?.descripcion ?? "",
    precio_cop: producto ? String(producto.precio_cop) : "",
    gramos: producto ? String(producto.gramos) : "0",
    controla_stock: producto?.controla_stock ?? true,
    stock_minimo: producto ? String(producto.stock_minimo) : "3",
    finca: producto?.finca ?? "",
    productor: producto?.productor ?? "",
    region: producto?.region ?? "",
    altitud_msnm: producto?.altitud_msnm ? String(producto.altitud_msnm) : "",
    variedad: producto?.variedad ?? "",
    proceso: producto?.proceso ?? "",
    tueste: producto?.tueste ?? "",
    notas: producto?.notas ?? [],
    puntaje_sca: producto?.puntaje_sca ? String(producto.puntaje_sca) : "",
    activo: producto?.activo ?? true,
    destacado: producto?.destacado ?? false,
  };
}

const seccion = { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))" } as const;

function Titulo({ children, nota }: { children: string; nota?: string }) {
  return (
    <div style={{ margin: "26px 0 12px", paddingTop: 18, borderTop: `1px solid ${COLOR.linea}` }}>
      <h3 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 17 }}>{children}</h3>
      {nota && <p style={{ margin: "4px 0 0", fontSize: 12.5, color: COLOR.suave }}>{nota}</p>}
    </div>
  );
}

/**
 * Alta y edición de un producto.
 *
 * El stock NO se edita aquí como un número suelto: vive por sede, y la columna
 * del producto es su suma. Por eso el bloque de inventario es una fila por
 * punto de venta y cada cambio va por su propio endpoint, que además deja el
 * antes y el después. Al crear todavía no hay producto al cual colgarle
 * unidades, así que ese bloque solo aparece al editar.
 */
export default function FormularioProducto({
  producto,
  categorias,
  categoriaPorDefecto,
  onCerrar,
  onGuardado,
}: {
  producto: AdminProducto | null;
  categorias: AdminCategoria[];
  categoriaPorDefecto: number;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [datos, setDatos] = useState<Borrador>(() => borradorDe(producto, categoriaPorDefecto));
  const [imagen, setImagen] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [extras, setExtras] = useState<File[]>([]);
  const [quitarImagen, setQuitarImagen] = useState(false);
  const [quitarVideo, setQuitarVideo] = useState(false);
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [sedes, setSedes] = useState<AdminSede[]>([]);
  const [stock, setStock] = useState<Record<number, string>>({});

  const editando = producto !== null;

  useEffect(() => {
    if (!editando) return;
    listarSedes()
      .then((ss) => {
        setSedes(ss);
        // El desglose viene por NOMBRE de sede desde la API; se cruza con la
        // lista para poder mandar el id al guardar.
        const porNombre = new Map(producto.stock_por_sede.map((s) => [s.sede, s.stock]));
        setStock(Object.fromEntries(ss.map((s) => [s.id, String(porNombre.get(s.nombre) ?? 0)])));
      })
      .catch(() => {});
  }, [editando, producto]);

  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setDatos((d) => ({ ...d, [k]: v }));

  function agregarNota(texto: string) {
    const limpia = texto.trim().replace(/,$/, "");
    if (!limpia || datos.notas.includes(limpia) || datos.notas.length >= 6) return;
    set("notas", [...datos.notas, limpia]);
    setNota("");
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError("");

    try {
      const cuerpo = new FormData();
      cuerpo.append("categoria_id", String(datos.categoria_id));
      cuerpo.append("nombre", datos.nombre);
      cuerpo.append("descripcion", datos.descripcion);
      cuerpo.append("precio_cop", datos.precio_cop || "0");
      cuerpo.append("gramos", datos.gramos || "0");
      cuerpo.append("controla_stock", datos.controla_stock ? "1" : "0");
      cuerpo.append("stock_minimo", datos.stock_minimo || "0");
      cuerpo.append("activo", datos.activo ? "1" : "0");
      cuerpo.append("destacado", datos.destacado ? "1" : "0");

      // Los campos de la ficha van vacíos cuando no aplican: el backend los
      // acepta como null y el catálogo no los pinta.
      for (const k of ["finca", "productor", "region", "variedad", "proceso", "tueste"] as const) {
        cuerpo.append(k, datos[k]);
      }
      if (datos.altitud_msnm) cuerpo.append("altitud_msnm", datos.altitud_msnm);
      if (datos.puntaje_sca) cuerpo.append("puntaje_sca", datos.puntaje_sca);

      // Sin notas hay que mandar el arreglo vacío explícito, o el backend
      // entiende "no me mandaron el campo" y deja las que ya había.
      if (datos.notas.length === 0) cuerpo.append("notas", "");
      datos.notas.forEach((n) => cuerpo.append("notas[]", n));

      if (imagen) cuerpo.append("imagen", imagen);
      if (video) cuerpo.append("video", video);
      extras.forEach((f) => cuerpo.append("imagenes_extra[]", f));
      if (quitarImagen) cuerpo.append("quitar_imagen", "1");
      if (quitarVideo) cuerpo.append("quitar_video", "1");

      const guardado = editando ? await editarProducto(producto.id, cuerpo) : await crearProducto(cuerpo);

      // El inventario va aparte de los campos: cada sede es un movimiento con
      // su propio antes/después.
      if (editando && datos.controla_stock) {
        const previo = new Map(producto.stock_por_sede.map((s) => [s.sede, s.stock]));
        for (const sede of sedes) {
          const nuevo = Number(stock[sede.id] ?? 0);
          if (nuevo !== (previo.get(sede.nombre) ?? 0)) {
            await moverStock(guardado.id, { sede_id: sede.id, accion: "fijar", cantidad: nuevo });
          }
        }
      }

      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function quitarExtra(id: number) {
    if (!producto) return;
    try {
      await borrarImagenExtra(producto.id, id);
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo borrar la foto");
    }
  }

  return (
    <Hoja
      titulo={editando ? producto.nombre : "Producto nuevo"}
      onCerrar={onCerrar}
      pie={
        <>
          <Boton tono="plano" onClick={onCerrar} type="button">
            Cancelar
          </Boton>
          <Boton tono="solido" onClick={guardar} disabled={guardando} type="submit">
            {guardando ? "Guardando…" : "Guardar"}
          </Boton>
        </>
      }
    >
      <form onSubmit={guardar} id="form-producto">
        {error && <div style={{ marginBottom: 14 }}><Aviso>{error}</Aviso></div>}

        <div style={seccion}>
          <Campo etiqueta="Nombre">
            <input style={campo} value={datos.nombre} onChange={(e) => set("nombre", e.target.value)} required />
          </Campo>

          <Campo etiqueta="Sección">
            <select style={campo} value={datos.categoria_id} onChange={(e) => set("categoria_id", Number(e.target.value))}>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Precio" nota="En pesos, entero y sin puntos: 48000">
            <input
              style={campo}
              type="number"
              min={0}
              value={datos.precio_cop}
              onChange={(e) => set("precio_cop", e.target.value)}
              required
            />
          </Campo>

          <Campo etiqueta="Peso de la bolsa" nota="En gramos. Deja 0 para equipos y servicios.">
            <input style={campo} type="number" min={0} value={datos.gramos} onChange={(e) => set("gramos", e.target.value)} />
          </Campo>
        </div>

        <div style={{ marginTop: 14 }}>
          <Campo etiqueta="Descripción">
            <textarea
              style={{ ...campo, minHeight: 78, resize: "vertical", fontFamily: "var(--font-sans)" }}
              value={datos.descripcion}
              onChange={(e) => set("descripcion", e.target.value)}
            />
          </Campo>
        </div>

        {/* ── Inventario ── */}
        <Titulo nota="Las unidades se cuentan por sede. El total del catálogo es su suma.">Inventario</Titulo>

        <div style={{ display: "grid", gap: 14 }}>
          <Interruptor
            etiqueta="Llevar inventario"
            nota="Apágalo para servicios (asesorías, barra para eventos): se agendan, no se agotan."
            valor={datos.controla_stock}
            onChange={(v) => set("controla_stock", v)}
          />

          {datos.controla_stock && (
            <>
              <div style={{ maxWidth: 220 }}>
                <Campo etiqueta="Avisar por debajo de" nota='Con esta cantidad o menos sale como "por acabarse".'>
                  <input
                    style={campo}
                    type="number"
                    min={0}
                    value={datos.stock_minimo}
                    onChange={(e) => set("stock_minimo", e.target.value)}
                  />
                </Campo>
              </div>

              {!editando ? (
                <p style={{ margin: 0, fontSize: 12.5, color: COLOR.suave }}>
                  Guarda el producto primero y podrás repartir sus unidades entre las sedes.
                </p>
              ) : (
                <div style={{ border: `1px solid ${COLOR.linea}`, borderRadius: 10, overflow: "hidden" }}>
                  {sedes.map((s, i) => (
                    <div
                      key={s.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "10px 12px",
                        borderTop: i === 0 ? "none" : `1px solid ${COLOR.linea}`,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{s.nombre}</div>
                        <div style={{ fontSize: 12, color: COLOR.suave }}>
                          {s.direccion}, {s.ciudad}
                        </div>
                      </div>
                      <input
                        style={{ ...campo, width: 90, textAlign: "right", fontFamily: "var(--font-mono)" }}
                        type="number"
                        min={0}
                        value={stock[s.id] ?? "0"}
                        onChange={(e) => setStock((v) => ({ ...v, [s.id]: e.target.value }))}
                      />
                    </div>
                  ))}
                  {sedes.length === 0 && (
                    <p style={{ margin: 0, padding: 12, fontSize: 12.5, color: COLOR.suave }}>
                      No hay sedes todavía. Crea una en la sección Sedes para poder repartir inventario.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Ficha de origen ── */}
        <Titulo nota="Solo para cafés. Lo que dejes vacío no se muestra en el catálogo.">Ficha de origen</Titulo>

        <div style={seccion}>
          <Campo etiqueta="Finca">
            <input style={campo} value={datos.finca} onChange={(e) => set("finca", e.target.value)} />
          </Campo>
          <Campo etiqueta="Productor">
            <input style={campo} value={datos.productor} onChange={(e) => set("productor", e.target.value)} />
          </Campo>
          <Campo etiqueta="Región">
            <input style={campo} value={datos.region} onChange={(e) => set("region", e.target.value)} placeholder="Huila" />
          </Campo>
          <Campo etiqueta="Altura (msnm)">
            <input
              style={campo}
              type="number"
              min={0}
              max={4000}
              value={datos.altitud_msnm}
              onChange={(e) => set("altitud_msnm", e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Variedad">
            <input style={campo} value={datos.variedad} onChange={(e) => set("variedad", e.target.value)} />
          </Campo>
          <Campo etiqueta="Proceso">
            <input style={campo} value={datos.proceso} onChange={(e) => set("proceso", e.target.value)} />
          </Campo>
          <Campo etiqueta="Tueste">
            <input style={campo} value={datos.tueste} onChange={(e) => set("tueste", e.target.value)} />
          </Campo>
          <Campo etiqueta="Puntaje SCA" nota="80 a 100. Admite medios puntos.">
            <input
              style={campo}
              type="number"
              step="0.25"
              min={0}
              max={100}
              value={datos.puntaje_sca}
              onChange={(e) => set("puntaje_sca", e.target.value)}
            />
          </Campo>
        </div>

        <div style={{ marginTop: 14 }}>
          <span style={rotulo}>Notas de cata</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {datos.notas.map((n) => (
              <span
                key={n}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: `1px solid ${COLOR.linea}`,
                  fontSize: 12.5,
                }}
              >
                {n}
                <button
                  type="button"
                  onClick={() => set("notas", datos.notas.filter((x) => x !== n))}
                  style={{ border: "none", background: "none", color: COLOR.rotulo, cursor: "pointer", padding: 0 }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <input
            style={campo}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            // Enter agregaría la nota y además enviaría el formulario: se corta
            // el envío y se deja solo lo primero.
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                agregarNota(nota);
              }
            }}
            placeholder={datos.notas.length >= 6 ? "Máximo 6 notas" : "Escribe y presiona Enter: panela, mandarina…"}
            disabled={datos.notas.length >= 6}
          />
        </div>

        {/* ── Medios ── */}
        <Titulo nota="La foto se convierte a WebP y el video se recomprime al subirlos.">Fotos y video</Titulo>

        <div style={seccion}>
          <Campo etiqueta="Foto principal">
            {producto?.imagen_url && !quitarImagen && (
              <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={producto.imagen_url}
                  alt=""
                  style={{ width: 62, height: 62, objectFit: "cover", borderRadius: 8, border: `1px solid ${COLOR.linea}` }}
                />
                <Boton tono="peligro" chico type="button" onClick={() => setQuitarImagen(true)}>
                  Quitar
                </Boton>
              </div>
            )}
            <input type="file" accept="image/*" onChange={(e) => setImagen(e.target.files?.[0] ?? null)} style={{ fontSize: 12.5 }} />
          </Campo>

          <Campo etiqueta="Video">
            {producto?.video_url && !quitarVideo && (
              <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                <video src={producto.video_url} muted style={{ width: 62, height: 62, objectFit: "cover", borderRadius: 8 }} />
                <Boton tono="peligro" chico type="button" onClick={() => setQuitarVideo(true)}>
                  Quitar
                </Boton>
              </div>
            )}
            <input type="file" accept="video/*" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} style={{ fontSize: 12.5 }} />
          </Campo>
        </div>

        <div style={{ marginTop: 14 }}>
          <span style={rotulo}>Fotos adicionales</span>
          {producto && producto.imagenes_extra.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              {producto.imagenes_extra.map((img) => (
                <div key={img.id} style={{ position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt=""
                    style={{ width: 62, height: 62, objectFit: "cover", borderRadius: 8, border: `1px solid ${COLOR.linea}` }}
                  />
                  <button
                    type="button"
                    onClick={() => quitarExtra(img.id)}
                    title="Borrar"
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: "none",
                      background: COLOR.tinta,
                      color: "#FFF",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setExtras(Array.from(e.target.files ?? []))}
            style={{ fontSize: 12.5 }}
          />
        </div>

        {/* ── Publicación ── */}
        <Titulo>Publicación</Titulo>

        <div style={{ display: "grid", gap: 12 }}>
          <Interruptor
            etiqueta="Visible en el catálogo"
            nota="Distinto de agotado: un producto sin unidades se sigue mostrando, con su sello."
            valor={datos.activo}
            onChange={(v) => set("activo", v)}
          />
          <Interruptor
            etiqueta="Destacado"
            nota="En las secciones de vitrina, el destacado es el que se dibuja en grande. Marca uno solo por sección."
            valor={datos.destacado}
            onChange={(v) => set("destacado", v)}
          />
        </div>

        {editando && (
          <p style={{ marginTop: 20, marginBottom: 0, fontSize: 12, color: COLOR.rotulo }}>
            <Etiqueta>Total actual</Etiqueta>{" "}
            {producto.controla_stock ? `${producto.stock} unidades en ${producto.stock_por_sede.length} sedes` : "Servicio"}
          </p>
        )}
      </form>
    </Hoja>
  );
}
