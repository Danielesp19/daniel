<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Un kit deja de ser "un producto que resultó tener componentes".
 *
 * Antes se armaba marcando casillas dentro del formulario normal, y un kit era
 * kit solo porque alguien le había marcado algo. Eso dejaba dos problemas: no
 * se podía decir "esto es un kit" antes de llenarlo, y solo se podían meter
 * productos que ya existieran sueltos en el catálogo.
 *
 * Se marca con `es_kit` y se le agrega `kit_piezas`: lo que va DENTRO del kit
 * pero no se vende aparte —los filtros de papel, la bolsa de café de muestra—.
 * Llevan nombre y foto, nada más: no tienen precio porque no se venden, y no
 * tienen stock porque el que cuenta es el del kit.
 *
 * Los kits que ya existían se marcan solos: si algo tiene componentes, es kit.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->boolean('es_kit')->default(false)->after('es_cafe');
        });

        DB::table('productos')
            ->whereIn('id', DB::table('producto_componentes')->select('producto_id'))
            ->update(['es_kit' => true]);

        Schema::create('kit_piezas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            $table->string('nombre');
            $table->string('imagen')->nullable();
            $table->unsignedInteger('orden')->default(0);
            $table->timestamps();

            $table->index(['producto_id', 'orden']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kit_piezas');

        Schema::table('productos', function (Blueprint $table) {
            $table->dropColumn('es_kit');
        });
    }
};
