<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Subcategorías: una categoría puede colgar de otra.
 *
 * La jerarquía es de UN solo nivel — sección › subcategoría — y eso se cuida en
 * el modelo, no acá: una columna que se apunta a sí misma admite cadenas tan
 * largas como uno quiera, y un catálogo de café no necesita "Artefactos ›
 * Molinos › Manuales › De cerámica". Con dos niveles ya se resuelve lo que
 * pidió el cliente (básculas, molinos, jarras dentro de Artefactos) y la página
 * sigue siendo una sola pasada hacia abajo.
 *
 * Los productos NO cambian: siguen apuntando a una categoría con `categoria_id`,
 * que ahora puede ser una sección o una subcategoría.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categorias', function (Blueprint $table) {
            // nullOnDelete y no cascade: borrar una sección no puede llevarse
            // sus subcategorías con todos los productos adentro. Se sueltan y
            // quedan como secciones, visibles, para que nadie pierda nada sin
            // enterarse.
            $table->foreignId('padre_id')->nullable()->after('id')
                ->constrained('categorias')->nullOnDelete();

            $table->index(['padre_id', 'orden']);
        });
    }

    public function down(): void
    {
        Schema::table('categorias', function (Blueprint $table) {
            $table->dropIndex(['padre_id', 'orden']);
            $table->dropConstrainedForeignId('padre_id');
        });
    }
};
