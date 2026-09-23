<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * Se descartó el chatbot de WhatsApp: el catálogo se administra por el panel.
 *
 * Va como migración de baja y no borrando la de alta a secas porque la tabla
 * pudo alcanzar a crearse en algún despliegue. `dropIfExists` la quita si
 * está y no hace nada si nunca existió, así que sirve en los dos casos.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('consumo_chatbot');
    }

    /**
     * Sin vuelta atrás: la tabla solo guardaba cuánto gastaba el bot en la
     * API de Claude, y sin bot ese dato no significa nada. Si algún día vuelve
     * el chatbot, su migración de alta vuelve con él.
     */
    public function down(): void
    {
        // a propósito, nada
    }
};
