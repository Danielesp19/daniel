<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sedes', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->string('slug')->unique();

            // ── Cómo llegar ─────────────────────────────────────────────────
            // Estos datos son públicos: salen en la ficha del producto junto al
            // stock, porque saber que hay tres bolsas no sirve de nada si no se
            // sabe dónde quedan.
            $table->string('direccion');
            $table->string('ciudad');
            $table->string('barrio')->nullable();

            // Dos números y no uno: la línea fija de la tienda y el WhatsApp
            // rara vez son el mismo, y el enlace de WhatsApp necesita el número
            // sin espacios ni signos para armarse.
            $table->string('telefono')->nullable();
            $table->string('whatsapp')->nullable();

            // Texto libre ("Lun–Sáb 8:00–19:00") y no una tabla de franjas por
            // día: se muestra tal cual, nadie consulta por él, y estructurarlo
            // costaría un formulario mucho más pesado en el panel para que al
            // final se pinte la misma línea de texto.
            $table->string('horario')->nullable();

            // La sede principal es la que recibe el stock existente al migrar y
            // la que se propone por defecto cuando hay que desempatar. Solo una
            // debería tenerlo en true; lo cuida el modelo, no la base, porque
            // un índice único aquí impediría cambiar de principal sin dejar un
            // instante con ninguna.
            $table->boolean('principal')->default(false);

            $table->boolean('activa')->default(true);
            $table->unsignedInteger('orden')->default(0);
            $table->timestamps();

            $table->index(['activa', 'orden']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sedes');
    }
};
