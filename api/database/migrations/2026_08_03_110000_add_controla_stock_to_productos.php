<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * No todo lo que se vende se cuenta en bolsas.
     *
     * Una asesoría o una barra para un evento no se agotan: se agendan. Sin
     * esta bandera habría que dejarles un stock alto y falso, y el día que
     * alguien lo bajara a cero el catálogo pintaría "AGOTADO" sobre un
     * servicio que sí se puede contratar.
     */
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->boolean('controla_stock')->default(true)->after('gramos');
        });
    }

    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->dropColumn('controla_stock');
        });
    }
};
