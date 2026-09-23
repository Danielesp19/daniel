<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cuánto gasta el bot, mes a mes.
 *
 * La API de Claude cobra por token consumido. Una fila por mes —no una por
 * llamada— porque lo que hay que responder es "¿cuánto llevo este mes?" y
 * "¿ya me pasé del tope?", y para eso una fila que se va incrementando se
 * consulta en una sola lectura, sin sumar miles de registros en cada mensaje.
 *
 * El detalle llamada por llamada no se guarda a propósito: serían cientos de
 * filas al mes para responder una pregunta que nadie hace, y el registro de
 * qué cambió en el catálogo ya vive en las tablas del catálogo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consumo_chatbot', function (Blueprint $tabla) {
            $tabla->id();

            // El mes como 'YYYY-MM' y no como fecha: es la llave por la que
            // se busca siempre, y guardarlo ya formateado evita depender de
            // funciones de fecha distintas en SQLite y en Postgres.
            $tabla->string('mes', 7)->unique();

            // Tokens, separados porque la salida cuesta unas cinco veces más
            // que la entrada y mezclarlos escondería de dónde sale el gasto.
            // Los de caché van aparte: se cobran a una décima parte, así que
            // sumarlos con los demás inflaría la cuenta sin razón.
            $tabla->unsignedBigInteger('tokens_entrada')->default(0);
            $tabla->unsignedBigInteger('tokens_salida')->default(0);
            $tabla->unsignedBigInteger('tokens_cache_lectura')->default(0);
            $tabla->unsignedBigInteger('tokens_cache_escritura')->default(0);

            // La plata en centavos de dólar y en entero: mismo criterio que
            // los precios del catálogo, que ningún float toque un valor.
            $tabla->unsignedBigInteger('costo_centavos')->default(0);

            $tabla->unsignedInteger('mensajes')->default(0);

            // Para no repetir el aviso de "se está acabando el saldo" en cada
            // mensaje una vez cruzado el umbral.
            $tabla->boolean('aviso_enviado')->default(false);

            $tabla->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consumo_chatbot');
    }
};
