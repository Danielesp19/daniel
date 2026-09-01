<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Producto;
use App\Models\Sede;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogoApiTest extends TestCase
{
    use RefreshDatabase;

    private Sede $sede;

    /**
     * Una sede única. El inventario se lleva por sede, así que sin al menos una
     * no hay dónde poner las bolsas; con una sola, quien mueve stock no tiene
     * que nombrarla — que es justo el caso de la tienda de un solo local.
     */
    protected function setUp(): void
    {
        parent::setUp();

        $this->sede = Sede::create([
            'nombre' => 'Sede Centro',
            'direccion' => 'Calle 8 # 5-42',
            'ciudad' => 'Neiva',
            'principal' => true,
        ]);
    }

    private function categoria(array $atributos = []): Categoria
    {
        return Categoria::create($atributos + ['nombre' => 'Lotes de temporada', 'orden' => 1]);
    }

    private function producto(Categoria $categoria, array $atributos = []): Producto
    {
        // `stock` no se escribe en la columna: es la suma de las sedes. Se
        // coloca en la sede y la columna queda cuadrada sola.
        $stock = (int) ($atributos['stock'] ?? 10);
        unset($atributos['stock']);

        $producto = $categoria->productos()->create($atributos + [
            'nombre' => 'El Mirador',
            'precio_cop' => 48000,
            'stock_minimo' => 3,
        ]);

        if ($producto->controla_stock) {
            $producto->ajustarStockSede($this->sede, 'fijar', $stock);
        }

        return $producto->fresh();
    }

    private const TOKEN = 'token-de-prueba';

    private function panel()
    {
        config(['tienda.admin_token' => self::TOKEN]);

        return $this->withToken(self::TOKEN);
    }

    public function test_el_catalogo_devuelve_categorias_con_sus_productos(): void
    {
        $categoria = $this->categoria();
        $this->producto($categoria, ['nombre' => 'El Mirador', 'region' => 'Huila', 'altitud_msnm' => 1850]);

        $this->getJson('/api/catalogo')
            ->assertOk()
            ->assertJsonPath('0.nombre', 'Lotes de temporada')
            ->assertJsonPath('0.productos.0.nombre', 'El Mirador')
            ->assertJsonPath('0.productos.0.region', 'Huila')
            ->assertJsonPath('0.productos.0.tiene_ficha', true);
    }

    public function test_un_producto_agotado_se_sigue_mostrando_pero_marcado(): void
    {
        // Agotado no es lo mismo que inactivo: el café sin stock es parte del
        // portafolio y de la historia de la marca, solo no se puede pedir.
        $categoria = $this->categoria();
        $this->producto($categoria, ['stock' => 0]);

        $this->getJson('/api/catalogo')
            ->assertOk()
            ->assertJsonPath('0.productos.0.agotado', true)
            ->assertJsonPath('0.productos.0.stock', 0);
    }

    public function test_un_producto_inactivo_no_aparece(): void
    {
        $categoria = $this->categoria();
        $this->producto($categoria, ['activo' => false]);

        // Sin productos visibles, la categoría entera desaparece: una
        // categoría vacía en el catálogo es solo ruido.
        $this->getJson('/api/catalogo')->assertOk()->assertJsonCount(0);
    }

    public function test_una_categoria_inactiva_no_aparece(): void
    {
        $categoria = $this->categoria(['activa' => false]);
        $this->producto($categoria);

        $this->getJson('/api/catalogo')->assertOk()->assertJsonCount(0);
    }

    public function test_el_stock_en_vivo_no_se_cachea(): void
    {
        $categoria = $this->categoria();
        $producto = $this->producto($categoria, ['stock' => 7]);

        $respuesta = $this->getJson('/api/catalogo/stock')->assertOk();

        $respuesta->assertJsonPath((string) $producto->id, 7);
        // El carrito revalida contra este endpoint justo antes de mandar el
        // pedido; si el CDN lo cachea, la revalidación no sirve de nada.
        // Se busca la directiva, no la cabecera completa: Laravel le añade
        // "private" por su cuenta.
        $this->assertStringContainsString('no-store', $respuesta->headers->get('Cache-Control'));
    }

    public function test_un_servicio_nunca_sale_agotado_aunque_tenga_el_contador_en_cero(): void
    {
        $categoria = $this->categoria();
        $this->producto($categoria, [
            'nombre' => 'Barra para eventos',
            'stock' => 0,
            'controla_stock' => false,
        ]);

        $this->getJson('/api/catalogo')
            ->assertOk()
            ->assertJsonPath('0.productos.0.agotado', false)
            ->assertJsonPath('0.productos.0.por_acabarse', false)
            ->assertJsonPath('0.productos.0.controla_stock', false);
    }

    public function test_los_servicios_no_aparecen_en_el_stock_en_vivo(): void
    {
        $categoria = $this->categoria();
        $cafe = $this->producto($categoria, ['nombre' => 'El Mirador', 'stock' => 7]);
        $servicio = $this->producto($categoria, [
            'nombre' => 'Asesoría',
            'controla_stock' => false,
        ]);

        // El carrito usa este mapa para recortar cantidades. Si un servicio
        // apareciera con stock 0, lo borraría del pedido al enviarlo.
        $respuesta = $this->getJson('/api/catalogo/stock')->assertOk();
        $respuesta->assertJsonPath((string) $cafe->id, 7);
        $respuesta->assertJsonMissingPath((string) $servicio->id);
    }

    public function test_no_se_puede_ajustar_el_stock_de_un_servicio(): void
    {
        config(['tienda.admin_token' => 'token-de-prueba']);
        $servicio = $this->producto($this->categoria(), ['controla_stock' => false]);

        $this->withToken('token-de-prueba')
            ->patchJson("/api/admin/productos/{$servicio->id}/stock", [
                'accion' => 'sumar',
                'cantidad' => 5,
            ])
            ->assertStatus(422);
    }

    public function test_el_resumen_de_inventario_ignora_los_servicios(): void
    {
        config(['tienda.admin_token' => 'token-de-prueba']);
        $categoria = $this->categoria();
        $this->producto($categoria, ['nombre' => 'El Mirador', 'stock' => 4]);
        $this->producto($categoria, ['nombre' => 'Asesoría', 'controla_stock' => false]);

        $this->withToken('token-de-prueba')
            ->getJson('/api/admin/productos/resumen')
            ->assertOk()
            ->assertJsonPath('total_productos', 1)
            ->assertJsonPath('bolsas_en_stock', 4)
            // Sin el filtro, la asesoría saldría listada como agotada.
            ->assertJsonCount(0, 'agotados');
    }

    public function test_la_api_de_administracion_exige_token(): void
    {
        $this->getJson('/api/admin/productos')->assertUnauthorized();
    }

    public function test_con_token_valido_se_puede_ajustar_el_stock(): void
    {
        config(['tienda.admin_token' => 'token-de-prueba']);
        $producto = $this->producto($this->categoria(), ['stock' => 5]);

        $this->withToken('token-de-prueba')
            ->patchJson("/api/admin/productos/{$producto->id}/stock", [
                'accion' => 'sumar',
                'cantidad' => 12,
            ])
            ->assertOk()
            ->assertJsonPath('antes', 5)
            ->assertJsonPath('despues', 17);
    }

    // ── Subcategorías ────────────────────────────────────────────────────────

    public function test_una_subcategoria_viaja_dentro_de_su_seccion(): void
    {
        $artefactos = Categoria::create(['nombre' => 'Artefactos', 'orden' => 0]);
        $basculas = Categoria::create(['nombre' => 'Básculas', 'padre_id' => $artefactos->id, 'orden' => 0]);

        $artefactos->productos()->create(['nombre' => 'Kit para empezar', 'precio_cop' => 1140000]);
        $basculas->productos()->create(['nombre' => 'Báscula con cronómetro', 'precio_cop' => 175000]);

        $r = $this->getJson('/api/catalogo')->assertOk();

        // Una sola sección: la subcategoría NO sale como hermana de su padre.
        $r->assertJsonCount(1)
            ->assertJsonPath('0.nombre', 'Artefactos')
            ->assertJsonCount(1, '0.productos')
            ->assertJsonPath('0.productos.0.nombre', 'Kit para empezar')
            ->assertJsonCount(1, '0.subcategorias')
            ->assertJsonPath('0.subcategorias.0.nombre', 'Básculas')
            ->assertJsonPath('0.subcategorias.0.productos.0.nombre', 'Báscula con cronómetro');
    }

    public function test_una_seccion_sin_productos_propios_sale_si_su_subcategoria_tiene(): void
    {
        $artefactos = Categoria::create(['nombre' => 'Artefactos', 'orden' => 0]);
        $molinos = Categoria::create(['nombre' => 'Molinos', 'padre_id' => $artefactos->id]);
        $molinos->productos()->create(['nombre' => 'Molino C40', 'precio_cop' => 890000]);

        // Vacía de productos propios, pero con un estante lleno adentro: sacarla
        // del catálogo escondería el molino.
        $this->getJson('/api/catalogo')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.nombre', 'Artefactos')
            ->assertJsonCount(0, '0.productos');
    }

    public function test_la_subcategoria_vacia_no_deja_un_titulo_suelto(): void
    {
        $artefactos = Categoria::create(['nombre' => 'Artefactos', 'orden' => 0]);
        $artefactos->productos()->create(['nombre' => 'Kit', 'precio_cop' => 100000]);
        Categoria::create(['nombre' => 'Jarras', 'padre_id' => $artefactos->id]);

        $this->getJson('/api/catalogo')
            ->assertOk()
            ->assertJsonCount(0, '0.subcategorias');
    }

    public function test_la_jerarquia_es_de_un_solo_nivel(): void
    {
        $artefactos = Categoria::create(['nombre' => 'Artefactos']);
        $basculas = Categoria::create(['nombre' => 'Básculas', 'padre_id' => $artefactos->id]);

        // Colgar de una subcategoría sería un tercer nivel: se rechaza con una
        // explicación, no con un 422 pelado.
        $this->panel()
            ->postJson('/api/admin/categorias', ['nombre' => 'De cocina', 'padre_id' => $basculas->id])
            ->assertStatus(422)
            ->assertJsonPath('error', '«Básculas» ya es una subcategoría. Las subcategorías solo cuelgan de una sección.');
    }

    public function test_no_se_borra_una_seccion_con_subcategorias_adentro(): void
    {
        $artefactos = Categoria::create(['nombre' => 'Artefactos']);
        Categoria::create(['nombre' => 'Molinos', 'padre_id' => $artefactos->id]);

        $this->panel()
            ->deleteJson("/api/admin/categorias/{$artefactos->id}")
            ->assertStatus(422);

        $this->assertDatabaseHas('categorias', ['id' => $artefactos->id]);
    }

    public function test_la_sede_no_publica_telefono(): void
    {
        Sede::create(['nombre' => 'Sede Centro', 'direccion' => 'Calle 5 #4-32', 'ciudad' => 'Pitalito', 'telefono' => '(608) 871 0234']);

        // El contacto es uno solo, el de Daniel: tres números distintos hacían
        // que el pedido llegara al lugar equivocado.
        $r = $this->getJson('/api/catalogo/sedes')->assertOk();

        $this->assertArrayNotHasKey('telefono', $r->json('0'));
        $this->assertArrayNotHasKey('whatsapp', $r->json('0'));
    }
}
