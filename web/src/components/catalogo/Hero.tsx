"use client";

import Image from "next/image";
import type { Hero as HeroDatos } from "@/lib/catalogo";
import { MARCA } from "@/lib/marca";

/** Foto de portada. Es la que pidió Daniel conservar del diseño anterior. */
const FOTO_FONDO = "/img1.jpg";

/**
 * Portada: la foto a sangre, el texto abajo y dos botones.
 *
 * El contenido va apoyado en el borde inferior y no centrado: el velo carga el
 * peso justo ahí, así que el texto queda sobre la parte más oscura y la mitad
 * de arriba de la foto —donde está él— se ve limpia.
 *
 * Debajo va la cinta de logros sobre negro, que es lo que respalda todo lo
 * demás: uno le compra el café a este barista y no a otro por eso.
 */
export default function Hero({ hero }: { hero: HeroDatos | null }) {
  const imagen = hero?.imagen_url ?? FOTO_FONDO;
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
    <>
      {/* "svh", no "dvh": dvh se recalcula en vivo cuando el navegador móvil
          esconde y muestra la barra de direcciones al scrollear, y en una
          sección alta eso se ve como que el hero cambia de tamaño solo. */}
      <section
        id="hero"
        style={{
          position: "relative",
          height: "min(90svh, 780px)",
          minHeight: 540,
          overflow: "hidden",
          background: "var(--color-tinta)",
        }}
      >
        <Image
          src={imagen}
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="100vw"
          className="hero-media"
          // La foto es vertical y él está en la mitad de arriba: recortada al
          // ancho de la pantalla, centrada le corta la cabeza.
          style={{ objectPosition: "center 12%" }}
        />

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

      {/* ── Cinta de logros ── */}
      <div
        style={{
          background: "var(--color-tinta)",
          color: "#FFF",
          borderBottom: "1px solid var(--color-linea)",
        }}
      >
        <ul
          style={{
            maxWidth: "var(--ancho)",
            margin: "0 auto",
            padding: 0,
            listStyle: "none",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          }}
        >
          {MARCA.logros.map((logro, i) => (
            <li
              key={`${logro.anio}-${logro.competencia}`}
              style={{
                padding: "20px clamp(16px, 3vw, 28px)",
                // Con auto-fit las columnas se reacomodan en celular y la
                // primera de una fila nueva puede quedar con borde; es un pelo
                // de línea y no vale una media query.
                borderLeft: i === 0 ? "none" : "1px solid rgba(255,255,255,0.14)",
              }}
            >
              <div className="rotulo" style={{ color: "rgba(255,255,255,0.5)" }}>
                {logro.competencia.replace("Campeonato ", "")}
              </div>
              <div className="nombre" style={{ fontSize: 19, marginTop: 7 }}>
                {logro.puesto} · {logro.anio}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
