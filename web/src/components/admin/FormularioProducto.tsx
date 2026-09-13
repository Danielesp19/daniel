"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import {
  crearProducto,
  editarProducto,
  moverStock,
  listarSedes,
  listarProductos,
  type AdminProducto,
  type AdminCategoria,
  type AdminSede,
} from "@/lib/admin-api";
import {
  COLOR,
  campo,
  rotulo,
  Campo,
  Flechas,
  CampoDinero,
  Boton,
  Interruptor,
  Aviso,
  Hoja,
  Etiqueta,
} from "./ui";

/** Lo que el formulario mantiene en memoria mientras se llena. */
interface Borrador {
  categoria_id: number;
  nombre: string;
  descripcion: string;
  precio_cop: string;
  gramos: string;
  controla_stock: boolean;
  es_cafe: boolean;
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
  /** Ids de los productos que incluye, si es un kit. */
  componentes: number[];
}

function borradorDe(producto: AdminProducto | null, categoriaId: number): Borrador {
  return {
    categoria_id: producto?.categoria_id ?? categoriaId,
    nombre: producto?.nombre ?? "",
    descripcion: producto?.descripcion ?? "",
    precio_cop: producto ? String(producto.precio_cop) : "",
    gramos: producto ? String(producto.gramos) : "0",
    controla_stock: producto?.controla_stock ?? true,
    es_cafe: producto?.es_cafe ?? false,
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
    componentes: producto?.componentes.map((c) => c.id) ?? [],
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
/**
 * Una foto o un video mientras se edita.
 *
 * `url` es lo que ya está guardado y `archivo` lo que se acaba de escoger; una
 * fila tiene lo uno o lo otro. El `id` de una fila nueva es negativo para que
 * React la distinga sin confundirla con una guardada.
 */
interface Medio {
  id: number;
  tipo: "imagen" | "video";
  url: string | null;
  archivo: File | null;
}

/**
 * Las fotos y los videos del producto, en una sola lista.
 *
 * Eran tres controles —portada, video y adicionales— y con eso no había forma
 * de decidir el orden ni de poner el video primero. Acá la PRIMERA fila es la
 * portada, sea foto o video, y se mueve con las flechas. Es la misma idea de
 * la carta de la meca: "la primera foto es la que aparece".
 */
function ListaMedios({ medios, onCambio }: { medios: Medio[]; onCambio: (m: Medio[]) => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [encima, setEncima] = useState(false);

  const agregar = (lista: FileList | null) => {
    const nuevos: Medio[] = Array.from(lista ?? []).map((f, i) => ({
      // Negativo: no choca con ningún id de la base.
      id: -(Date.now() + i),
      tipo: f.type.startsWith("video/") ? "video" : "imagen",
      url: URL.createObjectURL(f),
      archivo: f,
    }));
    if (nuevos.length) onCambio([...medios, ...nuevos]);
  };

  const mover = (i: number, direccion: -1 | 1) => {
    const destino = i + direccion;
    if (destino < 0 || destino >= medios.length) return;
    const copia = [...medios];
    [copia[i], copia[destino]] = [copia[destino], copia[i]];
    onCambio(copia);
  };

  return (
    <div>
      <div style={{ display: "grid", gap: 8 }}>
        {medios.map((m, i) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 8,
              background: COLOR.papel,
              border: `1px solid ${i === 0 ? COLOR.tinta : COLOR.linea}`,
              borderRadius: 10,
            }}
          >
            <Flechas
              onSubir={() => mover(i, -1)}
              onBajar={() => mover(i, 1)}
              arribaBloqueada={i === 0}
              abajoBloqueada={i === medios.length - 1}
            />

            <div
              style={{
                width: 52,
                height: 52,
                flexShrink: 0,
                borderRadius: 8,
                overflow: "hidden",
                background: COLOR.fondo,
                border: `1px solid ${COLOR.linea}`,
              }}
            >
              {m.url ? (
                m.tipo === "video" ? (
                  <video src={m.url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )
              ) : null}
            </div>

            <div style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontWeight: 600 }}>{m.tipo === "video" ? "Video" : "Foto"}</span>
                {i === 0 && <span style={{ ...rotulo, marginBottom: 0 }}>portada</span>}
              </div>
              <div style={{ color: COLOR.suave, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.archivo ? `${m.archivo.name} · se sube al guardar` : "Ya publicada"}
              </div>
            </div>

            <Boton
              chico
              tono="peligro"
              type="button"
              onClick={() => onCambio(medios.filter((x) => x.id !== m.id))}
              aria-label="Quitar"
            >
              ✕
            </Boton>
          </div>
        ))}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => {
          e.preventDefault();
          setEncima(false);
          agregar(e.dataTransfer.files);
        }}
        onClick={() => entrada.current?.click()}
        style={{
          marginTop: medios.length ? 8 : 0,
          padding: "14px 12px",
          border: `1px dashed ${encima ? COLOR.tinta : COLOR.linea}`,
          borderRadius: 10,
          background: encima ? COLOR.fondo : "transparent",
          textAlign: "center",
          fontSize: 12.5,
          color: COLOR.suave,
          cursor: "pointer",
        }}
      >
        Arrastra fotos o videos aquí, o haz clic para buscarlos.
      </div>

      <input
        ref={entrada}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={(e) => {
          agregar(e.target.files);
          if (entrada.current) entrada.current.value = "";
        }}
        style={{ display: "none" }}
      />
    </div>
  );
}

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
  // Fotos y videos en una sola lista ordenada: la primera es la portada.
  const [medios, setMedios] = useState<Medio[]>(() =>
    (producto?.medios ?? []).map((m) => ({ id: m.id, tipo: m.tipo, url: m.url, archivo: null })),
  );
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Lo que había al abrir, para saber si hay cambios sin guardar. Se compara
  // el borrador entero de un tirón en vez de campo por campo: son veinte
  // campos y cualquiera de ellos cuenta igual.
  const [mediosIniciales] = useState(() =>
    JSON.stringify((producto?.medios ?? []).map((m) => [m.id, null])),
  );

  const [inicial] = useState(() => JSON.stringify(borradorDe(producto, categoriaPorDefecto)));

  const [sedes, setSedes] = useState<AdminSede[]>([]);
  const [otros, setOtros] = useState<AdminProducto[]>([]);
  const [stock, setStock] = useState<Record<number, string>>({});

  const editando = producto !== null;

  useEffect(() => {
    // Los candidatos a componente de un kit. Se piden siempre —también al
    // crear— porque un kit puede nacer ya armado.
    listarProductos()
      .then(setOtros)
      .catch(() => {});
  }, []);

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
      cuerpo.append("es_cafe", datos.es_cafe ? "1" : "0");
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

      // Igual que las notas: sin componentes hay que mandar el arreglo vacío
      // explícito, o el backend entiende "no me lo mandaron" y deja los que
      // ya había.
      if (datos.componentes.length === 0) cuerpo.append("componentes", "");
      datos.componentes.forEach((id) => cuerpo.append("componentes[]", String(id)));

      // La lista viaja completa y EN ORDEN: la posición en el arreglo es el
      // orden, los que ya existían van por id y los nuevos con su archivo. Lo
      // que no viaje, el backend lo da por borrado.
      medios.forEach((m, i) => {
        if (m.archivo) cuerpo.append(`medios[${i}][archivo]`, m.archivo);
        else cuerpo.append(`medios[${i}][id]`, String(m.id));
      });
      // Sin medios hay que decirlo explícito, o el backend entiende "no me
      // mandaron nada" y deja la galería como estaba.
      if (medios.length === 0) cuerpo.append("medios", "");

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

  return (
    <Hoja
      titulo={editando ? producto.nombre : "Producto nuevo"}
      onCerrar={onCerrar}
      sucio={
        JSON.stringify(datos) !== inicial ||
        JSON.stringify(medios.map((m) => [m.id, m.archivo?.name ?? null])) !== mediosIniciales
      }
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

        {/* Lo primero que hay que decidir: de eso depende medio formulario. */}
        <div style={{ marginBottom: 14 }}>
          <Interruptor
            etiqueta="Es un café"
            nota="Enciéndelo y aparecen el peso de la bolsa y la ficha de origen: finca, región, altura, proceso, tueste, puntaje y notas de cata."
            valor={datos.es_cafe}
            onChange={(v) => set("es_cafe", v)}
          />
        </div>

        <div style={seccion}>
          <Campo etiqueta="Nombre">
            <input style={campo} value={datos.nombre} onChange={(e) => set("nombre", e.target.value)} required />
          </Campo>

          {/* Las subcategorías van agrupadas bajo su sección: en una lista
              plana, «Básculas» y «Artefactos» se leen como dos secciones
              hermanas y se termina poniendo el producto en la equivocada. Es
              también la forma de MOVER un producto a un estante sin borrarlo y
              volverlo a crear. */}
          <Campo etiqueta="Dónde va">
            <select style={campo} value={datos.categoria_id} onChange={(e) => set("categoria_id", Number(e.target.value))}>
              {categorias
                .filter((c) => c.padre_id === null)
                .map((seccion) => {
                  const estantes = categorias.filter((c) => c.padre_id === seccion.id);

                  return estantes.length === 0 ? (
                    <option key={seccion.id} value={seccion.id}>
                      {seccion.nombre}
                    </option>
                  ) : (
                    <optgroup key={seccion.id} label={seccion.nombre}>
                      <option value={seccion.id}>{seccion.nombre} (sin subcategoría)</option>
                      {estantes.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.nombre}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
            </select>
          </Campo>

          <CampoDinero
            etiqueta="Precio"
            nota="Los puntos se ponen solos."
            valor={datos.precio_cop}
            onChange={(v) => set("precio_cop", v)}
            requerido
          />

          {/* El peso solo se pregunta en un café: un molino no se vende por
              gramos y el campo se quedaba en cero estorbando. */}
          {datos.es_cafe && (
            <Campo etiqueta="Peso de la bolsa" nota="En gramos: 250, 340, 500.">
              <input style={campo} type="number" min={0} value={datos.gramos} onChange={(e) => set("gramos", e.target.value)} />
            </Campo>
          )}
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

        {/* La ficha de origen entera cuelga de la casilla: son ocho campos que
            en un molino o en una asesoría se quedan vacíos y hay que saltar uno
            por uno cada vez que se crea algo. */}
        {datos.es_cafe && (
          <>
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
          </>
        )}

        {/* ── Medios ── */}
        <Titulo nota="La primera es la portada: es la que sale en el catálogo. Muévelas con las flechas. Las fotos se convierten a WebP y los videos se recomprimen al subirlos.">
          Fotos y video
        </Titulo>

        <ListaMedios medios={medios} onCambio={setMedios} />

        {/* ── Kit ── */}
        <Titulo nota="Deja esto vacío en un producto normal. Un kit se vende como una sola cosa —un precio, una línea en el pedido— y esto es lo que le dice al comprador qué se lleva.">
          Qué incluye
        </Titulo>

        <div style={{ display: "grid", gap: 8, maxHeight: 220, overflowY: "auto", padding: 2 }}>
          {otros
            .filter((o) => o.id !== producto?.id)
            .map((o) => (
              <Interruptor
                key={o.id}
                etiqueta={o.nombre}
                nota={o.categoria ?? undefined}
                valor={datos.componentes.includes(o.id)}
                onChange={(marcado) =>
                  set(
                    "componentes",
                    marcado
                      ? [...datos.componentes, o.id]
                      : datos.componentes.filter((id) => id !== o.id),
                  )
                }
              />
            ))}
          {otros.length === 0 && (
            <p style={{ margin: 0, fontSize: 12.5, color: COLOR.suave }}>
              No hay otros productos todavía.
            </p>
          )}
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
