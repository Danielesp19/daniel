<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * La banda de aviso que va arriba de todo: una feria, un lote que llegó,
     * un cierre por vacaciones.
     *
     * Es una tabla y no un par de campos en `hero` porque es contenido con
     * vida propia: se enciende para un evento y se apaga cuando pasa, sin
     * tocar la portada. Como el hero, la página dibuja una sola —la primera
     * activa— y el panel trabaja sobre esa.
     */
    public function up(): void
    {
        Schema::create('avisos', function (Blueprint $table) {
            $table->id();

            // El rótulo diminuto de la izquierda: "Aviso", "Nuevo lote".
            $table->string('etiqueta')->default('Aviso');
            $table->string('titulo');
            $table->text('texto')->nullable();

            // El botón. Sin texto o sin URL, la banda sale sin botón: un aviso
            // puede ser solo información y no tener a dónde llevar.
            $table->string('cta_texto')->nullable();
            $table->string('cta_url')->nullable();

            $table->boolean('activo')->default(true);
            $table->unsignedInteger('orden')->default(0);
            $table->timestamps();

            $table->index(['activo', 'orden']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('avisos');
    }
};
