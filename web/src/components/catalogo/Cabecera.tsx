"use client";

import { useEffect, useRef, useState } from "react";
import { enlaceWhatsApp, MARCA } from "@/lib/marca";
import IconoRed from "./IconoRed";

/** Una entrada del menú. */
interface Seccion {
  id: string;
  etiqueta: string;
}

/**
 * Las dos secciones fijas del final. No salen del catálogo: son contenido del
 * sitio, no categorías que el panel pueda borrar.
 */
const FIJAS: Seccion[] = [
  { id: "recetas", etiqueta: "Recetas" },
  { id: "preguntas", etiqueta: "Preguntas" },
];

/**
 * La taza de la marca, vista de frente: plato, cuerpo, asa y el vapor saliendo.
 *
 * Reemplaza al grano de café que había. Un grano es la materia prima; lo que
 * vende Daniel es la taza servida —el arte latte—, y a 20 px la silueta de una
 * taza se reconoce de inmediato mientras que el grano se leía como un punto.
 *
 * El vapor sube en bucle muy despacio y solo al pasar el mouse: quieto, el
 * icono no distrae de la barra; al tocarlo, la taza "está caliente".
 */
function Taza() {
  return (
    <span className="marca-taza" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* El vapor va primero para que quede por detrás de la taza. */}
        <g className="marca-vapor">
          <path d="M9.5 5.6c-.9-1 .3-1.7-.5-2.8" />
          <path d="M13 5.6c-.9-1 .3-1.7-.5-2.8" />
        </g>
        {/* Cuerpo: cónico, como una taza de capuchino. */}
        <path d="M4.4 9h13l-1 6.2a3.4 3.4 0 0 1-3.35 2.8h-4.3A3.4 3.4 0 0 1 5.4 15.2Z" />
        {/* Asa */}
        <path d="M17.2 10.6h1.4a2.2 2.2 0 0 1 0 4.4h-1.8" />
        {/* Plato */}
        <path d="M3.2 20.4h15.6" />
      </svg>
    </span>
  );
}

/**
 * Cabecera: la taza, el nombre, TODAS las secciones y el botón de WhatsApp.
 * Encima de todo, una barra que avanza con el scroll.
 *
 * Las secciones van como fichas en un riel que se desliza —la misma barra de la
 * carta de la meca—: la marca se queda fija a la izquierda, fuera del riel,
 * para que el desplazamiento horizontal no se la lleve, y la ficha de la
 * sección que se está leyendo se pinta llena y se trae al centro sola.
 *
 * Antes los enlaces solo salían en escritorio, con el argumento de que en
 * celular el recorrido es el dedo. Con la página como quedó —tres secciones de
 * catálogo, recetas y preguntas— bajar a pulso hasta el temporizador es una
 * tarea, y justo en celular. En un riel caben todas sin ocupar la barra entera.
 *
 * La barra de progreso no es decoración: en una sola página larga es lo único
 * que dice cuánto falta.
 */
export default function Cabecera({ categorias = [] }: { categorias?: { slug: string; nombre: string }[] }) {
  // El menú sale del catálogo REAL, no de una lista escrita a mano. Crear una
  // sección desde el panel —"Básculas", "Molinos"— tiene que verse aquí sin
  // que nadie toque código; con la lista fija, la sección nueva quedaba en la
  // página pero invisible en el menú.
  const secciones: Seccion[] = [
    ...categorias.map((c) => ({ id: `cat-${c.slug}`, etiqueta: c.nombre })),
    ...FIJAS,
  ];

  // El observador se rearma solo si CAMBIAN las secciones. `secciones` es un
  // arreglo nuevo en cada render, así que ponerlo de dependencia recrearía el
  // observador sesenta veces por segundo mientras se hace scroll.
  const claveSecciones = secciones.map((s) => s.id).join(",");

  const [avance, setAvance] = useState(0);
  const [activa, setActiva] = useState<string | null>(null);
  const barra = useRef<HTMLDivElement>(null);
  const riel = useRef<HTMLDivElement>(null);
  const fichaActiva = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // El avance se escribe directo en el DOM y no en el estado: el scroll
    // dispara decenas de eventos por segundo y un re-render por cada uno hace
    // que la página se sienta pesada justo mientras se desplaza.
    let pedido = 0;

    const alDesplazar = () => {
      if (pedido) return;
      pedido = requestAnimationFrame(() => {
        pedido = 0;
        const alto = document.documentElement.scrollHeight - window.innerHeight;
        const cuanto = alto > 0 ? Math.min(1, window.scrollY / alto) : 0;
        if (barra.current) barra.current.style.transform = `scaleX(${cuanto})`;
        setAvance(cuanto);
      });
    };

    alDesplazar();
    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => {
      window.removeEventListener("scroll", alDesplazar);
      cancelAnimationFrame(pedido);
    };
  }, []);

  useEffect(() => {
    // Qué sección se está mirando, para subrayar su enlace. El margen superior
    // descuenta la altura de la barra; el inferior deja "activa" la sección
    // que ocupa la mitad de arriba de la pantalla, que es la que uno siente
    // que está leyendo.
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) setActiva(e.target.id);
        }
      },
      { rootMargin: "-58px 0px -55% 0px", threshold: 0 },
    );

    for (const s of secciones) {
      const el = document.getElementById(s.id);
      if (el) observador.observe(el);
    }

    return () => observador.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveSecciones]);

  // La ficha de la sección que se está leyendo se trae al centro del riel.
  // Sin esto, en el celular uno baja hasta Preguntas y la barra sigue marcando
  // una ficha que quedó tres pantallas a la izquierda, fuera de la vista.
  useEffect(() => {
    const ficha = fichaActiva.current;
    const carril = riel.current;
    if (!ficha || !carril) return;

    carril.scrollTo({
      left: ficha.offsetLeft - carril.clientWidth / 2 + ficha.offsetWidth / 2,
      behavior: "smooth",
    });
  }, [activa]);

  return (
    <>
      {/* Va fuera de la cabecera y fija arriba: si viviera dentro, el fondo
          translúcido de la barra la desteñiría. */}
      <div className="progreso" aria-hidden="true">
        <div ref={barra} className="progreso-avance" />
      </div>

      <nav className={`cabecera${avance > 0.01 ? " cabecera-scroll" : ""}`}>
        <a href="#hero" className="marca">
          <Taza />
          <span className="marca-nombre">{MARCA.nombre}</span>
        </a>

        {/* La raya marca dónde termina la marca y empiezan las secciones, que
            son las que se deslizan. */}
        <span className="cabecera-raya" aria-hidden="true" />

        <div ref={riel} className="cabecera-enlaces">
          {secciones.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              ref={activa === s.id ? fichaActiva : null}
              className={`ficha-seccion${activa === s.id ? " ficha-activa" : ""}`}
              aria-current={activa === s.id ? "true" : undefined}
            >
              {s.etiqueta}
            </a>
          ))}
        </div>

        <a
          href={enlaceWhatsApp(`Hola ${MARCA.nombre}, quiero hacer un pedido.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="boton boton-solido cabecera-pedido"
          aria-label="Pedir por WhatsApp"
        >
          {/* En pantalla angosta se queda el icono solo: con el texto, el botón
              se llevaba dos tercios de la barra y al riel de secciones no le
              quedaba dónde deslizarse. */}
          <span className="cabecera-pedido-icono" aria-hidden="true">
            <IconoRed red="whatsapp" tamano={17} />
          </span>
          <span className="cabecera-pedido-texto">Pedir por WhatsApp</span>
        </a>
      </nav>
    </>
  );
}
