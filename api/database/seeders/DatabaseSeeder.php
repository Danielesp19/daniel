<?php

namespace Database\Seeders;

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
        // Ya no se siembra un usuario administrador: al panel se entra con la
        // contraseña compartida que vive en el frontend (ADMIN_PASSWORD), no
        // con una fila de la tabla `users`.
        $this->call(CatalogoSeeder::class);
        $this->call(ContenidoSeeder::class);
    }
}
