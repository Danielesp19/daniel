"use client";

import { useEffect, useRef } from "react";
import type { Hero as HeroDatos } from "@/lib/catalogo";
import { enlaceWhatsApp, MARCA } from "@/lib/marca";
import IconoRed, { type Red } from "./IconoRed";

/**
 * El video de portada y su primer cuadro.
 *
 * Van en `public/videos/` y no en el panel: es el fondo del sitio, no
 * contenido que cambie seguido, y desde ahí `next.config.ts` ya les pone
 * cabeceras de caché largas. El póster es lo que se ve mientras el video baja
 * —y lo único que se ve si el visitante pidió menos movimiento—.
 *
 * Dos formatos, WebM primero: pesa 1,7 MB contra 2,4 MB del MP4 y lo entienden
 * Chrome, Firefox y Edge. El MP4 queda de respaldo para Safari, que hasta hace
 * poco no leía VP9. El navegador se queda con el primero que sepa reproducir.
 *
 * QUÉ SE VE. El montaje que armó Daniel: media docena de figuras terminadas
 * —rosettas, cisnes, el dragón— con sus vertidos, una detrás de otra. Ya viene
 * editado como carrete, así que acá no se corta nada: va entero y a velocidad
 * real.
 *
 * El material queda en 500x500 y sale de un lienzo cuadrado de 720. Se recortó
 * dos veces: los lados, porque la escena venía con franjas negras puestas por
 * el editor, y la franja de abajo, donde estaban el piso, los tenis y las
 * calcomanías de camello que traía pegadas el montaje. Lo que sobrevive es la
 * taza en las manos, que es lo único que tiene que verse en un cuadro chico.
 * También se quitó el audio, que en un fondo que arranca solo no se puede
 * reproducir de todos modos.
 *
 * La calidad subió (CRF 18 en vez de 24): a este tamaño se notaban los bloques
 * en la crema, que es justo donde no se pueden notar.
 */
const VIDEO_WEBM = "/videos/hero.webm";
const VIDEO_MP4 = "/videos/hero.mp4";
const POSTER_FONDO = "/videos/hero.jpg";

/**
 * Cuántas veces se repite antes de quedarse quieto.
 *
 * Dos: el carrete dura veintiséis segundos, así que son casi dos minutos de
 * movimiento y para entonces nadie sigue mirando la portada. Dejarlo dando
 * vueltas mantiene al navegador decodificando y compositando una capa a
 * pantalla completa mientras el visitante lee el catálogo, y en un celular eso
 * es batería. Congela en el último cuadro, que es una figura terminada en alto:
 * un buen sitio donde quedarse.
 */
const PASADAS = 2;

/**
 * Las tres cifras del diseño.
 *
 * OJO: salen del mockup, no de una fuente confirmada. El cliente las aprobó
 * "con los números del diseño" mientras consigue los suyos, así que cuando
 * lleguen los reales se cambian ACÁ y en ningún otro lado.
 */
const CIFRAS = [
  { dato: "+400", nota: "baristas formados" },
  { dato: "100", nota: "productos diferentes" },
  { dato: "Todo", tenue: " el país", nota: "envíos nacionales" },
];

/** Las redes que se muestran bajo el titular, en el orden del diseño. */
const REDES: { red: Red; url: string }[] = [
  { red: "facebook", url: MARCA.facebook },
  { red: "instagram", url: MARCA.instagram },
  { red: "tiktok", url: MARCA.tiktok },
];

/**
 * Portada: el medallón con el video y, al lado, quién es y qué ofrece.
 *
 * Es el diseño que mandó Daniel ("Hero mejora y video pequeño"). El video deja
 * de ser un fondo a sangre y pasa a ser una pieza: un círculo chico con tres
 * anillos y un halo detrás, que es lo que lo vuelve el centro de la composición
 * sin tener que agrandarlo. El fondo lo pone el mismo video —un cuadro suyo,
 * desenfocado, en blanco y negro y al 30 % de opacidad—, así que la portada
 * toma su color de la escena sin pedirle nitidez al archivo.
 *
 * EN CÍRCULO, y no en cuadrado, por una razón práctica además de estética: un
 * círculo recorta la esquina de la escena donde estaban el piso y las
 * calcomanías del montaje, y deja justo la taza en las manos.
 *
 * En escritorio el texto va a la izquierda y el medallón a la derecha; en
 * celular el medallón va arriba y el texto debajo. Es el mismo orden en el que
 * se lee cada formato: en pantalla ancha la mirada entra por la izquierda, en
 * una de mano entra por arriba.
 *
 * NO lleva el párrafo de presentación que tenía —lo pidió quitar el cliente— ni
 * las cifras del diseño (+400 baristas, 1.700 msnm): esos números no los tengo
 * confirmados y una portada no es sitio para inventarlos. Los logros reales ya
 * están en la sección del barista, como medallas.
 */
export default function Hero({ hero }: { hero: HeroDatos | null }) {
  const seccionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  /**
   * El video: se reproduce un par de veces, se queda quieto y se pausa cuando
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
    <section ref={seccionRef} id="hero" className="hero">
      {/* El fondo es un cuadro del propio video: desenfocado, en gris y muy
          bajo de opacidad. Es el póster y no un segundo video —mismo encuadre,
          ni un decodificador más—. */}
      <div className="hero-fondo" aria-hidden="true" style={{ backgroundImage: `url(${POSTER_FONDO})` }} />
      {/* Dos luces y un velo: las luces levantan el centro y la esquina de
          arriba, el velo asienta el texto contra el borde inferior. */}
      <div className="hero-luces" aria-hidden="true" />
      <div className="hero-velo" aria-hidden="true" />

      {/* La barra de la portada. NO es el menú del sitio —ese entra al bajar
          del hero—: es la firma y el único botón que el diseño quiere a la
          vista desde el primer segundo. Va en blanco sobre la escena oscura,
          que es lo que la despega del fondo. */}
      <div className="hero-barra">
        <a href="#hero" className="hero-marca">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 8h1a4 4 0 0 1 0 8h-1" />
            <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" />
          </svg>
          <span>{MARCA.nombre}</span>
        </a>

        <a
          href={enlaceWhatsApp(`Hola ${MARCA.nombre}, quiero hacer un pedido.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="hero-pedido"
        >
          Pedir por WhatsApp
        </a>
      </div>

      <div className="hero-cuerpo">
        <div className="hero-texto">
          <div className="hero-epigrafe">
            <span className="hero-raya" aria-hidden="true" />
            <span className="epigrafe">{etiqueta}</span>
          </div>

          <h1 className="titular hero-titulo">
            {recto} {cursiva && <em>{cursiva}</em>}
          </h1>

          {/* Solo en escritorio: en celular la portada se queda con el titular
              y los botones, que es lo que cabe sin apretar. */}
          {subtitulo && <p className="hero-bajada">{subtitulo}</p>}

          {/* Uno encima del otro y no lado a lado: en fila los dos pesaban
              igual y no se sabía cuál era el camino principal. */}
          <div className="hero-botones">
            <a href={hero?.cta_url ?? "#catalogo"} className="boton boton-grande boton-solido-claro">
              {hero?.cta_texto ?? "Ver la tienda"}
            </a>
            <a href="#cat-servicios" className="boton boton-grande hero-boton-linea">
              Cursos y asesorías
            </a>
          </div>

          {/* Las cifras y las redes cierran la columna, como en el diseño. En
              celular no van acá: las redes bajan al pie de la portada y las
              cifras no salen —tres columnas de números en 390 px se leen como
              una tabla apretada—. */}
          <div className="hero-cifras">
            {CIFRAS.map((c) => (
              <div key={c.nota}>
                <div className="hero-cifra">
                  {c.dato}
                  {c.tenue && <span>{c.tenue}</span>}
                </div>
                <div className="hero-cifra-nota">{c.nota}</div>
              </div>
            ))}
          </div>

          <div className="hero-redes hero-redes-columna">
            {REDES.map(({ red, url }) => (
              <a
                key={red}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="hero-red"
                aria-label={red}
              >
                <IconoRed red={red} tamano={17} />
              </a>
            ))}
          </div>
        </div>

        {/* El medallón. Alrededor no van anillos —no gustaron— sino una órbita
            de texto que gira muy despacio: dice a qué se dedica sin ocupar una
            línea más de la portada, y al ser tipografía y no geometría no se
            lee como un adorno pegado encima. */}
        <div className="hero-medallon">
          <svg className="hero-orbita" viewBox="0 0 200 200" aria-hidden="true">
            <defs>
              <path
                id="hero-orbita-guia"
                fill="none"
                d="M 100,100 m -84,0 a 84,84 0 1,1 168,0 a 84,84 0 1,1 -168,0"
              />
            </defs>
            <text>
              {/* El mismo epígrafe del panel, dando la vuelta: una sola fuente
                  para el mismo dato. Se repite dos veces para cerrar el
                  círculo sin dejar un hueco. */}
              <textPath href="#hero-orbita-guia" startOffset="0">
                {`${etiqueta} · ${etiqueta} · `}
              </textPath>
            </text>
          </svg>

          <video
            ref={videoRef}
            className="hero-video"
            poster={POSTER_FONDO}
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
        </div>
      </div>

      {/* Las redes van pegadas abajo, no debajo de los botones: ahí cierran la
          portada en vez de competir con la llamada principal. */}
      <div className="hero-pie">
        <span className="hero-filete" aria-hidden="true" />
        <div className="hero-redes">
          {REDES.map(({ red, url }) => (
            <a
              key={red}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="hero-red"
              aria-label={red}
            >
              <IconoRed red={red} tamano={17} />
            </a>
          ))}
        </div>
      </div>

      <div className="hero-scroll" aria-hidden="true">
        <span className="punto-scroll" />
      </div>
    </section>
  );
}
