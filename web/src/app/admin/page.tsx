import { redirect } from "next/navigation";

/** /admin no es una pantalla: el panel empieza en el catálogo. */
export default function AdminIndex() {
  redirect("/admin/catalogo");
}
