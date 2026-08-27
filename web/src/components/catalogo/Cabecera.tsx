"use client";

import { useEffect, useRef, useState } from "react";
import { enlaceWhatsApp, MARCA } from "@/lib/marca";

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
 * Cabecera: el grano, el nombre, los enlaces de sección y el botón de
 * WhatsApp. Encima de todo, una barra que avanza con el scroll.
 *
 * Antes no llevaba menú, y con tres secciones tenía sentido: el recorrido era
 * bajar. Con recetas y preguntas al final la página se volvió larga, y bajar a
 * pulso hasta el temporizador es una tarea. Los enlaces solo salen en
 * escritorio; en celular la barra la ocuparían entera y el recorrido sigue
 * siendo el dedo.
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

  return (
    <>
      {/* Va fuera de la cabecera y fija arriba: si viviera dentro, el fondo
          translúcido de la barra la desteñiría. */}
      <div className="progreso" aria-hidden="true">
        <div ref={barra} className="progreso-avance" />
      </div>

      <nav className={`cabecera${avance > 0.01 ? " cabecera-scroll" : ""}`}>
        <a href="#hero" className="marca">
          <span className="marca-grano" aria-hidden="true">
            <span />
          </span>
          <span className="marca-nombre">{MARCA.nombre}</span>
        </a>

        <span style={{ flex: 1 }} />

        <div className="cabecera-enlaces">
          {secciones.map((s) => (
            <a key={s.id} href={`#${s.id}`} className={`enlace-seccion${activa === s.id ? " enlace-activo" : ""}`}>
              {s.etiqueta}
              <span className="enlace-linea" aria-hidden="true" />
            </a>
          ))}
        </div>

        <a
          href={enlaceWhatsApp(`Hola ${MARCA.nombre}, quiero hacer un pedido.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="boton boton-solido"
          style={{ minHeight: 40, padding: "9px 18px", fontSize: 12, letterSpacing: "0.03em" }}
        >
          Pedir por WhatsApp
        </a>
      </nav>
    </>
  );
}
