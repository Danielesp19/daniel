<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * La portada deja de ser contenido editable.
 *
 * El hero se rediseñó como una pieza fija —medallón, órbita, dos botones— y sus
 * textos viven ahora en el componente. Tener además una tabla con un titular
 * que nadie lee era una trampa: se edita desde el panel, se guarda sin error y
 * no cambia nada en la página.
 *
 * La vuelta atrás recrea la tabla vacía, no los textos: son tres líneas que se
 * escriben otra vez en un minuto y no vale la pena guardarlas en la migración.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('hero');
    }

    public function down(): void
    {
        Schema::create('hero', function (Blueprint $table) {
            $table->id();
            $table->string('titulo');
            $table->string('subtitulo')->nullable();
            $table->string('etiqueta')->nullable();
            $table->string('imagen')->nullable();
            $table->string('cta_texto')->nullable();
            $table->string('cta_url')->nullable();
            $table->boolean('activo')->default(true);
            $table->unsignedInteger('orden')->default(0);
            $table->timestamps();
        });
    }
};
