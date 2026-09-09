"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * Las piezas sueltas del panel: campos, botones, tarjetas y avisos.
 *
 * El panel usa la misma paleta y las mismas familias del sitio (tinta sobre
 * papel, serif para los títulos, mono para los rótulos) pero NO su geometría:
 * la página es de esquinas rectas y aire generoso, y un formulario con esa
 * misma severidad se vuelve incómodo de llenar. Acá hay radios suaves y las
 * cosas más juntas, que es lo que pide una pantalla de trabajo.
 *
 * Los estilos van en objetos y no en clases de Tailwind para que cada pantalla
 * se lea como lo que hace y no como una tira de utilidades.
 */

export const COLOR = {
  fondo: "#F7F6F4",
  papel: "#FFFFFF",
  tinta: "#0A0A0A",
  linea: "#E6E4E1",
  rotulo: "#8A8A8A",
  suave: "#6B6B6B",
  peligro: "#B4231F",
  bien: "#2E7D4F",
  aviso: "#B26B00",
} as const;

export const campo: CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: `1px solid ${COLOR.linea}`,
  background: COLOR.papel,
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  color: COLOR.tinta,
  outline: "none",
  boxSizing: "border-box",
};

export const rotulo: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: COLOR.rotulo,
  marginBottom: 5,
};

export const tarjeta: CSSProperties = {
  background: COLOR.papel,
  border: `1px solid ${COLOR.linea}`,
  borderRadius: 12,
};

export function Etiqueta({ children, ...resto }: { children: ReactNode } & { style?: CSSProperties }) {
  return <span style={{ ...rotulo, marginBottom: 0, ...resto.style }}>{children}</span>;
}

/** Campo con su rótulo y, si hace falta, una nota que explica para qué sirve. */
export function Campo({
  etiqueta,
  nota,
  children,
  ancho,
}: {
  etiqueta: string;
  nota?: string;
  children: ReactNode;
  ancho?: string;
}) {
  return (
    <label style={{ display: "block", gridColumn: ancho }}>
      <span style={rotulo}>{etiqueta}</span>
      {children}
      {nota && (
        <span style={{ display: "block", marginTop: 5, fontSize: 12, lineHeight: 1.45, color: COLOR.suave }}>
          {nota}
        </span>
      )}
    </label>
  );
}

/**
 * Campo de dinero.
 *
 * Se escribe con puntos de mil a medida que se teclea —48.000 y no 48000— y
 * debajo queda el valor en letras. Antes era un `input type=number` pelado y
 * había que contar los ceros a ojo: en un catálogo donde un molino vale 890.000
 * y un café 48.000, equivocarse en un cero es equivocarse por diez.
 *
 * Hacia fuera SIEMPRE entrega dígitos limpios ("48000"), que es lo que espera
 * la API; los puntos son solo de presentación.
 */
export function CampoDinero({
  etiqueta,
  nota,
  valor,
  onChange,
  requerido = false,
}: {
  etiqueta: string;
  nota?: string;
  /** Solo dígitos, sin puntos. */
  valor: string;
  onChange: (v: string) => void;
  requerido?: boolean;
}) {
  const numero = Number(valor || 0);
  const conPuntos = valor === "" ? "" : numero.toLocaleString("es-CO");

  return (
    // La nota es la instrucción de cómo escribirlo, así que solo hace falta
    // mientras está vacío; con un valor puesto, debajo va lo que vale en
    // letras, que es más útil que repetir la instrucción.
    <Campo etiqueta={etiqueta} nota={valor === "" ? nota : undefined}>
      <div style={{ position: "relative" }}>
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: COLOR.suave,
            pointerEvents: "none",
          }}
        >
          $
        </span>
        <input
          // `inputMode` y no `type=number`: con número el navegador pone sus
          // flechitas, acepta "e" y "-", y no deja escribir los puntos.
          inputMode="numeric"
          value={conPuntos}
          required={requerido}
          onChange={(e) => onChange(e.target.value.replace(/\D+/g, ""))}
          style={{ ...campo, paddingLeft: 26, fontFamily: "var(--font-mono)" }}
          placeholder="0"
        />
      </div>
      {valor !== "" && numero > 0 && (
        <span style={{ display: "block", marginTop: 5, fontSize: 12, color: COLOR.suave }}>
          {enLetras(numero)}
        </span>
      )}
    </Campo>
  );
}

/** 890000 → "ochocientos noventa mil pesos". Para leerlo sin contar ceros. */
function enLetras(n: number): string {
  if (n >= 1_000_000) {
    const millones = n / 1_000_000;
    const texto = Number.isInteger(millones) ? String(millones) : millones.toFixed(1).replace(".", ",");
    return `${texto} ${millones === 1 ? "millón" : "millones"} de pesos`;
  }
  if (n >= 1000) {
    const miles = n / 1000;
    const texto = Number.isInteger(miles) ? String(miles) : miles.toFixed(1).replace(".", ",");
    return `${texto} mil pesos`;
  }
  return `${n} pesos`;
}

/**
 * Campo de archivo con vista previa y arrastre.
 *
 * El `<input type=file>` suelto solo decía "Ningún archivo seleccionado": no se
 * veía qué había cargado, ni qué se acababa de escoger, y para cambiar una foto
 * había que acordarse de cuál era. Acá se ve la miniatura de lo que hay, la de
 * lo que se va a subir, y se puede soltar el archivo encima.
 */
export function CampoArchivo({
  etiqueta,
  nota,
  tipo = "image",
  actual,
  archivo,
  onArchivo,
  onQuitar,
  multiple = false,
  onArchivos,
}: {
  etiqueta: string;
  nota?: string;
  tipo?: "image" | "video";
  /** La URL de lo que ya está guardado, si hay. */
  actual?: string | null;
  archivo?: File | null;
  onArchivo?: (f: File | null) => void;
  /** Si se pasa, sale el botón de quitar lo guardado. */
  onQuitar?: () => void;
  multiple?: boolean;
  onArchivos?: (fs: File[]) => void;
}) {
  const [encima, setEncima] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  // La vista previa de lo recién escogido se arma con una URL de objeto, que
  // hay que liberar: si no, cada archivo que se mira deja su copia en memoria.
  // Se calcula al vuelo y se libera al cambiar, sin pasar por el estado.
  const previo = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo]);
  useEffect(() => () => { if (previo) URL.revokeObjectURL(previo); }, [previo]);

  const recibir = (lista: FileList | null) => {
    const fs = Array.from(lista ?? []);
    if (multiple) onArchivos?.(fs);
    else onArchivo?.(fs[0] ?? null);
  };

  const muestra = previo ?? actual ?? null;

  return (
    <Campo etiqueta={etiqueta} nota={nota}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => {
          e.preventDefault();
          setEncima(false);
          recibir(e.dataTransfer.files);
        }}
        onClick={() => entrada.current?.click()}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 10,
          border: `1px dashed ${encima ? COLOR.tinta : COLOR.linea}`,
          borderRadius: 12,
          background: encima ? COLOR.fondo : "transparent",
          cursor: "pointer",
          transition: "border-color .15s ease, background .15s ease",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            borderRadius: 9,
            background: COLOR.fondo,
            border: `1px solid ${COLOR.linea}`,
            overflow: "hidden",
            color: COLOR.suave,
            fontSize: 20,
          }}
        >
          {muestra ? (
            tipo === "video" ? (
              <video src={muestra} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={muestra} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )
          ) : (
            <span aria-hidden="true">{tipo === "video" ? "▶" : "+"}</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: COLOR.suave }}>
          {archivo ? (
            <>
              <strong style={{ color: COLOR.tinta, fontWeight: 600 }}>Se subirá al guardar</strong>
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {archivo.name}
              </div>
            </>
          ) : actual ? (
            "Arrastra otro archivo para reemplazarlo, o haz clic."
          ) : (
            "Arrastra el archivo aquí o haz clic para buscarlo."
          )}
        </div>

        {onQuitar && actual && !archivo && (
          <Boton
            tono="peligro"
            chico
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuitar();
            }}
          >
            Quitar
          </Boton>
        )}

        {archivo && onArchivo && (
          <Boton
            tono="plano"
            chico
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onArchivo(null);
              if (entrada.current) entrada.current.value = "";
            }}
          >
            Cancelar
          </Boton>
        )}

        <input
          ref={entrada}
          type="file"
          accept={tipo === "video" ? "video/*" : "image/*"}
          multiple={multiple}
          onChange={(e) => recibir(e.target.files)}
          style={{ display: "none" }}
        />
      </div>
    </Campo>
  );
}

type TonoBoton = "solido" | "linea" | "peligro" | "plano";

export function Boton({
  tono = "linea",
  chico = false,
  children,
  ...props
}: {
  tono?: TonoBoton;
  chico?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: chico ? "6px 12px" : "9px 18px",
    borderRadius: 999,
    border: "1px solid transparent",
    fontFamily: "var(--font-sans)",
    fontSize: chico ? 12.5 : 13.5,
    fontWeight: 600,
    cursor: props.disabled ? "not-allowed" : "pointer",
    opacity: props.disabled ? 0.45 : 1,
    whiteSpace: "nowrap",
    transition: "background .15s ease, color .15s ease, border-color .15s ease",
  };

  const tonos: Record<TonoBoton, CSSProperties> = {
    solido: { background: COLOR.tinta, color: "#FFF" },
    linea: { background: "transparent", borderColor: COLOR.linea, color: COLOR.tinta },
    peligro: { background: "transparent", borderColor: "transparent", color: COLOR.peligro },
    plano: { background: "transparent", borderColor: "transparent", color: COLOR.suave },
  };

  return (
    <button {...props} style={{ ...base, ...tonos[tono], ...props.style }}>
      {children}
    </button>
  );
}

/** Interruptor con su texto al lado. Más legible que un checkbox suelto. */
export function Interruptor({
  etiqueta,
  nota,
  valor,
  onChange,
}: {
  etiqueta: string;
  nota?: string;
  valor: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={valor}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 16, height: 16, marginTop: 2, accentColor: COLOR.tinta, cursor: "pointer" }}
      />
      <span>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 500 }}>{etiqueta}</span>
        {nota && (
          <span style={{ display: "block", marginTop: 2, fontSize: 12, lineHeight: 1.45, color: COLOR.suave }}>
            {nota}
          </span>
        )}
      </span>
    </label>
  );
}

export function Aviso({ tipo = "error", children }: { tipo?: "error" | "bien"; children: ReactNode }) {
  const color = tipo === "error" ? COLOR.peligro : COLOR.bien;
  return (
    <p
      role="status"
      style={{
        margin: 0,
        padding: "9px 12px",
        borderRadius: 8,
        border: `1px solid ${color}33`,
        background: `${color}0F`,
        fontSize: 13,
        lineHeight: 1.5,
        color,
      }}
    >
      {children}
    </p>
  );
}

/** Encabezado de pantalla: título en serif y, a la derecha, la acción principal. */
export function Cabecera({ titulo, bajada, children }: { titulo: string; bajada?: string; children?: ReactNode }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        marginBottom: 22,
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 30, lineHeight: 1.1 }}>{titulo}</h1>
        {bajada && (
          <p style={{ margin: "6px 0 0", fontSize: 13.5, lineHeight: 1.55, color: COLOR.suave, maxWidth: "58ch" }}>
            {bajada}
          </p>
        )}
      </div>
      {children}
    </header>
  );
}

/** Las flechitas de reordenar, agrupadas en una sola píldora. */
export function Flechas({
  onSubir,
  onBajar,
  arribaBloqueada,
  abajoBloqueada,
}: {
  onSubir: () => void;
  onBajar: () => void;
  arribaBloqueada: boolean;
  abajoBloqueada: boolean;
}) {
  const boton = (dir: "up" | "down", onClick: () => void, bloqueada: boolean) => (
    <button
      type="button"
      onClick={onClick}
      disabled={bloqueada}
      title={dir === "up" ? "Subir" : "Bajar"}
      style={{
        width: 28,
        height: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        background: "transparent",
        color: bloqueada ? "#D2CFCB" : COLOR.suave,
        cursor: bloqueada ? "default" : "pointer",
      }}
    >
      {/* SVG y no el carácter ↑↓: ese cambia de grosor según la fuente del
          sistema y se ve distinto en cada computador. */}
      <svg width="10" height="6" viewBox="0 0 11 7" fill="none" aria-hidden="true">
        <path
          d={dir === "up" ? "M1 6L5.5 1.5L10 6" : "M1 1L5.5 5.5L10 1"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        border: `1px solid ${COLOR.linea}`,
        borderRadius: 8,
        overflow: "hidden",
        background: COLOR.papel,
      }}
    >
      {boton("up", onSubir, arribaBloqueada)}
      <div style={{ height: 1, background: COLOR.linea }} />
      {boton("down", onBajar, abajoBloqueada)}
    </div>
  );
}

/** Hoja flotante para formularios largos, con el mismo gesto que la del sitio. */
/**
 * La hoja donde se editan las cosas.
 *
 * Tres costumbres que se dan por hechas en cualquier formulario y que acá
 * faltaban: se cierra con Escape, la página de atrás no se desplaza mientras
 * está abierta, y si hay cambios sin guardar avisa antes de cerrarse. Lo
 * último no es un lujo: la hoja se cierra al hacer clic FUERA, y perder
 * veinte minutos de ficha por un clic al lado es de las cosas que hacen que
 * alguien deje de usar un panel.
 */
export function Hoja({
  titulo,
  onCerrar,
  children,
  pie,
  sucio = false,
}: {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  pie?: ReactNode;
  /** Si hay cambios sin guardar, cerrar pregunta primero. */
  sucio?: boolean;
}) {
  // Se guarda en una referencia para que el efecto del Escape no tenga que
  // rearmarse en cada tecleo del formulario. Se escribe en un efecto y no en
  // el render: durante el render las refs no se tocan.
  const guardia = useRef({ sucio, onCerrar });
  useEffect(() => {
    guardia.current = { sucio, onCerrar };
  });

  const cerrar = () => {
    const { sucio: hayCambios, onCerrar: salir } = guardia.current;
    if (hayCambios && !confirm("Hay cambios sin guardar. ¿Cerrar de todos modos?")) return;
    salir();
  };

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const { sucio: hayCambios, onCerrar: salir } = guardia.current;
        if (hayCambios && !confirm("Hay cambios sin guardar. ¿Cerrar de todos modos?")) return;
        salir();
      }
    };
    window.addEventListener("keydown", alTeclear);

    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <div
      onClick={cerrar}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(0px, 3vw, 28px)",
        background: "rgba(10,10,10,0.5)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: 720,
          maxHeight: "92dvh",
          background: COLOR.papel,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "16px 20px",
            borderBottom: `1px solid ${COLOR.linea}`,
          }}
        >
          <h2 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 21 }}>
            {titulo}
            {/* El punto avisa que hay algo sin guardar, sin tener que leer. */}
            {sucio && (
              <span
                title="Cambios sin guardar"
                style={{
                  display: "inline-block",
                  width: 7,
                  height: 7,
                  marginLeft: 9,
                  borderRadius: 999,
                  background: COLOR.aviso,
                  verticalAlign: "middle",
                }}
              />
            )}
          </h2>
          <Boton tono="plano" chico onClick={cerrar} aria-label="Cerrar (Esc)">
            ✕
          </Boton>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>{children}</div>

        {pie && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              padding: "14px 20px",
              borderTop: `1px solid ${COLOR.linea}`,
              background: COLOR.fondo,
            }}
          >
            {pie}
          </div>
        )}
      </div>
    </div>
  );
}
