"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listarConsultas,
  alternarConsulta,
  borrarConsulta,
  SesionVencida,
  type AdminConsulta,
} from "@/lib/admin-api";
import { COLOR, Boton, Cabecera, Aviso } from "@/components/admin/ui";

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

/**
 * Las preguntas que deja la gente en la página.
 *
 * Es una bandeja de entrada, no un archivo: las sin atender van primero y el
 * único gesto que importa es marcarlas cuando ya se respondieron. Responder se
 * hace por fuera —por WhatsApp o por correo, según lo que haya dejado quien
 * pregunta— porque el sitio no manda mensajes en nombre de nadie.
 */
export default function ConsultasAdmin() {
  const router = useRouter();
  const [consultas, setConsultas] = useState<AdminConsulta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setConsultas(await listarConsultas());
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
    // Igual que el resto del panel: la petición va firmada con el token de
    // sessionStorage, así que no puede hacerse en el servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  async function alternar(c: AdminConsulta) {
    // Optimista: marcar y desmarcar es el gesto que más se repite y esperar al
    // servidor en cada clic hace que la bandeja se sienta pegajosa.
    setConsultas((cs) => cs.map((x) => (x.id === c.id ? { ...x, atendida: !x.atendida } : x)));
    try {
      await alternarConsulta(c.id);
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

  if (cargando) return <p style={{ color: COLOR.suave, fontSize: 14 }}>Cargando las preguntas…</p>;

  const pendientes = consultas.filter((c) => !c.atendida).length;

  return (
    <>
      <Cabecera
        titulo="Preguntas recibidas"
        bajada={
          pendientes > 0
            ? `${pendientes} sin responder. Se guardan siempre, aunque el correo falle.`
            : "Todo respondido. Las que llegan de la página aparecen acá."
        }
      />

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

            <div style={{ display: "flex", gap: 6 }}>
              <Boton chico onClick={() => alternar(c)}>
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
    </>
  );
}
