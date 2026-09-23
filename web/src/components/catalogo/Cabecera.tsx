"use client";

import { useEffect, useRef, useState } from "react";
import { MARCA } from "@/lib/marca";
import Taza from "./Taza";

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
 * Cabecera: la taza, el nombre y TODAS las secciones. Encima de todo, una
 * barra que avanza con el scroll.
 *
 * SIN botón de pedido. Llevaba uno de WhatsApp y se lo comía todo: en celular
 * dejaba al riel de secciones con sitio para una ficha y media, y en escritorio
 * competía con el "Ver el catálogo" de la portada, que está tres centímetros
 * más abajo. El pedido no se pierde —vive en cada producto, en el carrito, en
 * los servicios y en el pie—, y ahí llega con el contexto de qué se está
 * pidiendo en vez de abrir un chat en blanco.
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
 * NO SE VE SOBRE LA PORTADA. El hero ocupa la pantalla entera y se presenta
 * solo —con el medallón, el titular y sus dos botones—; la barra entra
 * deslizándose en cuanto se baja de él. Antes estaba fija desde el primer
 * píxel y le comía a la portada una franja blanca justo donde empieza.
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
  // La barra no existe sobre la portada: aparece al bajar de ella.
  const [pasoElHero, setPasoElHero] = useState(false);
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

        // Se mide contra el borde de abajo de la portada y no contra un número
        // de píxeles: el hero mide una pantalla completa, y una pantalla no
        // mide lo mismo en un celular que en un monitor.
        const portada = document.getElementById("hero");
        setPasoElHero(portada ? portada.getBoundingClientRect().bottom <= 4 : true);
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

      <nav
        className={`cabecera${avance > 0.01 ? " cabecera-scroll" : ""}${pasoElHero ? " cabecera-dentro" : ""}`}
        // Mientras está escondida no debe recibir el tabulador ni el lector de
        // pantalla: es una barra que todavía no existe para quien navega.
        aria-hidden={!pasoElHero}
        inert={!pasoElHero}
      >
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
      </nav>
    </>
  );
}
