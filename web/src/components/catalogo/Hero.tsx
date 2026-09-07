"use client";

import { useEffect, useRef } from "react";
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
 * Dos formatos, WebM primero: pesa 4,6 MB contra 5,5 MB del MP4 y lo entienden
 * Chrome, Firefox y Edge. El MP4 queda de respaldo para Safari, que hasta hace
 * poco no leía VP9. El navegador se queda con el primero que sepa reproducir.
 *
 * El material es vertical (944x1424, su tamaño nativo): es el vertido en picado
 * grabado con celular, los dos vertidos completos. De la fuente se recortaron
 * los bordes negros —que son del editor, no de la escena, y en el celular
 * habrían salido como franjas dentro del cuadro— y se quitó el audio, que en un
 * fondo que arranca solo no se puede reproducir de todos modos.
 *
 * PESO. Medio minuto a tamaño nativo no cabe en el kilobyte y medio de un
 * fondo cualquiera: son 5,5 MB, el techo que fijó el cliente. Se banca porque
 * el video NO bloquea el pintado —el póster se ve desde el primer cuadro— y
 * porque `next.config.ts` le pone caché de un día, así que se baja una vez.
 */
const VIDEO_WEBM = "/videos/hero.webm";
const VIDEO_MP4 = "/videos/hero.mp4";
const POSTER_FONDO = "/videos/hero.jpg";

/**
 * Cuántas veces se repite antes de quedarse quieto.
 *
 * Una sola: son treinta segundos con los dos vertidos enteros, y para cuando
 * termina ya nadie está mirando la portada. Dejarlo dando vueltas mantiene al
 * navegador decodificando y compositando una capa a pantalla completa mientras
 * el visitante lee el catálogo —en un celular eso es batería—. Al terminar se
 * queda congelado en el último cuadro, que es la figura lista: un buen sitio
 * donde quedarse.
 */
const PASADAS = 1;

/**
 * Portada: el video a sangre, el texto abajo y dos botones.
 *
 * El contenido va apoyado en el borde inferior y no centrado: el velo carga el
 * peso justo ahí, así que el texto queda sobre la parte más oscura y la mitad
 * de arriba —donde está la escena— se ve limpia.
 *
 * Los textos entran escalonados y despacio —cada uno espera a que el anterior
 * termine de asentarse—. Estuvieron el doble de rápidos y el cliente no
 * alcanzaba a leer su propia presentación antes de que la siguiente línea ya
 * estuviera encima.
 *
 * Los podios ya no van aquí debajo: pasaron a la presentación del barista,
 * como medallas. En una cinta pegada al hero se leían como una nota al pie;
 * al lado de su biografía son lo que respalda lo que dice.
 */
export default function Hero({ hero }: { hero: HeroDatos | null }) {
  const seccionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  /**
   * El fondo: se reproduce un par de veces, se queda quieto y se pausa cuando
   * el hero sale de pantalla.
   *
   * Va con `autoPlay` Y con `play()` a mano: iOS ignora `preload` por ahorro de
   * datos y sin el atributo ni empieza a bajar el archivo, pero hay casos —modo
   * de bajo consumo— en los que el autoplay silenciado también se bloquea y
   * entonces solo un gesto del visitante lo desbloquea. Por eso al primer toque
   * en la página se reintenta una vez.
   */
  useEffect(() => {
    const seccion = seccionRef.current;
    const video = videoRef.current;
    if (!seccion || !video) return;

    let pasadas = 0;
    let terminado = false;

    video.muted = true;
    // A la mitad de la velocidad real. Es un fondo, no un tutorial: a velocidad
    // natural el vertido pasa como un gesto rápido, y a la mitad se alcanza a
    // ver cómo la leche va abriendo la figura, que es lo que vende la portada.
    // Los treinta segundos de material se vuelven un minuto largo, y por eso
    // basta una sola pasada.
    video.playbackRate = 0.5;

    const alTerminar = () => {
      pasadas += 1;
      if (pasadas < PASADAS) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        terminado = true;
        video.classList.add("hero-video-quieto");
      }
    };
    video.addEventListener("ended", alTerminar);

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          if (!terminado) video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.05 },
    );
    observador.observe(seccion);

    const reintentar = () => {
      if (!terminado && video.paused) video.play().catch(() => {});
    };
    document.addEventListener("touchend", reintentar, { once: true, passive: true });

    return () => {
      video.removeEventListener("ended", alTerminar);
      document.removeEventListener("touchend", reintentar);
      observador.disconnect();
    };
  }, []);

  const etiqueta = hero?.etiqueta ?? `${MARCA.oficio} · ${MARCA.ciudad}`;
  const subtitulo = hero?.subtitulo ?? MARCA.descripcion;

  // El titular se parte en dos: lo que va en redonda y lo que va en itálica.
  // Es el recurso que sostiene el diseño entero. Si el título viene del panel
  // sin coma, se muestra completo en redonda en vez de partirlo a la fuerza.
  const titulo = hero?.titulo ?? "El arte del café, en cada taza.";
  const corte = titulo.indexOf(",");
  const recto = corte > 0 ? titulo.slice(0, corte + 1) : titulo;
  const cursiva = corte > 0 ? titulo.slice(corte + 1).trim() : null;

  return (
    <section
      ref={seccionRef}
      id="hero"
      style={{
        position: "relative",
        // Pantalla completa, menos la cabecera fija: el hero es lo primero que
        // se ve y el cliente lo quiere ocupando todo. Se descuenta `--barra`
        // para que la barra no quede montada sobre el titular.
        //
        // "svh" y no "dvh": dvh se recalcula en vivo cuando el navegador móvil
        // esconde y muestra la barra de direcciones al scrollear, y en una
        // sección de pantalla completa eso se ve como que el hero cambia de
        // tamaño solo mientras uno baja.
        height: "calc(100svh - var(--barra))",
        minHeight: 540,
        overflow: "hidden",
        // El póster va de fondo del contenedor y no solo como `poster` del
        // video: así se ve algo desde el primer cuadro pintado, y es lo que
        // queda cuando el visitante pidió menos movimiento y el video se
        // esconde por CSS.
        background: `var(--color-tinta) url(${POSTER_FONDO}) center/cover no-repeat`,
      }}
    >
      {/* El fondo desenfocado, solo en pantallas anchas: el video es vertical y
          a lo ancho quedaría o recortado a una tira o flotando sobre un vacío
          negro. Es el póster, no un segundo video: mismo encuadre, sin un
          decodificador más corriendo. */}
      <div className="hero-fondo" aria-hidden="true" style={{ backgroundImage: `url(${POSTER_FONDO})` }} />

      <video
        ref={videoRef}
        className="hero-media hero-video"
        poster={POSTER_FONDO}
        // Sin `muted` el navegador bloquea la reproducción automática, y el
        // archivo no trae pista de audio de todos modos.
        autoPlay
        muted
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
            animation: "entrar 1.1s cubic-bezier(.2,.7,.2,1) .25s both",
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
            animation: "entrar 1.2s cubic-bezier(.2,.7,.2,1) .55s both",
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
            animation: "entrar 1.2s cubic-bezier(.2,.7,.2,1) .95s both",
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
            animation: "entrar 1.2s cubic-bezier(.2,.7,.2,1) 1.3s both",
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
