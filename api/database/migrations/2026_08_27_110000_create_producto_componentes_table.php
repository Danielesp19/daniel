<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Qué productos incluye un producto: los kits.
     *
     * El cliente pidió "una sección para el que arranca, con molino, prensa y
     * gramera". Se resuelve como un producto que CONTIENE otros y no como una
     * categoría nueva, por dos razones:
     *
     *  · Un producto pertenece a una sola categoría. El molino ya está en
     *    Artefactos y no puede estar también en "Para empezar" sin duplicarlo,
     *    y dos filas del mismo molino son dos inventarios que se descuadran.
     *  · Un kit se vende como una cosa: un precio, una foto, una línea en el
     *    pedido. Que además diga qué trae adentro es información, no tres
     *    productos distintos.
     *
     * Tabla propia y no una columna JSON con ids: así la llave foránea impide
     * que un kit quede apuntando a un producto borrado.
     */
    public function up(): void
    {
        Schema::create('producto_componentes', function (Blueprint $table) {
            $table->id();

            // El kit.
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            // Lo que trae adentro.
            $table->foreignId('componente_id')->constrained('productos')->cascadeOnDelete();

            $table->unsignedInteger('orden')->default(0);
            $table->timestamps();

            // Un componente no se repite dentro del mismo kit.
            $table->unique(['producto_id', 'componente_id']);
            $table->index('componente_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('producto_componentes');
    }
};
