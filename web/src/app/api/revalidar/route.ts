import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Le dice al sitio que el catálogo cambió y hay que regenerarlo.
 *
 * La página se sirve cacheada y se refresca sola cada 60 s. Para quien
 * administra desde el celular ese minuto es una eternidad: cambia un precio,
 * abre la página, no ve nada y vuelve a cambiarlo. El backend llama acá
 * después de cada cambio para que el siguiente que entre ya vea lo nuevo.
 *
 * Lo protege un secreto compartido, no una sesión: quien llama es el backend,
 * no un navegador. Sin el secreto configurado el endpoint no existe — mejor
 * eso que dejar abierta una forma de tumbar el caché a punta de peticiones.
 */
export async function POST(peticion: Request) {
  const esperado = process.env.REVALIDAR_SECRETO;

  if (!esperado) {
    return NextResponse.json({ error: "No configurado" }, { status: 404 });
  }

  const recibido = peticion.headers.get("x-revalidar-secreto") ?? "";

  // Comparación de longitud primero para no filtrar el largo del secreto por
  // el tiempo que tarda el rechazo.
  if (recibido.length !== esperado.length || recibido !== esperado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  revalidatePath("/");

  return NextResponse.json({ ok: true, revalidado: new Date().toISOString() });
}
