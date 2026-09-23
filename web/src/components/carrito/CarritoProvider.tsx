"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Producto } from "@/lib/catalogo";

/**
 * La molienda ya no vive acá.
 *
 * El diseño nuevo no tiene panel de carrito —se agrega y se manda— así que no
 * había dónde elegirla, y una molienda que el cliente no puede cambiar es peor
 * que ninguna: promete algo que nadie decidió. La pregunta se mudó al mensaje
 * de WhatsApp, que es donde igual se confirma envío y pago.
 */
export interface Linea {
  id: number;
  nombre: string;
  precio_cop: number;
  gramos: number;
  cantidad: number;
  /**
   * Se guarda en la línea, no se deduce del mapa de stock: si un servicio
   * simplemente no apareciera en ese mapa, el carrito no podría distinguir
   * "esto no se cuenta" de "esto ya no existe", y en el segundo caso sí hay
   * que sacarlo del pedido.
   */
  controla_stock: boolean;
}

interface Carrito {
  lineas: Linea[];
  unidades: number;
  total: number;
  agregar: (producto: Producto) => void;
  cambiarCantidad: (id: number, cantidad: number) => void;
  quitar: (id: number) => void;
  vaciar: () => void;
  /** Quita lo que ya no se consigue, según el servidor. Devuelve los ajustes. */
  ajustarAStock: (disponibles: Record<string, boolean>) => Ajuste[];
}

export interface Ajuste {
  nombre: string;
  pedidas: number;
  disponibles: number;
}

// La versión va en la llave a propósito: al cambiar la forma de una línea
// guardada, subirla descarta los carritos viejos en vez de leerlos con campos
// faltantes. Un carrito a medio llenar se pierde; un carrito mal interpretado
// manda un pedido equivocado.
const LLAVE = "carrito:v3";

/**
 * Cuántas unidades de una misma línea deja meter el carrito.
 *
 * Es un número parejo y no el inventario real: el catálogo dejó de publicar
 * cuántas unidades hay. Doce es más de lo que se pide por WhatsApp de una
 * sentada, y por encima de eso la conversación pasa por Daniel igual.
 */
const TOPE_POR_LINEA = 12;

const Contexto = createContext<Carrito | null>(null);

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

  const agregar = useCallback((producto: Producto) => {
    setLineas((previas) => {
      const existente = previas.find((l) => l.id === producto.id);
      if (existente) {
        // Un tope parejo y no el inventario real: el catálogo ya no publica
        // cuántas unidades hay —era el inventario del negocio a la vista de
        // cualquiera—, así que acá no hay número contra el cual topar. Doce es
        // más de lo que se pide por WhatsApp de una sentada; por encima de eso
        // la conversación pasa por Daniel de todos modos.
        //
        // Antes de mandar el pedido se revalida contra el servidor, que dice
        // si el producto sigue disponible (sin decir cuánto queda).
        const tope = producto.controla_stock ? TOPE_POR_LINEA : Infinity;
        return previas.map((l) =>
          l.id === producto.id ? { ...l, cantidad: Math.min(l.cantidad + 1, tope) } : l,
        );
      }
      return [
        ...previas,
        {
          id: producto.id,
          nombre: producto.nombre,
          precio_cop: producto.precio_cop,
          gramos: producto.gramos,
          cantidad: 1,
          controla_stock: producto.controla_stock,
        },
      ];
    });
  }, []);

  const cambiarCantidad = useCallback((id: number, cantidad: number) => {
    setLineas((previas) =>
      cantidad <= 0
        ? previas.filter((l) => l.id !== id)
        : previas.map((l) => (l.id === id ? { ...l, cantidad } : l)),
    );
  }, []);

  const quitar = useCallback((id: number) => {
    setLineas((previas) => previas.filter((l) => l.id !== id));
  }, []);

  const vaciar = useCallback(() => setLineas([]), []);

  /**
   * Saca del carrito lo que ya no se consigue.
   *
   * Se llama justo antes de armar el mensaje de WhatsApp: el catálogo se sirve
   * cacheado y el sello de agotado que se pintó puede tener hasta un minuto.
   * Mejor avisarle al cliente aquí que dejar que pida algo que se acabó hace
   * media hora.
   *
   * ANTES RECORTABA LA CANTIDAD al número disponible; ahora solo saca lo
   * agotado, porque el servidor ya no dice cuántas unidades quedan —eso es
   * inventario del negocio—. Pedir de más se resuelve en el chat, que es donde
   * se confirma el pedido de todas formas.
   */
  const ajustarAStock = useCallback((disponibles: Record<string, boolean>): Ajuste[] => {
    const ajustes: Ajuste[] = [];

    setLineas((previas) =>
      previas.flatMap((l) => {
        // Los servicios no se revisan: se agendan, no se agotan.
        if (!l.controla_stock) return [l];

        // Sin noticia del servidor se deja pasar: un producto nuevo que
        // todavía no salga en el mapa no puede desaparecer del carrito.
        if (disponibles[String(l.id)] === false) {
          ajustes.push({ nombre: l.nombre, pedidas: l.cantidad, disponibles: 0 });
          return [];
        }
        return [l];
      }),
    );

    return ajustes;
  }, []);

  const valor = useMemo<Carrito>(
    () => ({
      lineas,
      unidades: lineas.reduce((n, l) => n + l.cantidad, 0),
      total: lineas.reduce((n, l) => n + l.cantidad * l.precio_cop, 0),
      agregar,
      cambiarCantidad,
      quitar,
      vaciar,
      ajustarAStock,
    }),
    [lineas, agregar, cambiarCantidad, quitar, vaciar, ajustarAStock],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useCarrito(): Carrito {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useCarrito debe usarse dentro de <CarritoProvider>");
  return ctx;
}
