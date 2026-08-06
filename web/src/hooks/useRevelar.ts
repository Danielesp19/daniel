"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Revela un elemento cuando entra en la banda central del viewport.
 *
 * Un solo IntersectionObserver compartido por toda la página: con una tarjeta
 * por observer, un catálogo de cuarenta productos crea cuarenta observers, y
 * eso se nota en el scroll de un celular de gama baja.
 *
 * Cada elemento se revela UNA vez y se deja de observar: re-animar al subir y
 * bajar marea. Los márgenes negativos recortan el viewport por arriba y por
 * abajo para que un elemento no cuente como visible hasta entrar en la franja
 * central — sin eso, en una pantalla alta entran cuatro tarjetas a la vez y el
 * observer las dispara todas juntas.
 */
let observador: IntersectionObserver | null = null;

/**
 * El registro se guarda envuelto en un objeto, no como la función pelada,
 * para poder comparar identidades en la limpieza. Ver el porqué abajo.
 */
type Registro = { alRevelar: () => void };
const avisos = new WeakMap<Element, Registro>();

function observar(el: Element, alRevelar: () => void): () => void {
  if (typeof IntersectionObserver === "undefined") {
    alRevelar(); // sin soporte: se muestra sin animación, nunca invisible
    return () => {};
  }
  if (!observador) {
    observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          avisos.get(e.target)?.alRevelar();
          avisos.delete(e.target);
          observador!.unobserve(e.target);
        }
      },
      { rootMargin: "-8% 0px -18% 0px", threshold: 0.15 },
    );
  }

  const registro: Registro = { alRevelar };
  avisos.set(el, registro);
  observador.observe(el);

  return () => {
    // Solo se suelta el elemento si el registro sigue siendo EL NUESTRO.
    //
    // React monta el efecto, lo limpia y lo vuelve a montar (StrictMode en
    // desarrollo, y en producción al recuperar estado). En esa secuencia el
    // segundo montaje ya registró y volvió a observar el elemento ANTES de
    // que corra esta limpieza del primero; sin el chequeo, este `unobserve`
    // cancelaba la observación recién hecha y el elemento no se revelaba
    // nunca — se quedaba en su esqueleto para siempre.
    if (avisos.get(el) === registro) {
      avisos.delete(el);
      observador?.unobserve(el);
    }
  };
}

/**
 * Cola de apariciones: aunque el observer entregue varios elementos en el
 * mismo lote (scroll rápido, pantalla de escritorio muy alta), se revelan
 * separados en el tiempo, uno detrás de otro y nunca en bloque.
 *
 * Es una marca de tiempo, no un contador, así que se autorregula: si pasa un
 * rato sin revelar nada, el siguiente entra al instante en vez de arrastrar un
 * retraso acumulado.
 */
const SEPARACION = 90; // ms entre una aparición y la siguiente
let proximaLibre = 0;

function encolar(revelar: () => void): () => void {
  const ahora = typeof performance !== "undefined" ? performance.now() : Date.now();
  const cuando = Math.max(ahora, proximaLibre);
  proximaLibre = cuando + SEPARACION;

  const espera = cuando - ahora;
  if (espera <= 0) {
    revelar();
    return () => {};
  }
  const t = window.setTimeout(revelar, espera);
  return () => clearTimeout(t);
}

/** @param enCola false para revelar de inmediato, sin esperar turno. */
export function useRevelar<T extends HTMLElement>(enCola = true) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelarCola = () => {};
    const dejarDeObservar = observar(el, () => {
      if (enCola) cancelarCola = encolar(() => setVisible(true));
      else setVisible(true);
    });
    return () => {
      dejarDeObservar();
      cancelarCola();
    };
  }, [enCola]);

  return { ref, visible };
}

/**
 * Marca un contenedor como revelado cuando entra en cuadro. Todo lo que lleve
 * la clase `.revelar` dentro (o el contenedor mismo) hace su fundido hacia
 * arriba en ese momento.
 *
 * Se usa así:
 *
 *   const { ref, props } = useRevelado<HTMLDivElement>();
 *   <section ref={ref} {...props}>
 *     <h2 className="revelar">…</h2>
 *     <p  className="revelar" style={{ transitionDelay: "80ms" }}>…</p>
 *   </section>
 *
 * El estado va en un atributo y no en una clase condicional: así el CSS lleva
 * toda la lógica de la transición y aquí solo se dice "ya llegó".
 */
export function useRevelado<T extends HTMLElement>(enCola = true) {
  const { ref, visible } = useRevelar<T>(enCola);

  return {
    ref,
    visible,
    props: { "data-visible": visible ? "si" : "no" } as const,
  };
}
