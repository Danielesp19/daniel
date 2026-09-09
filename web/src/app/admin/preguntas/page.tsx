"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
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
export default function PreguntasAdmin() {
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

  if (cargando) return <p style={{ color: COLOR.suave, fontSize: 14 }}>Cargando las preguntas…</p>;

  return (
    <>
      <Cabecera
        titulo="Preguntas"
        bajada="Las que salen en la página, en este orden. Cuando la misma duda llegue tres veces por WhatsApp, súbela acá."
      >
        <Boton tono="solido" onClick={() => setCreando(true)}>
          + Pregunta
        </Boton>
      </Cabecera>

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
  onCerrar,
  onGuardado,
}: {
  pregunta: AdminPregunta | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [d, setD] = useState({
    pregunta: pregunta?.pregunta ?? "",
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
