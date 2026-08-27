<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Las proporciones, en números y no dentro de una frase.
     *
     * `resumen` guarda "15 g · 250 ml · 2:45", que se lee bien pero no se puede
     * calcular. La calculadora de ratios que pidió el cliente necesita los dos
     * números sueltos para poder decir "1:16,7" y recalcular el agua cuando el
     * usuario cambia el café.
     *
     * Nullable las dos: una receta puede no tener proporción —un método que se
     * explica sin cantidades— y ahí la calculadora simplemente no aparece.
     *
     * En gramos y no en mililitros: para agua es lo mismo, pero en espresso lo
     * que se mide a la salida es peso, no volumen, y una sola unidad evita
     * tener que explicar cuál aplica en cada método.
     */
    public function up(): void
    {
        Schema::table('recetas', function (Blueprint $table) {
            $table->unsignedInteger('cafe_g')->nullable()->after('detalle');
            $table->unsignedInteger('agua_g')->nullable()->after('cafe_g');
        });
    }

    public function down(): void
    {
        Schema::table('recetas', function (Blueprint $table) {
            $table->dropColumn(['cafe_g', 'agua_g']);
        });
    }
};
