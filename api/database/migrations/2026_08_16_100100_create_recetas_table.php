<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Las recetas: cómo preparar cada método en casa.
     *
     * Tabla propia y no productos. Los cuatro "Métodos" que estaban apagados
     * vivían en `productos` con precio 0 y sin control de stock, que era un
     * remiendo: arrastraban carrito, inventario y hasta sedes que no les
     * servían de nada.
     */
    public function up(): void
    {
        Schema::create('recetas', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->string('slug')->unique();

            // Con qué se prepara: filtrado, inmersión, espresso, con leche.
            // Es el filtro de la sección, y por eso texto libre y no enum: el
            // día que aparezca "sifón" no debería requerir una migración.
            $table->string('metodo');

            // Las dos líneas de resumen, tal como se leen. Van como texto y no
            // como gramos + mililitros + segundos por columnas porque los
            // métodos no se miden igual: un espresso son 18 g adentro y 36 g
            // en taza, un cold brew son 14 horas. Forzar una sola forma
            // obligaría a mentir en la mitad de las recetas.
            $table->string('resumen')->nullable();   // "15 g · 250 ml · 2:45"
            $table->string('detalle')->nullable();   // "15 g café · 250 ml agua a 94 °C"

            // Lo que necesita el temporizador. En segundos, que es como se
            // cuenta un café.
            $table->unsignedInteger('duracion_seg')->nullable();

            // Listas: ["18 g de café", "250 ml de agua"] y los pasos en orden.
            $table->json('ingredientes')->nullable();
            $table->json('pasos')->nullable();

            // El café que mejor le queda. Si se borra ese producto la receta
            // se queda sin recomendación, pero no se borra con él.
            $table->foreignId('producto_id')->nullable()->constrained('productos')->nullOnDelete();

            $table->string('imagen')->nullable();
            $table->string('video')->nullable();
            $table->string('video_poster')->nullable();

            $table->boolean('activa')->default(true);
            $table->unsignedInteger('orden')->default(0);
            $table->timestamps();

            $table->index(['activa', 'orden']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recetas');
    }
};
