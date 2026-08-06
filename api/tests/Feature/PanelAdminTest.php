<?php

namespace Tests\Feature;

use App\Filament\Resources\CategoriaResource\Pages\ListCategorias;
use App\Models\Categoria;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * El panel de Filament se arma en tiempo de render: una tabla mal configurada
 * —una columna que no existe, un `reorderable` sobre un campo equivocado— no
 * se nota al correr los tests de la API ni al compilar, solo cuando alguien
 * abre la página y le explota.
 *
 * Estos tests abren las dos listas que Daniel usa de verdad y comprueban que
 * respondan. Son baratos y atajan justo esa clase de error.
 */
class PanelAdminTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create();
    }

    public function test_la_lista_de_categorias_abre_y_las_muestra_en_orden(): void
    {
        Categoria::create(['nombre' => 'Métodos', 'orden' => 5]);
        Categoria::create(['nombre' => 'Café en grano', 'orden' => 1]);

        $this->actingAs($this->admin())
            ->get('/admin/categorias')
            ->assertOk()
            // El orden de la tabla es el mismo del sitio, así que arrastrar
            // acá mueve la sección allá.
            ->assertSeeInOrder(['Café en grano', 'Métodos']);
    }

    public function test_la_lista_de_productos_abre(): void
    {
        $categoria = Categoria::create(['nombre' => 'Café en grano', 'orden' => 1]);
        $categoria->productos()->create([
            'nombre' => 'Bourbon Rosado',
            'precio_cop' => 58000,
            'stock' => 4,
            'stock_minimo' => 3,
        ]);

        $this->actingAs($this->admin())
            ->get('/admin/productos')
            ->assertOk()
            ->assertSee('Bourbon Rosado');
    }

    public function test_arrastrar_una_categoria_le_cambia_el_orden(): void
    {
        $grano = Categoria::create(['nombre' => 'Café en grano', 'orden' => 1]);
        $metodos = Categoria::create(['nombre' => 'Métodos', 'orden' => 2]);

        $this->actingAs($this->admin());

        // Lo mismo que hace el navegador al soltar la fila: manda las llaves
        // en el orden nuevo. Acá se sube Métodos al primer lugar.
        Livewire::test(ListCategorias::class)
            ->call('reorderTable', [$metodos->getKey(), $grano->getKey()]);

        $this->assertTrue(
            $metodos->fresh()->orden < $grano->fresh()->orden,
            'Arrastrar Métodos arriba de Café en grano debía dejarlo con un orden menor.',
        );
    }

    public function test_sin_sesion_el_panel_no_deja_entrar(): void
    {
        $this->get('/admin/categorias')->assertRedirect();
    }
}
