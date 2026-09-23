<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Producto;
use App\Models\Sede;
use App\Support\Chatbot\ColaDeFotos;
use App\Support\Chatbot\Herramientas;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Armar un kit por chat.
 *
 * Es el flujo más largo que el bot puede hacer —crear el producto, nombrarle
 * las piezas, engancharle una foto a cada una— y el que más maneras tiene de
 * salir mal: una foto puesta en la pieza equivocada no se nota hasta que un
 * cliente abre la página.
 *
 * Lo que se prueba acá es sobre todo que el bot NO adivine cuando no puede
 * saber: con varias fotos esperando tiene que preguntar, no elegir.
 */
class KitsPorChatTest extends TestCase
{
    use RefreshDatabase;

    private const ADMIN = '573222248487';

    private Categoria $categoria;

    protected function setUp(): void
    {
        parent::setUp();

        Sede::create([
            'nombre' => 'Sede Centro',
            'direccion' => 'Calle 8 # 5-42',
            'ciudad' => 'Neiva',
            'principal' => true,
        ]);

        $this->categoria = Categoria::create(['nombre' => 'Kits', 'orden' => 1]);
    }

    private function kit(array $extra = []): array
    {
        return Herramientas::ejecutar('crear_kit', $extra + [
            'categoria_id' => $this->categoria->id,
            'nombre' => 'Kit V60 para empezar',
            'precio_cop' => 180000,
            'piezas' => ['filtros de papel', 'cuchara medidora'],
        ], self::ADMIN);
    }

    // ── Crear ───────────────────────────────────────────────────────────────

    public function test_crea_el_kit_con_sus_piezas(): void
    {
        $r = $this->kit();

        $this->assertTrue($r['ok']);

        $kit = Producto::firstWhere('nombre', 'Kit V60 para empezar');
        $this->assertTrue($kit->es_kit);
        $this->assertSame(180000, $kit->precio_cop);
        $this->assertSame(
            ['filtros de papel', 'cuchara medidora'],
            $kit->piezas()->pluck('nombre')->all(),
            'las piezas conservan el orden en que las dictó el admin',
        );
    }

    public function test_un_kit_puede_traer_productos_del_catalogo_como_componentes(): void
    {
        $prensa = $this->categoria->productos()->create([
            'nombre' => 'Prensa francesa',
            'precio_cop' => 90000,
        ]);

        $this->kit(['componentes' => [$prensa->id]]);

        $kit = Producto::firstWhere('nombre', 'Kit V60 para empezar');
        $this->assertSame(['Prensa francesa'], $kit->componentes()->pluck('nombre')->all());
    }

    public function test_no_acepta_un_componente_que_no_existe(): void
    {
        // El modelo inventando un id es la forma más fácil de dejar un kit
        // apuntando a la nada. Se rechaza entero en vez de crearlo a medias.
        $r = $this->kit(['componentes' => [9999]]);

        $this->assertArrayHasKey('error', $r);
        $this->assertNull(Producto::firstWhere('nombre', 'Kit V60 para empezar'));
    }

    public function test_un_kit_sin_nada_adentro_se_rechaza(): void
    {
        // Sin piezas ni componentes es un producto normal, y crearlo como kit
        // le pinta al cliente una ficha de "qué trae" que sale vacía.
        $r = Herramientas::ejecutar('crear_kit', [
            'categoria_id' => $this->categoria->id,
            'nombre' => 'Kit vacío',
            'precio_cop' => 50000,
        ], self::ADMIN);

        $this->assertArrayHasKey('error', $r);
    }

    public function test_el_stock_inicial_del_kit_queda_en_la_sede(): void
    {
        $this->kit(['stock' => 4]);

        $kit = Producto::firstWhere('nombre', 'Kit V60 para empezar');
        // El total del producto es la suma de las sedes: si se escribiera
        // directo, quedaría un total sin bolsas detrás que lo respalden.
        $this->assertSame(4, $kit->stock);
        $this->assertSame(4, (int) $kit->sedes()->sum('producto_sede.stock'));
    }

    // ── Editar piezas ───────────────────────────────────────────────────────

    public function test_agrega_una_pieza_a_un_kit_que_ya_existe(): void
    {
        $this->kit();
        $kit = Producto::firstWhere('nombre', 'Kit V60 para empezar');

        $r = Herramientas::ejecutar('editar_piezas_kit', [
            'producto_id' => $kit->id,
            'accion' => 'agregar',
            'piezas' => ['bolsa de muestra'],
        ], self::ADMIN);

        $this->assertTrue($r['ok']);
        $this->assertContains('bolsa de muestra', $kit->fresh()->piezas()->pluck('nombre')->all());
    }

    public function test_renombrar_una_pieza_le_conserva_la_foto(): void
    {
        Storage::fake('public');
        $this->kit();
        $kit = Producto::firstWhere('nombre', 'Kit V60 para empezar');
        $kit->piezas()->first()->update(['imagen' => 'productos/filtros.webp']);

        Herramientas::ejecutar('editar_piezas_kit', [
            'producto_id' => $kit->id,
            'accion' => 'renombrar',
            'pieza' => 'filtros',
            'nombre_nuevo' => 'filtros de papel #02',
        ], self::ADMIN);

        $pieza = $kit->fresh()->piezas()->first();
        $this->assertSame('filtros de papel #02', $pieza->nombre);
        // Corregir cómo se llama algo no puede costar volver a mandar la foto.
        $this->assertSame('productos/filtros.webp', $pieza->imagen);
    }

    public function test_quitar_una_pieza_se_lleva_su_foto_del_disco(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('productos/filtros.webp', 'x');
        $this->kit();
        $kit = Producto::firstWhere('nombre', 'Kit V60 para empezar');
        $kit->piezas()->first()->update(['imagen' => 'productos/filtros.webp']);

        Herramientas::ejecutar('editar_piezas_kit', [
            'producto_id' => $kit->id,
            'accion' => 'quitar',
            'pieza' => 'filtros',
        ], self::ADMIN);

        $this->assertSame(['cuchara medidora'], $kit->fresh()->piezas()->pluck('nombre')->all());
        Storage::disk('public')->assertMissing('productos/filtros.webp');
    }

    public function test_un_nombre_de_pieza_ambiguo_hace_preguntar_en_vez_de_borrar(): void
    {
        // "filtro" calza con dos. Elegir una sería borrar la equivocada, y
        // eso no tiene deshacer.
        Herramientas::ejecutar('crear_kit', [
            'categoria_id' => $this->categoria->id,
            'nombre' => 'Kit dudoso',
            'precio_cop' => 100000,
            'piezas' => ['filtro de papel', 'filtro de tela'],
        ], self::ADMIN);
        $kit = Producto::firstWhere('nombre', 'Kit dudoso');

        $r = Herramientas::ejecutar('editar_piezas_kit', [
            'producto_id' => $kit->id,
            'accion' => 'quitar',
            'pieza' => 'filtro',
        ], self::ADMIN);

        $this->assertArrayHasKey('error', $r);
        $this->assertCount(2, $kit->fresh()->piezas, 'no debió borrar ninguna');
        $this->assertCount(2, $r['piezas'], 'le dice al modelo cuáles calzaron para que pregunte');
    }

    // ── Fotos en cola ───────────────────────────────────────────────────────

    public function test_con_varias_fotos_esperando_no_adivina_cual(): void
    {
        Storage::fake('public');
        $this->kit();
        $kit = Producto::firstWhere('nombre', 'Kit V60 para empezar');
        ColaDeFotos::agregar(self::ADMIN, 'productos/una.webp');
        ColaDeFotos::agregar(self::ADMIN, 'productos/dos.webp');

        $r = Herramientas::ejecutar('asignar_foto', ['producto_id' => $kit->id], self::ADMIN);

        $this->assertArrayHasKey('error', $r);
        $this->assertSame(2, $r['fotos_en_espera']);
        // Y ninguna se consumió: el admin no tiene que reenviarlas.
        $this->assertSame(2, ColaDeFotos::cuantas(self::ADMIN));
    }

    public function test_la_foto_se_elige_por_su_numero_de_llegada(): void
    {
        Storage::fake('public');
        $this->kit();
        $kit = Producto::firstWhere('nombre', 'Kit V60 para empezar');
        ColaDeFotos::agregar(self::ADMIN, 'productos/una.webp');
        ColaDeFotos::agregar(self::ADMIN, 'productos/dos.webp');

        $r = Herramientas::ejecutar('asignar_foto', [
            'producto_id' => $kit->id,
            'numero_foto' => 2,
        ], self::ADMIN);

        $this->assertTrue($r['ok']);
        $this->assertSame('productos/dos.webp', $kit->fresh()->portada()?->ruta);
        // La otra sigue esperando su turno.
        $this->assertSame(1, ColaDeFotos::cuantas(self::ADMIN));
    }

    public function test_una_foto_puede_ir_a_una_pieza_del_kit(): void
    {
        Storage::fake('public');
        $this->kit();
        $kit = Producto::firstWhere('nombre', 'Kit V60 para empezar');
        ColaDeFotos::agregar(self::ADMIN, 'productos/filtros.webp');

        $r = Herramientas::ejecutar('asignar_foto', [
            'producto_id' => $kit->id,
            'pieza' => 'filtros',
        ], self::ADMIN);

        $this->assertTrue($r['ok']);
        $this->assertSame('productos/filtros.webp', $kit->fresh()->piezas()->first()->imagen);
        // Y no se le puso al kit como portada por error.
        $this->assertNull($kit->fresh()->portada());
    }

    public function test_una_pieza_que_no_existe_no_consume_la_foto(): void
    {
        // Si el nombre está mal, el admin no tiene por qué reenviar la imagen.
        Storage::fake('public');
        $this->kit();
        $kit = Producto::firstWhere('nombre', 'Kit V60 para empezar');
        ColaDeFotos::agregar(self::ADMIN, 'productos/algo.webp');

        $r = Herramientas::ejecutar('asignar_foto', [
            'producto_id' => $kit->id,
            'pieza' => 'termómetro',
        ], self::ADMIN);

        $this->assertArrayHasKey('error', $r);
        $this->assertSame(1, ColaDeFotos::cuantas(self::ADMIN));
    }

    public function test_modo_agregar_suma_a_la_galeria_sin_quitar_la_portada(): void
    {
        Storage::fake('public');
        $this->kit();
        $kit = Producto::firstWhere('nombre', 'Kit V60 para empezar');
        $kit->medios()->create(['tipo' => 'imagen', 'ruta' => 'productos/portada.webp', 'orden' => 0]);
        ColaDeFotos::agregar(self::ADMIN, 'productos/otra.webp');

        Herramientas::ejecutar('asignar_foto', [
            'producto_id' => $kit->id,
            'modo' => 'agregar',
        ], self::ADMIN);

        $this->assertSame('productos/portada.webp', $kit->fresh()->portada()?->ruta);
        $this->assertCount(2, $kit->fresh()->medios);
    }

    public function test_la_cola_de_fotos_de_un_numero_no_le_sirve_a_otro(): void
    {
        Storage::fake('public');
        $this->kit();
        $kit = Producto::firstWhere('nombre', 'Kit V60 para empezar');
        ColaDeFotos::agregar(self::ADMIN, 'productos/una.webp');

        $r = Herramientas::ejecutar('asignar_foto', ['producto_id' => $kit->id], '573009998877');

        $this->assertArrayHasKey('error', $r);
    }
}
