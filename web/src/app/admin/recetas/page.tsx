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
import { COLOR, campo, rotulo, Campo, Boton, Cabecera, Aviso, Flechas, Hoja, Interruptor } from "@/components/admin/ui";

const METODOS = ["Filtrado", "Inmersión", "Espresso", "Con leche"];

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
    if (!confirm(`¿Borrar «${r.nombre}»? También se borran su foto y su video.`)) return;
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
        bajada="Las proporciones y los pasos que salen en la página, con su temporizador. Van en este orden."
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
    duracion: aTexto(receta?.duracion_seg ?? null),
    producto_id: receta?.producto_id ? String(receta.producto_id) : "",
    activa: receta?.activa ?? true,
  });
  const [ingredientes, setIngredientes] = useState<string[]>(receta?.ingredientes ?? []);
  const [pasos, setPasos] = useState<string[]>(receta?.pasos ?? []);
  const [imagen, setImagen] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
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
      cuerpo.append("activa", d.activa ? "1" : "0");

      const seg = aSegundos(d.duracion);
      if (seg) cuerpo.append("duracion_seg", String(seg));
      if (d.producto_id) cuerpo.append("producto_id", d.producto_id);

      // Las líneas en blanco se caen: quedan de darle a "Agregar" y no
      // escribir, y publicarlas dejaría un paso vacío numerado en la página.
      const limpiar = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean);
      const ings = limpiar(ingredientes);
      const ps = limpiar(pasos);
      // Sin elementos hay que mandar el campo vacío explícito, o el backend
      // entiende "no me lo mandaron" y deja los de antes.
      if (ings.length === 0) cuerpo.append("ingredientes", "");
      ings.forEach((x) => cuerpo.append("ingredientes[]", x));
      if (ps.length === 0) cuerpo.append("pasos", "");
      ps.forEach((x) => cuerpo.append("pasos[]", x));

      if (imagen) cuerpo.append("imagen", imagen);
      if (video) cuerpo.append("video", video);

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
          <Campo etiqueta="Método" nota="Es el filtro de la sección en la página.">
            <input style={campo} list="metodos" value={d.metodo} onChange={(e) => set("metodo", e.target.value)} />
            <datalist id="metodos">
              {METODOS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Campo>
        </div>

        <div style={dos}>
          <Campo etiqueta="Resumen" nota="La línea corta de la lista: 15 g · 250 ml · 2:45">
            <input style={campo} value={d.resumen} onChange={(e) => set("resumen", e.target.value)} />
          </Campo>
          <Campo etiqueta="Detalle" nota="La línea bajo el título: 15 g café · 250 ml agua a 94 °C">
            <input style={campo} value={d.detalle} onChange={(e) => set("detalle", e.target.value)} />
          </Campo>
        </div>

        <div style={dos}>
          <Campo etiqueta="Duración" nota="Para el temporizador. Escribe 2:45, o 14h para un cold brew. Vacío = sin reloj.">
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

        <Lista
          etiqueta="Ingredientes"
          valores={ingredientes}
          onChange={setIngredientes}
          marcador={() => "·"}
        />

        <Lista
          etiqueta="Pasos"
          nota="En orden. Se numeran solos en la página."
          valores={pasos}
          onChange={setPasos}
          marcador={(i) => String(i + 1)}
        />

        <div style={dos}>
          <Campo etiqueta="Foto">
            <input type="file" accept="image/*" onChange={(e) => setImagen(e.target.files?.[0] ?? null)} style={{ fontSize: 12.5 }} />
          </Campo>
          <Campo etiqueta="Video">
            <input type="file" accept="video/*" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} style={{ fontSize: 12.5 }} />
          </Campo>
        </div>

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
