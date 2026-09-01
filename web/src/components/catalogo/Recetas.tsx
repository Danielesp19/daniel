"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Producto, Receta } from "@/lib/catalogo";
import { pesos } from "@/lib/formato";
import { useRevelado } from "@/hooks/useRevelar";
import FichaProducto from "./FichaProducto";
import Molienda from "./Molienda";

/** Cuenta atrás en mm:ss. Por encima de una hora se dice en horas. */
function reloj(segundos: number): string {
  if (segundos >= 3600) {
    const h = Math.floor(segundos / 3600);
    const m = Math.round((segundos % 3600) / 60);
    return `${h} h ${String(m).padStart(2, "0")}`;
  }
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;
}

/**
 * El temporizador de la receta.
 *
 * Cuenta contra el reloj del sistema y no sumando ticks: un `setInterval` de
 * un segundo se atrasa cuando la pestaña pasa a segundo plano, y en un café de
 * cuatro minutos ese atraso se nota. Aquí el intervalo solo repinta; la cuenta
 * sale siempre de la diferencia entre dos marcas de tiempo.
 */
function Temporizador({ segundos, etiqueta }: { segundos: number; etiqueta?: string | null }) {
  const [restante, setRestante] = useState(segundos);
  const [corriendo, setCorriendo] = useState(false);
  const finRef = useRef(0);

  // Cambiar de receta reinicia el reloj: seguir contando el de la anterior
  // sobre los pasos de otra sería peor que no tenerlo.
  useEffect(() => {
    // Sincroniza el reloj con la receta abierta. El componente se remonta con
    // `key` al cambiar de receta, así que esto solo corre en el montaje; queda
    // por si alguna vez se reusa la instancia.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCorriendo(false);
    setRestante(segundos);
  }, [segundos]);

  useEffect(() => {
    if (!corriendo) return;

    const t = window.setInterval(() => {
      const quedan = Math.max(0, Math.round((finRef.current - Date.now()) / 1000));
      setRestante(quedan);
      if (quedan === 0) setCorriendo(false);
    }, 250);

    return () => clearInterval(t);
  }, [corriendo]);

  const arrancar = () => {
    const desde = restante > 0 ? restante : segundos;
    finRef.current = Date.now() + desde * 1000;
    setRestante(desde);
    setCorriendo(true);
  };

  const listo = restante === 0;
  const avance = segundos > 0 ? 1 - restante / segundos : 0;

  return (
    <div className={`reloj${listo ? " reloj-listo" : ""}`}>
      <div className="reloj-cifra">
        <span className="cifra">{reloj(restante)}</span>
        <span className="reloj-unidad">
          {etiqueta ? `${etiqueta} · ` : ""}
          {listo ? "listo" : corriendo ? "en curso" : "min"}
        </span>
      </div>

      <div className="reloj-barra" aria-hidden="true">
        <span className="reloj-avance" style={{ transform: `scaleX(${avance})` }} />
      </div>

      <div className="reloj-botones">
        <button
          type="button"
          className="boton boton-solido"
          onClick={() => (corriendo ? setCorriendo(false) : arrancar())}
        >
          {corriendo ? "Pausar" : listo ? "Otra vez" : "Iniciar"}
        </button>
        <button
          type="button"
          className="boton boton-linea"
          onClick={() => {
            setCorriendo(false);
            setRestante(segundos);
          }}
        >
          Reiniciar
        </button>
      </div>
    </div>
  );
}


/**
 * Cómo se llama lo que sale, según el método.
 *
 * En un filtrado el segundo número es agua; en un espresso es lo que cae en la
 * taza —peso, no volumen— y en un latte es leche. Llamarlo "agua" en los tres
 * casos sería incorrecto justo donde el dato importa.
 */
function rotuloRendimiento(metodo: string): string {
  const m = metodo.toLowerCase();
  if (m.includes("espresso")) return "En taza";
  if (m.includes("leche")) return "Leche";
  return "Agua";
}

/** 16.67 → "16,7". Coma decimal, que es como se escribe acá. */
function conComa(n: number): string {
  return n.toFixed(1).replace(".", ",").replace(",0", "");
}

/**
 * La calculadora de ratios, al lado del reloj.
 *
 * Arranca con las proporciones de la receta abierta y las dos cantidades
 * quedan atadas por el ratio: se cambia una y la otra se recalcula. También se
 * puede mover el ratio para subir o bajar la concentración sin tocar el café.
 *
 * Va en gramos las dos, no gramos y mililitros: para agua es equivalente, y en
 * espresso lo que se pesa a la salida es peso. Una sola unidad evita tener que
 * explicar cuál aplica en cada método.
 *
 * El estado guarda TEXTO y no números: mientras alguien borra para escribir
 * otra cifra, el campo pasa por vacío, y con números eso obligaría a inventar
 * un cero que empuja el cursor y pelea con quien está escribiendo.
 */
function Calculadora({ receta }: { receta: Receta }) {
  const base = receta.ratio ?? 16;
  const [ratio, setRatio] = useState(base);
  const [cafe, setCafe] = useState(String(receta.cafe_g ?? 15));
  const [rendimiento, setRendimiento] = useState(String(receta.agua_g ?? Math.round(15 * base)));

  const rotulo = rotuloRendimiento(receta.metodo);

  const cambiarCafe = (valor: string) => {
    setCafe(valor);
    const n = Number(valor);
    if (valor !== "" && Number.isFinite(n)) setRendimiento(String(Math.round(n * ratio)));
  };

  const cambiarRendimiento = (valor: string) => {
    setRendimiento(valor);
    const n = Number(valor);
    if (valor !== "" && Number.isFinite(n) && ratio > 0) setCafe(String(Math.round(n / ratio)));
  };

  // Mover el ratio deja el café quieto y recalcula lo que sale: es lo que uno
  // quiere cuando busca la taza más o menos cargada con lo que ya pesó.
  const cambiarRatio = (valor: number) => {
    setRatio(valor);
    const n = Number(cafe);
    if (cafe !== "" && Number.isFinite(n)) setRendimiento(String(Math.round(n * valor)));
  };

  const alaReceta = () => {
    setRatio(base);
    setCafe(String(receta.cafe_g ?? 15));
    setRendimiento(String(receta.agua_g ?? Math.round(15 * base)));
  };

  const cambiada = ratio !== base || Number(cafe) !== receta.cafe_g;

  return (
    <div className="calculadora">
      <div className="calculadora-cabeza">
        <span className="rotulo">Calculadora</span>
        <span className="cifra calculadora-ratio">1:{conComa(ratio)}</span>
      </div>

      <label className="calculadora-control">
        <span className="rotulo">Concentración</span>
        <input
          type="range"
          min={2}
          max={20}
          step={0.5}
          value={ratio}
          onChange={(e) => cambiarRatio(Number(e.target.value))}
          aria-label={`Ratio uno a ${conComa(ratio)}`}
        />
      </label>

      <div className="calculadora-campos">
        <label>
          <span className="rotulo">Café</span>
          <span className="calculadora-campo">
            <input
              type="number"
              min={1}
              inputMode="decimal"
              value={cafe}
              onChange={(e) => cambiarCafe(e.target.value)}
            />
            <span className="calculadora-unidad">g</span>
          </span>
        </label>

        <span className="calculadora-signo" aria-hidden="true">→</span>

        <label>
          <span className="rotulo">{rotulo}</span>
          <span className="calculadora-campo">
            <input
              type="number"
              min={1}
              inputMode="decimal"
              value={rendimiento}
              onChange={(e) => cambiarRendimiento(e.target.value)}
            />
            <span className="calculadora-unidad">g</span>
          </span>
        </label>
      </div>

      {cambiada && (
        <button type="button" className="vermas calculadora-volver" onClick={alaReceta}>
          Volver a la receta
        </button>
      )}
    </div>
  );
}


/** La miniatura de YouTube. La versión `hq` existe siempre; las grandes no. */
function miniaturaYoutube(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/**
 * El video, con fachada.
 *
 * No se monta el iframe de YouTube hasta que alguien lo pide: cada iframe
 * arrastra cerca de un mega de scripts y traería el rastreo de Google a una
 * página que no lo necesita. Hasta el clic solo hay una imagen.
 *
 * Se usa `youtube-nocookie` para que YouTube no deje cookies de publicidad
 * mientras se mira la receta.
 */
function Video({ id, titulo }: { id: string; titulo: string }) {
  const [andando, setAndando] = useState(false);

  if (andando) {
    return (
      <div className="receta-video">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={titulo}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className="receta-video receta-video-fachada"
      onClick={() => setAndando(true)}
      aria-label={`Reproducir el video de ${titulo}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={miniaturaYoutube(id)} alt="" loading="lazy" />
      <span className="receta-play" aria-hidden="true">▶</span>
    </button>
  );
}

/**
 * Una receta en la vitrina: foto, nombre y "Ver receta".
 *
 * La foto sale del video cuando hay uno. Así el panel no tiene que subir dos
 * veces la misma imagen —una para el video y otra para la tarjeta— y una receta
 * grabada queda completa con solo pegar el enlace de YouTube.
 */
function TarjetaReceta({ receta, onAbrir }: { receta: Receta; onAbrir: () => void }) {
  const foto = receta.imagen_url ?? (receta.youtube_id ? miniaturaYoutube(receta.youtube_id) : null);

  return (
    <article className="receta-tarjeta">
      <div className="receta-tarjeta-foto">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="" loading="lazy" />
        ) : (
          <span className="receta-tarjeta-vacia" aria-hidden="true">☕</span>
        )}
        {receta.youtube_id && <span className="receta-tarjeta-video">Video</span>}
      </div>

      <div className="receta-tarjeta-cuerpo">
        <h4 className="nombre receta-tarjeta-nombre">{receta.nombre}</h4>
        {receta.resumen && <p className="receta-tarjeta-resumen">{receta.resumen}</p>}

        <div className="receta-tarjeta-pie">
          <span className="cifra receta-tarjeta-dato">
            {[receta.duracion, receta.ratio ? `1:${conComa(receta.ratio)}` : null, receta.molienda]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <button type="button" className="vermas" onClick={onAbrir}>
            Ver receta
          </button>
        </div>
      </div>
    </article>
  );
}

/**
 * La receta completa, en hoja flotante.
 *
 * Los pasos mandan: cada uno lleva su texto, su foto si la tiene y SU reloj
 * debajo. Un solo temporizador para toda la receta obligaba a acordarse de cuál
 * de los tiempos estaba corriendo; con uno por paso, el bloom de 40 segundos y
 * la infusión de 4 minutos son dos relojes distintos, cada uno donde se usa.
 */
function HojaReceta({
  receta,
  onCerrar,
  onArtefacto,
}: {
  receta: Receta | null;
  onCerrar: () => void;
  onArtefacto: (id: number) => void;
}) {
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const foco = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!receta) return;

    foco.current = document.activeElement as HTMLElement | null;
    cerrarRef.current?.focus();

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alTeclear);

    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflow;
      foco.current?.focus();
    };
  }, [receta, onCerrar]);

  if (!receta || typeof document === "undefined") return null;

  const datos: Array<[string, string]> = [];
  if (receta.cafe_g) datos.push(["Café", `${receta.cafe_g} g`]);
  if (receta.agua_g) datos.push([rotuloRendimiento(receta.metodo), `${receta.agua_g} g`]);
  if (receta.ratio) datos.push(["Ratio", `1:${conComa(receta.ratio)}`]);
  if (receta.molienda) datos.push(["Molienda", receta.molienda]);
  if (receta.duracion) datos.push(["Tiempo", receta.duracion]);

  return createPortal(
    <div className="ficha-fondo" onClick={onCerrar}>
      <article
        className="ficha hoja-receta"
        role="dialog"
        aria-modal="true"
        aria-label={receta.nombre}
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={cerrarRef} type="button" className="ficha-cerrar" aria-label="Cerrar" onClick={onCerrar}>
          ×
        </button>

        <div className="hoja-receta-cuerpo">
          <span className="rotulo">{receta.metodo}</span>
          <h2 className="nombre ficha-nombre">{receta.nombre}</h2>
          {receta.detalle && <p className="ficha-descripcion">{receta.detalle}</p>}

          {receta.youtube_id && <Video id={receta.youtube_id} titulo={receta.nombre} />}

          {datos.length > 0 && (
            <dl className="ficha-datos">
              {datos.map(([rotulo, valor]) => (
                <div key={rotulo}>
                  <dt className="rotulo" style={{ fontSize: 8.5, letterSpacing: "0.18em" }}>
                    {rotulo}
                  </dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* La molienda va antes de los pasos: es la primera decisión de la
              preparación, y equivocarse ahí no lo arregla ningún vertido. */}
          <Molienda recomendada={receta.molienda_micras} />

          {receta.ingredientes.length > 0 && (
            <ul className="receta-ingredientes">
              {receta.ingredientes.map((ing) => (
                <li key={ing}>{ing}</li>
              ))}
            </ul>
          )}

          {receta.pasos.length > 0 && (
            <ol className="receta-pasos">
              {receta.pasos.map((paso, i) => (
                <li key={paso.id}>
                  <span className="cifra receta-paso-numero">{String(i + 1).padStart(2, "0")}</span>
                  <div className="receta-paso-cuerpo">
                    <p className="receta-paso-texto">{paso.texto}</p>

                    {paso.imagen_url && (
                      <div className="receta-paso-foto">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={paso.imagen_url} alt="" loading="lazy" />
                      </div>
                    )}

                    {/* El reloj de ESTE paso, justo debajo de lo que hay que
                        hacer. Se le pasa `key` para que cambiar de receta lo
                        devuelva a cero en vez de seguir contando el anterior. */}
                    {paso.segundos ? (
                      <Temporizador
                        key={`reloj-${paso.id}`}
                        segundos={paso.segundos}
                        etiqueta={paso.etiqueta}
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {receta.producto && (
            <p className="receta-recomendado">
              <span className="rotulo">Queda mejor con</span> {receta.producto.nombre}
            </p>
          )}

          {/* Lo que se usó, y que además está a la venta. El backend solo manda
              los artefactos activos, así que aquí no hay que filtrar nada. */}
          {receta.artefactos.length > 0 && (
            <div className="receta-artefactos">
              <span className="rotulo">Lo que uso para esta receta</span>
              <ul>
                {receta.artefactos.map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => onArtefacto(a.id)}>
                      <span className="receta-artefacto-foto">
                        {a.imagen_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.imagen_url} alt="" loading="lazy" />
                        ) : null}
                      </span>
                      <span className="receta-artefacto-info">
                        <span className="receta-artefacto-nombre">{a.nombre}</span>
                        <span className="cifra receta-artefacto-precio">
                          {a.agotado ? "Agotado" : pesos(a.precio_cop)}
                        </span>
                      </span>
                      <span className="vermas" aria-hidden="true">Ver</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Calculadora key={`calc-${receta.id}`} receta={receta} />
        </div>
      </article>
    </div>,
    document.body,
  );
}

/**
 * La sección de recetas: un riel por método y la receta en hoja.
 *
 * Va por método y no en una lista sola porque un filtrado y un espresso no se
 * comparan entre sí — quien busca cómo hacer un V60 no está decidiendo entre
 * eso y un latte. Cada método es su propio estante, y el riel horizontal deja
 * meter recetas nuevas sin que la sección crezca hacia abajo sin fin.
 *
 * Es la única sección de la página que no vende nada: enseña. Por eso va al
 * final, después de todo lo que se puede comprar o agendar.
 */
export default function Recetas({
  recetas,
  productos = [],
}: {
  recetas: Receta[];
  /** El catálogo, para poder abrir la ficha de un artefacto recomendado. */
  productos?: Producto[];
}) {
  const { ref, props } = useRevelado<HTMLElement>();
  const [abierta, setAbierta] = useState<Receta | null>(null);
  const [artefacto, setArtefacto] = useState<Producto | null>(null);

  // Los métodos que existen de verdad, en el orden en que llegan. Nada de una
  // lista fija: si el panel agrega "Sifón", el estante sale solo.
  const grupos = useMemo(() => {
    const mapa = new Map<string, Receta[]>();
    for (const r of recetas) {
      const lista = mapa.get(r.metodo);
      if (lista) lista.push(r);
      else mapa.set(r.metodo, [r]);
    }
    return [...mapa.entries()];
  }, [recetas]);

  if (recetas.length === 0) return null;

  return (
    <section ref={ref} {...props} id="recetas" className="seccion seccion-banda">
      <div className="contenedor">
        <div style={{ marginBottom: "clamp(22px, 4vw, 40px)" }}>
          <span className="epigrafe revelar">Prepáralo en casa</span>
          <h2 className="titular revelar" style={{ marginTop: 12, transitionDelay: "80ms" }}>
            Recetas
          </h2>
          <p
            className="bajada revelar"
            style={{
              margin: "12px 0 0",
              maxWidth: "44ch",
              fontSize: 14,
              lineHeight: 1.7,
              color: "var(--color-suave)",
              transitionDelay: "160ms",
            }}
          >
            Las mismas proporciones que uso en barra. Elige el método, mira el video y deja correr el
            reloj de cada paso.
          </p>
        </div>

        {grupos.map(([metodo, lista], g) => (
          <div key={metodo} className="recetas-grupo revelar" style={{ transitionDelay: `${200 + g * 60}ms` }}>
            <div className="recetas-grupo-cabeza">
              <h3 className="recetas-grupo-nombre">{metodo}</h3>
              <span className="rotulo">
                {String(lista.length).padStart(2, "0")} {lista.length === 1 ? "receta" : "recetas"}
              </span>
            </div>

            {/* Riel horizontal con anclaje: en el celular cada tarjeta queda
                encuadrada sola al arrastrar, sin quedarse a medio camino. */}
            <div className="recetas-riel">
              {lista.map((r) => (
                <TarjetaReceta key={r.id} receta={r} onAbrir={() => setAbierta(r)} />
              ))}
            </div>
          </div>
        ))}

      </div>

      <HojaReceta
        receta={abierta}
        onCerrar={() => setAbierta(null)}
        onArtefacto={(id) => {
          const p = productos.find((x) => x.id === id);
          if (p) setArtefacto(p);
        }}
      />

      {/* La ficha del artefacto va encima de la receta: se mira el molino, se
          cierra y se sigue en el paso donde iba. */}
      <FichaProducto producto={artefacto} onCerrar={() => setArtefacto(null)} />
    </section>
  );
}
