<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Producto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogoApiTest extends TestCase
{
    use RefreshDatabase;

    private function categoria(array $atributos = []): Categoria
    {
        return Categoria::create($atributos + ['nombre' => 'Lotes de temporada', 'orden' => 1]);
    }

    private function producto(Categoria $categoria, array $atributos = []): Producto
    {
        return $categoria->productos()->create($atributos + [
            'nombre' => 'El Mirador',
            'precio_cop' => 48000,
            'stock' => 10,
            'stock_minimo' => 3,
        ]);
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
}
