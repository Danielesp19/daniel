import type { Metadata } from "next";
import { getCatalogo, getHero, type Categoria, type Hero as HeroDatos } from "@/lib/catalogo";
import { MARCA } from "@/lib/marca";
import { CarritoProvider } from "@/components/carrito/CarritoProvider";
import BarraCarrito from "@/components/carrito/BarraCarrito";
import Hero from "@/components/catalogo/Hero";
import Barista from "@/components/catalogo/Barista";
import Catalogo from "@/components/catalogo/Catalogo";
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
  const [categorias, hero] = await Promise.all([
    getCatalogo().catch(() => [] as Categoria[]),
    getHero().catch(() => null as HeroDatos | null),
  ]);

  return (
    <CarritoProvider>
      <main>
        {/* La foto de fondo de las vitrinas es pesada y vive al final de una
            página larga. Se pide desde ya, pero con prioridad baja para no
            competir por ancho de banda con el video del hero, que sí importa
            para el primer pantallazo. */}
        <link rel="preload" as="image" href="/image.webp" fetchPriority="low" />
        <link rel="preload" as="image" href="/metodos.jpg" fetchPriority="low" />

        <Hero hero={hero} />
        <Barista />
        <Catalogo categorias={categorias} />
        <PieSitio />
      </main>

      <BarraCarrito />
    </CarritoProvider>
  );
}
