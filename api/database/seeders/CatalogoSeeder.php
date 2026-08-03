<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Hero;
use App\Models\Producto;
use Illuminate\Database\Seeder;

/**
 * Catálogo de prueba con datos realistas: fincas, regiones, variedades y
 * procesos que de verdad se cultivan en Colombia, con precios y altitudes
 * en rangos creíbles. Sirve para desarrollar contra algo que se parece a lo
 * que va a haber en producción — sobre todo para el diseño, donde un nombre
 * de finca largo o cinco notas de cata revientan una tarjeta que se probó
 * con "Producto 1".
 *
 * Los productos NO traen foto: las imágenes se cargan desde el panel. El
 * frontend dibuja un marcador con la inicial cuando `imagen_url` viene nula.
 */
class CatalogoSeeder extends Seeder
{
    public function run(): void
    {
        Hero::create([
            'etiqueta' => 'Tostado por lote · Bogotá',
            'titulo' => 'Café de altura',
            'subtitulo' => 'Compramos lotes pequeños directamente a diez fincas colombianas y los tostamos cada semana. Nada de mezclas anónimas.',
            'cta_texto' => 'Ver el catálogo',
            'cta_url' => '#catalogo',
            'activo' => true,
            'orden' => 0,
        ]);

        $temporada = Categoria::create([
            'nombre' => 'Lotes de temporada',
            'descripcion' => 'La cosecha que está en el tostador ahora mismo. Cuando se acaba, se acaba.',
            'modo_vitrina' => 'grid',
            'orden' => 1,
        ]);

        $origen = Categoria::create([
            'nombre' => 'Cafés de origen',
            'descripcion' => 'Un solo productor, un solo lote, una sola cosecha. Trazables hasta la hectárea.',
            'modo_vitrina' => 'vertical',
            'orden' => 2,
        ]);

        $metodos = Categoria::create([
            'nombre' => 'Métodos',
            'descripcion' => 'Cómo preparamos cada café en la barra. Desliza para pasar de método.',
            'modo_vitrina' => 'horizontal',
            'orden' => 3,
        ]);

        $equipo = Categoria::create([
            'nombre' => 'Equipo',
            'descripcion' => 'Lo mínimo para preparar bien un café en casa.',
            'modo_vitrina' => 'grid',
            'orden' => 4,
        ]);

        $this->sembrar($temporada, [
            [
                'nombre' => 'El Mirador', 'precio_cop' => 48000, 'gramos' => 340, 'stock' => 24,
                'descripcion' => 'Dulce y redondo, el que le damos a quien nunca ha tomado café de especialidad. Aguanta leche sin desaparecer.',
                'finca' => 'Finca El Mirador', 'productor' => 'Familia Perdomo', 'region' => 'Huila',
                'altitud_msnm' => 1850, 'variedad' => 'Castillo', 'proceso' => 'Lavado', 'tueste' => 'Medio',
                'notas' => ['panela', 'mandarina', 'cacao'], 'puntaje_sca' => 85.5, 'destacado' => true,
            ],
            [
                'nombre' => 'La Esperanza', 'precio_cop' => 52000, 'gramos' => 340, 'stock' => 11,
                'descripcion' => 'Acidez de fruta madura y cuerpo jugoso. Brilla en V60 y se apaga en espresso.',
                'finca' => 'La Esperanza', 'productor' => 'Édgar Muñoz', 'region' => 'Nariño',
                'altitud_msnm' => 2100, 'variedad' => 'Caturra', 'proceso' => 'Lavado', 'tueste' => 'Claro',
                'notas' => ['durazno', 'panela', 'jazmín'], 'puntaje_sca' => 86.25, 'destacado' => true,
            ],
            [
                'nombre' => 'Buenavista Honey', 'precio_cop' => 58000, 'gramos' => 340, 'stock' => 3,
                'descripcion' => 'Secado con el mucílago puesto. Más dulce y más denso que un lavado, sin irse a lo fermentado.',
                'finca' => 'Buenavista', 'productor' => 'Marta Ochoa', 'region' => 'Tolima',
                'altitud_msnm' => 1720, 'variedad' => 'Bourbon Rosado', 'proceso' => 'Honey', 'tueste' => 'Medio',
                'notas' => ['miel de caña', 'ciruela', 'nuez'], 'puntaje_sca' => 87.0,
            ],
            [
                'nombre' => 'Descafeinado Azufrado', 'precio_cop' => 46000, 'gramos' => 340, 'stock' => 16,
                'descripcion' => 'Descafeinado con agua de montaña, sin solventes. Sigue sabiendo a café, que es más de lo que suele lograrse.',
                'finca' => 'Asociación Andes', 'region' => 'Antioquia',
                'altitud_msnm' => 1600, 'variedad' => 'Colombia', 'proceso' => 'Lavado · EA', 'tueste' => 'Medio',
                'notas' => ['chocolate', 'almendra'], 'puntaje_sca' => 83.5,
            ],
            [
                'nombre' => 'Mezcla Casa', 'precio_cop' => 38000, 'gramos' => 500, 'stock' => 0,
                'descripcion' => 'Tres lotes del Huila y el Tolima armados para prensa y moka. La bolsa grande de todos los días.',
                'region' => 'Huila · Tolima', 'proceso' => 'Lavado', 'tueste' => 'Medio oscuro',
                'notas' => ['cacao', 'caramelo', 'nuez'],
            ],
        ]);

        $this->sembrar($origen, [
            [
                'nombre' => 'Geisha El Diviso', 'precio_cop' => 145000, 'gramos' => 250, 'stock' => 6,
                'descripcion' => 'Nuestro lote más caro y el más difícil de conseguir. Cuarenta kilos al año, y ni un gramo más.',
                'finca' => 'El Diviso', 'productor' => 'Nestor Lasso', 'region' => 'Huila',
                'altitud_msnm' => 1750, 'variedad' => 'Geisha', 'proceso' => 'Fermentación anaeróbica', 'tueste' => 'Claro',
                'notas' => ['bergamota', 'lichi', 'té negro', 'durazno blanco'], 'puntaje_sca' => 90.5, 'destacado' => true,
            ],
            [
                'nombre' => 'Pink Bourbon Las Flores', 'precio_cop' => 92000, 'gramos' => 250, 'stock' => 9,
                'descripcion' => 'La variedad que puso a Colombia en las mesas de cata del mundo. Floral sin volverse perfume.',
                'finca' => 'Las Flores', 'productor' => 'Jhoan Vergara', 'region' => 'Huila',
                'altitud_msnm' => 1900, 'variedad' => 'Pink Bourbon', 'proceso' => 'Lavado', 'tueste' => 'Claro',
                'notas' => ['maracuyá', 'flor de naranjo', 'panela'], 'puntaje_sca' => 88.75,
            ],
            [
                'nombre' => 'Tabi La Divisa', 'precio_cop' => 74000, 'gramos' => 250, 'stock' => 2,
                'descripcion' => 'Un cruce colombiano de Típica, Bourbon y Timor. Cuerpo de bourbon con la resistencia de un híbrido.',
                'finca' => 'La Divisa', 'productor' => 'Édwin Noreña', 'region' => 'Quindío',
                'altitud_msnm' => 1650, 'variedad' => 'Tabi', 'proceso' => 'Natural', 'tueste' => 'Medio',
                'notas' => ['fresa', 'vino tinto', 'cacao'], 'puntaje_sca' => 87.5,
            ],
            [
                'nombre' => 'Caturra El Paraíso', 'precio_cop' => 68000, 'gramos' => 250, 'stock' => 14,
                'descripcion' => 'Fermentación controlada a temperatura fija durante 48 horas. Un lote que sabe igual todos los meses.',
                'finca' => 'El Paraíso', 'productor' => 'Wilton Benítez', 'region' => 'Cauca',
                'altitud_msnm' => 1960, 'variedad' => 'Caturra', 'proceso' => 'Fermentación anaeróbica', 'tueste' => 'Claro',
                'notas' => ['manzana verde', 'canela', 'miel'], 'puntaje_sca' => 89.0,
            ],
        ]);

        $this->sembrar($metodos, [
            [
                'nombre' => 'V60', 'precio_cop' => 9000, 'gramos' => 0, 'stock' => 99,
                'descripcion' => 'Filtrado por goteo. Taza limpia y aromática: es donde mejor se leen los cafés de altura y los procesos lavados.',
            ],
            [
                'nombre' => 'Prensa francesa', 'precio_cop' => 8000, 'gramos' => 0, 'stock' => 99,
                'descripcion' => 'Inmersión total con filtro metálico. Deja pasar los aceites: más cuerpo, menos claridad.',
            ],
            [
                'nombre' => 'Espresso', 'precio_cop' => 6000, 'gramos' => 0, 'stock' => 99,
                'descripcion' => 'Nueve bares durante veintiocho segundos. Concentra el dulzor y castiga sin piedad cualquier defecto del lote.',
            ],
        ]);

        $this->sembrar($equipo, [
            [
                'nombre' => 'Molino manual C40', 'precio_cop' => 385000, 'gramos' => 0, 'stock' => 4,
                'descripcion' => 'Fresas cónicas de acero. Si solo vas a comprar una cosa, que sea esta: moler en el momento cambia más la taza que subir de lote.',
            ],
            [
                'nombre' => 'Balanza con temporizador', 'precio_cop' => 145000, 'gramos' => 0, 'stock' => 7,
                'descripcion' => 'Precisión de 0,1 g y cronómetro integrado. Sin pesar no hay receta, hay suerte.',
            ],
            [
                'nombre' => 'Filtros V60 · 100 und', 'precio_cop' => 28000, 'gramos' => 0, 'stock' => 1,
                'descripcion' => 'Papel blanqueado sin cloro, tamaño 02. Enjuágalos antes de usarlos.',
            ],
        ]);
    }

    /** @param  array<int, array<string, mixed>>  $productos */
    private function sembrar(Categoria $categoria, array $productos): void
    {
        foreach ($productos as $orden => $datos) {
            $categoria->productos()->create($datos + [
                'orden' => $orden,
                'activo' => true,
                // Los cafés se venden por bolsa y tres es un buen umbral de
                // "pide más ya". El equipo se repone distinto, pero el mismo
                // número sirve de punto de partida.
                'stock_minimo' => 3,
            ]);
        }
    }
}
