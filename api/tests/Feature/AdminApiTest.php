<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Producto;
use App\Models\Sede;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * La API de administración ES el panel: desde que no hay Filament, esta es la
 * única forma de tocar el catálogo desde el navegador. Si algo de aquí se
 * rompe, la tienda se queda sin quien la administre.
 */
class AdminApiTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = 'token-de-prueba';

    private Categoria $categoria;

    protected function setUp(): void
    {
        parent::setUp();

        config(['tienda.admin_token' => self::TOKEN]);

        Sede::create([
            'nombre' => 'Sede Centro',
            'direccion' => 'Calle 8 # 5-42',
            'ciudad' => 'Neiva',
            'principal' => true,
        ]);

        $this->categoria = Categoria::create(['nombre' => 'Cafés', 'orden' => 1]);
    }

    /** Petición autenticada como el panel. */
    private function panel()
    {
        return $this->withToken(self::TOKEN);
    }

    // ── Puerta de entrada ────────────────────────────────────────────────────

    public function test_sin_token_no_se_puede_tocar_nada(): void
    {
        $this->getJson('/api/admin/categorias')->assertUnauthorized();
        $this->postJson('/api/admin/productos', [])->assertUnauthorized();
        $this->deleteJson("/api/admin/categorias/{$this->categoria->id}")->assertUnauthorized();
    }

    // ── Productos ────────────────────────────────────────────────────────────

    public function test_crea_un_producto(): void
    {
        $this->panel()
            ->postJson('/api/admin/productos', [
                'categoria_id' => $this->categoria->id,
                'nombre' => 'Bourbon Rosado',
                'precio_cop' => 58000,
                'notas' => ['panela', 'mandarina'],
            ])
            ->assertCreated()
            ->assertJsonPath('nombre', 'Bourbon Rosado')
            // Nace en cero: las unidades entran después, por sede.
            ->assertJsonPath('stock', 0);

        $this->assertSame('bourbon-rosado', Producto::first()->slug);
    }

    public function test_dos_productos_con_el_mismo_nombre_no_chocan(): void
    {
        // Pasa de verdad: el mismo café en dos presentaciones, o un nombre
        // repetido en secciones distintas. Antes el segundo reventaba contra el
        // índice único con un mensaje que no decía qué estaba repetido.
        foreach ([1, 2] as $_) {
            $this->panel()
                ->postJson('/api/admin/productos', [
                    'categoria_id' => $this->categoria->id,
                    'nombre' => 'El Mirador',
                    'precio_cop' => 48000,
                ])
                ->assertCreated();
        }

        $this->assertSame(
            ['el-mirador', 'el-mirador-2'],
            Producto::orderBy('id')->pluck('slug')->all(),
        );
    }

    public function test_el_stock_no_se_puede_escribir_a_mano(): void
    {
        $producto = $this->categoria->productos()->create(['nombre' => 'El Mirador', 'precio_cop' => 48000]);

        $this->panel()
            ->patchJson("/api/admin/productos/{$producto->id}", ['stock' => 999, 'precio_cop' => 50000])
            ->assertOk();

        // El precio sí cambió; el stock se ignoró porque es la suma de las
        // sedes y escribirlo descuadraría el desglose.
        $producto->refresh();
        $this->assertSame(50000, $producto->precio_cop);
        $this->assertSame(0, $producto->stock);
    }

    public function test_borrar_un_producto_se_lleva_sus_archivos(): void
    {
        Storage::fake('public');

        $respuesta = $this->panel()->post('/api/admin/productos', [
            'categoria_id' => $this->categoria->id,
            'nombre' => 'Con foto',
            'precio_cop' => 10000,
            'imagen' => UploadedFile::fake()->image('foto.jpg', 900, 900),
        ])->assertCreated();

        $ruta = Producto::first()->imagen;
        $this->assertNotNull($ruta, 'la foto debió guardarse');
        Storage::disk('public')->assertExists($ruta);

        $this->panel()->deleteJson('/api/admin/productos/'.$respuesta->json('id'))->assertNoContent();

        Storage::disk('public')->assertMissing($ruta);
        $this->assertSame(0, Producto::count());
    }

    public function test_reordenar_deja_los_productos_en_el_orden_pedido(): void
    {
        $a = $this->categoria->productos()->create(['nombre' => 'A', 'precio_cop' => 1000, 'orden' => 0]);
        $b = $this->categoria->productos()->create(['nombre' => 'B', 'precio_cop' => 1000, 'orden' => 1]);

        $this->panel()
            ->postJson('/api/admin/productos/reordenar', ['ids' => [$b->id, $a->id]])
            ->assertOk();

        $this->assertSame(0, $b->fresh()->orden);
        $this->assertSame(1, $a->fresh()->orden);
    }

    public function test_un_kit_guarda_lo_que_incluye(): void
    {
        $molino = $this->categoria->productos()->create(['nombre' => 'Molino', 'precio_cop' => 890000]);
        $prensa = $this->categoria->productos()->create(['nombre' => 'Prensa', 'precio_cop' => 130000]);

        $kit = $this->panel()->postJson('/api/admin/productos', [
            'categoria_id' => $this->categoria->id,
            'nombre' => 'Kit para empezar',
            'precio_cop' => 1000000,
            'componentes' => [$molino->id, $prensa->id],
        ])->assertCreated();

        $this->assertSame(
            ['Molino', 'Prensa'],
            Producto::find($kit->json('id'))->componentes->pluck('nombre')->all(),
        );
    }

    public function test_un_kit_no_puede_contenerse_a_si_mismo(): void
    {
        // Se caería en un bucle al pintar la ficha. Se filtra el id en vez de
        // rechazar el guardado entero por un componente mal elegido.
        $kit = $this->categoria->productos()->create(['nombre' => 'Kit', 'precio_cop' => 100000]);

        $this->panel()
            ->patchJson("/api/admin/productos/{$kit->id}", ['componentes' => [$kit->id]])
            ->assertOk();

        $this->assertCount(0, $kit->fresh()->componentes);
    }

    public function test_guardar_sin_mandar_componentes_no_vacia_el_kit(): void
    {
        // El chatbot y otras vistas guardan productos sin saber de kits; si el
        // campo ausente se interpretara como "vacío", le borrarían el
        // contenido a un kit sin querer.
        $pieza = $this->categoria->productos()->create(['nombre' => 'Pieza', 'precio_cop' => 1000]);
        $kit = $this->categoria->productos()->create(['nombre' => 'Kit', 'precio_cop' => 100000]);
        $kit->componentes()->sync([$pieza->id => ['orden' => 0]]);

        $this->panel()->patchJson("/api/admin/productos/{$kit->id}", ['precio_cop' => 90000])->assertOk();

        $this->assertCount(1, $kit->fresh()->componentes);
    }

    // ── Categorías ───────────────────────────────────────────────────────────

    public function test_crea_y_edita_una_categoria(): void
    {
        $creada = $this->panel()
            ->postJson('/api/admin/categorias', ['nombre' => 'Artefactos', 'modo_vitrina' => 'carrusel'])
            ->assertCreated()
            ->assertJsonPath('slug', 'artefactos');

        $this->panel()
            ->putJson('/api/admin/categorias/'.$creada->json('id'), ['nombre' => 'La tienda'])
            ->assertOk()
            ->assertJsonPath('nombre', 'La tienda');
    }

    public function test_no_deja_borrar_una_seccion_con_productos_adentro(): void
    {
        $this->categoria->productos()->create(['nombre' => 'El Mirador', 'precio_cop' => 48000]);

        // La llave foránea está en cascada: sin este bloqueo, borrar la sección
        // se llevaría por delante todo su catálogo.
        $this->panel()
            ->deleteJson("/api/admin/categorias/{$this->categoria->id}")
            ->assertStatus(422);

        $this->assertSame(1, Producto::count());
        $this->assertSame(1, Categoria::count());
    }

    public function test_borra_una_seccion_vacia(): void
    {
        $this->panel()->deleteJson("/api/admin/categorias/{$this->categoria->id}")->assertNoContent();

        $this->assertSame(0, Categoria::count());
    }

    // ── Sedes ────────────────────────────────────────────────────────────────

    public function test_crea_una_sede_y_marcarla_principal_desmarca_la_otra(): void
    {
        $nueva = $this->panel()
            ->postJson('/api/admin/sedes', [
                'nombre' => 'Sede Bogotá',
                'direccion' => 'Carrera 13 # 55-30',
                'ciudad' => 'Bogotá',
                'principal' => true,
            ])
            ->assertCreated();

        $this->assertTrue(Sede::find($nueva->json('id'))->principal);
        $this->assertFalse(Sede::where('nombre', 'Sede Centro')->first()->principal, 'solo puede haber una principal');
    }

    public function test_borrar_una_sede_con_inventario_pide_confirmacion(): void
    {
        $sede = Sede::first();
        $producto = $this->categoria->productos()->create(['nombre' => 'El Mirador', 'precio_cop' => 48000]);
        $producto->ajustarStockSede($sede, 'fijar', 5);

        $this->panel()
            ->deleteJson("/api/admin/sedes/{$sede->id}")
            ->assertStatus(422)
            ->assertJsonPath('necesita_confirmacion', true);

        $this->assertSame(1, Sede::count());

        // Con la confirmación sí se borra, y el total del producto vuelve a
        // cuadrar con lo que queda en las sedes que siguen existiendo.
        $this->panel()->deleteJson("/api/admin/sedes/{$sede->id}?confirmar=1")->assertNoContent();

        $this->assertSame(0, Sede::count());
        $this->assertSame(0, $producto->fresh()->stock);
    }

    // ── Portada ──────────────────────────────────────────────────────────────

    public function test_la_portada_ya_no_se_edita(): void
    {
        // Los textos del hero viven en el componente desde que la portada pasó
        // a ser una pieza de diseño fija. Si alguien vuelve a exponer la ruta
        // sin querer, esta prueba lo canta.
        // No se comprueba un código exacto —según qué otra ruta case, Laravel
        // responde 404 o 405— sino que la petición NO prospera.
        $r = $this->panel()->post('/api/admin/hero', ['titulo' => 'El arte del café']);

        $this->assertGreaterThanOrEqual(400, $r->status());
    }
}
