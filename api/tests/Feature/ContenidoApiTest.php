<?php

namespace Tests\Feature;

use App\Models\Aviso;
use App\Models\Categoria;
use App\Models\Pregunta;
use App\Models\Receta;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Aviso, recetas y preguntas: lo que se administra pero no se vende.
 */
class ContenidoApiTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = 'token-de-prueba';

    protected function setUp(): void
    {
        parent::setUp();
        config(['tienda.admin_token' => self::TOKEN]);
    }

    private function panel()
    {
        return $this->withToken(self::TOKEN);
    }

    // ── Aviso ────────────────────────────────────────────────────────────────

    public function test_el_aviso_publico_es_null_cuando_no_hay_ninguno(): void
    {
        $this->getJson('/api/catalogo/aviso')->assertOk()->assertExactJson([]);
    }

    public function test_un_aviso_apagado_no_sale(): void
    {
        Aviso::create(['titulo' => 'Feria del Café', 'activo' => false]);

        $this->getJson('/api/catalogo/aviso')->assertOk()->assertExactJson([]);
    }

    public function test_el_boton_del_aviso_solo_sale_completo(): void
    {
        // Con texto pero sin URL no hay a dónde ir: la banda debe salir sin
        // botón en vez de con uno que no lleva a ninguna parte.
        Aviso::create(['titulo' => 'Feria del Café', 'cta_texto' => 'Quiero ir']);

        $this->getJson('/api/catalogo/aviso')
            ->assertOk()
            ->assertJsonPath('titulo', 'Feria del Café')
            ->assertJsonPath('cta_texto', null)
            ->assertJsonPath('cta_url', null);
    }

    public function test_se_guarda_el_aviso_aunque_no_exista_ninguno(): void
    {
        $this->panel()
            ->postJson('/api/admin/aviso', ['titulo' => 'Cerrado por vacaciones'])
            ->assertOk()
            ->assertJsonPath('titulo', 'Cerrado por vacaciones')
            // Sin etiqueta la banda se ve rota: se repone la de siempre.
            ->assertJsonPath('etiqueta', 'Aviso');

        $this->assertSame(1, Aviso::count());
    }

    // ── Recetas ──────────────────────────────────────────────────────────────

    public function test_las_recetas_apagadas_no_salen(): void
    {
        Receta::create(['nombre' => 'V60', 'metodo' => 'Filtrado', 'activa' => true]);
        Receta::create(['nombre' => 'Sifón', 'metodo' => 'Filtrado', 'activa' => false]);

        $this->getJson('/api/catalogo/recetas')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.nombre', 'V60');
    }

    public function test_la_duracion_se_publica_ya_escrita(): void
    {
        Receta::create(['nombre' => 'V60', 'metodo' => 'Filtrado', 'duracion_seg' => 165]);
        Receta::create(['nombre' => 'Cold brew', 'metodo' => 'Inmersión', 'duracion_seg' => 50400, 'orden' => 1]);

        $r = $this->getJson('/api/catalogo/recetas')->assertOk();

        // Segundos para el reloj del navegador, y el texto ya resuelto para
        // pintarlo. Catorce horas escritas "840:00" no las entiende nadie.
        $this->assertSame('2:45', $r->json('0.duracion'));
        $this->assertSame(165, $r->json('0.duracion_seg'));
        $this->assertSame('14 h', $r->json('1.duracion'));
    }

    public function test_crea_una_receta_con_sus_pasos(): void
    {
        $this->panel()
            ->postJson('/api/admin/recetas', [
                'nombre' => 'Chemex para dos',
                'metodo' => 'Filtrado',
                'duracion_seg' => 240,
                'ingredientes' => ['30 g de café', '500 ml de agua'],
                'pasos' => ['Enjuaga el filtro.', 'Bloom con 90 ml.'],
            ])
            ->assertCreated()
            ->assertJsonPath('slug', 'chemex-para-dos')
            ->assertJsonCount(2, 'pasos');
    }

    public function test_borrar_el_cafe_recomendado_no_borra_la_receta(): void
    {
        $categoria = Categoria::create(['nombre' => 'Cafés', 'orden' => 1]);
        $producto = $categoria->productos()->create(['nombre' => 'El Mirador', 'precio_cop' => 48000]);

        $receta = Receta::create([
            'nombre' => 'V60',
            'metodo' => 'Filtrado',
            'producto_id' => $producto->id,
        ]);

        $producto->delete();

        // La receta sobrevive y solo pierde la recomendación: perder el paso a
        // paso porque se agotó un lote sería absurdo.
        $this->assertNotNull($receta->fresh());
        $this->assertNull($receta->fresh()->producto_id);
    }

    // ── Preguntas ────────────────────────────────────────────────────────────

    public function test_las_preguntas_salen_en_su_orden_y_sin_las_ocultas(): void
    {
        Pregunta::create(['pregunta' => 'B', 'respuesta' => '…', 'orden' => 1]);
        Pregunta::create(['pregunta' => 'A', 'respuesta' => '…', 'orden' => 0]);
        Pregunta::create(['pregunta' => 'Oculta', 'respuesta' => '…', 'orden' => 2, 'activa' => false]);

        $this->getJson('/api/catalogo/preguntas')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.pregunta', 'A')
            ->assertJsonPath('1.pregunta', 'B');
    }

    public function test_reordenar_preguntas_las_deja_en_el_orden_pedido(): void
    {
        $a = Pregunta::create(['pregunta' => 'A', 'respuesta' => '…', 'orden' => 0]);
        $b = Pregunta::create(['pregunta' => 'B', 'respuesta' => '…', 'orden' => 1]);

        $this->panel()
            ->postJson('/api/admin/preguntas/reordenar', ['ids' => [$b->id, $a->id]])
            ->assertOk();

        $this->assertSame(0, $b->fresh()->orden);
        $this->assertSame(1, $a->fresh()->orden);
    }

    public function test_sin_token_no_se_toca_nada(): void
    {
        $this->postJson('/api/admin/aviso', ['titulo' => 'x'])->assertUnauthorized();
        $this->getJson('/api/admin/recetas')->assertUnauthorized();
        $this->getJson('/api/admin/preguntas')->assertUnauthorized();
    }
}
