<?php

namespace Tests\Unit;

use App\Models\Categoria;
use App\Models\Producto;
use App\Models\Sede;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * El ajuste de stock es donde está la plata: si "llegaron 12" se interpreta
 * como "quedan 12", el inventario queda descuadrado y alguien vende algo que
 * no tiene. Estas pruebas fijan las tres acciones, el piso en cero, y el
 * invariante que sostiene todo lo demás desde que hay sedes: `productos.stock`
 * es SIEMPRE la suma de las sedes.
 */
class AjusteDeStockTest extends TestCase
{
    use RefreshDatabase;

    private Sede $centro;

    private Sede $norte;

    protected function setUp(): void
    {
        parent::setUp();

        $this->centro = Sede::create([
            'nombre' => 'Sede Centro',
            'direccion' => 'Calle 8 # 5-42',
            'ciudad' => 'Neiva',
            'principal' => true,
            'orden' => 0,
        ]);

        $this->norte = Sede::create([
            'nombre' => 'Sede Norte',
            'direccion' => 'Carrera 7 # 34-18',
            'ciudad' => 'Neiva',
            'orden' => 1,
        ]);
    }

    /** Un producto con `$stock` bolsas puestas en la sede del Centro. */
    private function producto(int $stock, ?Sede $sede = null): Producto
    {
        $categoria = Categoria::firstOrCreate(['nombre' => 'Lotes'], ['orden' => 1]);

        $producto = $categoria->productos()->create([
            'nombre' => 'El Mirador '.uniqid(),
            'precio_cop' => 48000,
            'stock_minimo' => 3,
        ]);

        $producto->ajustarStockSede($sede ?? $this->centro, 'fijar', $stock);

        return $producto->fresh();
    }

    public function test_sumar_agrega_sobre_lo_que_habia(): void
    {
        $producto = $this->producto(10);

        [$antes, $despues] = $producto->ajustarStockSede($this->centro, 'sumar', 12);

        $this->assertSame(10, $antes);
        $this->assertSame(22, $despues);
        $this->assertSame(22, $producto->fresh()->stock);
    }

    public function test_restar_descuenta_de_lo_que_habia(): void
    {
        $producto = $this->producto(10);

        [, $despues] = $producto->ajustarStockSede($this->centro, 'restar', 4);

        $this->assertSame(6, $despues);
    }

    public function test_fijar_reemplaza_el_valor_en_vez_de_acumular(): void
    {
        $producto = $this->producto(10);

        [, $despues] = $producto->ajustarStockSede($this->centro, 'fijar', 3);

        $this->assertSame(3, $despues);
    }

    public function test_restar_de_mas_deja_el_stock_en_cero_y_no_en_negativo(): void
    {
        $producto = $this->producto(2);

        [, $despues] = $producto->ajustarStockSede($this->centro, 'restar', 50);

        $this->assertSame(0, $despues);
        $this->assertTrue($producto->fresh()->agotado());
    }

    public function test_una_accion_desconocida_revienta_en_vez_de_adivinar(): void
    {
        $producto = $this->producto(5);

        $this->expectException(\InvalidArgumentException::class);
        $producto->ajustarStockSede($this->centro, 'duplicar', 2);
    }

    public function test_por_acabarse_solo_aplica_con_stock_positivo(): void
    {
        $producto = $this->producto(3);
        $this->assertTrue($producto->porAcabarse(), 'con 3 y umbral 3 debería avisar');

        $producto->ajustarStockSede($this->centro, 'fijar', 0);
        $producto = $producto->fresh();

        // Agotado y "por acabarse" son estados distintos: si los dos fueran
        // ciertos a la vez, el catálogo pintaría dos sellos encima del mismo
        // producto.
        $this->assertTrue($producto->agotado());
        $this->assertFalse($producto->porAcabarse());
    }

    // ── El invariante del total ──────────────────────────────────────────────

    public function test_el_total_es_la_suma_de_las_sedes(): void
    {
        $producto = $this->producto(4);
        $producto->ajustarStockSede($this->norte, 'fijar', 6);

        $this->assertSame(10, $producto->fresh()->stock);
    }

    public function test_mover_una_sede_no_toca_las_otras(): void
    {
        $producto = $this->producto(4);
        $producto->ajustarStockSede($this->norte, 'fijar', 6);

        $producto->ajustarStockSede($this->centro, 'restar', 4);

        $disponibilidad = $producto->fresh()->disponibilidad()->keyBy(fn ($f) => $f['sede']->nombre);
        $this->assertSame(0, $disponibilidad['Sede Centro']['stock']);
        $this->assertSame(6, $disponibilidad['Sede Norte']['stock'], 'la otra sede no debía moverse');
        $this->assertSame(6, $producto->fresh()->stock);
    }

    public function test_agotado_en_una_sede_no_es_agotado_en_la_tienda(): void
    {
        $producto = $this->producto(4);
        $producto->ajustarStockSede($this->norte, 'fijar', 6);

        $producto->ajustarStockSede($this->centro, 'fijar', 0);
        $producto = $producto->fresh();

        // Es el caso que más importa: el cliente todavía puede comprarlo, solo
        // que no en esa sede. Si esto se rompe, el catálogo pinta AGOTADO sobre
        // algo que sí hay y se pierde la venta.
        $this->assertFalse($producto->agotado());
        $this->assertSame(6, $producto->stock);
    }

    public function test_solo_esta_agotado_cuando_todas_las_sedes_estan_en_cero(): void
    {
        $producto = $this->producto(4);
        $producto->ajustarStockSede($this->norte, 'fijar', 6);

        $producto->ajustarStockSede($this->centro, 'fijar', 0);
        $producto->ajustarStockSede($this->norte, 'fijar', 0);

        $this->assertTrue($producto->fresh()->agotado());
    }

    public function test_la_disponibilidad_incluye_las_sedes_sin_surtir_en_cero(): void
    {
        // Solo se surtió el Centro: el Norte nunca recibió una fila en el
        // pivote, y aun así tiene que aparecer para que el cliente sepa que
        // ahí no hay.
        $producto = $this->producto(4);

        $disponibilidad = $producto->disponibilidad();

        $this->assertCount(2, $disponibilidad);
        $this->assertSame(0, $disponibilidad->firstWhere('sede.nombre', 'Sede Norte')['stock']);
    }

    public function test_recalcular_corrige_un_total_desincronizado(): void
    {
        $producto = $this->producto(4);

        // Alguien escribió la columna por fuera del modelo — justo lo que el
        // recálculo tiene que poder enderezar.
        $producto->update(['stock' => 999]);

        $this->assertSame(4, $producto->fresh()->recalcularTotal());
    }
}
