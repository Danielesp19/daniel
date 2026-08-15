"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MARCA } from "@/lib/marca";
import { COLOR, campo, rotulo, Aviso, Boton } from "@/components/admin/ui";

/**
 * Entrada al panel: una contraseña que el servidor cambia por el token del
 * backend. La contraseña nunca se guarda en el navegador; el token vive en
 * sessionStorage, así que cerrar la pestaña cierra la sesión.
 */
export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError("");

    try {
      const res = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const datos = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(datos.error ?? "Contraseña incorrecta");
        return;
      }

      sessionStorage.setItem("admin_token", datos.token);
      router.replace("/admin/catalogo");
    } catch {
      setError("No se pudo conectar. ¿Está corriendo el servidor?");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: COLOR.fondo,
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 32, lineHeight: 1.1 }}>{MARCA.nombre}</div>
          <div
            style={{
              marginTop: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: COLOR.rotulo,
            }}
          >
            Panel de administración
          </div>
        </div>

        <form
          onSubmit={entrar}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            padding: 24,
            background: COLOR.papel,
            border: `1px solid ${COLOR.linea}`,
            borderRadius: 14,
          }}
        >
          <label>
            <span style={rotulo}>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              required
              style={campo}
            />
          </label>

          {error && <Aviso>{error}</Aviso>}

          <Boton tono="solido" type="submit" disabled={cargando} style={{ width: "100%" }}>
            {cargando ? "Entrando…" : "Entrar"}
          </Boton>
        </form>
      </div>
    </div>
  );
}
