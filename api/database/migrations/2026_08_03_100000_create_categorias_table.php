<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categorias', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->string('slug')->unique();
            $table->text('descripcion')->nullable();

            // Cómo se dibuja la categoría en el catálogo web:
            //   grid       → grilla de tarjetas (el modo normal)
            //   vertical   → vitrina de filas alternadas sobre foto de fondo
            //   horizontal → una ficha a la vez, se pasa deslizando
            $table->string('modo_vitrina')->default('grid');

            $table->unsignedInteger('orden')->default(0);
            $table->boolean('activa')->default(true);
            $table->timestamps();

            $table->index(['activa', 'orden']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categorias');
    }
};
