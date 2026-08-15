<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Los servicios pasan de grilla de tarjetas a bandas a lo ancho.
     *
     * En la grilla, en escritorio, un servicio quedaba del tamaño de un café:
     * cuatro tarjetas iguales que se comparan por precio. Un servicio no se
     * elige así —se entra a uno porque la escena convence—, y en banda el
     * video se toma el ancho completo y es el que vende.
     *
     * "Métodos" se queda en `horizontal` a propósito: está apagada y es la base
     * de las recetas, que son otra cosa y todavía no sabemos cómo se van a ver.
     */
    public function up(): void
    {
        DB::table('categorias')->where('slug', 'servicios')->update([
            'modo_vitrina' => 'bandas',
            // La bajada hablaba de tarjetas que abren su video; ya no hay
            // tarjetas ni video que abrir: el video está corriendo de fondo.
            'descripcion' => 'Mira de qué se trata y agenda por WhatsApp.',
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('categorias')->where('slug', 'servicios')->update([
            'modo_vitrina' => 'horizontal',
            'descripcion' => 'Mira de qué se trata y agenda por WhatsApp. Cada tarjeta abre su video.',
            'updated_at' => now(),
        ]);
    }
};
