<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Producto;
use App\Models\Sede;
use App\Support\Chatbot\Herramientas;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Con varias sedes, mover inventario sin decir en cuál es la peor equivocación
 * posible: descuadra dos estantes de una vez y nadie se entera hasta el conteo
 * físico. Estas pruebas fijan que ni el chatbot ni la API adivinen — que
 * pregunten.
 */
class StockPorSedeTest extends TestCase
{
    use RefreshDatabase;

    private const ADMIN = '573222248487';

    private Producto $producto;

    protected function setUp(): void
    {
        parent::setUp();

        config(['tienda.admin_token' => 'token-de-prueba']);

        Sede::create([
            'nombre' => 'Sede Centro',
            'direccion' => 'Calle 8 # 5-42',
            'ciudad' => 'Neiva',
            'principal' => true,
            'orden' => 0,
        ]);

        Sede::create([
            'nombre' => 'Sede Bogotá',
            'direccion' => 'Carrera 13 # 55-30',
            'ciudad' => 'Bogotá',
            'orden' => 1,
        ]);

        $categoria = Categoria::create(['nombre' => 'Café en grano', 'orden' => 1]);
        $this->producto = $categoria->productos()->create([
            'nombre' => 'El Mirador',
            'precio_cop' => 48000,
            'stock_minimo' => 3,
        ]);
    }

    // ── El chatbot ───────────────────────────────────────────────────────────

    public function test_el_chatbot_no_mueve_stock_sin_saber_la_sede(): void
    {
        $r = Herramientas::ejecutar('ajustar_stock', [
            'producto_id' => $this->producto->id,
            'accion' => 'sumar',
            'cantidad' => 12,
        ], self::ADMIN);

        $this->assertArrayHasKey('error', $r);
        // Le devuelve los nombres para que pueda preguntar con opciones en vez
        // de un "¿en cuál sede?" a secas.
        $this->assertSame(['Sede Centro', 'Sede Bogotá'], $r['sedes']);
        $this->assertSame(0, $this->producto->fresh()->stock, 'no debió moverse ni una bolsa');
    }

    public function test_el_chatbot_ubica_la_sede_por_un_nombre_parcial(): void
    {
        $r = Herramientas::ejecutar('ajustar_stock', [
            'producto_id' => $this->producto->id,
            'accion' => 'sumar',
            'cantidad' => 12,
            'sede' => 'bogotá',
        ], self::ADMIN);

        $this->assertTrue($r['ok']);
        $this->assertSame('Sede Bogotá', $r['sede']);
        $this->assertSame(12, $r['stock_despues']);
    }

    public function test_el_chatbot_pregunta_de_nuevo_si_el_nombre_calza_con_varias(): void
    {
        Sede::create(['nombre' => 'Sede Centro Norte', 'direccion' => 'Calle 20', 'ciudad' => 'Neiva']);

        $r = Herramientas::ejecutar('ajustar_stock', [
            'producto_id' => $this->producto->id,
            'accion' => 'sumar',
            'cantidad' => 5,
            'sede' => 'centro',
        ], self::ADMIN);

        $this->assertArrayHasKey('error', $r);
        $this->assertSame(['Sede Centro', 'Sede Centro Norte'], $r['sedes']);
        $this->assertSame(0, $this->producto->fresh()->stock);
    }

    public function test_el_nombre_exacto_gana_sobre_el_que_lo_contiene(): void
    {
        // "Sede Centro" escrito completo no puede quedar ambiguo solo porque
        // exista "Sede Centro Norte": si no, la sede con el nombre más corto
        // se volvería inalcanzable.
        Sede::create(['nombre' => 'Sede Centro Norte', 'direccion' => 'Calle 20', 'ciudad' => 'Neiva']);

        $r = Herramientas::ejecutar('ajustar_stock', [
            'producto_id' => $this->producto->id,
            'accion' => 'sumar',
            'cantidad' => 5,
            'sede' => 'Sede Centro',
        ], self::ADMIN);

        $this->assertTrue($r['ok']);
        $this->assertSame('Sede Centro', $r['sede']);
    }

    public function test_el_chatbot_avisa_cuando_queda_en_cero_en_una_sede_pero_hay_en_otra(): void
    {
        Herramientas::ejecutar('ajustar_stock', [
            'producto_id' => $this->producto->id, 'accion' => 'fijar', 'cantidad' => 4, 'sede' => 'Centro',
        ], self::ADMIN);
        Herramientas::ejecutar('ajustar_stock', [
            'producto_id' => $this->producto->id, 'accion' => 'fijar', 'cantidad' => 6, 'sede' => 'Bogotá',
        ], self::ADMIN);

        $r = Herramientas::ejecutar('ajustar_stock', [
            'producto_id' => $this->producto->id, 'accion' => 'fijar', 'cantidad' => 0, 'sede' => 'Centro',
        ], self::ADMIN);

        // Las dos cifras por separado: es lo que le permite responder "en el
        // Centro se acabó, pero quedan seis en Bogotá" en vez de decir que el
        // producto se agotó cuando todavía se puede vender.
        $this->assertTrue($r['quedo_agotado_en_sede']);
        $this->assertFalse($r['quedo_agotado']);
        $this->assertSame(6, $r['stock_total']);
    }

    public function test_crear_un_producto_con_stock_inicial_exige_decir_la_sede(): void
    {
        $categoria = Categoria::first();

        $r = Herramientas::ejecutar('crear_producto', [
            'categoria_id' => $categoria->id,
            'nombre' => 'Bourbon Rosado',
            'precio_cop' => 58000,
            'stock' => 12,
        ], self::ADMIN);

        $this->assertArrayHasKey('error', $r);
        // No se crea a medias: si hubiera quedado creado, el reintento del
        // modelo lo duplicaría.
        $this->assertNull(Producto::where('nombre', 'Bourbon Rosado')->first());
    }

    // ── La API de administración ─────────────────────────────────────────────

    public function test_la_api_rechaza_el_ajuste_sin_sede_y_devuelve_las_opciones(): void
    {
        $this->withToken('token-de-prueba')
            ->patchJson("/api/admin/productos/{$this->producto->id}/stock", [
                'accion' => 'sumar',
                'cantidad' => 12,
            ])
            ->assertStatus(422)
            ->assertJsonPath('necesita_sede', true)
            ->assertJsonPath('sedes', ['Sede Centro', 'Sede Bogotá']);
    }

    public function test_la_api_ajusta_cuando_se_nombra_la_sede(): void
    {
        $this->withToken('token-de-prueba')
            ->patchJson("/api/admin/productos/{$this->producto->id}/stock", [
                'accion' => 'sumar',
                'cantidad' => 12,
                'sede' => 'Bogotá',
            ])
            ->assertOk()
            ->assertJsonPath('sede', 'Sede Bogotá')
            ->assertJsonPath('despues', 12)
            ->assertJsonPath('total', 12);
    }

    public function test_la_api_no_deja_escribir_el_total_a_mano(): void
    {
        $this->withToken('token-de-prueba')
            ->patchJson("/api/admin/productos/{$this->producto->id}", ['stock' => 999])
            ->assertOk();

        // El campo se ignora en silencio porque la columna es una suma: dejar
        // pasar un 999 sin bolsas detrás rompería el desglose de las sedes.
        $this->assertSame(0, $this->producto->fresh()->stock);
    }

    // ── El catálogo público ──────────────────────────────────────────────────

    public function test_el_catalogo_publica_las_sedes_con_su_direccion_pero_sin_inventario(): void
    {
        // El cliente necesita saber a qué local ir; cuántas unidades hay en
        // cada uno es información del negocio. Antes esto viajaba en el JSON
        // público y quedaba a la vista de cualquiera —competencia incluida—.
        $this->producto->ajustarStockSede(Sede::where('nombre', 'Sede Bogotá')->first(), 'fijar', 6);

        $r = $this->getJson('/api/catalogo')->assertOk();

        $r->assertJsonPath('0.productos.0.sedes.0.nombre', 'Sede Centro')
            ->assertJsonPath('0.productos.0.sedes.1.nombre', 'Sede Bogotá')
            ->assertJsonPath('0.productos.0.sedes.1.direccion', 'Carrera 13 # 55-30')
            ->assertJsonPath('0.productos.0.sedes.1.ciudad', 'Bogotá');

        // Ni el total ni el desglose por sede.
        $r->assertJsonMissingPath('0.productos.0.stock')
            ->assertJsonMissingPath('0.productos.0.sedes.0.stock')
            ->assertJsonMissingPath('0.productos.0.sedes.1.stock')
            ->assertJsonMissingPath('0.productos.0.sedes.1.agotado');

        // Y por si algún día alguien reintroduce el número con otro nombre:
        // el 6 no puede aparecer por ningún lado del payload público.
        $this->assertStringNotContainsString('"stock"', $r->getContent());
    }

    public function test_un_servicio_no_lleva_desglose_de_sedes(): void
    {
        Categoria::first()->productos()->create([
            'nombre' => 'Asesoría para tu barra',
            'precio_cop' => 280000,
            'controla_stock' => false,
        ]);

        $this->getJson('/api/catalogo')
            ->assertOk()
            // Una lista de sedes en cero debajo de una asesoría se leería como
            // que está agotada en todas partes.
            ->assertJsonPath('0.productos.1.sedes', []);
    }

    public function test_las_sedes_inactivas_no_salen_en_el_catalogo(): void
    {
        Sede::where('nombre', 'Sede Bogotá')->update(['activa' => false]);

        $respuesta = $this->getJson('/api/catalogo')->assertOk();

        $this->assertCount(1, $respuesta->json('0.productos.0.sedes'));
    }
}
