<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Hero;
use App\Models\Producto;
use Illuminate\Database\Seeder;

/**
 * Catálogo de prueba.
 *
 * OJO: los productos, los precios y las fichas de origen son DE EJEMPLO. Están
 * armados con fincas, variedades y procesos que sí existen en Colombia para
 * que el diseño se pruebe contra datos con la forma real —un nombre de finca
 * largo o cinco notas de cata revientan una tarjeta que se probó con
 * "Producto 1"—, pero no son el inventario ni las tarifas de nadie. Lo real se
 * carga desde el panel en /admin.
 *
 * Los productos no traen foto: el catálogo dibuja la inicial del producto
 * mientras no haya imagen.
 */
class CatalogoSeeder extends Seeder
{
    public function run(): void
    {
        Hero::create([
            'etiqueta' => 'Arte latte · Café de especialidad · Huila',
            'titulo' => 'El arte del café, en cada taza',
            'subtitulo' => 'Subcampeón Nacional de Arte Latte. Cursos, experiencias y café de especialidad del Huila.',
            'cta_texto' => 'Ver el catálogo',
            'cta_url' => '#catalogo',
            'activo' => true,
            'orden' => 0,
        ]);

        $grano = Categoria::create([
            'nombre' => 'Café en grano',
            'descripcion' => 'Lotes con fecha de tueste reciente. Se muele al momento y para el método que uses.',
            'modo_vitrina' => 'carrusel',
            'orden' => 1,
        ]);

        $origen = Categoria::create([
            'nombre' => 'Cafés de origen',
            'descripcion' => 'Un solo productor, un solo lote, una sola cosecha. Los que valen la pena tomar sin leche.',
            'modo_vitrina' => 'vertical',
            'orden' => 2,
        ]);

        $metodos = Categoria::create([
            'nombre' => 'Métodos',
            'descripcion' => 'Cómo preparo cada café según lo que quieras sacarle. Desliza para pasar de método.',
            'modo_vitrina' => 'horizontal',
            'orden' => 3,
        ]);

        $artefactos = Categoria::create([
            'nombre' => 'Artefactos',
            'descripcion' => 'Lo que uso y lo que recomiendo para preparar en casa. Equipo probado en barra, no catálogo de importador.',
            'modo_vitrina' => 'carrusel',
            'orden' => 4,
        ]);

        $servicios = Categoria::create([
            'nombre' => 'Servicios',
            'descripcion' => 'Mira de qué se trata y agenda por WhatsApp. Cada tarjeta abre su video.',
            'modo_vitrina' => 'horizontal',
            'orden' => 5,
        ]);

        $this->sembrar($grano, [
            [
                'nombre' => 'Bourbon Rosado', 'precio_cop' => 58000, 'gramos' => 340, 'stock' => 14,
                'descripcion' => 'Floral sin volverse perfume. El que más pido para filtrado, y el que mejor convence a quien dice que el café le sabe amargo.',
                'finca' => 'Las Flores', 'productor' => 'Jhoan Vergara', 'region' => 'Huila',
                'altitud_msnm' => 1900, 'variedad' => 'Pink Bourbon', 'proceso' => 'Lavado', 'tueste' => 'Claro',
                'notas' => ['maracuyá', 'flor de naranjo', 'panela'], 'puntaje_sca' => 88.75, 'destacado' => true,
            ],
            [
                'nombre' => 'El Mirador', 'precio_cop' => 48000, 'gramos' => 340, 'stock' => 22,
                'descripcion' => 'Dulce y redondo, el que le doy a quien nunca ha tomado café de especialidad. Aguanta leche sin desaparecer.',
                'finca' => 'Finca El Mirador', 'productor' => 'Familia Perdomo', 'region' => 'Huila',
                'altitud_msnm' => 1850, 'variedad' => 'Castillo', 'proceso' => 'Lavado', 'tueste' => 'Medio',
                'notas' => ['panela', 'mandarina', 'cacao'], 'puntaje_sca' => 85.5, 'destacado' => true,
            ],
            [
                'nombre' => 'Buenavista Honey', 'precio_cop' => 56000, 'gramos' => 340, 'stock' => 3,
                'descripcion' => 'Secado con el mucílago puesto. Más dulce y más denso que un lavado, sin irse a lo fermentado.',
                'finca' => 'Buenavista', 'productor' => 'Marta Ochoa', 'region' => 'Tolima',
                'altitud_msnm' => 1720, 'variedad' => 'Bourbon Rosado', 'proceso' => 'Honey', 'tueste' => 'Medio',
                'notas' => ['miel de caña', 'ciruela', 'nuez'], 'puntaje_sca' => 87.0,
            ],
            [
                'nombre' => 'Descafeinado', 'precio_cop' => 46000, 'gramos' => 340, 'stock' => 9,
                'descripcion' => 'Descafeinado con agua de montaña, sin solventes. Sigue sabiendo a café, que es más de lo que suele lograrse.',
                'region' => 'Antioquia', 'variedad' => 'Colombia', 'proceso' => 'Lavado · EA', 'tueste' => 'Medio',
                'altitud_msnm' => 1600, 'notas' => ['chocolate', 'almendra'], 'puntaje_sca' => 83.5,
            ],
            [
                'nombre' => 'Mezcla Barra', 'precio_cop' => 38000, 'gramos' => 500, 'stock' => 0,
                'descripcion' => 'Armada para espresso con leche: se sostiene en un capuchino y no se pierde bajo la espuma. La bolsa grande de todos los días.',
                'region' => 'Huila · Tolima', 'proceso' => 'Lavado', 'tueste' => 'Medio oscuro',
                'notas' => ['cacao', 'caramelo', 'nuez'],
            ],
        ]);

        $this->sembrar($origen, [
            [
                'nombre' => 'Geisha El Diviso', 'precio_cop' => 145000, 'gramos' => 250, 'stock' => 5,
                'descripcion' => 'El lote más caro que manejo y el más difícil de conseguir. Se toma filtrado, sin leche y sin azúcar, o no tiene sentido pagarlo.',
                'finca' => 'El Diviso', 'productor' => 'Nestor Lasso', 'region' => 'Huila',
                'altitud_msnm' => 1750, 'variedad' => 'Geisha', 'proceso' => 'Fermentación anaeróbica', 'tueste' => 'Claro',
                'notas' => ['bergamota', 'lichi', 'té negro', 'durazno blanco'], 'puntaje_sca' => 90.5, 'destacado' => true,
            ],
            [
                'nombre' => 'Tabi La Divisa', 'precio_cop' => 74000, 'gramos' => 250, 'stock' => 2,
                'descripcion' => 'Un cruce colombiano de Típica, Bourbon y Timor. Cuerpo de bourbon con la resistencia de un híbrido.',
                'finca' => 'La Divisa', 'productor' => 'Édwin Noreña', 'region' => 'Quindío',
                'altitud_msnm' => 1650, 'variedad' => 'Tabi', 'proceso' => 'Natural', 'tueste' => 'Medio',
                'notas' => ['fresa', 'vino tinto', 'cacao'], 'puntaje_sca' => 87.5,
            ],
            [
                'nombre' => 'Caturra El Paraíso', 'precio_cop' => 68000, 'gramos' => 250, 'stock' => 11,
                'descripcion' => 'Fermentación controlada a temperatura fija durante 48 horas. Un lote que sabe igual todos los meses, que para una barra vale oro.',
                'finca' => 'El Paraíso', 'productor' => 'Wilton Benítez', 'region' => 'Cauca',
                'altitud_msnm' => 1960, 'variedad' => 'Caturra', 'proceso' => 'Fermentación anaeróbica', 'tueste' => 'Claro',
                'notas' => ['manzana verde', 'canela', 'miel'], 'puntaje_sca' => 89.0,
            ],
        ]);

        // Los métodos son informativos: la vitrina horizontal no muestra precio
        // ni botón de agregar, así que aquí el precio queda en cero y el stock
        // no se controla. Es la sección donde van los videos.
        $this->sembrar($metodos, [
            [
                'nombre' => 'Espresso', 'precio_cop' => 0, 'gramos' => 0, 'controla_stock' => false,
                'descripcion' => 'Nueve bares durante veintiocho segundos. Concentra el dulzor y no perdona un defecto del lote ni una molienda mal calibrada.',
            ],
            [
                'nombre' => 'Capuchino', 'precio_cop' => 0, 'gramos' => 0, 'controla_stock' => false,
                'descripcion' => 'Leche texturizada a punto de brillo, sin burbuja visible. Es donde se ve si el barista sabe manejar el vapor: el arte latte es la consecuencia, no el objetivo.',
            ],
            [
                'nombre' => 'V60', 'precio_cop' => 0, 'gramos' => 0, 'controla_stock' => false,
                'descripcion' => 'Filtrado por goteo. Taza limpia y aromática: es donde mejor se leen los cafés de altura y los procesos lavados.',
            ],
            [
                'nombre' => 'Prensa francesa', 'precio_cop' => 0, 'gramos' => 0, 'controla_stock' => false,
                'descripcion' => 'Inmersión total con filtro metálico. Deja pasar los aceites: más cuerpo, menos claridad. La más fácil de hacer bien en casa.',
            ],
        ]);

        // Artefactos: equipo, no café. No tienen ficha de origen ni tueste,
        // así que la tarjeta se dibuja sin regla y sin puntaje — es el caso que
        // obliga a que esos bloques sean opcionales y no decorativos.
        $this->sembrar($artefactos, [
            [
                'nombre' => 'Molino manual C40', 'precio_cop' => 890000, 'gramos' => 0, 'stock' => 4,
                'descripcion' => 'Fresas cónicas de acero y clics marcados: la misma molienda hoy y en seis meses. Es el que llevo a competencia.',
                'destacado' => true,
            ],
            [
                'nombre' => 'Prensa de espresso portátil', 'precio_cop' => 420000, 'gramos' => 0, 'stock' => 6,
                'descripcion' => 'Espresso de verdad sin conectar nada: se presiona a mano y sostiene nueve bares. La que uso cuando viajo.',
            ],
            [
                'nombre' => 'Kit V60 completo', 'precio_cop' => 210000, 'gramos' => 0, 'stock' => 9,
                'descripcion' => 'Cono de vidrio, jarra, filtros y la receta escrita. Todo lo que hace falta para el primer filtrado en casa.',
                'destacado' => true,
            ],
            [
                'nombre' => 'Báscula con cronómetro', 'precio_cop' => 175000, 'gramos' => 0, 'stock' => 7,
                'descripcion' => 'Décimas de gramo y tiempo en la misma pantalla. Sin báscula no hay receta que se pueda repetir.',
            ],
            [
                'nombre' => 'Jarra de leche 600 ml', 'precio_cop' => 95000, 'gramos' => 0, 'stock' => 12,
                'descripcion' => 'Pico afilado para figuras finas. Es la medida con la que enseño arte latte y con la que compito.',
            ],
            [
                'nombre' => 'Prensa francesa 800 ml', 'precio_cop' => 130000, 'gramos' => 0, 'stock' => 0,
                'descripcion' => 'Filtro metálico de malla doble. La más fácil de hacer bien en casa y la más difícil de arruinar.',
            ],
        ]);

        // Servicios: no se cuentan en bolsas ni se agotan, se agendan. Los
        // precios son de ejemplo — pon los reales desde el panel.
        $this->sembrar($servicios, [
            [
                'nombre' => 'Asesoría para tu barra', 'precio_cop' => 280000, 'gramos' => 0, 'controla_stock' => false,
                'descripcion' => 'Voy a tu negocio, reviso molino, máquina y receta, y dejo la barra calibrada con tu equipo entrenado para sostenerla. Media jornada.',
                'destacado' => true,
            ],
            [
                'nombre' => 'Clase de arte latte', 'precio_cop' => 180000, 'gramos' => 0, 'controla_stock' => false,
                'descripcion' => 'Texturizado de leche y las figuras base: corazón, tulipán y roseta. Individual o en grupo pequeño, con máquina y leche incluidas.',
            ],
            [
                'nombre' => 'Barra para eventos', 'precio_cop' => 650000, 'gramos' => 0, 'controla_stock' => false,
                'descripcion' => 'Monto la barra completa con café de especialidad y la atiendo durante el evento. El precio final depende de invitados, duración y ciudad.',
                'destacado' => true,
            ],
            [
                'nombre' => 'Coctelería con café', 'precio_cop' => 420000, 'gramos' => 0, 'controla_stock' => false,
                'descripcion' => 'Carta corta de cocteles con café de especialidad para tu evento, con o sin alcohol. Se arma según lo que estés celebrando.',
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
                // "pide más ya".
                'stock' => 0,
                'stock_minimo' => 3,
            ]);
        }
    }
}
