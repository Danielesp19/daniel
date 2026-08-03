"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Producto } from "@/lib/catalogo";

/**
 * Moliendas que ofrecemos. No cambian el precio ni el stock —una bolsa es una
 * bolsa— así que viven solo en el carrito, como una instrucción para quien
 * prepara el pedido.
 */
export const MOLIENDAS = [
  "Grano entero",
  "Prensa francesa",
  "V60 / Chemex",
  "Moka",
  "Espresso",
] as const;

export type Molienda = (typeof MOLIENDAS)[number];

export interface Linea {
  id: number;
  nombre: string;
  precio_cop: number;
  gramos: number;
  molienda: Molienda;
  cantidad: number;
}

interface Carrito {
  lineas: Linea[];
  unidades: number;
  total: number;
  agregar: (producto: Producto, molienda?: Molienda) => void;
  cambiarCantidad: (id: number, molienda: Molienda, cantidad: number) => void;
  cambiarMolienda: (id: number, actual: Molienda, nueva: Molienda) => void;
  quitar: (id: number, molienda: Molienda) => void;
  vaciar: () => void;
  /** Recorta las cantidades al stock recién consultado. Devuelve los ajustes. */
  ajustarAStock: (stock: Record<string, number>) => Ajuste[];
}

export interface Ajuste {
  nombre: string;
  pedidas: number;
  disponibles: number;
}

const LLAVE = "altura:carrito:v1";

const Contexto = createContext<Carrito | null>(null);

/** Dos líneas son la misma si coinciden producto Y molienda. */
const mismaLinea = (l: Linea, id: number, molienda: Molienda) =>
  l.id === id && l.molienda === molienda;

export function CarritoProvider({ children }: { children: React.ReactNode }) {
  const [lineas, setLineas] = useState<Linea[]>([]);

  // La carga se hace en un efecto, no en el useState inicial: leer
  // localStorage durante el render del servidor no existe, y hacerlo en el
  // primer render del cliente produce un HTML distinto al del servidor
  // (error de hidratación). Así el primer render coincide siempre —carrito
  // vacío— y el contenido guardado entra un frame después.
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(LLAVE);
      // La regla apunta a los setState que encadenan renders; este corre una
      // sola vez al montar y es la única forma de hidratar sin desajustar el
      // HTML del servidor (ver el comentario de arriba).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (guardado) setLineas(JSON.parse(guardado));
    } catch {
      // localStorage puede estar bloqueado (modo privado, permisos).
      // El carrito sigue funcionando en memoria; solo no sobrevive al refresco.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LLAVE, JSON.stringify(lineas));
    } catch {
      /* ver arriba */
    }
  }, [lineas]);

  const agregar = useCallback((producto: Producto, molienda: Molienda = "Grano entero") => {
    setLineas((previas) => {
      const existente = previas.find((l) => mismaLinea(l, producto.id, molienda));
      if (existente) {
        // Nunca por encima del stock que conocemos. El tope real se vuelve a
        // revisar contra el servidor al momento de enviar el pedido.
        return previas.map((l) =>
          mismaLinea(l, producto.id, molienda)
            ? { ...l, cantidad: Math.min(l.cantidad + 1, producto.stock) }
            : l,
        );
      }
      return [
        ...previas,
        {
          id: producto.id,
          nombre: producto.nombre,
          precio_cop: producto.precio_cop,
          gramos: producto.gramos,
          molienda,
          cantidad: 1,
        },
      ];
    });
  }, []);

  const cambiarCantidad = useCallback((id: number, molienda: Molienda, cantidad: number) => {
    setLineas((previas) =>
      cantidad <= 0
        ? previas.filter((l) => !mismaLinea(l, id, molienda))
        : previas.map((l) => (mismaLinea(l, id, molienda) ? { ...l, cantidad } : l)),
    );
  }, []);

  const cambiarMolienda = useCallback((id: number, actual: Molienda, nueva: Molienda) => {
    setLineas((previas) => {
      if (actual === nueva) return previas;
      const origen = previas.find((l) => mismaLinea(l, id, actual));
      if (!origen) return previas;

      // Si ya existe una línea del mismo café con la molienda destino, las dos
      // se funden en una en vez de quedar duplicadas en el resumen.
      const destino = previas.find((l) => mismaLinea(l, id, nueva));
      if (destino) {
        return previas
          .filter((l) => !mismaLinea(l, id, actual))
          .map((l) =>
            mismaLinea(l, id, nueva) ? { ...l, cantidad: l.cantidad + origen.cantidad } : l,
          );
      }
      return previas.map((l) => (mismaLinea(l, id, actual) ? { ...l, molienda: nueva } : l));
    });
  }, []);

  const quitar = useCallback((id: number, molienda: Molienda) => {
    setLineas((previas) => previas.filter((l) => !mismaLinea(l, id, molienda)));
  }, []);

  const vaciar = useCallback(() => setLineas([]), []);

  /**
   * Recorta el carrito al stock real.
   *
   * Se llama justo antes de armar el mensaje de WhatsApp: el catálogo se sirve
   * cacheado y el stock que se pintó puede tener hasta un minuto. Mejor
   * avisarle al cliente aquí que dejar que pida tres bolsas de algo que se
   * acabó hace media hora.
   */
  const ajustarAStock = useCallback((stock: Record<string, number>): Ajuste[] => {
    const ajustes: Ajuste[] = [];

    setLineas((previas) => {
      // Varias líneas del mismo café (distintas moliendas) comparten stock:
      // se reparte en el orden en que están, y lo que no alcanza se recorta.
      const restante: Record<number, number> = {};

      return previas.flatMap((l) => {
        if (!(l.id in restante)) restante[l.id] = stock[String(l.id)] ?? 0;

        const permitidas = Math.min(l.cantidad, Math.max(0, restante[l.id]));
        restante[l.id] -= permitidas;

        if (permitidas !== l.cantidad) {
          ajustes.push({ nombre: l.nombre, pedidas: l.cantidad, disponibles: permitidas });
        }
        return permitidas > 0 ? [{ ...l, cantidad: permitidas }] : [];
      });
    });

    return ajustes;
  }, []);

  const valor = useMemo<Carrito>(
    () => ({
      lineas,
      unidades: lineas.reduce((n, l) => n + l.cantidad, 0),
      total: lineas.reduce((n, l) => n + l.cantidad * l.precio_cop, 0),
      agregar,
      cambiarCantidad,
      cambiarMolienda,
      quitar,
      vaciar,
      ajustarAStock,
    }),
    [lineas, agregar, cambiarCantidad, cambiarMolienda, quitar, vaciar, ajustarAStock],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useCarrito(): Carrito {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useCarrito debe usarse dentro de <CarritoProvider>");
  return ctx;
}
