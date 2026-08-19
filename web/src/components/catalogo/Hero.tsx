"use client";

import type { Hero as HeroDatos } from "@/lib/catalogo";
import { MARCA } from "@/lib/marca";

/**
 * El video de portada y su primer cuadro.
 *
 * Van en `public/videos/` y no en el panel: es el fondo del sitio, no
 * contenido que cambie seguido, y desde ahí `next.config.ts` ya les pone
 * cabeceras de caché largas. El póster es lo que se ve mientras el video baja
 * —y lo único que se ve si el visitante pidió menos movimiento—.
 *
 * Dos formatos, WebM primero: pesa 600 KB contra 991 KB del MP4 y lo entienden
 * Chrome, Firefox y Edge. El MP4 queda de respaldo para Safari, que hasta hace
 * poco no leía VP9. El navegador se queda con el primero que sepa reproducir.
 */
const VIDEO_WEBM = "/videos/hero.webm";
const VIDEO_MP4 = "/videos/hero.mp4";
const POSTER_FONDO = "/videos/hero.jpg";

/**
 * Portada: el video a sangre, el texto abajo y dos botones.
 *
 * El contenido va apoyado en el borde inferior y no centrado: el velo carga el
 * peso justo ahí, así que el texto queda sobre la parte más oscura y la mitad
 * de arriba —donde está la escena— se ve limpia.
 *
 * Los podios ya no van aquí debajo: pasaron a la presentación del barista,
 * como medallas. En una cinta pegada al hero se leían como una nota al pie;
 * al lado de su biografía son lo que respalda lo que dice.
 */
export default function Hero({ hero }: { hero: HeroDatos | null }) {
  const etiqueta = hero?.etiqueta ?? `${MARCA.oficio} · ${MARCA.ciudad}`;
  const subtitulo = hero?.subtitulo ?? MARCA.descripcion;

  // El titular se parte en dos: lo que va en redonda y lo que va en itálica.
  // Es el recurso que sostiene el diseño entero. Si el título viene del panel
  // sin coma, se muestra completo en redonda en vez de partirlo a la fuerza.
  const titulo = hero?.titulo ?? "El arte del café, en cada taza.";
  const corte = titulo.indexOf(",");
  const recto = corte > 0 ? titulo.slice(0, corte + 1) : titulo;
  const cursiva = corte > 0 ? titulo.slice(corte + 1).trim() : null;

  // "svh", no "dvh": dvh se recalcula en vivo cuando el navegador móvil
  // esconde y muestra la barra de direcciones al scrollear, y en una sección
  // alta eso se ve como que el hero cambia de tamaño solo.
  return (
    <section
      id="hero"
      style={{
        position: "relative",
        height: "min(90svh, 780px)",
        minHeight: 540,
        overflow: "hidden",
        // El póster va de fondo del contenedor y no solo como `poster` del
        // video: así se ve algo desde el primer cuadro pintado, y es lo que
        // queda cuando el visitante pidió menos movimiento y el video se
        // esconde por CSS.
        background: `var(--color-tinta) url(${POSTER_FONDO}) center/cover no-repeat`,
      }}
    >
      <video
        className="hero-media hero-video"
        poster={POSTER_FONDO}
        // Sin `muted` el navegador bloquea la reproducción automática, y el
        // archivo no trae pista de audio de todos modos.
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src={VIDEO_WEBM} type="video/webm" />
        <source src={VIDEO_MP4} type="video/mp4" />
      </video>

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.28) 42%, rgba(10,10,10,0.86) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          textAlign: "center",
          padding: "0 clamp(20px, 6vw, 40px) clamp(64px, 10vw, 96px)",
          color: "#FFF",
        }}
      >
        <span
          className="epigrafe"
          style={{
            color: "rgba(255,255,255,0.8)",
            animation: "entrar .8s cubic-bezier(.2,.7,.2,1) .1s both",
          }}
        >
          {etiqueta}
        </span>

        <h1
          className="titular"
          style={{
            fontSize: "clamp(46px, 11vw, 88px)",
            lineHeight: 0.98,
            maxWidth: "12ch",
            marginTop: 18,
            animation: "entrar .9s cubic-bezier(.2,.7,.2,1) .22s both",
          }}
        >
          {recto} {cursiva && <em>{cursiva}</em>}
        </h1>

        <p
          style={{
            maxWidth: "42ch",
            margin: "16px 0 0",
            fontSize: 15,
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.82)",
            animation: "entrar .9s cubic-bezier(.2,.7,.2,1) .34s both",
          }}
        >
          {subtitulo}
        </p>

        <div
          style={{
            pointerEvents: "auto",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 10,
            width: "100%",
            maxWidth: 420,
            marginTop: 28,
            animation: "entrar .9s cubic-bezier(.2,.7,.2,1) .46s both",
          }}
        >
          <a
            href={hero?.cta_url ?? "#catalogo"}
            className="boton boton-grande boton-solido-claro"
            style={{ flex: "1 1 160px" }}
          >
            {hero?.cta_texto ?? "Ver la tienda"}
          </a>
          <a
            href="#cat-servicios"
            className="boton boton-grande"
            style={{ flex: "1 1 160px", border: "1px solid rgba(255,255,255,0.5)", color: "#FFF" }}
          >
            Cursos y asesorías
          </a>
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          bottom: 18,
          transform: "translateX(-50%)",
          width: 1,
          height: 34,
          background: "rgba(255,255,255,0.35)",
          pointerEvents: "none",
          animation: "aparecer 1s ease 1.1s both",
        }}
      >
        <span
          className="punto-scroll"
          style={{ position: "absolute", top: 0, left: -1, width: 3, height: 9, background: "#FFF" }}
        />
      </div>
    </section>
  );
}
