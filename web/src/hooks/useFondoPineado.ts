"use client";

import { useEffect, useState } from "react";

/**
 * Fondo pineado mientras se hace scroll por TODA una sección (vitrina de
 * cierre de la carta, vertical u horizontal), a pantalla completa y SIEMPRE
 * con foto (nunca cae a un color plano) — sin usar CSS `position:sticky`: un
 * ancestor de estas secciones (el <section id="menu"> de MenuSection) tiene
 * `overflow-x: clip` para recortar el sangrado horizontal de los carruseles,
 * y eso rompe el cálculo del rango en el que un sticky descendiente se queda
 * "pegado" — en la práctica nunca se soltaba y tapaba el footer para siempre.
 * Se resuelve a mano con 4 estados según la posición de la sección respecto
 * al viewport:
 *   "antes"   → aún no llega el scroll: foto en su lugar normal (arriba).
 *   "durante" → la sección cruza el viewport: foto fixed, pineada.
 *   "después" → ya se pasó de largo: foto pegada abajo de la sección.
 *   "corta"   → la sección mide MENOS que el viewport (p.ej. Métodos, que
 *               muestra un solo café/método a la vez, a diferencia de la
 *               lista larga de Cafés de origen). Con height:100svh fijo, el
 *               "durante" nunca dura estable — r.top cruza 0 y r.bottom ya es
 *               menor que vh casi en el mismo frame, y el fondo oscila entre
 *               "antes"/"después" en cada scroll (el "margin que aparece y
 *               desaparece" reportado). Acá el fondo simplemente cubre el
 *               100% de la sección, sin pinear ni depender del scroll.
 * Las transiciones coinciden en píxel exacto, así que no hay salto visible al
 * pasar de un estado a otro. Usar con height:100svh (no dvh) en el consumidor
 * para "durante"/"antes"/"después": dvh se recalcula en vivo al esconderse la
 * barra de direcciones del navegador y se ve como que el fondo salta — ver el
 * fix del hero.
 */
export function useFondoPineado(sectionRef: React.RefObject<HTMLElement | null>) {
  const [pin, setPin] = useState<"antes" | "durante" | "despues" | "corta">("antes");

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let raf = 0;
    let scrollBound = false;

    const check = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.height <= vh) { setPin("corta"); return; }
      if (r.top > 0) setPin("antes");
      else if (r.bottom < vh) setPin("despues");
      else setPin("durante");
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };

    // El listener de scroll SOLO se conecta mientras la sección está cerca
    // del viewport (±150% de su alto). Con varias vitrinas en la misma
    // página, tener los N listeners activos todo el tiempo —incluidos los
    // de secciones lejísimos de donde está mirando el usuario— suma trabajo
    // de más en cada frame de scroll; en celulares de gama baja eso alcanzó
    // a notarse como una vibración en la barra de categorías (sticky), que
    // depende de que el hilo principal no se atore. Desconectar el listener
    // cuando la sección no importa reduce ese trabajo de fondo.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !scrollBound) {
          scrollBound = true;
          check();
          window.addEventListener("scroll", onScroll, { passive: true });
          window.addEventListener("resize", onScroll);
        } else if (!entry.isIntersecting && scrollBound) {
          scrollBound = false;
          window.removeEventListener("scroll", onScroll);
          window.removeEventListener("resize", onScroll);
        }
      },
      { rootMargin: "150% 0px 150% 0px" },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      if (scrollBound) {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      }
      if (raf) cancelAnimationFrame(raf);
    };
  }, [sectionRef]);

  return pin;
}
