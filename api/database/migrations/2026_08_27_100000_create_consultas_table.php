<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Las preguntas que deja la gente desde la sección de preguntas frecuentes.
     *
     * Se guardan ADEMÁS de avisar por correo. El correo se puede perder, marcar
     * como spam o quedar en un buzón al que ese día nadie entra; la fila en la
     * base no. Y así el panel puede mostrar cuáles quedaron sin responder, que
     * es lo que el cliente pidió cuando dijo "centralizar": no que llegaran a
     * un sitio, sino que no se le perdiera ninguna.
     */
    public function up(): void
    {
        Schema::create('consultas', function (Blueprint $table) {
            $table->id();
            $table->text('mensaje');

            // Cómo devolverle la respuesta. Opcional a propósito: pedir datos
            // obligatorios en un campo de "déjame tu pregunta" espanta a la
            // mitad de la gente, y una pregunta sin remitente igual sirve —
            // si se repite, se vuelve una entrada de las frecuentes.
            $table->string('contacto')->nullable();

            $table->boolean('atendida')->default(false);
            $table->timestamps();

            $table->index(['atendida', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultas');
    }
};
