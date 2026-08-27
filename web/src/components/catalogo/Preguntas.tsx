"use client";

import { useState, FormEvent } from "react";
import type { Pregunta } from "@/lib/catalogo";
import { enviarConsulta } from "@/lib/catalogo";
import { enlaceWhatsApp, MARCA } from "@/lib/marca";
import { useRevelado } from "@/hooks/useRevelar";

/**
 * Las preguntas frecuentes, en acordeón, y un campo para dejar la que no esté.
 *
 * El campo GUARDA la pregunta en la base y, si hay un correo configurado, la
 * manda también por ahí. Antes solo abría WhatsApp; el cliente pidió que las
 * consultas se centralizaran, y un mensaje de WhatsApp se pierde entre los
 * pedidos. Quien prefiera escribir por WhatsApp igual puede: el enlace sigue
 * ahí, como segunda opción.
 *
 * Es
 * deliberado —montar bandeja de entrada, notificaciones y moderación para tres
 * mensajes a la semana es infraestructura que nadie va a mantener— y además es
 * donde el negocio ya responde.
 */
export default function Preguntas({ preguntas }: { preguntas: Pregunta[] }) {
  const { ref, props } = useRevelado<HTMLElement>();
  const [abierta, setAbierta] = useState<number | null>(null);
  const [texto, setTexto] = useState("");
  const [contacto, setContacto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "bien" | "mal"; texto: string } | null>(null);

  if (preguntas.length === 0) return null;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio || enviando) return;

    setEnviando(true);
    setAviso(null);
    try {
      const r = await enviarConsulta({ mensaje: limpio, contacto: contacto.trim() || undefined });
      setAviso({ tipo: "bien", texto: r.mensaje });
      setTexto("");
      setContacto("");
    } catch (err) {
      setAviso({ tipo: "mal", texto: err instanceof Error ? err.message : "No se pudo enviar." });
    } finally {
      setEnviando(false);
    }
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
            <button type="submit" className="boton boton-solido" disabled={!texto.trim() || enviando}>
              {enviando ? "Enviando…" : "Enviar"}
            </button>
          </div>

          {/* Opcional a propósito: pedir datos obligatorios en un "déjame tu
              pregunta" espanta a la mitad de la gente, y una pregunta sin
              remitente igual sirve — si se repite, se vuelve una frecuente. */}
          <input
            className="faq-envio-contacto"
            value={contacto}
            onChange={(e) => setContacto(e.target.value)}
            placeholder="Tu correo o WhatsApp (opcional, para responderte)"
            aria-label="Tu correo o WhatsApp, opcional"
          />

          {aviso ? (
            <p className={`faq-envio-nota faq-envio-${aviso.tipo}`} role="status">
              {aviso.texto}
            </p>
          ) : (
            <p className="faq-envio-nota">
              Te respondo apenas la lea. Si prefieres,{" "}
              <a
                href={enlaceWhatsApp(`Hola ${MARCA.nombre}, tengo una pregunta.`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                escríbeme por WhatsApp
              </a>
              .
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
