<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Hero;
use App\Models\Producto;
use App\Support\Chatbot\Asistente;
use App\Support\Chatbot\Herramientas;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Las herramientas del chatbot SON el panel de administración: no hay otro
 * camino para cambiar la página. Lo que se prueba acá es que un mensaje mal
 * entendido no pueda romper el catálogo — sobre todo la diferencia entre
 * "agotado" (sigue visible) y "oculto" (desaparece).
 */
class HerramientasChatbotTest extends TestCase
{
    use RefreshDatabase;

    private const ADMIN = '573222248487';

    private function categoria(array $extra = []): Categoria
    {
        return Categoria::create($extra + ['nombre' => 'Café en grano', 'orden' => 1]);
    }

    private function producto(Categoria $categoria, array $extra = []): Producto
    {
        return $categoria->productos()->create($extra + [
            'nombre' => 'El Mirador',
            'precio_cop' => 48000,
            'stock' => 10,
        ]);
    }

    // ── Crear ───────────────────────────────────────────────────────────────

    public function test_crea_un_producto_en_la_categoria_indicada(): void
    {
        $categoria = $this->categoria();

        $r = Herramientas::ejecutar('crear_producto', [
            'categoria_id' => $categoria->id,
            'nombre' => 'Bourbon Rosado',
            'precio_cop' => 58000,
            'gramos' => 340,
            'stock' => 12,
            'region' => 'Huila',
            'notas' => ['maracuyá', 'panela'],
        ], self::ADMIN);

        $this->assertTrue($r['ok']);
        $producto = Producto::where('nombre', 'Bourbon Rosado')->first();
        $this->assertNotNull($producto);
        $this->assertSame(58000, $producto->precio_cop);
        $this->assertSame(12, $producto->stock);
        $this->assertSame(['maracuyá', 'panela'], $producto->notas);
        // El slug se genera solo: nadie lo va a dictar por WhatsApp.
        $this->assertSame('bourbon-rosado', $producto->slug);
    }

    public function test_no_crea_un_producto_en_una_categoria_que_no_existe(): void
    {
        $r = Herramientas::ejecutar('crear_producto', [
            'categoria_id' => 999,
            'nombre' => 'Fantasma',
            'precio_cop' => 1000,
        ], self::ADMIN);

        $this->assertArrayHasKey('error', $r);
        $this->assertSame(0, Producto::count());
    }

    public function test_rechaza_un_precio_negativo(): void
    {
        $categoria = $this->categoria();

        $r = Herramientas::ejecutar('crear_producto', [
            'categoria_id' => $categoria->id,
            'nombre' => 'Raro',
            'precio_cop' => -5000,
        ], self::ADMIN);

        $this->assertArrayHasKey('error', $r);
        $this->assertSame(0, Producto::count());
    }

    // ── Agotado vs. oculto ──────────────────────────────────────────────────

    public function test_dejar_el_stock_en_cero_agota_pero_no_esconde(): void
    {
        $producto = $this->producto($this->categoria());

        Herramientas::ejecutar('ajustar_stock', [
            'producto_id' => $producto->id,
            'accion' => 'fijar',
            'cantidad' => 0,
        ], self::ADMIN);

        $producto->refresh();
        $this->assertTrue($producto->agotado(), 'debería salir con el sello de agotado');
        $this->assertTrue($producto->activo, 'pero NO debería desaparecer del catálogo');
    }

    public function test_esconder_un_producto_es_otra_cosa_y_no_le_toca_el_stock(): void
    {
        $producto = $this->producto($this->categoria(), ['stock' => 7]);

        Herramientas::ejecutar('editar_producto', [
            'producto_id' => $producto->id,
            'activo' => false,
        ], self::ADMIN);

        $producto->refresh();
        $this->assertFalse($producto->activo);
        $this->assertSame(7, $producto->stock, 'esconderlo no es venderlo');
    }

    public function test_editar_producto_no_puede_tocar_el_stock(): void
    {
        // El stock solo se mueve por ajustar_stock, que deja constancia del
        // antes y el después. Si editar_producto pudiera cambiarlo, un ajuste
        // pasaría sin que nadie lo note.
        $producto = $this->producto($this->categoria(), ['stock' => 10]);

        Herramientas::ejecutar('editar_producto', [
            'producto_id' => $producto->id,
            'stock' => 999,
            'precio_cop' => 52000,
        ], self::ADMIN);

        $producto->refresh();
        $this->assertSame(10, $producto->stock, 'el stock no debió moverse');
        $this->assertSame(52000, $producto->precio_cop, 'el precio sí');
    }

    // ── Fotos ───────────────────────────────────────────────────────────────

    public function test_asigna_al_producto_la_ultima_foto_del_chat(): void
    {
        Storage::fake('public');
        $producto = $this->producto($this->categoria());
        Cache::put(Asistente::llaveFotoDe(self::ADMIN), 'productos/nueva.webp');

        $r = Herramientas::ejecutar('asignar_foto', ['producto_id' => $producto->id], self::ADMIN);

        $this->assertTrue($r['ok']);
        $this->assertSame('productos/nueva.webp', $producto->fresh()->imagen);
    }

    public function test_la_foto_se_consume_para_no_repetirla_en_otro_producto(): void
    {
        Storage::fake('public');
        $categoria = $this->categoria();
        $uno = $this->producto($categoria, ['nombre' => 'Uno']);
        $dos = $this->producto($categoria, ['nombre' => 'Dos']);
        Cache::put(Asistente::llaveFotoDe(self::ADMIN), 'productos/nueva.webp');

        Herramientas::ejecutar('asignar_foto', ['producto_id' => $uno->id], self::ADMIN);
        $segundo = Herramientas::ejecutar('asignar_foto', ['producto_id' => $dos->id], self::ADMIN);

        $this->assertArrayHasKey('error', $segundo);
        $this->assertNull($dos->fresh()->imagen);
    }

    public function test_sin_foto_reciente_avisa_en_vez_de_fallar(): void
    {
        $producto = $this->producto($this->categoria());

        $r = Herramientas::ejecutar('asignar_foto', ['producto_id' => $producto->id], self::ADMIN);

        $this->assertArrayHasKey('error', $r);
    }

    public function test_la_foto_de_un_admin_no_le_sirve_a_otro_numero(): void
    {
        Storage::fake('public');
        $producto = $this->producto($this->categoria());
        Cache::put(Asistente::llaveFotoDe(self::ADMIN), 'productos/nueva.webp');

        $r = Herramientas::ejecutar('asignar_foto', ['producto_id' => $producto->id], '573009998877');

        $this->assertArrayHasKey('error', $r);
        $this->assertNull($producto->fresh()->imagen);
    }

    public function test_al_reemplazar_la_foto_se_borra_la_anterior(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('productos/vieja.webp', 'x');
        $producto = $this->producto($this->categoria(), ['imagen' => 'productos/vieja.webp']);
        Cache::put(Asistente::llaveFotoDe(self::ADMIN), 'productos/nueva.webp');

        Herramientas::ejecutar('asignar_foto', ['producto_id' => $producto->id], self::ADMIN);

        // Sin esto el disco crece sin control a punta de fotos reemplazadas.
        Storage::disk('public')->assertMissing('productos/vieja.webp');
    }

    // ── Categorías y portada ────────────────────────────────────────────────

    public function test_crea_una_categoria_y_la_pone_de_ultima(): void
    {
        $this->categoria(['orden' => 3]);

        $r = Herramientas::ejecutar('crear_categoria', [
            'nombre' => 'Suscripciones',
            'modo_vitrina' => 'grid',
        ], self::ADMIN);

        $this->assertTrue($r['ok']);
        $nueva = Categoria::where('nombre', 'Suscripciones')->first();
        $this->assertSame(4, $nueva->orden, 'debería quedar después de las que ya estaban');
    }

    public function test_rechaza_un_modo_de_vitrina_inventado(): void
    {
        $r = Herramientas::ejecutar('crear_categoria', [
            'nombre' => 'Rara',
            'modo_vitrina' => 'carrusel3d',
        ], self::ADMIN);

        $this->assertArrayHasKey('error', $r);
        $this->assertSame(0, Categoria::count());
    }

    public function test_cambia_los_textos_de_la_portada(): void
    {
        Hero::create(['titulo' => 'Café bien hecho', 'subtitulo' => 'Viejo', 'activo' => true]);

        $r = Herramientas::ejecutar('editar_portada', [
            'titulo' => 'Café de verdad',
            'subtitulo' => 'Nuevo texto',
        ], self::ADMIN);

        $this->assertTrue($r['ok']);
        $hero = Hero::first();
        $this->assertSame('Café de verdad', $hero->titulo);
        $this->assertSame('Nuevo texto', $hero->subtitulo);
    }

    public function test_una_herramienta_desconocida_no_revienta_la_conversacion(): void
    {
        $r = Herramientas::ejecutar('borrar_todo', [], self::ADMIN);

        $this->assertArrayHasKey('error', $r);
    }
}
