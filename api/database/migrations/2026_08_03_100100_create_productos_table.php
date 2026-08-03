<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('productos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('categoria_id')->constrained('categorias')->cascadeOnDelete();

            $table->string('nombre');
            $table->string('slug')->unique();
            $table->text('descripcion')->nullable();

            // Plata SIEMPRE en enteros de pesos colombianos. Nada de decimales
            // flotantes: un café de $48.000 es 48000, punto.
            $table->unsignedBigInteger('precio_cop');

            // ── Inventario ──────────────────────────────────────────────────
            // El stock se cuenta en BOLSAS de `gramos` cada una, no en gramos
            // sueltos: es como lo cuenta quien está parado frente al estante,
            // y es lo que el chatbot va a preguntar y actualizar.
            $table->unsignedInteger('stock')->default(0);
            // Umbral de aviso: por debajo de esto el panel (y el chatbot) lo
            // reportan como "por acabarse" antes de que llegue a cero.
            $table->unsignedInteger('stock_minimo')->default(3);
            $table->unsignedInteger('gramos')->default(340);

            // ── Ficha técnica de origen ─────────────────────────────────────
            // Es el corazón del catálogo: en café de especialidad esta ficha
            // es la que vende. Todo opcional porque no todo producto es un
            // café de origen (hay equipos, accesorios, suscripciones).
            $table->string('finca')->nullable();
            $table->string('productor')->nullable();
            $table->string('region')->nullable();            // "Huila", "Nariño"
            $table->unsignedInteger('altitud_msnm')->nullable();
            $table->string('variedad')->nullable();          // "Castillo", "Geisha"
            $table->string('proceso')->nullable();           // "Lavado", "Natural"
            $table->string('tueste')->nullable();            // "Claro", "Medio"
            // Notas de cata como lista: ["panela", "mandarina", "cacao"].
            // Se pintan como etiquetas sueltas, por eso lista y no texto libre.
            $table->json('notas')->nullable();
            // Puntaje SCA (80.00–100.00). Decimal y no entero: el medio punto
            // importa en especialidad (85.5 no es 85).
            $table->decimal('puntaje_sca', 4, 2)->nullable();

            // ── Medios ──────────────────────────────────────────────────────
            $table->string('imagen')->nullable();
            $table->string('video')->nullable();
            $table->string('video_poster')->nullable();

            $table->boolean('activo')->default(true);
            $table->boolean('destacado')->default(false);
            $table->unsignedInteger('orden')->default(0);
            $table->timestamps();

            $table->index(['activo', 'orden']);
            $table->index('categoria_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('productos');
    }
};
