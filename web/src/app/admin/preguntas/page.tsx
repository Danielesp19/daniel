"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listarConsultas,
  alternarConsulta,
  borrarConsulta,
  type AdminConsulta,
  listarPreguntas,
  crearPregunta,
  editarPregunta,
  borrarPregunta,
  reordenarPreguntas,
  SesionVencida,
  type AdminPregunta,
} from "@/lib/admin-api";
import { COLOR, campo, rotulo, Campo, Boton, Cabecera, Aviso, Flechas, Hoja, Interruptor } from "@/components/admin/ui";

/**
 * Las preguntas frecuentes.
 *
 * El orden importa: la primera es la que más se pregunta, y es la que la gente
 * lee antes de escribir por WhatsApp.
 */
/**
 * Preguntas: lo que llega y lo que se publica, en una sola sección.
 *
 * Antes eran dos —"Buzón" y "Frecuentes"— y el recorrido natural obligaba a
 * saltar entre ellas: llega la misma duda tres veces, se copia el texto, se va
 * a la otra sección y se pega. Ahora son dos pestañas del mismo sitio y una
 * pregunta recibida se publica con un botón, con el texto ya puesto.
 */
export default function PreguntasAdmin() {
  const [pestana, setPestana] = useState<"recibidas" | "publicadas">("recibidas");
  const [sinAtender, setSinAtender] = useState(0);

  return (
    <>
      <Cabecera
        titulo="Preguntas"
        bajada="Las que deja la gente en la página y las que salen publicadas como frecuentes."
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {([
          ["recibidas", "Recibidas"],
          ["publicadas", "Publicadas"],
        ] as const).map(([clave, texto]) => {
          const activa = pestana === clave;
          return (
            <button
              key={clave}
              type="button"
              onClick={() => setPestana(clave)}
              aria-pressed={activa}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 16px",
                borderRadius: 999,
                border: `1px solid ${activa ? COLOR.tinta : COLOR.linea}`,
                background: activa ? COLOR.tinta : "transparent",
                color: activa ? "#FFF" : COLOR.suave,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {texto}
              {/* El contador solo aparece si hay algo sin atender: un cero
                  permanente deja de leerse a los dos días. */}
              {clave === "recibidas" && sinAtender > 0 && (
                <span
                  style={{
                    display: "grid",
                    placeItems: "center",
                    minWidth: 18,
                    height: 18,
                    padding: "0 5px",
                    borderRadius: 999,
                    background: activa ? "#FFF" : COLOR.tinta,
                    color: activa ? COLOR.tinta : "#FFF",
                    fontSize: 11,
                  }}
                >
                  {sinAtender}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {pestana === "recibidas" ? <Recibidas onPendientes={setSinAtender} /> : <Publicadas />}
    </>
  );
}

/** Las que llegan del formulario de la página. */
function Recibidas({ onPendientes }: { onPendientes: (n: number) => void }) {
  const router = useRouter();
  const [consultas, setConsultas] = useState<AdminConsulta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  // La que se está pasando a frecuentes, con su texto ya puesto.
  const [publicando, setPublicando] = useState<AdminConsulta | null>(null);

  const cargar = useCallback(async () => {
    try {
      const lista = await listarConsultas();
      setConsultas(lista);
      onPendientes(lista.filter((c) => !c.atendida).length);
      setError("");
    } catch (e) {
      if (e instanceof SesionVencida) {
        router.replace("/admin/login");
        return;
      }
      setError(e instanceof Error ? e.message : "No se pudieron cargar las preguntas");
    } finally {
      setCargando(false);
    }
  }, [router, onPendientes]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  async function alternar(c: AdminConsulta) {
    // Optimista: marcar y desmarcar es el gesto que más se repite y esperar al
    // servidor en cada uno hace que la bandeja se sienta pesada.
    setConsultas((cs) => cs.map((x) => (x.id === c.id ? { ...x, atendida: !x.atendida } : x)));
    try {
      await alternarConsulta(c.id);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo marcar");
      cargar();
    }
  }

  async function quitar(c: AdminConsulta) {
    if (!confirm("¿Borrar esta pregunta?")) return;
    try {
      await borrarConsulta(c.id);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo borrar");
    }
  }

  if (cargando) return <p style={{ color: COLOR.suave, fontSize: 14 }}>Cargando…</p>;

  return (
    <>
      {error && (
        <div style={{ marginBottom: 16 }}>
          <Aviso>{error}</Aviso>
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {consultas.map((c) => (
          <article
            key={c.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
              padding: 16,
              background: COLOR.papel,
              border: `1px solid ${c.atendida ? COLOR.linea : COLOR.tinta}`,
              borderRadius: 12,
              // Lo atendido se apaga pero no se esconde: sirve para saber qué
              // se preguntó y decidir si merece entrar a las frecuentes.
              opacity: c.atendida ? 0.55 : 1,
            }}
          >
            <div style={{ minWidth: 0, flex: "1 1 320px" }}>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6 }}>{c.mensaje}</p>
              <p style={{ margin: "8px 0 0", fontSize: 12.5, color: COLOR.suave }}>
                {c.contacto ? c.contacto : "Sin contacto"} · {cuando(c.recibida)}
              </p>
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Boton chico onClick={() => setPublicando(c)}>
                Publicar
              </Boton>
              <Boton chico tono="plano" onClick={() => alternar(c)}>
                {c.atendida ? "Reabrir" : "Marcar respondida"}
              </Boton>
              <Boton chico tono="peligro" onClick={() => quitar(c)}>
                Borrar
              </Boton>
            </div>
          </article>
        ))}

        {consultas.length === 0 && (
          <p style={{ fontSize: 13.5, color: COLOR.suave }}>
            Todavía no ha llegado ninguna pregunta desde la página.
          </p>
        )}
      </div>

      {/* Publicar una recibida: se abre el mismo formulario de las frecuentes
          con la pregunta escrita, para no copiar y pegar entre secciones. */}
      {publicando && (
        <Formulario
          pregunta={null}
          textoInicial={publicando.mensaje}
          onCerrar={() => setPublicando(null)}
          onGuardado={() => {
            // Publicarla cuenta como atenderla: si ya quedó respondida en la
            // página, no tiene sentido que siga marcada como pendiente.
            if (!publicando.atendida) alternarConsulta(publicando.id).catch(() => {});
            setPublicando(null);
            cargar();
          }}
        />
      )}
    </>
  );
}

/** "2026-08-27T14:03:00-05:00" → "27 ago, 2:03 p. m." */
function cuando(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Las que salen publicadas en la página, en su orden. */
function Publicadas() {
  const router = useRouter();
  const [preguntas, setPreguntas] = useState<AdminPregunta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [enEdicion, setEnEdicion] = useState<AdminPregunta | null>(null);
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setPreguntas(await listarPreguntas());
      setError("");
    } catch (e) {
      if (e instanceof SesionVencida) {
        router.replace("/admin/login");
        return;
      }
      setError(e instanceof Error ? e.message : "No se pudieron cargar las preguntas");
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  async function mover(indice: number, direccion: -1 | 1) {
    const orden = [...preguntas];
    const destino = indice + direccion;
    [orden[indice], orden[destino]] = [orden[destino], orden[indice]];
    setPreguntas(orden);
    try {
      await reordenarPreguntas(orden.map((p) => p.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo reordenar");
      cargar();
    }
  }

  async function quitar(p: AdminPregunta) {
    if (!confirm(`¿Borrar «${p.pregunta}»?`)) return;
    try {
      await borrarPregunta(p.id);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo borrar");
    }
  }

  if (cargando) return <p style={{ color: COLOR.suave, fontSize: 14 }}>Cargando…</p>;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: COLOR.suave }}>
          Salen en la página en este orden.
        </p>
        <Boton tono="solido" onClick={() => setCreando(true)}>
          + Pregunta
        </Boton>
      </div>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Aviso>{error}</Aviso>
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {preguntas.map((p, i) => (
          <article
            key={p.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
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
              abajoBloqueada={i === preguntas.length - 1}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--font-serif)", fontSize: 17 }}>{p.pregunta}</span>
                {!p.activa && <span style={{ ...rotulo, marginBottom: 0, color: COLOR.aviso }}>oculta</span>}
              </div>
              <p style={{ margin: "5px 0 0", fontSize: 13, lineHeight: 1.55, color: COLOR.suave }}>
                {p.respuesta}
              </p>
            </div>

            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <Boton chico tono="plano" onClick={() => setEnEdicion(p)}>
                Editar
              </Boton>
              <Boton chico tono="peligro" onClick={() => quitar(p)}>
                Borrar
              </Boton>
            </div>
          </article>
        ))}

        {preguntas.length === 0 && (
          <p style={{ fontSize: 13.5, color: COLOR.suave }}>
            No hay preguntas todavía. Sin ninguna, la sección no sale en la página.
          </p>
        )}
      </div>

      {(creando || enEdicion) && (
        <Formulario
          pregunta={enEdicion}
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

function Formulario({
  pregunta,
  textoInicial,
  onCerrar,
  onGuardado,
}: {
  pregunta: AdminPregunta | null;
  /** La pregunta que llegó por el formulario, para no copiarla a mano. */
  textoInicial?: string;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [d, setD] = useState({
    pregunta: pregunta?.pregunta ?? textoInicial ?? "",
    respuesta: pregunta?.respuesta ?? "",
    activa: pregunta?.activa ?? true,
  });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  // Copia de lo que había al abrir: si el borrador ya no coincide, cerrar
  // avisa antes de tirar los cambios.
  const [inicial] = useState(() => JSON.stringify(d));

  async function guardar() {
    setGuardando(true);
    setError("");
    try {
      if (pregunta) await editarPregunta(pregunta.id, d);
      else await crearPregunta(d);
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Hoja
      titulo={pregunta ? "Editar pregunta" : "Pregunta nueva"}
      onCerrar={onCerrar}
      sucio={JSON.stringify(d) !== inicial}
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

        <Campo etiqueta="Pregunta" nota="Escríbela como la hace la gente, no como la escribirías tú.">
          <input
            style={campo}
            value={d.pregunta}
            onChange={(e) => setD((x) => ({ ...x, pregunta: e.target.value }))}
            placeholder="¿Cuánto tarda el envío?"
            required
          />
        </Campo>

        <Campo etiqueta="Respuesta">
          <textarea
            style={{ ...campo, minHeight: 110, resize: "vertical", fontFamily: "var(--font-sans)" }}
            value={d.respuesta}
            onChange={(e) => setD((x) => ({ ...x, respuesta: e.target.value }))}
          />
        </Campo>

        <Interruptor
          etiqueta="Visible en la página"
          valor={d.activa}
          onChange={(v) => setD((x) => ({ ...x, activa: v }))}
        />
      </div>
    </Hoja>
  );
}
