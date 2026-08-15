"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerHero, guardarHero, SesionVencida } from "@/lib/admin-api";
import { COLOR, campo, Campo, Boton, Cabecera, Aviso, Interruptor } from "@/components/admin/ui";

/**
 * La portada: lo primero que se ve al entrar a la página.
 *
 * La tabla admite varias, pero el sitio dibuja una sola, así que aquí se edita
 * esa: mostrar una lista de portadas de las que solo se ve una sería mentir.
 */
export default function PortadaAdmin() {
  const router = useRouter();
  const [d, setD] = useState({ titulo: "", subtitulo: "", etiqueta: "", cta_texto: "", cta_url: "", activo: true });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const h = await obtenerHero();
      if (h) {
        setD({
          titulo: h.titulo ?? "",
          subtitulo: h.subtitulo ?? "",
          etiqueta: h.etiqueta ?? "",
          cta_texto: h.cta_texto ?? "",
          cta_url: h.cta_url ?? "",
          activo: h.activo,
        });
      }
      setError("");
    } catch (e) {
      if (e instanceof SesionVencida) {
        router.replace("/admin/login");
        return;
      }
      setError(e instanceof Error ? e.message : "No se pudo cargar la portada");
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

  const set = (k: keyof typeof d, v: string | boolean) => setD((x) => ({ ...x, [k]: v }));

  async function guardar() {
    setGuardando(true);
    setError("");
    setListo(false);
    try {
      const cuerpo = new FormData();
      cuerpo.append("titulo", d.titulo);
      cuerpo.append("subtitulo", d.subtitulo);
      cuerpo.append("etiqueta", d.etiqueta);
      cuerpo.append("cta_texto", d.cta_texto);
      cuerpo.append("cta_url", d.cta_url);
      cuerpo.append("activo", d.activo ? "1" : "0");

      await guardarHero(cuerpo);
      setListo(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <p style={{ color: COLOR.suave, fontSize: 14 }}>Cargando la portada…</p>;

  return (
    <>
      <Cabecera titulo="Portada" bajada="El titular y los textos que reciben a quien entra a la página. El fondo es un video fijo.">
        <Boton tono="solido" onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </Boton>
      </Cabecera>

      <div style={{ display: "grid", gap: 14, maxWidth: 620 }}>
        {error && <Aviso>{error}</Aviso>}
        {listo && <Aviso tipo="bien">Portada guardada. Ya se ve en la página.</Aviso>}

        <div style={{ display: "grid", gap: 14, padding: 18, background: COLOR.papel, border: `1px solid ${COLOR.linea}`, borderRadius: 12 }}>
          <Campo etiqueta="Etiqueta" nota="El rótulo pequeño encima del título.">
            <input style={campo} value={d.etiqueta} onChange={(e) => set("etiqueta", e.target.value)} />
          </Campo>

          <Campo etiqueta="Título">
            <input style={campo} value={d.titulo} onChange={(e) => set("titulo", e.target.value)} required />
          </Campo>

          <Campo etiqueta="Subtítulo">
            <textarea
              style={{ ...campo, minHeight: 66, resize: "vertical", fontFamily: "var(--font-sans)" }}
              value={d.subtitulo}
              onChange={(e) => set("subtitulo", e.target.value)}
            />
          </Campo>

          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))" }}>
            <Campo etiqueta="Texto del botón">
              <input style={campo} value={d.cta_texto} onChange={(e) => set("cta_texto", e.target.value)} placeholder="Ver el catálogo" />
            </Campo>
            <Campo etiqueta="Enlace del botón">
              <input style={campo} value={d.cta_url} onChange={(e) => set("cta_url", e.target.value)} placeholder="#catalogo" />
            </Campo>
          </div>

          {/* El fondo de la portada es un video fijo que vive en el código
              (public/videos/hero.mp4), no una imagen que se suba desde acá.
              Por eso no hay campo de imagen: mostrarlo daría a entender que
              cambiar el fondo se resuelve subiendo un archivo, y no es así. */}
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: COLOR.suave }}>
            El fondo de la portada es un video y se cambia desde el código, no desde aquí.
          </p>

          <Interruptor
            etiqueta="Portada visible"
            nota="Apagada, la página abre directo en el catálogo."
            valor={d.activo}
            onChange={(v) => set("activo", v)}
          />
        </div>
      </div>
    </>
  );
}
