import type { Metadata } from "next";
import {
  getAviso,
  getCatalogo,
  getPreguntas,
  getRecetas,
  type Aviso as AvisoDatos,
  type Categoria,
  type Pregunta,
  type Receta,
} from "@/lib/catalogo";
import { MARCA } from "@/lib/marca";
import { CarritoProvider } from "@/components/carrito/CarritoProvider";
import BarraCarrito from "@/components/carrito/BarraCarrito";
import BotonWhatsApp from "@/components/catalogo/BotonWhatsApp";
import Intro from "@/components/catalogo/Intro";
import Cabecera from "@/components/catalogo/Cabecera";
import Hero from "@/components/catalogo/Hero";
import Barista from "@/components/catalogo/Barista";
import Catalogo from "@/components/catalogo/Catalogo";
import Recetas from "@/components/catalogo/Recetas";
import Preguntas from "@/components/catalogo/Preguntas";
import Aviso from "@/components/catalogo/Aviso";
import PieSitio from "@/components/catalogo/PieSitio";

export const metadata: Metadata = {
  title: `${MARCA.nombre} — ${MARCA.oficio}`,
  description: MARCA.descripcion,
};

// ISR: la página se regenera como máximo cada 60 s y se sirve desde el CDN.
// Así una ráfaga de visitas se atiende en el borde y el backend recibe ~1
// petición por minuto en vez de una por visita.
export const revalidate = 60;

export default async function Inicio() {
  // Datos traídos en el servidor. Si el backend está caído, la página se
  // publica igual con lo que haya: mejor el hero y la presentación que un
  // error a pantalla completa.
  const [categorias, aviso, recetas, preguntas] = await Promise.all([
    getCatalogo().catch(() => [] as Categoria[]),
    getAviso().catch(() => null as AvisoDatos | null),
    getRecetas().catch(() => [] as Receta[]),
    getPreguntas().catch(() => [] as Pregunta[]),
  ]);

  return (
    <CarritoProvider>
      <Intro />
      <Cabecera categorias={categorias.map((c) => ({ slug: c.slug, nombre: c.nombre }))} />

      <main>
        <Hero />
        <Aviso aviso={aviso} />
        <Barista />
        <Catalogo categorias={categorias} />
        <Recetas recetas={recetas} productos={categorias.flatMap((c) => c.productos)} />
        <Preguntas preguntas={preguntas} />
        <PieSitio />
      </main>

      <BotonWhatsApp />
      <BarraCarrito />
    </CarritoProvider>
  );
}
