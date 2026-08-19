"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Receta } from "@/lib/catalogo";
import { useRevelado } from "@/hooks/useRevelar";

/** Cuenta atrás en mm:ss. Por encima de una hora se dice en horas. */
function reloj(segundos: number): string {
  if (segundos >= 3600) {
    const h = Math.floor(segundos / 3600);
    const m = Math.round((segundos % 3600) / 60);
    return `${h} h ${String(m).padStart(2, "0")}`;
  }
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;
}

/**
 * El temporizador de la receta.
 *
 * Cuenta contra el reloj del sistema y no sumando ticks: un `setInterval` de
 * un segundo se atrasa cuando la pestaña pasa a segundo plano, y en un café de
 * cuatro minutos ese atraso se nota. Aquí el intervalo solo repinta; la cuenta
 * sale siempre de la diferencia entre dos marcas de tiempo.
 */
function Temporizador({ segundos }: { segundos: number }) {
  const [restante, setRestante] = useState(segundos);
  const [corriendo, setCorriendo] = useState(false);
  const finRef = useRef(0);

  // Cambiar de receta reinicia el reloj: seguir contando el de la anterior
  // sobre los pasos de otra sería peor que no tenerlo.
  useEffect(() => {
    // Sincroniza el reloj con la receta abierta. El componente se remonta con
    // `key` al cambiar de receta, así que esto solo corre en el montaje; queda
    // por si alguna vez se reusa la instancia.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCorriendo(false);
    setRestante(segundos);
  }, [segundos]);

  useEffect(() => {
    if (!corriendo) return;

    const t = window.setInterval(() => {
      const quedan = Math.max(0, Math.round((finRef.current - Date.now()) / 1000));
      setRestante(quedan);
      if (quedan === 0) setCorriendo(false);
    }, 250);

    return () => clearInterval(t);
  }, [corriendo]);

  const arrancar = () => {
    const desde = restante > 0 ? restante : segundos;
    finRef.current = Date.now() + desde * 1000;
    setRestante(desde);
    setCorriendo(true);
  };

  const listo = restante === 0;
  const avance = segundos > 0 ? 1 - restante / segundos : 0;

  return (
    <div className="reloj">
      <div className="reloj-cifra">
        <span className="cifra">{reloj(restante)}</span>
        <span className="reloj-unidad">{listo ? "listo" : corriendo ? "en curso" : "min"}</span>
      </div>

      <div className="reloj-barra" aria-hidden="true">
        <span className="reloj-avance" style={{ transform: `scaleX(${avance})` }} />
      </div>

      <div className="reloj-botones">
        <button
          type="button"
          className="boton boton-solido"
          onClick={() => (corriendo ? setCorriendo(false) : arrancar())}
        >
          {corriendo ? "Pausar" : listo ? "Otra vez" : "Iniciar"}
        </button>
        <button
          type="button"
          className="boton boton-linea"
          onClick={() => {
            setCorriendo(false);
            setRestante(segundos);
          }}
        >
          Reiniciar
        </button>
      </div>
    </div>
  );
}

/**
 * La sección de recetas: los métodos como filtro, la lista a la izquierda y el
 * paso a paso a la derecha, con su reloj.
 *
 * Es la única sección de la página que no vende nada: enseña. Por eso va al
 * final, después de todo lo que se puede comprar o agendar.
 */
export default function Recetas({ recetas }: { recetas: Receta[] }) {
  const { ref, props } = useRevelado<HTMLElement>();
  const [metodo, setMetodo] = useState<string>("Todas");
  const [elegidaId, setElegidaId] = useState<number | null>(recetas[0]?.id ?? null);

  // Los métodos que existen de verdad, en el orden en que aparecen. Nada de
  // una lista fija: si el panel agrega "Sifón", el filtro sale solo.
  const metodos = useMemo(() => {
    const vistos: string[] = [];
    for (const r of recetas) if (!vistos.includes(r.metodo)) vistos.push(r.metodo);
    return ["Todas", ...vistos];
  }, [recetas]);

  const visibles = metodo === "Todas" ? recetas : recetas.filter((r) => r.metodo === metodo);

  // Si el filtro deja fuera la receta abierta, se pasa a la primera que quede:
  // el panel de la derecha no puede quedar mostrando algo que la lista ya no
  // tiene.
  const elegida = visibles.find((r) => r.id === elegidaId) ?? visibles[0] ?? null;

  if (recetas.length === 0) return null;

  return (
    <section ref={ref} {...props} id="recetas" className="seccion seccion-banda">
      <div className="contenedor">
        <div style={{ marginBottom: "clamp(22px, 4vw, 40px)" }}>
          <span className="epigrafe revelar">Prepáralo en casa</span>
          <h2 className="titular revelar" style={{ marginTop: 12, transitionDelay: "80ms" }}>
            Recetas
          </h2>
          <p
            className="bajada revelar"
            style={{
              margin: "12px 0 0",
              maxWidth: "44ch",
              fontSize: 14,
              lineHeight: 1.7,
              color: "var(--color-suave)",
              transitionDelay: "160ms",
            }}
          >
            Las mismas proporciones que uso en barra. Elige el método, sigue los pasos y deja correr
            el reloj.
          </p>
        </div>

        <div className="recetas-filtros revelar" style={{ transitionDelay: "200ms" }}>
          {metodos.map((m, i) => (
            <button
              key={m}
              type="button"
              className={`filtro${m === metodo ? " filtro-activo" : ""}`}
              aria-pressed={m === metodo}
              onClick={() => setMetodo(m)}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="recetas">
          <ol className="recetas-lista revelar" style={{ transitionDelay: "240ms" }}>
            {visibles.map((r, i) => (
              <li key={r.id}>
                <button
                  type="button"
                  className={`receta-fila${r.id === elegida?.id ? " receta-activa" : ""}`}
                  onClick={() => setElegidaId(r.id)}
                  aria-current={r.id === elegida?.id}
                >
                  <span className="rotulo receta-numero">{String(i + 1).padStart(2, "0")}</span>
                  <span className="receta-info">
                    <span className="receta-nombre">{r.nombre}</span>
                    {r.resumen && <span className="receta-resumen cifra">{r.resumen}</span>}
                  </span>
                  <span className="rotulo receta-metodo">{r.metodo}</span>
                </button>
              </li>
            ))}
          </ol>

          {elegida && (
            <article className="receta-panel revelar" style={{ transitionDelay: "300ms" }}>
              <header className="receta-panel-cabeza">
                <div>
                  <h3 className="nombre receta-titulo">{elegida.nombre}</h3>
                  {elegida.detalle && <p className="receta-detalle">{elegida.detalle}</p>}
                </div>
                <span className="rotulo">{elegida.metodo}</span>
              </header>

              {elegida.ingredientes.length > 0 && (
                <ul className="receta-ingredientes">
                  {elegida.ingredientes.map((ing) => (
                    <li key={ing}>{ing}</li>
                  ))}
                </ul>
              )}

              <ol className="receta-pasos">
                {elegida.pasos.map((paso, i) => (
                  <li key={i}>
                    <span className="cifra receta-paso-numero">{i + 1}</span>
                    <span>{paso}</span>
                  </li>
                ))}
              </ol>

              {elegida.producto && (
                <p className="receta-recomendado">
                  <span className="rotulo">Queda mejor con</span> {elegida.producto.nombre}
                </p>
              )}

              {elegida.duracion_seg ? (
                <Temporizador key={elegida.id} segundos={elegida.duracion_seg} />
              ) : null}
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
