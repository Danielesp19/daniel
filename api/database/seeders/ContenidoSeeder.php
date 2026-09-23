<?php

namespace Database\Seeders;

use App\Models\Aviso;
use App\Models\Pregunta;
use App\Models\Producto;
use App\Models\Receta;
use Illuminate\Database\Seeder;

/**
 * Aviso, recetas y preguntas frecuentes.
 *
 * OJO: como el resto del sembrado, es contenido DE EJEMPLO con la forma del
 * real. Las recetas sí traen proporciones que funcionan —son las que se usan
 * en barra— pero el aviso anuncia una feria inventada y las respuestas hablan
 * de tiempos de envío que hay que confirmar. Todo se corrige desde el panel.
 */
class ContenidoSeeder extends Seeder
{
    public function run(): void
    {
        Aviso::create([
            'etiqueta' => 'Aviso',
            'titulo' => 'Barra en vivo en la Feria del Café',
            'texto' => 'Del 12 al 14 de septiembre estoy en Pitalito preparando filtrados y mostrando arte latte. Entrada libre.',
            'cta_texto' => 'Quiero ir',
            'cta_url' => 'https://wa.me/573227323425',
        ]);

        // Las recetas, en el orden en que se aprenden: primero los filtrados,
        // que son con los que arranca cualquiera, y de últimas la leche, que
        // es lo que más práctica pide.
        $recetas = [
            [
                'nombre' => 'V60 para uno',
                'metodo' => 'Filtrado',
                'resumen' => '15 g · 250 ml · 2:45',
                'detalle' => '15 g café · 250 ml agua a 94 °C',
                'cafe_g' => 15,
                'agua_g' => 250,
                'molienda_micras' => 600,
                'duracion_seg' => 165,
                'ingredientes' => ['15 g de café', '250 ml de agua a 94 °C', 'Filtro de papel V60'],
                'pasos' => [
                    ['texto' => 'Enjuaga el filtro y precalienta la jarra. Bota el agua.'],
                    ['texto' => 'Muele medio, tipo arena de mar. Nivela la cama.'],
                    ['texto' => 'Bloom: 45 ml y espera 40 segundos.', 'segundos' => 40, 'temporizador_etiqueta' => 'Bloom'],
                    ['texto' => 'Tres vertidos de 70 ml en espiral, sin tocar el borde.'],
                    ['texto' => 'Termina cerca de 2:45. Gira la jarra antes de servir.', 'segundos' => 165, 'temporizador_etiqueta' => 'Total'],
                ],
            ],
            [
                'nombre' => 'Chemex para dos',
                'metodo' => 'Filtrado',
                'resumen' => '30 g · 500 ml · 4:00',
                'detalle' => '30 g café · 500 ml agua a 93 °C',
                'cafe_g' => 30,
                'agua_g' => 500,
                'molienda_micras' => 800,
                'duracion_seg' => 240,
                'ingredientes' => ['30 g de café', '500 ml de agua a 93 °C', 'Filtro Chemex'],
                'pasos' => [
                    ['texto' => 'Filtro con el triple pliegue hacia el pico. Enjuaga.'],
                    ['texto' => 'Molienda un paso más gruesa que la del V60.'],
                    ['texto' => 'Bloom con 90 ml, 45 segundos.', 'segundos' => 45, 'temporizador_etiqueta' => 'Bloom'],
                    ['texto' => 'Vertidos de 130 ml cada minuto, lento y al centro.', 'segundos' => 240, 'temporizador_etiqueta' => 'Total'],
                    ['texto' => 'Retira el filtro en cuanto gotee despacio.'],
                ],
            ],
            [
                'nombre' => 'Prensa francesa',
                'metodo' => 'Inmersión',
                'resumen' => '30 g · 500 ml · 4:00',
                'detalle' => '30 g café · 500 ml agua a 92 °C',
                'cafe_g' => 30,
                'agua_g' => 500,
                'molienda_micras' => 1000,
                'duracion_seg' => 240,
                'ingredientes' => ['30 g de café', '500 ml de agua a 92 °C'],
                'pasos' => [
                    ['texto' => 'Molienda gruesa. Precalienta la prensa.'],
                    ['texto' => 'Agrega toda el agua de una y arranca el reloj.', 'segundos' => 240, 'temporizador_etiqueta' => 'Infusión'],
                    ['texto' => 'A los 4:00 rompe la costra y retira la espuma.'],
                    ['texto' => 'Baja el filtro despacio y sirve todo de inmediato.'],
                ],
            ],
            [
                'nombre' => 'Cold brew de un día',
                'metodo' => 'Inmersión',
                'resumen' => '100 g · 1 L · 14 h',
                'detalle' => '100 g café · 1 L agua fría · 14 horas',
                'cafe_g' => 100,
                'agua_g' => 1000,
                'molienda_micras' => 1000,
                'duracion_seg' => 50400,
                'ingredientes' => ['100 g de café', '1 L de agua fría', 'Filtro de papel para colar'],
                'pasos' => [
                    ['texto' => 'Molienda muy gruesa, como pimienta partida.'],
                    ['texto' => 'Mezcla con agua fría y tapa. Nevera 14 horas.', 'segundos' => 50400, 'temporizador_etiqueta' => 'Reposo'],
                    ['texto' => 'Cuela por filtro de papel sin apretar el borra.'],
                    ['texto' => 'Sirve 1:1 con agua o leche y bastante hielo.'],
                ],
            ],
            [
                'nombre' => 'Espresso en casa',
                'metodo' => 'Espresso',
                'resumen' => '18 g · 36 g · 28 s',
                'detalle' => '18 g dentro · 36 g en taza',
                'cafe_g' => 18,
                'agua_g' => 36,
                'molienda_micras' => 250,
                'duracion_seg' => 28,
                'ingredientes' => ['18 g de café', 'Canasta doble'],
                'pasos' => [
                    ['texto' => '18 g, distribuye y prensa parejo, sin golpear.'],
                    ['texto' => 'Purga el grupo dos segundos antes de montar.'],
                    ['texto' => 'Busca 36 g en taza entre 26 y 30 segundos.', 'segundos' => 28, 'temporizador_etiqueta' => 'Extracción'],
                    ['texto' => 'Si sale rápido cierra la molienda; si se ahoga, ábrela.'],
                ],
            ],
            [
                'nombre' => 'Moka italiana',
                'metodo' => 'Espresso',
                'resumen' => '16 g · 150 ml · 3:30',
                'detalle' => '16 g café · agua caliente al nivel de la válvula',
                'cafe_g' => 16,
                'agua_g' => 150,
                'molienda_micras' => 400,
                'duracion_seg' => 210,
                'ingredientes' => ['16 g de café', 'Agua caliente hasta la válvula'],
                'pasos' => [
                    ['texto' => 'Llena la base con agua ya caliente, hasta la válvula.'],
                    ['texto' => 'Molienda media, nivelada, sin prensar.'],
                    ['texto' => 'Fuego bajo y tapa abierta para verla salir.', 'segundos' => 210, 'temporizador_etiqueta' => 'En el fuego'],
                    ['texto' => 'Retira en cuanto suene: lo último amarga.'],
                ],
            ],
            [
                'nombre' => 'Latte con leche texturizada',
                'metodo' => 'Con leche',
                'resumen' => '36 g · 180 ml leche',
                'detalle' => '36 g espresso · 180 ml leche entera fría',
                'cafe_g' => 36,
                'agua_g' => 180,
                'molienda_micras' => 250,
                'duracion_seg' => 60,
                'ingredientes' => ['36 g de espresso', '180 ml de leche entera fría'],
                'pasos' => [
                    ['texto' => 'Espresso listo en taza precalentada.'],
                    ['texto' => 'Airea la leche 3 segundos, luego hunde la lanceta.', 'segundos' => 3, 'temporizador_etiqueta' => 'Aireado'],
                    ['texto' => 'Busca 60 °C: la jarra deja de aguantarse con la mano.'],
                    ['texto' => 'Golpea, gira y vierte alto; termina bajo y al centro.'],
                ],
            ],
        ];

        foreach ($recetas as $orden => $datos) {
            $pasos = $datos['pasos'] ?? [];
            unset($datos['pasos']);

            $receta = Receta::create($datos + ['orden' => $orden]);

            foreach ($pasos as $i => $paso) {
                $receta->pasos()->create($paso + ['orden' => $i]);
            }
        }

        // Los artefactos que usa cada método, para que la receta los
        // recomiende. Se buscan por nombre porque el seeder del catálogo corre
        // antes y los ids dependen del orden de inserción.
        $usa = [
            'V60 para uno' => ['Kit V60 completo', 'Molino manual C40', 'Báscula con cronómetro'],
            'Chemex para dos' => ['Molino manual C40', 'Báscula con cronómetro'],
            'Prensa francesa' => ['Prensa francesa 800 ml', 'Molino manual C40'],
            'Cold brew de un día' => ['Molino manual C40'],
            'Espresso en casa' => ['Prensa de espresso portátil', 'Molino manual C40'],
            'Moka italiana' => ['Molino manual C40'],
            'Latte con leche texturizada' => ['Jarra de leche 600 ml'],
        ];

        foreach ($usa as $nombreReceta => $nombresArtefactos) {
            $receta = Receta::where('nombre', $nombreReceta)->first();
            if (! $receta) {
                continue;
            }
            $ids = Producto::whereIn('nombre', $nombresArtefactos)->pluck('id');
            $receta->artefactos()->sync(
                $ids->mapWithKeys(fn ($id, $i) => [$id => ['orden' => $i]])->all()
            );
        }

        $preguntas = [
            [
                'pregunta' => '¿Cómo hago el pedido?',
                'respuesta' => 'Armas tu pedido acá, tocas “Pedir por WhatsApp” y te llega el mensaje ya escrito con los lotes, la molienda y el total. Yo confirmo disponibilidad y envío.',
            ],
            [
                'pregunta' => '¿Lo muelen o me lo mandan en grano?',
                'respuesta' => 'Como prefieras. Si me dices tu método —V60, prensa, espresso, moka— lo muelo en el punto justo el día que sale el envío. En grano dura más.',
            ],
            [
                'pregunta' => '¿Cuánto tarda el envío?',
                'respuesta' => 'Dos a cuatro días hábiles a ciudades principales, hasta cinco a zonas alejadas. Salen desde Pitalito con guía para que lo sigas.',
            ],
        ];

        foreach ($preguntas as $orden => $datos) {
            Pregunta::create($datos + ['orden' => $orden]);
        }
    }
}
