<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hero', function (Blueprint $table) {
            $table->id();
            $table->string('titulo');
            $table->string('subtitulo')->nullable();
            $table->string('etiqueta')->nullable();   // el "eyebrow" sobre el título
            // Si hay imagen cargada desde el panel, manda sobre el video local
            // que trae el frontend por defecto.
            $table->string('imagen')->nullable();
            $table->string('cta_texto')->nullable();
            $table->string('cta_url')->nullable();
            $table->boolean('activo')->default(true);
            $table->unsignedInteger('orden')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hero');
    }
};
