"use client";

import { useState, FormEvent } from "react";
import type { Pregunta } from "@/lib/catalogo";
import { enlaceWhatsApp, MARCA } from "@/lib/marca";
import { useRevelado } from "@/hooks/useRevelar";

/**
 * Las preguntas frecuentes, en acordeón, y un campo para dejar la que no esté.
 *
 * El campo no guarda nada: abre WhatsApp con la pregunta ya escrita. Es
 * deliberado —montar bandeja de entrada, notificaciones y moderación para tres
 * mensajes a la semana es infraestructura que nadie va a mantener— y además es
 * donde el negocio ya responde.
 */
export default function Preguntas({ preguntas }: { preguntas: Pregunta[] }) {
  const { ref, props } = useRevelado<HTMLElement>();
  const [abierta, setAbierta] = useState<number | null>(null);
  const [texto, setTexto] = useState("");

  if (preguntas.length === 0) return null;

  function enviar(e: FormEvent) {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio) return;
    window.open(
      enlaceWhatsApp(`Hola ${MARCA.nombre}, tengo una pregunta: ${limpio}`),
      "_blank",
      "noopener,noreferrer",
    );
    setTexto("");
  }

  return (
    <section ref={ref} {...props} id="preguntas" className="seccion">
      <div className="contenedor contenedor-angosto">
        <span className="epigrafe revelar">Preguntas y comentarios</span>
        <h2 className="titular revelar" style={{ marginTop: 12, transitionDelay: "80ms" }}>
          Lo que más me preguntan
        </h2>

        <ul className="faq revelar" style={{ transitionDelay: "160ms" }}>
          {preguntas.map((p) => {
            const activa = abierta === p.id;
            return (
              <li key={p.id} className="faq-fila">
                <button
                  type="button"
                  className="faq-boton"
                  aria-expanded={activa}
                  onClick={() => setAbierta(activa ? null : p.id)}
                >
                  <span className="faq-pregunta">{p.pregunta}</span>
                  {/* Un solo signo que gira: el "+" se vuelve "×" al abrir sin
                      cambiar de glifo, así no salta el ancho de la caja. */}
                  <span className={`faq-signo${activa ? " faq-signo-abierto" : ""}`} aria-hidden="true">
                    +
                  </span>
                </button>

                {activa && <p className="faq-respuesta desplegado">{p.respuesta}</p>}
              </li>
            );
          })}
        </ul>

        <form className="faq-envio revelar" style={{ transitionDelay: "220ms" }} onSubmit={enviar}>
          <h3 className="nombre faq-envio-titulo">Déjame tu pregunta</h3>
          <div className="faq-envio-campo">
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe tu pregunta o comentario"
              aria-label="Tu pregunta"
            />
            <button type="submit" className="boton boton-solido" disabled={!texto.trim()}>
              Enviar
            </button>
          </div>
          <p className="faq-envio-nota">Te respondo por WhatsApp, normalmente el mismo día.</p>
        </form>
      </div>
    </section>
  );
}
