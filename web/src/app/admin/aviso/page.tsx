"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerAviso, guardarAviso, SesionVencida } from "@/lib/admin-api";
import { COLOR, campo, Campo, Boton, Cabecera, Aviso as Nota, Interruptor } from "@/components/admin/ui";

/**
 * La banda de aviso de arriba del sitio.
 *
 * Como la portada: la tabla admite varios pero la página dibuja uno solo, así
 * que aquí se edita ese.
 */
export default function AvisoAdmin() {
  const router = useRouter();
  const [d, setD] = useState({
    etiqueta: "Aviso",
    titulo: "",
    texto: "",
    cta_texto: "",
    cta_url: "",
    activo: true,
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const a = await obtenerAviso();
      if (a) {
        setD({
          etiqueta: a.etiqueta ?? "Aviso",
          titulo: a.titulo ?? "",
          texto: a.texto ?? "",
          cta_texto: a.cta_texto ?? "",
          cta_url: a.cta_url ?? "",
          activo: a.activo,
        });
      }
      setError("");
    } catch (e) {
      if (e instanceof SesionVencida) {
        router.replace("/admin/login");
        return;
      }
      setError(e instanceof Error ? e.message : "No se pudo cargar el aviso");
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

  const set = (k: keyof typeof d, v: string | boolean) => setD((x) => ({ ...x, [k]: v }));

  async function guardar() {
    setGuardando(true);
    setError("");
    setListo(false);
    try {
      await guardarAviso(d);
      setListo(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <p style={{ color: COLOR.suave, fontSize: 14 }}>Cargando el aviso…</p>;

  return (
    <>
      <Cabecera
        titulo="Aviso"
        bajada="La banda de arriba del sitio: una feria, un lote que llegó, un cierre por vacaciones. Quien la cierra no la vuelve a ver hasta que cambies el texto."
      >
        <Boton tono="solido" onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </Boton>
      </Cabecera>

      <div style={{ display: "grid", gap: 14, maxWidth: 620 }}>
        {error && <Nota>{error}</Nota>}
        {listo && <Nota tipo="bien">Aviso guardado. Ya se ve en la página.</Nota>}

        <div
          style={{
            display: "grid",
            gap: 14,
            padding: 18,
            background: COLOR.papel,
            border: `1px solid ${COLOR.linea}`,
            borderRadius: 12,
          }}
        >
          <Interruptor
            etiqueta="Aviso encendido"
            nota="Apagado desaparece del sitio, pero el texto se conserva para la próxima."
            valor={d.activo}
            onChange={(v) => set("activo", v)}
          />

          <Campo etiqueta="Etiqueta" nota="El rótulo pequeño de la izquierda: “Aviso”, “Nuevo lote”.">
            <input style={campo} value={d.etiqueta} onChange={(e) => set("etiqueta", e.target.value)} />
          </Campo>

          <Campo etiqueta="Título">
            <input
              style={campo}
              value={d.titulo}
              onChange={(e) => set("titulo", e.target.value)}
              placeholder="Barra en vivo en la Feria del Café"
              required
            />
          </Campo>

          <Campo etiqueta="Texto">
            <textarea
              style={{ ...campo, minHeight: 66, resize: "vertical", fontFamily: "var(--font-sans)" }}
              value={d.texto}
              onChange={(e) => set("texto", e.target.value)}
              placeholder="Del 12 al 14 de septiembre estoy en Pitalito…"
            />
          </Campo>

          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))" }}>
            <Campo etiqueta="Texto del botón" nota="Déjalo vacío y la banda sale sin botón.">
              <input style={campo} value={d.cta_texto} onChange={(e) => set("cta_texto", e.target.value)} placeholder="Quiero ir" />
            </Campo>
            <Campo etiqueta="Enlace del botón">
              <input style={campo} value={d.cta_url} onChange={(e) => set("cta_url", e.target.value)} placeholder="https://wa.me/57…" />
            </Campo>
          </div>
        </div>
      </div>
    </>
  );
}
