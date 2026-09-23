"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listarSedes,
  crearSede,
  editarSede,
  borrarSede,
  NecesitaConfirmacion,
  SesionVencida,
  type AdminSede,
} from "@/lib/admin-api";
import { COLOR, campo, rotulo, Campo, Boton, Cabecera, Aviso, Hoja, Interruptor } from "@/components/admin/ui";

/**
 * Los puntos de venta.
 *
 * Todo lo de esta pantalla lo ve el cliente en la ficha del producto, junto a
 * cuántas unidades hay en cada sede — una dirección mal escrita se publica.
 */
export default function SedesAdmin() {
  const router = useRouter();
  const [sedes, setSedes] = useState<AdminSede[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [enEdicion, setEnEdicion] = useState<AdminSede | null>(null);
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setSedes(await listarSedes());
      setError("");
    } catch (e) {
      if (e instanceof SesionVencida) {
        router.replace("/admin/login");
        return;
      }
      setError(e instanceof Error ? e.message : "No se pudieron cargar las sedes");
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    // Igual que en el catálogo: la petición va firmada con el token de
    // sessionStorage, así que no puede hacerse en el servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  async function quitar(s: AdminSede) {
    if (!confirm(`¿Borrar «${s.nombre}»?`)) return;
    try {
      await borrarSede(s.id);
      cargar();
    } catch (e) {
      // El backend pide confirmación aparte cuando la sede todavía tiene
      // inventario: perder esas unidades no puede pasar por un solo clic.
      const mensaje = e instanceof Error ? e.message : "No se pudo borrar";
      if (e instanceof NecesitaConfirmacion && confirm(`${mensaje}\n\n¿Borrarla de todos modos?`)) {
        try {
          await borrarSede(s.id, true);
          cargar();
          return;
        } catch (e2) {
          setError(e2 instanceof Error ? e2.message : "No se pudo borrar");
          return;
        }
      }
      setError(mensaje);
    }
  }

  if (cargando) return <p style={{ color: COLOR.suave, fontSize: 14 }}>Cargando las sedes…</p>;

  return (
    <>
      <Cabecera
        titulo="Sedes"
        bajada="El inventario se lleva por sede. La dirección y el horario salen publicados en la ficha de cada producto; el contacto siempre pasa por tu WhatsApp, no por un número de la sede."
      >
        <Boton tono="solido" onClick={() => setCreando(true)}>
          + Sede
        </Boton>
      </Cabecera>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Aviso>{error}</Aviso>
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {sedes.map((s) => (
          <article
            key={s.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
              padding: 16,
              background: COLOR.papel,
              border: `1px solid ${COLOR.linea}`,
              borderRadius: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--font-serif)", fontSize: 19 }}>{s.nombre}</span>
                {s.principal && <span style={{ ...rotulo, marginBottom: 0 }}>principal</span>}
                {!s.activa && <span style={{ ...rotulo, marginBottom: 0, color: COLOR.aviso }}>oculta</span>}
              </div>

              <p style={{ margin: "5px 0 0", fontSize: 13, color: COLOR.suave, lineHeight: 1.5 }}>
                {s.direccion}
                {s.barrio ? ` · ${s.barrio}` : ""}, {s.ciudad}
                {s.horario && (
                  <>
                    <br />
                    {s.horario}
                  </>
                )}
              </p>

              <p style={{ margin: "8px 0 0", fontSize: 12.5, fontFamily: "var(--font-mono)", color: COLOR.tinta }}>
                {s.bolsas_en_stock} unidades en inventario
              </p>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <Boton chico tono="plano" onClick={() => setEnEdicion(s)}>
                Editar
              </Boton>
              <Boton chico tono="peligro" onClick={() => quitar(s)}>
                Borrar
              </Boton>
            </div>
          </article>
        ))}

        {sedes.length === 0 && (
          <p style={{ fontSize: 13.5, color: COLOR.suave }}>
            No hay sedes todavía. Sin al menos una no hay dónde guardar inventario.
          </p>
        )}
      </div>

      {(creando || enEdicion) && (
        <FormularioSede
          sede={enEdicion}
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

function FormularioSede({
  sede,
  onCerrar,
  onGuardado,
}: {
  sede: AdminSede | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [d, setD] = useState({
    nombre: sede?.nombre ?? "",
    direccion: sede?.direccion ?? "",
    ciudad: sede?.ciudad ?? "",
    barrio: sede?.barrio ?? "",
    horario: sede?.horario ?? "",
    principal: sede?.principal ?? false,
    activa: sede?.activa ?? true,
  });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  // Copia de lo que había al abrir: si el borrador ya no coincide, cerrar
  // avisa antes de tirar los cambios.
  const [inicial] = useState(() => JSON.stringify(d));

  const set = (k: keyof typeof d, v: string | boolean) => setD((x) => ({ ...x, [k]: v }));

  async function guardar() {
    setGuardando(true);
    setError("");
    try {
      if (sede) await editarSede(sede.id, d);
      else await crearSede(d);
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
      titulo={sede ? sede.nombre : "Sede nueva"}
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

        <Campo etiqueta="Nombre" nota="Como la llama la gente. Es también el nombre por el que el chatbot la reconoce.">
          <input style={campo} value={d.nombre} onChange={(e) => set("nombre", e.target.value)} required />
        </Campo>

        <div style={dos}>
          <Campo etiqueta="Dirección">
            <input style={campo} value={d.direccion} onChange={(e) => set("direccion", e.target.value)} placeholder="Calle 8 # 5-42" />
          </Campo>
          <Campo etiqueta="Ciudad">
            <input style={campo} value={d.ciudad} onChange={(e) => set("ciudad", e.target.value)} placeholder="Neiva" />
          </Campo>
          <Campo etiqueta="Barrio">
            <input style={campo} value={d.barrio} onChange={(e) => set("barrio", e.target.value)} placeholder="Centro" />
          </Campo>
        </div>

        <Campo etiqueta="Horario" nota='Escríbelo como quieras que se lea: "Lun a Sáb 8:00 a.m. – 7:00 p.m."'>
          <input style={campo} value={d.horario} onChange={(e) => set("horario", e.target.value)} />
        </Campo>

        <Interruptor
          etiqueta="Visible en la página"
          nota="Apagada desaparece de las fichas. Sus unidades siguen contando en el total."
          valor={d.activa}
          onChange={(v) => set("activa", v)}
        />

        <Interruptor
          etiqueta="Sede principal"
          nota="La que se usa por defecto al mover inventario. Solo puede haber una: al marcar esta, la otra se desmarca sola."
          valor={d.principal}
          onChange={(v) => set("principal", v)}
        />
      </div>
    </Hoja>
  );
}
