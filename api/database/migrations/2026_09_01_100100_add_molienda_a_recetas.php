<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * La molienda recomendada de cada receta.
 *
 * Se guarda en MICRAS y no como "media" o "fina": esas palabras no significan
 * lo mismo en dos molinos, y el número es lo único que se puede dibujar a
 * tamaño real para compararlo contra el café de uno. Los cinco puntos que
 * ofrece el panel (1000, 800, 600, 400, 250) son los mismos de la referencia
 * de molienda, así que la receta abierta puede señalar cuál es el suyo.
 *
 * Nulo = receta sin recomendación; la referencia se muestra igual, sin nada
 * marcado.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('recetas', function (Blueprint $table) {
            $table->unsignedSmallInteger('molienda_micras')->nullable()->after('agua_g');
        });
    }

    public function down(): void
    {
        Schema::table('recetas', function (Blueprint $table) {
            $table->dropColumn('molienda_micras');
        });
    }
};
