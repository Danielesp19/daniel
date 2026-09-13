<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Marca qué productos son café.
 *
 * La ficha de origen —finca, región, altura, variedad, proceso, tueste, SCA,
 * notas de cata— y el peso de la bolsa solo tienen sentido en un café. En un
 * molino o en una asesoría son ocho campos vacíos que hay que saltar cada vez
 * que se crea algo, y que invitan a llenarlos con cualquier cosa.
 *
 * Se marca con una columna y no se deduce de la categoría: el cliente puede
 * llamar a su sección como quiera —"Lotes", "De temporada"— y la página no
 * puede depender de cómo la bautizó.
 *
 * Los que ya tienen ficha se marcan solos: si algo tiene finca, región o notas,
 * es café.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->boolean('es_cafe')->default(false)->after('controla_stock');
        });

        DB::table('productos')
            ->where(function ($q) {
                $q->whereNotNull('finca')
                    ->orWhereNotNull('region')
                    ->orWhereNotNull('variedad')
                    ->orWhereNotNull('proceso')
                    ->orWhereNotNull('notas');
            })
            ->update(['es_cafe' => true]);
    }

    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->dropColumn('es_cafe');
        });
    }
};
