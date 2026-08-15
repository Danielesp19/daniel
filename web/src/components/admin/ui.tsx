"use client";

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
export function Hoja({
  titulo,
  onCerrar,
  children,
  pie,
}: {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  pie?: ReactNode;
}) {
  return (
    <div
      onClick={onCerrar}
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
          <h2 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 21 }}>{titulo}</h2>
          <Boton tono="plano" chico onClick={onCerrar} aria-label="Cerrar">
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
