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
const avisos = new WeakMap<Element, () => void>();

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
          avisos.get(e.target)?.();
          avisos.delete(e.target);
          observador!.unobserve(e.target);
        }
      },
      { rootMargin: "-8% 0px -18% 0px", threshold: 0.15 },
    );
  }
  avisos.set(el, alRevelar);
  observador.observe(el);
  return () => {
    avisos.delete(el);
    observador?.unobserve(el);
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

/** Estilo de entrada listo para pegar en un `style`. */
export function entrada(visible: boolean, retraso = 0): React.CSSProperties {
  return {
    opacity: visible ? 1 : 0,
    animation: visible
      ? `entrar .75s cubic-bezier(0.2,0.7,0.2,1) ${retraso}s both`
      : undefined,
  };
}
