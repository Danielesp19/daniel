"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listarRecetas,
  crearReceta,
  editarReceta,
  borrarReceta,
  reordenarRecetas,
  listarProductos,
  SesionVencida,
  type AdminReceta,
  type AdminProducto,
} from "@/lib/admin-api";
import {
  COLOR,
  campo,
  rotulo,
  Campo,
  CampoArchivo,
  Boton,
  Cabecera,
  Aviso,
  Flechas,
  Hoja,
  Interruptor,
} from "@/components/admin/ui";

const METODOS = ["Filtrado", "Inmersión", "Espresso", "Con leche"];

/**
 * Los puntos de molienda, en micras. Son los mismos cinco que dibuja la página
 * a tamaño real, así que la recomendación siempre cae en uno de esos discos.
 */
const MOLIENDAS = [
  { micras: 1000, nombre: "Gruesa", para: "Prensa francesa · cold brew" },
  { micras: 800, nombre: "Media gruesa", para: "Chemex" },
  { micras: 600, nombre: "Media", para: "V60 · goteo" },
  { micras: 400, nombre: "Media fina", para: "Moka · aeropress" },
  { micras: 250, nombre: "Fina", para: "Espresso" },
];

/** "2:45" ⇄ 165 segundos. El panel se escribe en minutos, no en segundos. */
function aSegundos(texto: string): number | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  // Acepta "2:45", "165" y "14h".
  const horas = limpio.match(/^(\d+(?:[.,]\d+)?)\s*h$/i);
  if (horas) return Math.round(parseFloat(horas[1].replace(",", ".")) * 3600);
  if (limpio.includes(":")) {
    const [m, s] = limpio.split(":");
    return Number(m) * 60 + Number(s || 0);
  }
  return Number(limpio) || null;
}

function aTexto(segundos: number | null): string {
  if (!segundos) return "";
  if (segundos >= 3600) return `${+(segundos / 3600).toFixed(2)}h`;
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;
}

export default function RecetasAdmin() {
  const router = useRouter();
  const [recetas, setRecetas] = useState<AdminReceta[]>([]);
  const [productos, setProductos] = useState<AdminProducto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [enEdicion, setEnEdicion] = useState<AdminReceta | null>(null);
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [rs, ps] = await Promise.all([listarRecetas(), listarProductos().catch(() => [])]);
      setRecetas(rs);
      setProductos(ps);
      setError("");
    } catch (e) {
      if (e instanceof SesionVencida) {
        router.replace("/admin/login");
        return;
      }
      setError(e instanceof Error ? e.message : "No se pudieron cargar las recetas");
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  async function mover(indice: number, direccion: -1 | 1) {
    const orden = [...recetas];
    const destino = indice + direccion;
    [orden[indice], orden[destino]] = [orden[destino], orden[indice]];
    setRecetas(orden);
    try {
      await reordenarRecetas(orden.map((r) => r.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo reordenar");
      cargar();
    }
  }

  async function quitar(r: AdminReceta) {
    if (!confirm(`¿Borrar «${r.nombre}»? También se borran sus pasos y sus fotos.`)) return;
    try {
      await borrarReceta(r.id);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo borrar");
    }
  }

  if (cargando) return <p style={{ color: COLOR.suave, fontSize: 14 }}>Cargando las recetas…</p>;

  return (
    <>
      <Cabecera
        titulo="Recetas"
        bajada="Las recetas de la página, agrupadas por método. Cada paso puede llevar foto y su propio temporizador."
      >
        <Boton tono="solido" onClick={() => setCreando(true)}>
          + Receta
        </Boton>
      </Cabecera>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Aviso>{error}</Aviso>
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {recetas.map((r, i) => (
          <article
            key={r.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: 14,
              background: COLOR.papel,
              border: `1px solid ${COLOR.linea}`,
              borderRadius: 12,
            }}
          >
            <Flechas
              onSubir={() => mover(i, -1)}
              onBajar={() => mover(i, 1)}
              arribaBloqueada={i === 0}
              abajoBloqueada={i === recetas.length - 1}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--font-serif)", fontSize: 17 }}>{r.nombre}</span>
                <span style={{ ...rotulo, marginBottom: 0 }}>{r.metodo}</span>
                {!r.activa && <span style={{ ...rotulo, marginBottom: 0, color: COLOR.aviso }}>oculta</span>}
              </div>
              <div style={{ marginTop: 3, fontSize: 12.5, color: COLOR.suave, fontFamily: "var(--font-mono)" }}>
                {r.resumen ?? "sin resumen"}
                {r.duracion && ` · ${r.duracion}`}
                {` · ${r.pasos.length} pasos`}
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <Boton chico tono="plano" onClick={() => setEnEdicion(r)}>
                Editar
              </Boton>
              <Boton chico tono="peligro" onClick={() => quitar(r)}>
                Borrar
              </Boton>
            </div>
          </article>
        ))}

        {recetas.length === 0 && (
          <p style={{ fontSize: 13.5, color: COLOR.suave }}>
            No hay recetas todavía. Sin ninguna, la sección no sale en la página.
          </p>
        )}
      </div>

      {(creando || enEdicion) && (
        <Formulario
          receta={enEdicion}
          productos={productos}
          onCerrar={() => {
            setCreando(false);
            setEnEdicion(null);
          }}
          onGuardado={() => {
            setCreando(false);
            setEnEdicion(null);
            cargar();
          }}
        />
      )}
    </>
  );
}

/** Editor de una lista de líneas (ingredientes, pasos). */
function Lista({
  etiqueta,
  nota,
  valores,
  onChange,
  marcador,
}: {
  etiqueta: string;
  nota?: string;
  valores: string[];
  onChange: (v: string[]) => void;
  marcador: (i: number) => string;
}) {
  return (
    <div>
      <span style={rotulo}>{etiqueta}</span>
      {nota && (
        <p style={{ margin: "0 0 8px", fontSize: 12, color: COLOR.suave }}>{nota}</p>
      )}
      <div style={{ display: "grid", gap: 7 }}>
        {valores.map((v, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ ...rotulo, marginBottom: 0, width: 18, flexShrink: 0 }}>{marcador(i)}</span>
            <input
              style={campo}
              value={v}
              onChange={(e) => onChange(valores.map((x, j) => (j === i ? e.target.value : x)))}
            />
            <Boton
              chico
              tono="plano"
              type="button"
              onClick={() => onChange(valores.filter((_, j) => j !== i))}
              aria-label="Quitar"
            >
              ✕
            </Boton>
          </div>
        ))}
      </div>
      <Boton chico type="button" onClick={() => onChange([...valores, ""])} style={{ marginTop: 8 }}>
        + Agregar
      </Boton>
    </div>
  );
}

/**
 * Un paso mientras se edita.
 *
 * `imagen` es la ruta de la que ya está guardada y `archivo` la que acaban de
 * escoger. Se llevan las dos porque el backend borra y vuelve a crear los pasos
 * en cada guardado: sin `imagen` de vuelta, editar un texto le borraría la foto
 * a todos los pasos que no se tocaron.
 */
interface PasoEdicion {
  texto: string;
  imagen: string | null;
  imagen_url: string | null;
  archivo: File | null;
  /** Escrito como en la duración: "0:40", "4:00". Vacío = paso sin reloj. */
  duracion: string;
  etiqueta: string;
}

function pasoVacio(): PasoEdicion {
  return { texto: "", imagen: null, imagen_url: null, archivo: null, duracion: "", etiqueta: "" };
}

/**
 * El editor de pasos.
 *
 * Cada paso es una tarjeta con su texto, su foto y su temporizador. El reloj va
 * en el paso y no en la receta porque una receta tiene varios: el bloom de 40
 * segundos y la infusión de 4 minutos son dos tiempos distintos, y en la página
 * cada uno sale debajo del paso al que pertenece.
 */
function Pasos({ valores, onChange }: { valores: PasoEdicion[]; onChange: (v: PasoEdicion[]) => void }) {
  const editar = (i: number, cambio: Partial<PasoEdicion>) =>
    onChange(valores.map((p, j) => (j === i ? { ...p, ...cambio } : p)));

  const mover = (i: number, direccion: -1 | 1) => {
    const destino = i + direccion;
    if (destino < 0 || destino >= valores.length) return;
    const copia = [...valores];
    [copia[i], copia[destino]] = [copia[destino], copia[i]];
    onChange(copia);
  };

  return (
    <div>
      <span style={rotulo}>Pasos</span>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: COLOR.suave }}>
        En orden. Cada uno puede llevar una foto y su propio temporizador — por ejemplo uno de 1:00
        para el bloom y otro de 4:00 para la infusión.
      </p>

      <div style={{ display: "grid", gap: 10 }}>
        {valores.map((p, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gap: 10,
              padding: 12,
              background: COLOR.fondo,
              border: `1px solid ${COLOR.linea}`,
              borderRadius: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...rotulo, marginBottom: 0 }}>Paso {i + 1}</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <Flechas
                  onSubir={() => mover(i, -1)}
                  onBajar={() => mover(i, 1)}
                  arribaBloqueada={i === 0}
                  abajoBloqueada={i === valores.length - 1}
                />
                <Boton
                  chico
                  tono="plano"
                  type="button"
                  onClick={() => onChange(valores.filter((_, j) => j !== i))}
                  aria-label={`Quitar el paso ${i + 1}`}
                >
                  ✕
                </Boton>
              </div>
            </div>

            <textarea
              style={{ ...campo, minHeight: 60, resize: "vertical", fontFamily: "inherit" }}
              value={p.texto}
              placeholder="Qué hay que hacer en este paso"
              onChange={(e) => editar(i, { texto: e.target.value })}
            />

            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
              }}
            >
              <Campo etiqueta="Temporizador" nota="0:40, 4:00. Vacío = sin reloj.">
                <input
                  style={campo}
                  value={p.duracion}
                  placeholder="0:40"
                  onChange={(e) => editar(i, { duracion: e.target.value })}
                />
              </Campo>
              <Campo etiqueta="Nombre del reloj" nota="Bloom, Infusión…">
                <input
                  style={campo}
                  value={p.etiqueta}
                  onChange={(e) => editar(i, { etiqueta: e.target.value })}
                />
              </Campo>
              <CampoArchivo
                etiqueta="Foto del paso"
                actual={p.imagen_url}
                archivo={p.archivo}
                onArchivo={(f) => editar(i, { archivo: f })}
                onQuitar={() => editar(i, { archivo: null, imagen: null, imagen_url: null })}
              />
            </div>

          </div>
        ))}
      </div>

      <Boton chico type="button" onClick={() => onChange([...valores, pasoVacio()])} style={{ marginTop: 10 }}>
        + Agregar paso {valores.length + 1}
      </Boton>
    </div>
  );
}

function Formulario({
  receta,
  productos,
  onCerrar,
  onGuardado,
}: {
  receta: AdminReceta | null;
  productos: AdminProducto[];
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [d, setD] = useState({
    nombre: receta?.nombre ?? "",
    metodo: receta?.metodo ?? METODOS[0],
    resumen: receta?.resumen ?? "",
    detalle: receta?.detalle ?? "",
    video_youtube: receta?.video_youtube ?? "",
    cafe_g: receta?.cafe_g ? String(receta.cafe_g) : "",
    agua_g: receta?.agua_g ? String(receta.agua_g) : "",
    duracion: aTexto(receta?.duracion_seg ?? null),
    molienda_micras: receta?.molienda_micras ? String(receta.molienda_micras) : "",
    producto_id: receta?.producto_id ? String(receta.producto_id) : "",
    activa: receta?.activa ?? true,
  });
  const [ingredientes, setIngredientes] = useState<string[]>(receta?.ingredientes ?? []);
  const [pasos, setPasos] = useState<PasoEdicion[]>(
    (receta?.pasos ?? []).map((p) => ({
      texto: p.texto,
      imagen: p.imagen,
      imagen_url: p.imagen_url,
      archivo: null,
      duracion: aTexto(p.segundos),
      etiqueta: p.temporizador_etiqueta ?? "",
    })),
  );
  const [artefactos, setArtefactos] = useState<number[]>((receta?.artefactos ?? []).map((a) => a.id));
  // Lo que había al abrir, para avisar si se cierra con cambios sin guardar.
  const [inicial] = useState(() =>
    JSON.stringify({
      d: {
        nombre: receta?.nombre ?? "",
        metodo: receta?.metodo ?? METODOS[0],
        resumen: receta?.resumen ?? "",
        detalle: receta?.detalle ?? "",
        video_youtube: receta?.video_youtube ?? "",
        cafe_g: receta?.cafe_g ? String(receta.cafe_g) : "",
        agua_g: receta?.agua_g ? String(receta.agua_g) : "",
        duracion: aTexto(receta?.duracion_seg ?? null),
        molienda_micras: receta?.molienda_micras ? String(receta.molienda_micras) : "",
        producto_id: receta?.producto_id ? String(receta.producto_id) : "",
        activa: receta?.activa ?? true,
      },
      ing: receta?.ingredientes ?? [],
      pasos: (receta?.pasos ?? []).map((p) => [p.texto, p.segundos, p.temporizador_etiqueta, p.imagen]),
      art: (receta?.artefactos ?? []).map((a) => a.id),
    }),
  );
  const [imagen, setImagen] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const set = (k: keyof typeof d, v: string | boolean) => setD((x) => ({ ...x, [k]: v }));

  async function guardar() {
    setGuardando(true);
    setError("");
    try {
      const cuerpo = new FormData();
      cuerpo.append("nombre", d.nombre);
      cuerpo.append("metodo", d.metodo);
      cuerpo.append("resumen", d.resumen);
      cuerpo.append("detalle", d.detalle);
      cuerpo.append("video_youtube", d.video_youtube);
      // Vacíos no se mandan: el backend los deja como están, y mandar cadena
      // vacía en un campo entero sería un error de validación.
      if (d.cafe_g) cuerpo.append("cafe_g", d.cafe_g);
      if (d.agua_g) cuerpo.append("agua_g", d.agua_g);
      cuerpo.append("activa", d.activa ? "1" : "0");

      // Vacío se manda explícito para poder QUITAR la recomendación: sin el
      // campo, el backend entiende "no me lo mandaron" y deja la de antes.
      cuerpo.append("molienda_micras", d.molienda_micras);

      const seg = aSegundos(d.duracion);
      if (seg) cuerpo.append("duracion_seg", String(seg));
      if (d.producto_id) cuerpo.append("producto_id", d.producto_id);

      // Las líneas en blanco se caen: quedan de darle a "Agregar" y no
      // escribir, y publicarlas dejaría un renglón vacío en la página.
      const ings = ingredientes.map((x) => x.trim()).filter(Boolean);
      // Sin elementos hay que mandar el campo vacío explícito, o el backend
      // entiende "no me lo mandaron" y deja los de antes.
      if (ings.length === 0) cuerpo.append("ingredientes", "");
      ings.forEach((x) => cuerpo.append("ingredientes[]", x));

      const ps = pasos.filter((p) => p.texto.trim());
      if (ps.length === 0) cuerpo.append("pasos", "");
      ps.forEach((p, i) => {
        cuerpo.append(`pasos[${i}][texto]`, p.texto.trim());
        const s = aSegundos(p.duracion);
        if (s) cuerpo.append(`pasos[${i}][segundos]`, String(s));
        if (p.etiqueta.trim()) cuerpo.append(`pasos[${i}][temporizador_etiqueta]`, p.etiqueta.trim());
        // La foto que ya estaba: sin esto el backend la daría por borrada.
        if (p.imagen && !p.archivo) cuerpo.append(`pasos[${i}][imagen_actual]`, p.imagen);
        if (p.archivo) cuerpo.append(`pasos[${i}][imagen]`, p.archivo);
      });

      if (artefactos.length === 0) cuerpo.append("artefactos", "");
      artefactos.forEach((id) => cuerpo.append("artefactos[]", String(id)));

      if (imagen) cuerpo.append("imagen", imagen);

      if (receta) await editarReceta(receta.id, cuerpo);
      else await crearReceta(cuerpo);
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  const dos = { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))" } as const;

  return (
    <Hoja
      titulo={receta ? receta.nombre : "Receta nueva"}
      onCerrar={onCerrar}
      sucio={
        JSON.stringify({
          d,
          ing: ingredientes,
          pasos: pasos.map((p) => [p.texto, aSegundos(p.duracion), p.etiqueta || null, p.imagen]),
          art: artefactos,
        }) !== inicial || Boolean(imagen) || pasos.some((p) => p.archivo)
      }
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
      <div style={{ display: "grid", gap: 16 }}>
        {error && <Aviso>{error}</Aviso>}

        <div style={dos}>
          <Campo etiqueta="Nombre">
            <input style={campo} value={d.nombre} onChange={(e) => set("nombre", e.target.value)} required />
          </Campo>
          <Campo etiqueta="Método" nota="Agrupa las recetas en la página: cada método es un estante.">
            <input style={campo} list="metodos" value={d.metodo} onChange={(e) => set("metodo", e.target.value)} />
            <datalist id="metodos">
              {METODOS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Campo>
        </div>

        <Campo
          etiqueta="Video de YouTube"
          nota="Pega el enlace del video. De ahí sale también la foto de la tarjeta, así que con video no hace falta subir foto."
        >
          <input
            style={campo}
            value={d.video_youtube}
            placeholder="https://www.youtube.com/watch?v=…"
            onChange={(e) => set("video_youtube", e.target.value)}
          />
        </Campo>

        <div style={dos}>
          <Campo etiqueta="Resumen" nota="La línea corta de la tarjeta: 15 g · 250 ml · 2:45">
            <input style={campo} value={d.resumen} onChange={(e) => set("resumen", e.target.value)} />
          </Campo>
          <Campo etiqueta="Detalle" nota="La línea bajo el título: 15 g café · 250 ml agua a 94 °C">
            <input style={campo} value={d.detalle} onChange={(e) => set("detalle", e.target.value)} />
          </Campo>
        </div>

        <div style={dos}>
          <Campo etiqueta="Café (g)" nota="Alimenta la calculadora de ratios de la página.">
            <input
              style={campo}
              type="number"
              min={1}
              value={d.cafe_g}
              onChange={(e) => set("cafe_g", e.target.value)}
              placeholder="15"
            />
          </Campo>
          <Campo
            etiqueta="Agua o rendimiento (g)"
            nota="Lo que sale: agua en un filtrado, peso en taza en un espresso, leche en un latte."
          >
            <input
              style={campo}
              type="number"
              min={1}
              value={d.agua_g}
              onChange={(e) => set("agua_g", e.target.value)}
              placeholder="250"
            />
          </Campo>
        </div>

        <div style={dos}>
          <Campo
            etiqueta="Duración total"
            nota="Solo para mostrarla en la tarjeta. Los relojes van en cada paso."
          >
            <input style={campo} value={d.duracion} onChange={(e) => set("duracion", e.target.value)} placeholder="2:45" />
          </Campo>
          <Campo etiqueta="Café recomendado" nota="Sale como “queda mejor con”.">
            <select style={campo} value={d.producto_id} onChange={(e) => set("producto_id", e.target.value)}>
              <option value="">Ninguno</option>
              {productos
                .filter((p) => p.controla_stock)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
            </select>
          </Campo>
        </div>

        <Campo
          etiqueta="Molienda recomendada"
          nota="Sale marcada en la receta, sobre la escala a tamaño real. Quien la lee puede tocar las otras para comparar."
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {[{ micras: 0, nombre: "Sin recomendar", para: "" }, ...MOLIENDAS].map((m) => {
              const valor = m.micras === 0 ? "" : String(m.micras);
              const activa = d.molienda_micras === valor;

              return (
                <button
                  key={m.micras}
                  type="button"
                  onClick={() => set("molienda_micras", valor)}
                  aria-pressed={activa}
                  title={m.para}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 999,
                    border: `1px solid ${activa ? COLOR.tinta : COLOR.linea}`,
                    background: activa ? COLOR.tinta : "transparent",
                    color: activa ? "#FFF" : COLOR.suave,
                    fontSize: 12.5,
                    cursor: "pointer",
                  }}
                >
                  {m.nombre}
                  {m.micras > 0 && (
                    <span style={{ marginLeft: 6, fontFamily: "var(--font-mono)", fontSize: 10, opacity: 0.75 }}>
                      {m.micras} µm
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Campo>

        <Lista
          etiqueta="Ingredientes"
          valores={ingredientes}
          onChange={setIngredientes}
          marcador={() => "·"}
        />

        <Pasos valores={pasos} onChange={setPasos} />

        <Artefactos productos={productos} elegidos={artefactos} onChange={setArtefactos} />

        <CampoArchivo
          etiqueta="Foto"
          nota="Opcional. Sin foto y sin video, la tarjeta sale con una taza."
          actual={receta?.imagen_url}
          archivo={imagen}
          onArchivo={setImagen}
        />

        <Interruptor
          etiqueta="Visible en la página"
          nota="Apagada no sale, pero se conserva con todos sus pasos."
          valor={d.activa}
          onChange={(v) => set("activa", v)}
        />
      </div>
    </Hoja>
  );
}

/**
 * Los artefactos que usa la receta.
 *
 * Se eligen del catálogo, no se escriben: así la página puede mostrar el precio
 * y el stock de verdad, y si el molino se agota la receta deja de ofrecerlo
 * sola. Solo salen los productos que se cuentan — una asesoría no es un
 * artefacto que se use para preparar café.
 */
function Artefactos({
  productos,
  elegidos,
  onChange,
}: {
  productos: AdminProducto[];
  elegidos: number[];
  onChange: (v: number[]) => void;
}) {
  const alternar = (id: number) =>
    onChange(elegidos.includes(id) ? elegidos.filter((x) => x !== id) : [...elegidos, id]);

  // Agrupados por categoría: el catálogo mezcla cafés y máquinas, y una fila
  // plana de treinta fichas no dice cuál es cuál. Los servicios no entran: no
  // son algo que se use para preparar café.
  const grupos = new Map<string, AdminProducto[]>();
  for (const p of productos.filter((x) => x.controla_stock)) {
    const clave = p.categoria ?? "Sin categoría";
    const lista = grupos.get(clave);
    if (lista) lista.push(p);
    else grupos.set(clave, [p]);
  }
  const candidatos = [...grupos.entries()];

  return (
    <div>
      <span style={rotulo}>Artefactos que se usan</span>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: COLOR.suave }}>
        Salen recomendados al final de la receta, con su precio. Si están agotados se muestran igual,
        marcados como agotados.
      </p>

      {candidatos.length === 0 ? (
        <p style={{ fontSize: 12.5, color: COLOR.suave }}>No hay productos en el catálogo todavía.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {candidatos.map(([categoria, lista]) => (
            <div key={categoria}>
              <span style={{ ...rotulo, marginBottom: 6 }}>{categoria}</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {lista.map((p) => {
                  const activo = elegidos.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => alternar(p.id)}
                      aria-pressed={activo}
                      style={{
                        padding: "6px 13px",
                        borderRadius: 999,
                        border: `1px solid ${activo ? COLOR.tinta : COLOR.linea}`,
                        background: activo ? COLOR.tinta : "transparent",
                        color: activo ? "#FFF" : COLOR.suave,
                        fontSize: 12.5,
                        cursor: "pointer",
                      }}
                    >
                      {p.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
