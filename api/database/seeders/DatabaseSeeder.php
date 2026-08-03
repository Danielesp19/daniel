<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * OJO: sin `WithoutModelEvents` a propósito. Ese trait apaga los eventos de
 * Eloquent durante el sembrado, y aquí el evento `creating` de Categoria y
 * Producto es el que genera el slug — con el trait puesto, todo intento de
 * sembrar revienta con "NOT NULL constraint failed: categorias.slug".
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Admin por defecto del panel Filament. La contraseña la pone
        // UserFactory ("password") — cámbiala antes de exponer el panel.
        User::factory()->create([
            'name' => 'Admin',
            'email' => 'admin@altura.co',
        ]);

        $this->call(CatalogoSeeder::class);
    }
}
