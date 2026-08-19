<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Hero;
use App\Models\Producto;
use App\Models\Sede;
use Illuminate\Database\Eloquent\Collection;
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
        $this->sembrarSedes();

        Hero::create([
            'etiqueta' => 'Arte latte · Café de especialidad · Huila',
            'titulo' => 'El arte del café, en cada taza',
            'subtitulo' => 'Subcampeón Nacional de Arte Latte. Cursos, experiencias y café de especialidad del Huila.',
            'cta_texto' => 'Ver el catálogo',
            'cta_url' => '#catalogo',
            'activo' => true,
            'orden' => 0,
        ]);

        // ── Tres secciones, tres tratamientos distintos ─────────────────────
        // La página se sentía repetida cuando eran cinco: el café salía dos
        // veces (en grano y de origen) y dos secciones usaban el mismo
        // carrusel. Ahora cada una se dibuja distinto —vitrina, carrusel y
        // bandas a lo ancho— y ninguna se parece a la anterior.
        //
        // El café de origen no necesita sección aparte: su ficha ya lo
        // distingue sola con finca, altura y puntaje SCA.
        $cafes = Categoria::create([
            'nombre' => 'Cafés',
            'descripcion' => 'Lotes con fecha de tueste reciente, de un solo productor. Se muelen al momento y para el método que uses.',
            'modo_vitrina' => 'vertical',
            'orden' => 1,
        ]);

        $artefactos = Categoria::create([
            'nombre' => 'Artefactos',
            'descripcion' => 'Lo que uso y lo que recomiendo para preparar en casa. Equipo probado en barra, no catálogo de importador.',
            'modo_vitrina' => 'carrusel',
            'orden' => 2,
        ]);

        $servicios = Categoria::create([
            'nombre' => 'Servicios',
            'descripcion' => 'Mira de qué se trata y agenda por WhatsApp.',
            // En bandas a lo ancho, con el video de fondo: un servicio no se
            // elige comparando cuatro tarjetas del mismo tamaño.
            'modo_vitrina' => 'bandas',
            'orden' => 3,
        ]);

        // Los ocho cafés en una sola sección, de mayor a menor puntaje. El
        // PRIMERO es el que la vitrina dibuja en grande, así que va el Geisha:
        // es el lote más difícil de conseguir y el que justifica la barra.
        //
        // Solo ese lleva `destacado`. El sello sirve mientras sea uno: tres
        // productos marcados en la misma grilla es lo mismo que ninguno.
        $this->sembrar($cafes, [
            [
                'nombre' => 'Geisha El Diviso', 'precio_cop' => 145000, 'gramos' => 250, 'stock' => 5,
                'descripcion' => 'El lote más caro que manejo y el más difícil de conseguir. Se toma filtrado, sin leche y sin azúcar, o no tiene sentido pagarlo.',
                'finca' => 'El Diviso', 'productor' => 'Nestor Lasso', 'region' => 'Huila',
                'altitud_msnm' => 1750, 'variedad' => 'Geisha', 'proceso' => 'Fermentación anaeróbica', 'tueste' => 'Claro',
                'notas' => ['bergamota', 'lichi', 'té negro', 'durazno blanco'], 'puntaje_sca' => 90.5, 'destacado' => true,
            ],
            [
                'nombre' => 'Caturra El Paraíso', 'precio_cop' => 68000, 'gramos' => 250, 'stock' => 11,
                'descripcion' => 'Fermentación controlada a temperatura fija durante 48 horas. Un lote que sabe igual todos los meses, que para una barra vale oro.',
                'finca' => 'El Paraíso', 'productor' => 'Wilton Benítez', 'region' => 'Cauca',
                'altitud_msnm' => 1960, 'variedad' => 'Caturra', 'proceso' => 'Fermentación anaeróbica', 'tueste' => 'Claro',
                'notas' => ['manzana verde', 'canela', 'miel'], 'puntaje_sca' => 89.0,
            ],
            [
                'nombre' => 'Bourbon Rosado', 'precio_cop' => 58000, 'gramos' => 340, 'stock' => 14,
                'descripcion' => 'Floral sin volverse perfume. El que más pido para filtrado, y el que mejor convence a quien dice que el café le sabe amargo.',
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
                'nombre' => 'Buenavista Honey', 'precio_cop' => 56000, 'gramos' => 340, 'stock' => 3,
                'descripcion' => 'Secado con el mucílago puesto. Más dulce y más denso que un lavado, sin irse a lo fermentado.',
                'finca' => 'Buenavista', 'productor' => 'Marta Ochoa', 'region' => 'Tolima',
                'altitud_msnm' => 1720, 'variedad' => 'Bourbon Rosado', 'proceso' => 'Honey', 'tueste' => 'Medio',
                'notas' => ['miel de caña', 'ciruela', 'nuez'], 'puntaje_sca' => 87.0,
            ],
            [
                'nombre' => 'El Mirador', 'precio_cop' => 48000, 'gramos' => 340, 'stock' => 22,
                'descripcion' => 'Dulce y redondo, el que le doy a quien nunca ha tomado café de especialidad. Aguanta leche sin desaparecer.',
                'finca' => 'Finca El Mirador', 'productor' => 'Familia Perdomo', 'region' => 'Huila',
                'altitud_msnm' => 1850, 'variedad' => 'Castillo', 'proceso' => 'Lavado', 'tueste' => 'Medio',
                'notas' => ['panela', 'mandarina', 'cacao'], 'puntaje_sca' => 85.5,
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

    /**
     * Las sedes de ejemplo. Direcciones y teléfonos con la FORMA de los reales
     * —nomenclatura colombiana, indicativo del Huila, celular de diez dígitos—
     * pero inventados: como el resto del seeder, sirven para probar el diseño
     * contra datos con el largo que van a tener de verdad. Los de la tienda se
     * cargan desde el panel en /admin.
     */
    private function sembrarSedes(): void
    {
        Sede::create([
            'nombre' => 'Sede Centro',
            'direccion' => 'Calle 8 # 5-42',
            'ciudad' => 'Neiva',
            'barrio' => 'Centro',
            'telefono' => '(608) 871 0234',
            'whatsapp' => '573222248487',
            'horario' => 'Lun a Sáb 7:00 a.m. – 8:00 p.m. · Dom 9:00 a.m. – 2:00 p.m.',
            'principal' => true,
            'orden' => 0,
        ]);

        Sede::create([
            'nombre' => 'Sede Las Ceibas',
            'direccion' => 'Carrera 7 # 34-18',
            'ciudad' => 'Neiva',
            'barrio' => 'Las Ceibas',
            'telefono' => '(608) 871 5590',
            'whatsapp' => '573222248488',
            'horario' => 'Lun a Sáb 8:00 a.m. – 7:00 p.m.',
            'orden' => 1,
        ]);

        Sede::create([
            'nombre' => 'Sede Bogotá',
            'direccion' => 'Carrera 13 # 55-30',
            'ciudad' => 'Bogotá',
            'barrio' => 'Chapinero',
            'telefono' => '(601) 745 8820',
            'whatsapp' => '573222248489',
            'horario' => 'Mar a Dom 9:00 a.m. – 8:00 p.m.',
            'orden' => 2,
        ]);
    }

    /** @param  array<int, array<string, mixed>>  $productos */
    private function sembrar(Categoria $categoria, array $productos): void
    {
        $sedes = Sede::visibles();

        foreach ($productos as $orden => $datos) {
            // El `stock` de la lista de arriba es el TOTAL de la tienda: se
            // reparte entre las sedes y vuelve a la columna como suma. La
            // columna no se escribe a mano en ningún lado, ni siquiera aquí.
            $total = (int) ($datos['stock'] ?? 0);
            unset($datos['stock']);

            $producto = $categoria->productos()->create($datos + [
                'orden' => $orden,
                'activo' => true,
                // Los cafés se venden por bolsa y tres es un buen umbral de
                // "pide más ya".
                'stock' => 0,
                'stock_minimo' => 3,
            ]);

            if ($producto->controla_stock) {
                $this->repartir($producto, $total, $sedes);
            }
        }
    }

    /**
     * Reparte el total entre las sedes sin perder ni inventar una sola bolsa.
     *
     * Va de a una y arrancando en una sede distinta para cada producto: así el
     * catálogo de prueba queda con casos que de verdad hay que saber dibujar
     * —una sede en cero mientras otra tiene tres, un producto agotado en todas—
     * en vez de con la misma cifra repetida en todas partes.
     */
    private function repartir(Producto $producto, int $total, Collection $sedes): void
    {
        if ($sedes->isEmpty()) {
            return;
        }

        $cuantas = $sedes->count();
        $reparto = array_fill(0, $cuantas, 0);
        $inicio = $producto->id % $cuantas;

        for ($i = 0; $i < $total; $i++) {
            $reparto[($inicio + $i) % $cuantas]++;
        }

        foreach ($sedes->values() as $posicion => $sede) {
            $producto->sedes()->attach($sede->id, ['stock' => $reparto[$posicion]]);
        }

        $producto->recalcularTotal();
    }
}
