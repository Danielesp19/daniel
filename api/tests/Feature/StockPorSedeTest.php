<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Producto;
use App\Models\Sede;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Con varias sedes, mover inventario sin decir en cuál es la peor equivocación
 * posible: descuadra dos estantes de una vez y nadie se entera hasta el conteo
 * físico. Estas pruebas fijan que la API no adivine — que pregunte.
 */
class StockPorSedeTest extends TestCase
{
    use RefreshDatabase;

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

    // ── Resolver la sede por su nombre ──────────────────────────────────────
    //
    // El endpoint acepta la sede por id (lo que manda el panel) o por nombre.
    // Lo que se fija acá es la vía del nombre en los casos difíciles: cuando
    // calza con dos y cuando una sede se llama como el principio de otra.

    /** @param array<string, mixed> $datos */
    private function ajustar(array $datos)
    {
        return $this->withToken('token-de-prueba')
            ->patchJson("/api/admin/productos/{$this->producto->id}/stock", $datos);
    }

    public function test_pregunta_de_nuevo_si_el_nombre_calza_con_varias(): void
    {
        Sede::create(['nombre' => 'Sede Centro Norte', 'direccion' => 'Calle 20', 'ciudad' => 'Neiva']);

        $r = $this->ajustar(['accion' => 'sumar', 'cantidad' => 5, 'sede' => 'centro']);

        $r->assertStatus(422);
        $this->assertSame(['Sede Centro', 'Sede Centro Norte'], $r->json('sedes'));
        $this->assertSame(0, $this->producto->fresh()->stock);
    }

    public function test_el_nombre_exacto_gana_sobre_el_que_lo_contiene(): void
    {
        // "Sede Centro" escrito completo no puede quedar ambiguo solo porque
        // exista "Sede Centro Norte": si no, la sede con el nombre más corto
        // se volvería inalcanzable.
        Sede::create(['nombre' => 'Sede Centro Norte', 'direccion' => 'Calle 20', 'ciudad' => 'Neiva']);

        $this->ajustar(['accion' => 'sumar', 'cantidad' => 5, 'sede' => 'Sede Centro'])
            ->assertOk()
            ->assertJsonPath('sede', 'Sede Centro');
    }

    public function test_avisa_cuando_queda_en_cero_en_una_sede_pero_hay_en_otra(): void
    {
        $this->ajustar(['accion' => 'fijar', 'cantidad' => 4, 'sede' => 'Centro']);
        $this->ajustar(['accion' => 'fijar', 'cantidad' => 6, 'sede' => 'Bogotá']);

        $r = $this->ajustar(['accion' => 'fijar', 'cantidad' => 0, 'sede' => 'Centro']);

        // Las dos cifras por separado: es lo que permite decir "en el Centro
        // se acabó, pero quedan seis en Bogotá" en vez de dar por agotado un
        // producto que todavía se puede vender.
        $r->assertOk()
            ->assertJsonPath('agotado_en_sede', true)
            ->assertJsonPath('agotado', false)
            ->assertJsonPath('total', 6);
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
