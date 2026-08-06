"use client";

import { useEffect, useRef } from "react";
import type { Hero as HeroDatos } from "@/lib/catalogo";
import { enlaceWhatsApp, MARCA } from "@/lib/marca";

/**
 * Portada: foto o video a sangre, un titular corto centrado y dos botones.
 * Nada más.
 *
 * En las dos referencias el hero no ocupa la pantalla entera —se ve el borde
 * de la sección siguiente— y el texto encima es mínimo. Es lo que hace que la
 * foto se lea como una foto y no como el fondo de un cartel.
 *
 * El video se reproduce UNA sola vez por visita y queda congelado en el último
 * cuadro como fondo estático: en un catálogo el video es ambientación, y
 * dejarlo en bucle es gastar batería para siempre.
 */
export default function Hero({ hero }: { hero: HeroDatos | null }) {
  const contenedor = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  // Una imagen cargada desde el panel manda sobre el video local.
  const imagenFondo = hero?.imagen_url ?? null;

  // Fondo: una pasada del video, y pausa total del zoom cuando el hero sale de
  // pantalla — sin esto el navegador sigue componiendo una capa a pantalla
  // completa mientras se recorre todo el catálogo.
  useEffect(() => {
    const caja = contenedor.current;
    if (!caja) return;
    const media = caja.querySelector<HTMLElement>(".hero-media");
    const v = imagenFondo ? null : video.current;
    let terminado = false;

    const alTerminar = () => {
      terminado = true;
      if (media) media.style.animationPlayState = "paused";
    };

    if (v) {
      v.muted = true;
      v.playbackRate = 0.8;
      v.addEventListener("ended", alTerminar);
    }

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          if (!terminado && media) media.style.animationPlayState = "running";
          if (!terminado) v?.play().catch(() => {});
        } else {
          if (media) media.style.animationPlayState = "paused";
          v?.pause();
        }
      },
      { threshold: 0.05 },
    );
    observador.observe(caja);

    // iOS con ahorro de batería bloquea incluso el autoplay silenciado: play()
    // devuelve NotAllowedError y el video se queda en el póster para siempre.
    // Un gesto del usuario sí lo desbloquea, así que al primer toque en la
    // página se reintenta una vez.
    const reintentar = () => {
      if (!terminado && v?.paused) v.play().catch(() => {});
    };
    document.addEventListener("touchend", reintentar, { once: true, passive: true });

    return () => {
      observador.disconnect();
      document.removeEventListener("touchend", reintentar);
      v?.removeEventListener("ended", alTerminar);
    };
  }, [imagenFondo]);

  const titulo = hero?.titulo ?? "Café bien hecho";
  const etiqueta = hero?.etiqueta ?? `${MARCA.oficio} · ${MARCA.ciudad}`;
  const subtitulo = hero?.subtitulo ?? MARCA.descripcion;

  return (
    <>
      {/* "svh", no "dvh": dvh se recalcula en vivo cuando el navegador móvil
          esconde y muestra la barra de direcciones al scrollear, y en una
          sección alta eso se ve como que el hero cambia de tamaño solo. */}
      <section
        id="hero"
        ref={contenedor}
        style={{
          position: "relative",
          height: "min(84svh, 760px)",
          minHeight: 480,
          overflow: "hidden",
          background: "var(--color-hueso-2)",
        }}
      >
        {imagenFondo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagenFondo} alt="" aria-hidden="true" className="hero-media" />
        ) : (
          <video
            ref={video}
            muted
            playsInline
            // autoPlay ADEMÁS del play() por JS: iOS Safari ignora
            // preload="auto" y no descarga nada hasta que algo dispara la
            // reproducción — solo con el play() del JS, en iPhone el video ni
            // siquiera empezaba a bajar y el fondo quedaba vacío un buen rato.
            autoPlay
            poster="/videos/hero-coffee-poster.jpg"
            preload="auto"
            aria-hidden="true"
            tabIndex={-1}
            className="hero-media"
          >
            <source src="/videos/hero-coffee.mp4" type="video/mp4" />
          </video>
        )}

        {/* Un solo velo, suave y parejo. El texto va centrado, así que no hace
            falta el degradado lateral de la versión anterior. */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(23,22,20,0.45) 0%, rgba(23,22,20,0.25) 45%, rgba(23,22,20,0.55) 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "var(--barra) clamp(20px, 6vw, 40px) 0",
            color: "#FFF",
          }}
        >
          <span
            className="epigrafe"
            style={{
              color: "rgba(255,255,255,0.85)",
              animation: "entrar .8s cubic-bezier(0.2,0.7,0.2,1) .1s both",
            }}
          >
            {etiqueta}
          </span>

          <h1
            className="titular"
            style={{
              fontSize: "clamp(38px, 6.4vw, 76px)",
              maxWidth: 15 * 76,
              margin: "18px 0 0",
              animation: "entrar .9s cubic-bezier(0.2,0.7,0.2,1) .2s both",
            }}
          >
            {titulo}
          </h1>

          <p
            style={{
              maxWidth: 520,
              margin: "18px 0 0",
              fontSize: "clamp(14px, 1.5vw, 16px)",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.88)",
              animation: "entrar .9s cubic-bezier(0.2,0.7,0.2,1) .3s both",
            }}
          >
            {subtitulo}
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 12,
              marginTop: "clamp(26px, 4vw, 38px)",
              animation: "entrar .9s cubic-bezier(0.2,0.7,0.2,1) .4s both",
            }}
          >
            <a
              href={hero?.cta_url ?? "#catalogo"}
              className="boton boton-claro"
              style={{ background: "#FFF", color: "var(--color-tinta)", borderColor: "#FFF", textDecoration: "none" }}
            >
              {hero?.cta_texto ?? "Ver el catálogo"}
            </a>
            <a
              href={enlaceWhatsApp(`Hola ${MARCA.nombre}, quiero preguntarte por tus cursos.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="boton boton-claro"
              style={{ textDecoration: "none" }}
            >
              Cursos y asesorías
            </a>
          </div>
        </div>

        {/* Indicador de scroll, discreto y centrado. */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%",
            bottom: 22,
            transform: "translateX(-50%)",
            width: 1,
            height: 30,
            background: "rgba(255,255,255,0.45)",
            animation: "aparecer 1s ease 1.1s both",
          }}
        >
          <span
            className="punto-scroll"
            style={{ position: "absolute", top: 0, left: -1, width: 3, height: 8, background: "#FFF" }}
          />
        </div>
      </section>

      {/* ── Franja de respaldo ──
          Los datos duros justo debajo del hero, como la fila de garantías de
          las referencias. Acá hablan de él: es lo que respalda que uno le
          compre el café a este barista y no a otro. */}
      <div style={{ borderBottom: "1px solid var(--linea)" }}>
        <ul
          className="contenedor"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            listStyle: "none",
            margin: 0,
            padding: 0,
          }}
        >
          {[
            ["Nacional Arte Latte", "2.º puesto · 2025"],
            ["Nacional Arte Latte", "2.º puesto · 2024"],
            ["Reto 4V", "1.º puesto · 2024"],
            ["Tueste", "Bajo pedido"],
          ].map(([rotulo, valor], i) => (
            <li
              key={`${rotulo}-${valor}`}
              style={{
                padding: "22px clamp(16px, 3vw, 28px)",
                // Con auto-fit las columnas se reacomodan en celular y la
                // primera de una fila nueva puede quedar con borde; es un pelo
                // de línea sobre blanco y no vale una media query.
                borderLeft: i === 0 ? "none" : "1px solid var(--linea-tenue)",
              }}
            >
              <div className="epigrafe" style={{ marginBottom: 6 }}>
                {rotulo}
              </div>
              <div className="cifra" style={{ fontSize: 14, fontWeight: 600 }}>
                {valor}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
