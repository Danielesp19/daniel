import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";

/**
 * Cambia la contraseña del panel por el token del backend.
 *
 * La contraseña NUNCA sale del servidor de Next y el token del backend nunca
 * viaja en el bundle: el navegador manda la contraseña una vez, recibe el
 * token y de ahí en adelante habla con la API de Laravel con ese Bearer. Es el
 * mismo esquema del panel de La Meca.
 *
 * Es una contraseña compartida y no usuarios con sesión porque el panel lo usa
 * una persona: montar tabla de usuarios, recuperación de contraseña y roles
 * para un solo administrador es infraestructura que nadie va a mantener.
 */

// ── Anti fuerza bruta ───────────────────────────────────────────────────────
// Máx. 5 intentos fallidos por IP cada 15 minutos. En memoria: alcanza para un
// despliegue de un solo proceso. Si algún día esto corre en varias instancias,
// hay que cambiarlo por un almacén compartido (Redis).
const VENTANA_MS = 15 * 60 * 1000;
const MAX_INTENTOS = 5;
const intentos = new Map<string, { cuenta: number; venceEn: number }>();

function ipDe(peticion: Request): string {
  return (
    peticion.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    peticion.headers.get("x-real-ip") ||
    "desconocida"
  );
}

/**
 * Comparación en tiempo constante: si se compara con === , el tiempo que tarda
 * en fallar delata cuántos caracteres iniciales se acertaron. Se hashean los
 * dos lados primero para que tengan el mismo largo.
 */
function igualSeguro(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function POST(peticion: Request) {
  const ip = ipDe(peticion);
  const ahora = Date.now();

  const entrada = intentos.get(ip);
  if (entrada && entrada.venceEn > ahora && entrada.cuenta >= MAX_INTENTOS) {
    const minutos = Math.ceil((entrada.venceEn - ahora) / 60000);
    return NextResponse.json(
      { error: `Demasiados intentos. Espera ${minutos} min.` },
      { status: 429 },
    );
  }

  const { password } = await peticion.json().catch(() => ({ password: "" }));
  const esperada = process.env.ADMIN_PASSWORD ?? "";
  const token = process.env.ADMIN_TOKEN ?? "";

  // Sin configurar, el panel no existe: mejor eso que un panel abierto porque
  // a alguien se le olvidó poner la contraseña en producción.
  if (esperada === "" || token === "") {
    return NextResponse.json(
      { error: "El panel no está configurado (falta ADMIN_PASSWORD o ADMIN_TOKEN)." },
      { status: 503 },
    );
  }

  const correcta =
    typeof password === "string" && password.length > 0 && igualSeguro(password, esperada);

  if (!correcta) {
    const e = entrada && entrada.venceEn > ahora ? entrada : { cuenta: 0, venceEn: ahora + VENTANA_MS };
    e.cuenta += 1;
    intentos.set(ip, e);

    // Limpieza ocasional para que el mapa no crezca sin límite.
    if (intentos.size > 500) {
      for (const [k, v] of intentos) if (v.venceEn <= ahora) intentos.delete(k);
    }

    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  intentos.delete(ip);

  return NextResponse.json({ token });
}
