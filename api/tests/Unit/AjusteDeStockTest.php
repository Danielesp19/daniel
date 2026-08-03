<?php

namespace Tests\Unit;

use App\Models\Categoria;
use App\Models\Producto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * El ajuste de stock es donde está la plata: si "llegaron 12" se interpreta
 * como "quedan 12", el inventario queda descuadrado y alguien vende algo que
 * no tiene. Estas pruebas fijan las tres acciones y el piso en cero.
 */
class AjusteDeStockTest extends TestCase
{
    use RefreshDatabase;

    private function producto(int $stock): Producto
    {
        $categoria = Categoria::create(['nombre' => 'Lotes', 'orden' => 1]);

        return $categoria->productos()->create([
            'nombre' => 'El Mirador',
            'precio_cop' => 48000,
            'stock' => $stock,
            'stock_minimo' => 3,
        ]);
    }

    public function test_sumar_agrega_sobre_lo_que_habia(): void
    {
        $producto = $this->producto(10);

        [$antes, $despues] = $producto->ajustarStock('sumar', 12);

        $this->assertSame(10, $antes);
        $this->assertSame(22, $despues);
        $this->assertSame(22, $producto->fresh()->stock);
    }

    public function test_restar_descuenta_de_lo_que_habia(): void
    {
        $producto = $this->producto(10);

        [, $despues] = $producto->ajustarStock('restar', 4);

        $this->assertSame(6, $despues);
    }

    public function test_fijar_reemplaza_el_valor_en_vez_de_acumular(): void
    {
        $producto = $this->producto(10);

        [, $despues] = $producto->ajustarStock('fijar', 3);

        $this->assertSame(3, $despues);
    }

    public function test_restar_de_mas_deja_el_stock_en_cero_y_no_en_negativo(): void
    {
        $producto = $this->producto(2);

        [, $despues] = $producto->ajustarStock('restar', 50);

        $this->assertSame(0, $despues);
        $this->assertTrue($producto->fresh()->agotado());
    }

    public function test_una_accion_desconocida_revienta_en_vez_de_adivinar(): void
    {
        $producto = $this->producto(5);

        $this->expectException(\InvalidArgumentException::class);
        $producto->ajustarStock('duplicar', 2);
    }

    public function test_por_acabarse_solo_aplica_con_stock_positivo(): void
    {
        $producto = $this->producto(3);
        $this->assertTrue($producto->porAcabarse(), 'con 3 y umbral 3 debería avisar');

        $producto->ajustarStock('fijar', 0);
        $producto = $producto->fresh();

        // Agotado y "por acabarse" son estados distintos: si los dos fueran
        // ciertos a la vez, el catálogo pintaría dos sellos encima del mismo
        // producto.
        $this->assertTrue($producto->agotado());
        $this->assertFalse($producto->porAcabarse());
    }
}
