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
