"use client";

import { useEffect, useRef } from "react";
import type { Hero as HeroDatos } from "@/lib/catalogo";
import { MARCA } from "@/lib/marca";

/**
 * Portada. Video de fondo a sangre, titular condensado alineado a la
 * izquierda y una franja de datos duros debajo — la misma lógica de ficha
 * técnica que usa el catálogo, aplicada a la marca entera.
 *
 * El video se reproduce UNA sola vez por visita y queda congelado en el
 * último cuadro como fondo estático: en un catálogo el video es ambientación,
 * y dejarlo en bucle es gastar batería para siempre.
 */
export default function Hero({ hero }: { hero: HeroDatos | null }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const cabecera = useRef<HTMLElement>(null);

  // Una imagen cargada desde el panel manda sobre el video local.
  const imagenFondo = hero?.imagen_url ?? null;

  // La cabecera se desvanece al bajar hacia el catálogo y reaparece al subir.
  // Solo escribe opacity/transform, que van por el compositor y no provocan
  // recálculo de layout en cada frame de scroll.
  useEffect(() => {
    let raf: number | null = null;
    const alScrollear = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const el = cabecera.current;
        if (!el) return;
        const f = Math.min(1, window.scrollY / (window.innerHeight * 0.4));
        el.style.opacity = (1 - f).toFixed(3);
        el.style.transform = `translateY(${(-14 * f).toFixed(1)}px)`;
        el.style.pointerEvents = f > 0.85 ? "none" : "";
      });
    };
    window.addEventListener("scroll", alScrollear, { passive: true });
    alScrollear();
    return () => {
      window.removeEventListener("scroll", alScrollear);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Fondo: una pasada del video, y pausa total del zoom cuando el hero sale
  // de pantalla — sin esto el navegador sigue componiendo una capa a pantalla
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
  const etiqueta = hero?.etiqueta ?? MARCA.oficio;
  const subtitulo = hero?.subtitulo ?? MARCA.descripcion;

  return (
    <div ref={contenedor} style={{ position: "relative", background: "#0A0A0A" }}>
      {/* "svh", no "dvh": dvh se recalcula en vivo cuando el navegador móvil
          esconde y muestra la barra de direcciones al scrollear, y en una
          sección a pantalla completa eso se ve como que el hero cambia de
          tamaño solo. svh usa el alto mínimo y se queda quieto. */}
      <section
        style={{
          position: "sticky",
          top: 0,
          height: "100svh",
          minHeight: 560,
          overflow: "hidden",
          background: "#0A0A0A",
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

        {/* Oscurecido: el titular tiene que leerse sobre cualquier cuadro del
            video, incluidos los más claros. */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(10,10,10,0.94) 0%, rgba(10,10,10,0.72) 45%, rgba(10,10,10,0.5) 100%)",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(10,10,10,0.7) 0%, transparent 30%, rgba(10,10,10,0.95) 100%)",
          }}
        />

        {/* Cuadrícula técnica: la retícula del sistema, apenas visible. */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(250,250,250,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(250,250,250,0.045) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(120% 90% at 20% 40%, #000 20%, transparent 78%)",
            WebkitMaskImage: "radial-gradient(120% 90% at 20% 40%, #000 20%, transparent 78%)",
          }}
        />

        {/* ── Cabecera ── */}
        <header
          ref={cabecera}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "clamp(18px,3vw,30px) clamp(20px,5vw,56px)",
            animation: "aparecer 1s ease both",
            willChange: "opacity, transform",
          }}
        >
          <span className="titular" style={{ fontSize: "clamp(20px,4.6vw,26px)", letterSpacing: "0.04em" }}>
            {MARCA.nombre}
          </span>
          <span className="etiqueta" style={{ color: "var(--apagado)" }}>
            {MARCA.ciudad}
          </span>
        </header>

        {/* ── Contenido ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 clamp(20px,5vw,56px)",
            maxWidth: 1400,
            margin: "0 auto",
          }}
        >
          <div style={{ maxWidth: 780 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: "clamp(16px,2.5vw,24px)",
                animation: "entrar .8s cubic-bezier(0.2,0.7,0.2,1) .1s both",
              }}
            >
              <span style={{ width: 28, height: 2, background: "var(--color-acido)" }} />
              <span className="etiqueta" style={{ color: "var(--color-acido)" }}>
                {etiqueta}
              </span>
            </div>

            <h1
              className="titular"
              style={{
                fontSize: "clamp(58px,13.5vw,168px)",
                margin: 0,
                animation: "entrar .9s cubic-bezier(0.2,0.7,0.2,1) .2s both",
              }}
            >
              {titulo}
            </h1>

            <p
              style={{
                maxWidth: 460,
                margin: "clamp(20px,3vw,30px) 0 0",
                fontSize: "clamp(14px,1.5vw,16px)",
                lineHeight: 1.6,
                color: "var(--apagado)",
                animation: "entrar .9s cubic-bezier(0.2,0.7,0.2,1) .32s both",
              }}
            >
              {subtitulo}
            </p>

            <a
              href={hero?.cta_url ?? "#catalogo"}
              style={{
                marginTop: "clamp(26px,3.5vw,40px)",
                display: "inline-flex",
                alignItems: "center",
                gap: 14,
                padding: "15px 30px",
                border: "1px solid var(--color-acido)",
                background: "transparent",
                color: "var(--color-acido)",
                textDecoration: "none",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                transition: "background .2s, color .2s",
                animation: "entrar .9s cubic-bezier(0.2,0.7,0.2,1) .44s both",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--color-acido)";
                e.currentTarget.style.color = "#0A0A0A";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--color-acido)";
              }}
            >
              {hero?.cta_texto ?? "Ver el catálogo"}
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>

        {/* ── Franja de datos al pie ── */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 25,
            borderTop: "1px solid var(--linea)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            animation: "aparecer 1s ease .7s both",
          }}
        >
          {/* La franja de datos habla de él, no de una finca: es lo que
              respalda que uno le compre el café a este barista y no a otro. */}
          {[
            ["Nacional Arte Latte", "2.º · 2025"],
            ["Nacional Arte Latte", "2.º · 2024"],
            ["Reto 4V", "1.º · 2024"],
            ["Pedidos", "WhatsApp"],
          ].map(([rotulo, valor], i) => (
            <div
              key={rotulo}
              style={{
                padding: "14px clamp(20px,5vw,32px)",
                // Línea divisoria entre columnas, menos en la primera. Con
                // auto-fit las columnas se reacomodan en celular y la primera
                // de cada fila puede llevar borde: es un detalle que casi no
                // se ve sobre el degradado y no vale una media query.
                borderLeft: i === 0 ? "none" : "1px solid var(--linea-tenue)",
                background: "rgba(10,10,10,0.55)",
                backdropFilter: "blur(6px)",
              }}
            >
              <div className="etiqueta" style={{ color: "var(--apagado)", marginBottom: 6 }}>
                {rotulo}
              </div>
              <div className="cifra" style={{ fontSize: 14 }}>
                {valor}
              </div>
            </div>
          ))}
        </div>

        {/* Indicador de scroll */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            right: "clamp(20px,5vw,56px)",
            bottom: 110,
            zIndex: 26,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            animation: "aparecer 1s ease 1.1s both",
          }}
        >
          <span className="etiqueta" style={{ writingMode: "vertical-rl", color: "var(--apagado)" }}>
            Scroll
          </span>
          <span style={{ position: "relative", width: 1, height: 34, background: "var(--linea)" }}>
            <span
              className="punto-scroll"
              style={{
                position: "absolute",
                top: 0,
                left: -1,
                width: 3,
                height: 8,
                background: "var(--color-acido)",
              }}
            />
          </span>
        </div>
      </section>
    </div>
  );
}
