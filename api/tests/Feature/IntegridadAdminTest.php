<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Producto;
use App\Models\Receta;
use App\Models\Sede;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Qué pasa cuando se borra algo que otro está usando.
 *
 * Casi todas las referencias del esquema están en cascada, así que la base
 * deja borrar sin chistar y limpia las referencias sola —en silencio—. El
 * problema no es la integridad de la base: es que un kit amanezca con una
 * pieza menos y nadie se entere hasta que un cliente abre la ficha. Lo que se
 * prueba acá es que el panel AVISE antes, y que borre igual si se confirma.
 */
class IntegridadAdminTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = 'token-de-prueba';

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
    }

    /** @param array<string, mixed> $datos */
    private function borrar(int $id, bool $confirmar = false)
    {
        return $this->withHeader('Authorization', 'Bearer '.self::TOKEN)
            ->deleteJson('/api/admin/productos/'.$id.($confirmar ? '?confirmar=1' : ''));
    }

    private function categoria(): Categoria
    {
        return Categoria::create(['nombre' => 'Café en grano', 'orden' => 1]);
    }

    private function producto(string $nombre): Producto
    {
        return $this->categoria()->productos()->create([
            'nombre' => $nombre,
            'precio_cop' => 48000,
        ]);
    }

    // ── Productos dentro de un kit ──────────────────────────────────────────

    public function test_avisa_antes_de_borrar_un_producto_que_esta_dentro_de_un_kit(): void
    {
        $prensa = $this->producto('Prensa francesa');
        $kit = $this->producto('Kit V60');
        $kit->componentes()->sync([$prensa->id => ['orden' => 0]]);

        $r = $this->borrar($prensa->id);

        $r->assertStatus(422)
            ->assertJsonPath('necesita_confirmacion', true)
            ->assertJsonPath('usos.kits', ['Kit V60']);
        // Y no lo borró: el aviso no puede ser el recibo de algo ya hecho.
        $this->assertNotNull(Producto::find($prensa->id));
    }

    public function test_el_aviso_nombra_el_kit_para_que_se_sepa_cual_revisar(): void
    {
        $prensa = $this->producto('Prensa francesa');
        $kit = $this->producto('Kit V60');
        $kit->componentes()->sync([$prensa->id => ['orden' => 0]]);

        $this->borrar($prensa->id)->assertSee('Kit V60');
    }

    public function test_confirmando_si_lo_borra_y_lo_saca_del_kit(): void
    {
        $prensa = $this->producto('Prensa francesa');
        $kit = $this->producto('Kit V60');
        $kit->componentes()->sync([$prensa->id => ['orden' => 0]]);

        $this->borrar($prensa->id, confirmar: true)->assertNoContent();

        $this->assertNull(Producto::find($prensa->id));
        $this->assertCount(0, $kit->fresh()->componentes, 'el kit queda sin ese componente');
    }

    public function test_un_producto_que_no_usa_nadie_se_borra_de_una(): void
    {
        // Sin ataduras no hay que preguntar nada: pedir confirmación de todo
        // enseña a decir que sí sin leer.
        $suelto = $this->producto('Café suelto');

        $this->borrar($suelto->id)->assertNoContent();
        $this->assertNull(Producto::find($suelto->id));
    }

    // ── Productos usados por recetas ────────────────────────────────────────

    public function test_avisa_si_el_producto_es_el_cafe_de_una_receta(): void
    {
        $cafe = $this->producto('El Mirador');
        Receta::create([
            'nombre' => 'Chemex',
            'metodo' => 'Filtrado',
            'producto_id' => $cafe->id,
        ]);

        $this->borrar($cafe->id)
            ->assertStatus(422)
            ->assertJsonPath('usos.recetas', ['Chemex']);
    }

    public function test_avisa_si_el_producto_es_un_artefacto_de_una_receta(): void
    {
        $molino = $this->producto('Molino de mano');
        $receta = Receta::create(['nombre' => 'V60', 'metodo' => 'Filtrado']);
        $receta->artefactos()->sync([$molino->id]);

        $this->borrar($molino->id)
            ->assertStatus(422)
            ->assertJsonPath('usos.recetas_que_lo_usan', ['V60']);
    }

    // ── Categorías ──────────────────────────────────────────────────────────

    public function test_no_se_puede_borrar_una_categoria_con_productos(): void
    {
        // La clave foránea está en cascada: sin esta guarda, borrar una
        // sección se llevaba en silencio TODOS sus productos, con sus fotos,
        // su inventario y su sitio dentro de los kits.
        $producto = $this->producto('El Mirador');

        $this->withHeader('Authorization', 'Bearer '.self::TOKEN)
            ->deleteJson('/api/admin/categorias/'.$producto->categoria_id)
            ->assertStatus(422);

        $this->assertNotNull(Producto::find($producto->id));
    }

    // ── Validación ──────────────────────────────────────────────────────────

    public function test_el_enlace_del_aviso_no_puede_ser_un_guion_de_navegador(): void
    {
        // El aviso se pinta como <a href> con target=_blank en la página
        // pública: un "javascript:" acá se ejecutaba en el navegador de quien
        // visitara el sitio.
        $this->withHeader('Authorization', 'Bearer '.self::TOKEN)
            ->postJson('/api/admin/aviso', [
                'titulo' => 'Feria',
                'cta_texto' => 'Ir',
                'cta_url' => 'javascript:alert(1)',
            ])
            ->assertStatus(422);
    }

    public function test_los_errores_de_validacion_salen_en_castellano(): void
    {
        // La app corre en `es` y el respaldo también, así que sin traducciones
        // el panel mostraba la clave cruda ("validation.required") en cada
        // error. Se prueba porque es invisible desde el backend: la petición
        // responde 422 igual, solo que con un texto que nadie entiende.
        $r = $this->withHeader('Authorization', 'Bearer '.self::TOKEN)
            ->postJson('/api/admin/productos', []);

        $r->assertStatus(422);
        $mensaje = $r->json('errors.nombre.0');

        $this->assertStringNotContainsString('validation.', $mensaje);
        $this->assertSame('Falta el nombre.', $mensaje);
    }
}
